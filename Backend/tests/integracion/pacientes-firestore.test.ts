import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { Paciente } from '../../src/dominio/clinica/paciente.js';
import { uuidPublico, type UUID } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { RegistrarPaciente } from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { ActualizarPaciente } from '../../src/aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import { ConsultarPaciente } from '../../src/aplicacion/casos-uso/pacientes/consultar-paciente.js';
import { BuscarPacientes } from '../../src/aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import { crearClienteFirestore } from '../../src/adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearRepositorioCuentaFirestore } from '../../src/adaptadores/salida/firestore/repositorio-cuenta-firestore.js';
import { RepositorioPacientesFirestore } from '../../src/adaptadores/salida/firestore/pacientes/repositorio-pacientes-firestore.js';
import {
  crearBundlePacientesFirestore,
  crearUnidadDeTrabajoPacientesFirestore,
} from '../../src/adaptadores/salida/firestore/pacientes/crear-bundle-pacientes-firestore.js';

const hostFirestore = process.env.FIRESTORE_EMULATOR_HOST;
const proyectoFirestore = process.env.FIRESTORE_PROJECT_ID ?? `demo-pediatria-pacientes-${process.pid}`;

test('E02-P2-02 Firestore: persistencia de menores, responsables, vínculos, búsquedas y versiones', {
  skip: !hostFirestore,
}, async (t) => {
  const cliente = crearClienteFirestore({
    projectId: proyectoFirestore,
    databaseId: '(default)',
    institucionalId: 'CENTRO_MEDICO_PEDIATRICO',
  });
  t.after(async () => cliente.cerrar());

  const uid = `sec-ped-${randomUUID()}`;
  const actorId = uuidPublico(randomUUID());
  const rolId = uuidPublico(randomUUID());
  const pediatraId = uuidPublico(randomUUID());

  await cliente.firestore.doc(`pediatras/${pediatraId}`).set({
    revision: 1,
    nombres: 'Dra. Sofía',
    apellidos: 'Morales',
    colegiado: 'COL-PED-7788',
    entidad_colegiacion: 'Colegio de Médicos de Guatemala',
    especialidad: 'Pediatría General',
    estado: 'ACTIVO',
  });

  await cliente.firestore.doc(`roles/${rolId}`).set({
    revision: 1,
    nombre: 'SECRETARIA',
    descripcion: 'Gestión de menores y responsables',
    permisos: ['pacientes.administrar', 'historial.archivar', 'historial.leer'],
  });

  await cliente.firestore.doc(`usuarios/${actorId}`).set({
    revision: 1,
    auth_uid: uid,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    estado: 'ACTIVO',
    rol_ids: [rolId],
    pediatra_id: pediatraId,
    nombre_usuario: `secretaria_${randomUUID().slice(0, 8)}`,
  });

  const repoCuenta = crearRepositorioCuentaFirestore(cliente.firestore, cliente.firestore);
  const cuenta = await repoCuenta.porUid(uid);
  assert.ok(cuenta !== null);

  const contexto = crearContextoAutenticado(
    { uid, institucion: 'CENTRO_MEDICO_PEDIATRICO', emitidoEn: instanteUtc('2026-10-27T12:00:00Z') },
    cuenta,
    uuidPublico(randomUUID()),
  );

  const bundle = crearBundlePacientesFirestore(cliente);

  const registrar = new RegistrarPaciente(dependenciasComandoPorDefecto);
  const actualizar = new ActualizarPaciente(dependenciasComandoPorDefecto);
  const consultar = new ConsultarPaciente();
  const buscar = new BuscarPacientes();

  let responsableCompartidoId: UUID;
  let primerMenorId: UUID;

  await t.test('1. Registro de menor con nuevo responsable inicial y verificación de colecciones', async () => {
    const claveIdempotencia = uuidPublico(randomUUID());
    const res = await registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia,
      entrada: {
        nombres: 'Mateo Alejandro',
        apellidos: 'García Pérez',
        fecha_nacimiento: '2022-04-15',
        sexo: 'MASCULINO',
        direccion: 'Zona 11, Ciudad de Guatemala',
        telefono: '+502 5555 4444',
        correo: 'mateo.pediatria@example.com',
        responsables: [
          {
            nombres: 'Valeria',
            apellidos: 'Pérez Gómez',
            telefono: '+502 4433 2211',
            parentesco: 'MADRE',
            es_principal: true,
            autoriza_atencion: true,
            documento: {
              tipo: 'CUI',
              numero: '2541893200101',
            },
          },
        ],
      },
    });

    assert.equal(res.httpStatus, 201);
    assert.equal(res.respuesta.nombres, 'Mateo Alejandro');
    assert.equal(res.respuesta.institucion, 'CENTRO_MEDICO_PEDIATRICO');
    assert.match(res.respuesta.codigo_legible, /^PED-[A-F0-9]{32}$/);
    assert.equal(res.respuesta.estado, 'ACTIVO');
    assert.equal(res.respuesta.version, 1);
    assert.ok(res.respuesta.responsables && res.respuesta.responsables.length === 1);

    const vinculo = res.respuesta.responsables[0]!;
    assert.equal(vinculo.responsable.nombre, 'Valeria Pérez Gómez');
    assert.equal(vinculo.vinculo.parentesco, 'MADRE');
    assert.equal(vinculo.vinculo.es_principal, true);
    assert.equal(vinculo.vinculo.autoriza_atencion, true);

    primerMenorId = uuidPublico(res.respuesta.id);
    responsableCompartidoId = uuidPublico(vinculo.responsable.id);

    // Verificar en Firestore
    const docMenor = await cliente.firestore.doc(`pacientes/${primerMenorId}`).get();
    assert.equal(docMenor.exists, true);
    assert.equal(docMenor.get('nombres'), 'Mateo Alejandro');
    assert.equal(docMenor.get('estado'), 'ACTIVO');
    assert.equal(docMenor.get('revision'), 1);
    assert.equal(docMenor.get('telefono'), '+502 5555 4444');
    assert.equal(docMenor.get('correo'), 'mateo.pediatria@example.com');

    const pacConsultado = await consultar.ejecutar({
      contexto,
      bundle,
      id: primerMenorId,
    });
    assert.equal(pacConsultado.telefono, '+502 5555 4444');
    assert.equal(pacConsultado.correo, 'mateo.pediatria@example.com');

    const docResp = await cliente.firestore.doc(`responsables/${responsableCompartidoId}`).get();
    assert.equal(docResp.exists, true);
    assert.equal(docResp.get('nombres'), 'Valeria');
    assert.equal(docResp.get('apellidos'), 'Pérez Gómez');

    const docVinculo = await cliente.firestore
      .doc(`pacientes/${primerMenorId}/responsables/${responsableCompartidoId}`)
      .get();
    assert.equal(docVinculo.exists, true);
    assert.equal(docVinculo.get('es_principal'), true);
    assert.equal(docVinculo.get('autoriza_atencion'), true);

    // Idempotencia: segunda llamada con misma clave devuelve el mismo resultado
    const resRepetida = await registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia,
      entrada: {
        nombres: 'Mateo Alejandro',
        apellidos: 'García Pérez',
        fecha_nacimiento: '2022-04-15',
        sexo: 'MASCULINO',
        direccion: 'Zona 11, Ciudad de Guatemala',
        telefono: '+502 5555 4444',
        correo: 'mateo.pediatria@example.com',
        responsables: [
          {
            nombres: 'Valeria',
            apellidos: 'Pérez Gómez',
            telefono: '+502 4433 2211',
            parentesco: 'MADRE',
            es_principal: true,
            autoriza_atencion: true,
            documento: {
              tipo: 'CUI',
              numero: '2541893200101',
            },
          },
        ],
      },
    });
    assert.equal(resRepetida.httpStatus, 201);
    assert.equal(resRepetida.respuesta.id, primerMenorId);
    assert.equal(resRepetida.correlacionOriginal, res.correlacionOriginal);
  });

  await t.test('2. Segundo menor referenciando el responsable existente sin sobrescribir sus datos', async () => {
    const claveIdempotencia = uuidPublico(randomUUID());
    const res = await registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia,
      entrada: {
        nombres: 'Lucía Valentina',
        apellidos: 'García Pérez',
        fecha_nacimiento: '2024-08-20',
        sexo: 'FEMENINO',
        responsables: [
          {
            responsable_id: responsableCompartidoId,
            version_responsable: 1,
            parentesco: 'MADRE',
            es_principal: true,
            autoriza_atencion: false, // Separación de autorización por vínculo
          },
        ],
      },
    });

    assert.equal(res.httpStatus, 201);
    assert.equal(res.respuesta.nombres, 'Lucía Valentina');
    const segundoMenorId = res.respuesta.id;

    // Verificar vínculos independientes
    const vinculo1 = await cliente.firestore
      .doc(`pacientes/${primerMenorId}/responsables/${responsableCompartidoId}`)
      .get();
    const vinculo2 = await cliente.firestore
      .doc(`pacientes/${segundoMenorId}/responsables/${responsableCompartidoId}`)
      .get();

    assert.equal(vinculo1.get('autoriza_atencion'), true);
    assert.equal(vinculo2.get('autoriza_atencion'), false);

    // Verificar que los datos del responsable compartido en su colección raíz siguen intactos
    const docResp = await cliente.firestore.doc(`responsables/${responsableCompartidoId}`).get();
    assert.equal(docResp.get('nombres'), 'Valeria');
    assert.equal(docResp.get('apellidos'), 'Pérez Gómez');
    assert.equal(docResp.get('revision'), 1);
  });

  await t.test('3. Políticas de responsables pediátricos: principal obligatorio, duplicados y referencias', async () => {
    // 3a. Alta sin responsables falla
    await assert.rejects(
      () =>
        registrar.ejecutar({
          contexto,
          bundle,
          claveIdempotencia: uuidPublico(randomUUID()),
          entrada: {
            nombres: 'Prueba',
            apellidos: 'Sin Responsable',
            fecha_nacimiento: '2023-01-01',
            sexo: 'MASCULINO',
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'SOLICITUD_INVALIDA',
    );

    // 3b. Alta sin ningún responsable principal falla
    await assert.rejects(
      () =>
        registrar.ejecutar({
          contexto,
          bundle,
          claveIdempotencia: uuidPublico(randomUUID()),
          entrada: {
            nombres: 'Prueba',
            apellidos: 'Sin Principal',
            fecha_nacimiento: '2023-01-01',
            sexo: 'MASCULINO',
            responsables: [
              {
                nombres: 'Resp Uno',
                apellidos: 'Test',
                telefono: '11112222',
                parentesco: 'PADRE',
                es_principal: false,
                autoriza_atencion: true,
                documento: { tipo: 'CUI', numero: '1111111110101' },
              },
            ],
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'SOLICITUD_INVALIDA',
    );

    // 3c. Responsable existente inexistente falla 404 RECURSO_NO_ENCONTRADO
    await assert.rejects(
      () =>
        registrar.ejecutar({
          contexto,
          bundle,
          claveIdempotencia: uuidPublico(randomUUID()),
          entrada: {
            nombres: 'Prueba',
            apellidos: 'Inexistente',
            fecha_nacimiento: '2023-01-01',
            sexo: 'MASCULINO',
            responsables: [
              {
                responsable_id: uuidPublico(randomUUID()),
                version_responsable: 1,
                parentesco: 'PADRE',
                es_principal: true,
                autoriza_atencion: true,
              },
            ],
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'RECURSO_NO_ENCONTRADO',
    );

    // 3d. Responsable existente con versión desactualizada falla VERSION_DESACTUALIZADA
    await assert.rejects(
      () =>
        registrar.ejecutar({
          contexto,
          bundle,
          claveIdempotencia: uuidPublico(randomUUID()),
          entrada: {
            nombres: 'Prueba',
            apellidos: 'Version Desactualizada',
            fecha_nacimiento: '2023-01-01',
            sexo: 'MASCULINO',
            responsables: [
              {
                responsable_id: responsableCompartidoId,
                version_responsable: 99,
                parentesco: 'PADRE',
                es_principal: true,
                autoriza_atencion: true,
              },
            ],
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'VERSION_DESACTUALIZADA',
    );
  });

  await t.test('4. Colisión de identidad: rechaza CUI de paciente o responsable duplicado', async () => {
    // 4a. Alta con CUI de responsable que ya existe en el sistema
    await assert.rejects(
      () =>
        registrar.ejecutar({
          contexto,
          bundle,
          claveIdempotencia: uuidPublico(randomUUID()),
          entrada: {
            nombres: 'Bebé Prueba',
            apellidos: 'Duplicado',
            fecha_nacimiento: '2023-05-10',
            sexo: 'MASCULINO',
            responsables: [
              {
                nombres: 'Otra',
                apellidos: 'Persona',
                telefono: '12345678',
                parentesco: 'TUTOR',
                es_principal: true,
                autoriza_atencion: true,
                documento: {
                  tipo: 'CUI',
                  numero: '2541-89320-0101', // Mismo CUI con guiones ya reservado por Valeria
                },
              },
            ],
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PACIENTE_DUPLICADO',
    );
  });

  await t.test('5. Actualización demográfica, versionado optimista e historial de revisiones', async () => {
    // 5a. Actualizar datos de primerMenorId
    const resAct = await actualizar.ejecutar({
      contexto,
      bundle,
      id: primerMenorId,
      claveIdempotencia: uuidPublico(randomUUID()),
      cambios: {
        version_esperada: 1,
        nombres: 'Mateo Alexander',
        direccion: 'Zona 14, Ciudad de Guatemala',
        telefono: null, // Eliminación explícita de teléfono
      },
    });

    assert.equal(resAct.httpStatus, 200);
    assert.equal(resAct.respuesta.nombres, 'Mateo Alexander');
    assert.equal(resAct.respuesta.direccion, 'Zona 14, Ciudad de Guatemala');
    assert.equal(resAct.respuesta.telefono, undefined);
    assert.equal(resAct.respuesta.correo, 'mateo.pediatria@example.com');
    assert.equal(resAct.respuesta.version, 2);

    // Verificar que en Firestore la revisión es 2 y telefono fue eliminado
    const docAct = await cliente.firestore.doc(`pacientes/${primerMenorId}`).get();
    assert.equal(docAct.get('revision'), 2);
    assert.equal(docAct.get('nombres'), 'Mateo Alexander');
    assert.equal(docAct.get('telefono'), undefined);
    assert.equal(docAct.get('correo'), 'mateo.pediatria@example.com');

    // 5b. Verificar consulta por versión
    const repoLectura = new RepositorioPacientesFirestore(cliente.firestore, cliente.firestore);
    const ver1 = await repoLectura.porVersion(primerMenorId, versionPositiva(1));
    assert.ok(ver1 !== null);
    assert.equal(ver1.nombres, 'Mateo Alejandro');
    assert.equal(ver1.version, versionPositiva(1));

    const ver2 = await repoLectura.porVersion(primerMenorId, versionPositiva(2));
    assert.ok(ver2 !== null);
    assert.equal(ver2.nombres, 'Mateo Alexander');
    assert.equal(ver2.version, versionPositiva(2));

    // 5c. Concurrencia optimista: intentar actualizar con versión esperada desactualizada (1) falla
    await assert.rejects(
      () =>
        actualizar.ejecutar({
          contexto,
          bundle,
          id: primerMenorId,
          claveIdempotencia: uuidPublico(randomUUID()),
          cambios: {
            version_esperada: 1,
            nombres: 'Mateo Tercero',
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'VERSION_DESACTUALIZADA',
    );
  });

  await t.test('6. Búsqueda por prefijo de nombre y paginación con cursor', async () => {
    // Búsqueda de 'Mateo'
    const resBusqueda = await buscar.ejecutar({
      contexto,
      bundle,
      entrada: {
        q: 'Mateo',
        limite: 10,
        orden: 'ASC',
      },
    });

    assert.ok(resBusqueda.data.length >= 1);
    const encontrado = resBusqueda.data.find((p) => p.id === primerMenorId);
    assert.ok(encontrado !== undefined);
    assert.equal(encontrado.nombres, 'Mateo Alexander');
    assert.ok(encontrado.responsables && encontrado.responsables.length >= 1);

    // Búsqueda de 'Lucía'
    const resLucia = await buscar.ejecutar({
      contexto,
      bundle,
      entrada: {
        q: 'Lucía',
        limite: 10,
        orden: 'ASC',
      },
    });
    assert.ok(resLucia.data.length >= 1);
    assert.equal(resLucia.data[0]?.nombres, 'Lucía Valentina');

    // Registrar otro menor con prefijo 'Mateo' para probar paginación de prefijo
    const resSegundoMateo = await registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(randomUUID()),
      entrada: {
        nombres: 'Mateo Daniel',
        apellidos: 'López Morales',
        fecha_nacimiento: '2023-09-10',
        sexo: 'MASCULINO',
        responsables: [
          {
            nombres: 'Daniel',
            apellidos: 'López',
            telefono: '+502 9988 7766',
            parentesco: 'PADRE',
            es_principal: true,
            autoriza_atencion: true,
            documento: { tipo: 'CUI', numero: '9988776650101' },
          },
        ],
      },
    });
    const segundoMateoId = resSegundoMateo.respuesta.id;

    // Registrar tercer menor con el MISMO nombre completo para verificar desempate de cursor por ID
    const resTercerMateo = await registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(randomUUID()),
      entrada: {
        nombres: 'Mateo Daniel',
        apellidos: 'López Morales',
        fecha_nacimiento: '2023-11-15',
        sexo: 'MASCULINO',
        responsables: [
          {
            nombres: 'Estela',
            apellidos: 'Morales',
            telefono: '+502 9988 5544',
            parentesco: 'MADRE',
            es_principal: true,
            autoriza_atencion: true,
            documento: { tipo: 'CUI', numero: '9988554430101' },
          },
        ],
      },
    });
    const tercerMateoId = resTercerMateo.respuesta.id;

    // Paginación con límite 1 buscando exactamente 'Mateo Daniel' (dos homónimos)
    const p1 = await buscar.ejecutar({
      contexto,
      bundle,
      entrada: {
        q: 'Mateo Daniel',
        limite: 1,
        orden: 'ASC',
      },
    });

    assert.equal(p1.data.length, 1);
    assert.ok(p1.meta.siguiente_cursor !== undefined);

    const p2 = await buscar.ejecutar({
      contexto,
      bundle,
      entrada: {
        q: 'Mateo Daniel',
        limite: 1,
        cursor: p1.meta.siguiente_cursor,
        orden: 'ASC',
      },
    });

    assert.equal(p2.data.length, 1);
    assert.notEqual(p2.data[0]?.id, p1.data[0]?.id);
    const idsPagina = [p1.data[0]?.id, p2.data[0]?.id];
    assert.ok(idsPagina.includes(segundoMateoId));
    assert.ok(idsPagina.includes(tercerMateoId));
  });

  await t.test('7. Archivo de paciente: impide modificaciones posteriores', async () => {
    // Archivar menor
    const uow = crearUnidadDeTrabajoPacientesFirestore(cliente);
    const comandoArchivo = {
      id: uuidPublico(randomUUID()),
      claveIdempotencia: uuidPublico(randomUUID()),
      caso: 'paciente.archivar',
      hashEntrada: createHash('sha256').update('hash-sintetico-archivo').digest('hex'),
      instante: instanteUtc('2026-10-27T16:00:00Z'),
      ids: { evento_auditoria_id: uuidPublico(randomUUID()) },
    };

    await uow.ejecutar(contexto, comandoArchivo, async (lector) => {
      const paciente = (await lector.pacientes.porId(primerMenorId)) as Paciente | null;
      assert.ok(paciente !== null);

      const pacienteArchivado = {
        ...paciente,
        estado: 'ARCHIVADO' as const,
        version: versionPositiva(Number(paciente.version) + 1),
        baja: {
          causa: 'TRASLADO' as const,
          motivo: 'Traslado a otra institución de salud',
          fecha: instanteUtc('2026-10-27T16:00:00Z'),
          actorId: contexto.cuenta.id,
        },
      };

      return {
        tipo: 'CONFIRMAR',
        cambios: [
          {
            agregado: 'pacientes',
            tipo: 'ACTUALIZAR',
            recursoId: primerMenorId,
            versionAnterior: paciente.version,
            nuevoEstado: pacienteArchivado,
          },
        ],
        revisiones: [],
        auditoria: [
          {
            id: comandoArchivo.ids.evento_auditoria_id!,
            actorId: contexto.cuenta.id,
            caso: 'paciente.archivar',
            recursoId: primerMenorId,
            fechaHora: comandoArchivo.instante,
            correlacion: contexto.correlacion,
          },
        ],
        resultado: {
          httpStatus: 200,
          respuesta: { archivado: true },
          correlacionOriginal: contexto.correlacion,
        },
      };
    });

    // Verificar estado archivado
    const pacArch = await consultar.ejecutar({
      contexto,
      bundle,
      id: primerMenorId,
    });
    assert.equal(pacArch.estado, 'ARCHIVADO');
    assert.equal(pacArch.baja?.causa, 'TRASLADO');

    // Intentar modificar datos demográficos de paciente archivado falla con ESTADO_INVALIDO
    await assert.rejects(
      () =>
        actualizar.ejecutar({
          contexto,
          bundle,
          id: primerMenorId,
          claveIdempotencia: uuidPublico(randomUUID()),
          cambios: {
            version_esperada: 3,
            nombres: 'Intento de Cambio Archivador',
          },
        }),
      (err: unknown) => err instanceof ErrorDominio && err.codigo === 'ESTADO_INVALIDO',
    );
  });
});
