import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import { RegistrarPaciente } from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { ActualizarPaciente } from '../../src/aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import { ConsultarPaciente } from '../../src/aplicacion/casos-uso/pacientes/consultar-paciente.js';
import { BuscarPacientes } from '../../src/aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import { RepositorioPacientesMemoria } from '../../src/adaptadores/salida/pacientes/repositorio-pacientes-memoria.js';
import type { EventoAuditoria } from '../../src/aplicacion/puertos/nucleo.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { crearContextoAutenticado, type ContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import { CUENTAS_SINTETICAS } from '../../src/adaptadores/salida/identidad/semillas-sinteticas.js';
import { uuidPublico, type UUID } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { fechaCivil } from '../../src/dominio/compartido/fecha-civil.js';
import type { Version } from '../../src/dominio/compartido/version.js';
import type { Paciente } from '../../src/dominio/clinica/paciente.js';
import { mapearPacienteDto } from '../../src/aplicacion/casos-uso/pacientes/dtos-pacientes.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';

describe('casos de uso de pacientes en memoria', () => {
  let repoHospital: RepositorioPacientesMemoria;
  let repoPediatria: RepositorioPacientesMemoria;
  let bundleHospital: BundleInstitucional;
  let bundlePediatria: BundleInstitucional;

  let contextoHospital: ContextoAutenticado;
  let contextoPediatria: ContextoAutenticado;

  let registrarPaciente: RegistrarPaciente;
  let actualizarPaciente: ActualizarPaciente;
  let consultarPaciente: ConsultarPaciente;
  let buscarPacientes: BuscarPacientes;

  beforeEach(() => {
    repoHospital = new RepositorioPacientesMemoria();
    repoPediatria = new RepositorioPacientesMemoria();

    bundleHospital = Object.freeze({
      institucion: 'HOSPITAL_GENERAL',
      estadoPersistencia: 'DISPONIBLE',
      pacientes: repoHospital,
      uow: repoHospital.crearUnidadDeTrabajo(),
    });

    bundlePediatria = Object.freeze({
      institucion: 'CENTRO_MEDICO_PEDIATRICO',
      estadoPersistencia: 'DISPONIBLE',
      pacientes: repoPediatria,
      uow: repoPediatria.crearUnidadDeTrabajo(),
    });

    const cuentaHosp = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('ADMIN_INSTITUCIONAL'),
    )!;
    contextoHospital = crearContextoAutenticado(
      { uid: cuentaHosp.uid, institucion: cuentaHosp.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
      cuentaHosp,
      uuidPublico(randomUUID()),
    );

    const cuentaPed = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'CENTRO_MEDICO_PEDIATRICO' && c.roles.includes('ADMIN_INSTITUCIONAL'),
    )!;
    contextoPediatria = crearContextoAutenticado(
      { uid: cuentaPed.uid, institucion: cuentaPed.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
      cuentaPed,
      uuidPublico(randomUUID()),
    );

    registrarPaciente = new RegistrarPaciente(dependenciasComandoPorDefecto);
    actualizarPaciente = new ActualizarPaciente(dependenciasComandoPorDefecto);
    consultarPaciente = new ConsultarPaciente();
    buscarPacientes = new BuscarPacientes();
  });

  describe('RegistrarPaciente', () => {
    it('registra un paciente hospitalario con código legible y campos obligatorios', async () => {
      const claveIdempotencia = uuidPublico(randomUUID());
      const resultado = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada: {
          nombres: 'Carlos Alberto',
          apellidos: 'Gomez Alvarez',
          fecha_nacimiento: '1985-06-15',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '2099123450101' },
          grupo_sanguineo: 'O+',
          contacto_emergencia: {
            nombres: 'Maria',
            apellidos: 'Gomez',
            parentesco: 'Hermana',
            telefono: '55512345',
          },
        },
      });

      const paciente = resultado.respuesta;
      assert.ok(paciente.id);
      assert.match(paciente.codigo_legible, /^HOSP-[A-F0-9]{6}$/);
      assert.equal(paciente.nombres, 'Carlos Alberto');
      assert.equal(paciente.apellidos, 'Gomez Alvarez');
      assert.equal(paciente.fecha_nacimiento, '1985-06-15');
      assert.equal(paciente.sexo, 'MASCULINO');
      assert.equal(paciente.identificacion?.numero, '2099123450101');
      assert.equal(paciente.grupo_sanguineo, 'O+');
      assert.equal(paciente.contacto_emergencia?.nombres, 'Maria');
      assert.equal(paciente.contacto_emergencia?.apellidos, 'Gomez');
      assert.equal(paciente.contacto_emergencia?.parentesco, 'Hermana');
      assert.equal(paciente.contacto_emergencia?.telefono, '55512345');
      assert.equal(paciente.estado, 'ACTIVO');
      assert.equal(paciente.version, 1);
    });

    it('reproduce durablemente el resultado ante clave de idempotencia repetida conservando correlacionOriginal', async () => {
      const claveIdempotencia = uuidPublico(randomUUID());
      const entrada = {
        nombres: 'Luisa Fernanda',
        apellidos: 'Morales Silva',
        fecha_nacimiento: '1990-11-20',
        sexo: 'FEMENINO' as const,
        identificacion: { tipo: 'CUI' as const, numero: '3044123450101' },
      };

      const primero = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada,
      });

      const contextoReintento = crearContextoAutenticado(
        { uid: contextoHospital.cuenta.uid, institucion: contextoHospital.cuenta.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
        contextoHospital.cuenta,
        uuidPublico(randomUUID()),
      );

      const segundo = await registrarPaciente.ejecutar({
        contexto: contextoReintento,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada,
      });

      assert.equal(segundo.respuesta.id, primero.respuesta.id);
      assert.equal(segundo.respuesta.codigo_legible, primero.respuesta.codigo_legible);
      assert.equal(segundo.respuesta.version, primero.respuesta.version);
      assert.equal(segundo.correlacionOriginal, primero.correlacionOriginal);
    });

    it('serializa ejecuciones concurrentes con la misma clave de idempotencia devolviendo el mismo registro', async () => {
      const claveIdempotencia = uuidPublico(randomUUID());
      const entrada = {
        nombres: 'Concurrente',
        apellidos: 'Idempotente',
        fecha_nacimiento: '1987-07-07',
        sexo: 'MASCULINO' as const,
        identificacion: { tipo: 'CUI' as const, numero: '9988776650101' },
      };

      const [res1, res2] = await Promise.all([
        registrarPaciente.ejecutar({
          contexto: contextoHospital,
          bundle: bundleHospital,
          claveIdempotencia,
          entrada,
        }),
        registrarPaciente.ejecutar({
          contexto: contextoHospital,
          bundle: bundleHospital,
          claveIdempotencia,
          entrada,
        }),
      ]);

      assert.equal(res1.respuesta.id, res2.respuesta.id);
      assert.equal(res1.respuesta.codigo_legible, res2.respuesta.codigo_legible);
      assert.equal(res1.correlacionOriginal, res2.correlacionOriginal);
    });

    it('rechaza repetición con carga útil distinta usando la misma clave de idempotencia (CLAVE_REUTILIZADA)', async () => {
      const claveIdempotencia = uuidPublico(randomUUID());
      await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada: {
          nombres: 'Primero',
          apellidos: 'Original',
          fecha_nacimiento: '1985-01-01',
          sexo: 'MASCULINO',
        },
      });

      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            claveIdempotencia,
            entrada: {
              nombres: 'Diferente',
              apellidos: 'Modificado',
              fecha_nacimiento: '1985-01-01',
              sexo: 'MASCULINO',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'CLAVE_REUTILIZADA');
          return true;
        },
      );
    });

    it('rechaza identificación duplicada', async () => {
      const ident = { tipo: 'CUI' as const, numero: '2099999990101' };
      await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Primer',
          apellidos: 'Paciente',
          fecha_nacimiento: '1980-01-01',
          sexo: 'MASCULINO',
          identificacion: ident,
        },
      });

      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Segundo',
              apellidos: 'Paciente',
              fecha_nacimiento: '1982-02-02',
              sexo: 'MASCULINO',
              identificacion: ident,
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'PACIENTE_DUPLICADO');
          return true;
        },
      );
    });

    it('exige al menos un responsable principal en alta pediátrica', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Niño',
              apellidos: 'Perez',
              fecha_nacimiento: '2020-05-10',
              sexo: 'MASCULINO',
              responsables: [
                {
                  parentesco: 'Madre',
                  es_principal: false,
                  autoriza_atencion: true,
                  nombres: 'Juana',
                  apellidos: 'Perez',
                  telefono: '55500000',
                  documento: { tipo: 'CUI', numero: '1000000000101' },
                },
              ],
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /responsable principal/i);
          return true;
        },
      );
    });

    it('rechaza fecha de nacimiento futura', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Futuro',
              apellidos: 'Paciente',
              fecha_nacimiento: '2099-01-01',
              sexo: 'MASCULINO',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          return true;
        },
      );
    });

    it('deniega registro si la cuenta no tiene permiso pacientes.administrar', async () => {
      const cuentaMedico = CUENTAS_SINTETICAS.find(
        (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('MEDICO'),
      )!;
      const contextoMedico = crearContextoAutenticado(
        { uid: cuentaMedico.uid, institucion: cuentaMedico.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
        cuentaMedico,
        uuidPublico(randomUUID()),
      );

      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoMedico,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Test',
              apellidos: 'NoPermiso',
              fecha_nacimiento: '1995-01-01',
              sexo: 'MASCULINO',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SIN_PERMISO');
          return true;
        },
      );
    });

    it('registra paciente pediátrico y persiste responsable en memoria con esquema canónico', async () => {
      const resp = await registrarPaciente.ejecutar({
        contexto: contextoPediatria,
        bundle: bundlePediatria,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Mateo',
          apellidos: 'Lopez',
          fecha_nacimiento: '2021-08-14',
          sexo: 'MASCULINO',
          responsables: [
            {
              nombres: 'Elena',
              apellidos: 'Lopez',
              telefono: '55522222',
              parentesco: 'Madre',
              es_principal: true,
              autoriza_atencion: true,
              documento: { tipo: 'CUI', numero: '1234567890101' },
            },
          ],
        },
      });

      const paciente = resp.respuesta;
      assert.ok(paciente.id);
      assert.equal(paciente.institucion, 'CENTRO_MEDICO_PEDIATRICO');
      assert.ok(paciente.responsables);
      assert.equal(paciente.responsables.length, 1);
      const primero = paciente.responsables[0]!;
      assert.equal(primero.responsable.nombres, 'Elena');
      assert.equal(primero.responsable.apellidos, 'Lopez');
      assert.equal(primero.responsable.nombre, 'Elena Lopez');
      assert.equal(primero.responsable.telefono, '55522222');
      assert.equal(primero.responsable.version, 1);
      assert.equal(primero.vinculo.parentesco, 'Madre');
      assert.equal(primero.vinculo.es_principal, true);
      assert.equal(primero.vinculo.autoriza_atencion, true);
      assert.equal(primero.version_vinculo, 1);

      // Ahora registrar un segundo hijo referenciando al responsable existente por ID
      const resp2 = await registrarPaciente.ejecutar({
        contexto: contextoPediatria,
        bundle: bundlePediatria,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Sofia',
          apellidos: 'Lopez',
          fecha_nacimiento: '2023-01-20',
          sexo: 'FEMENINO',
          responsables: [
            {
              responsable_id: primero.responsable.id,
              version_responsable: primero.responsable.version,
              parentesco: 'Madre',
              es_principal: true,
              autoriza_atencion: true,
            },
          ],
        },
      });

      const paciente2 = resp2.respuesta;
      assert.ok(paciente2.id);
      assert.ok(paciente2.responsables);
      assert.equal(paciente2.responsables.length, 1);
      assert.equal(paciente2.responsables[0]!.responsable.id, primero.responsable.id);
      assert.equal(paciente2.responsables[0]!.vinculo.responsable_id, primero.responsable.id);
    });

    it('rechaza responsable nuevo pediátrico sin nombres o apellidos requeridos', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Bebe',
              apellidos: 'SinTutorCompleto',
              fecha_nacimiento: '2023-05-01',
              sexo: 'FEMENINO',
              responsables: [
                {
                  parentesco: 'Tia',
                  es_principal: true,
                  autoriza_atencion: true,
                } as unknown as { parentesco: string; es_principal: boolean; autoriza_atencion: boolean },
              ],
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /nombres/i);
          return true;
        },
      );
    });

    it('rechaza grupo_sanguineo y contacto_emergencia en alta no hospitalaria', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Test',
              apellidos: 'Pediatrico',
              fecha_nacimiento: '2022-01-01',
              sexo: 'MASCULINO',
              grupo_sanguineo: 'O+',
              responsables: [
                {
                  nombres: 'Madre',
                  apellidos: 'Test',
                  telefono: '55511111',
                  parentesco: 'Madre',
                  es_principal: true,
                  autoriza_atencion: true,
                },
              ],
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /HOSPITAL_GENERAL/);
          return true;
        },
      );
    });

    it('rechaza documentos duplicados entre responsables nuevos dentro de la misma solicitud', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Hermanos',
              apellidos: 'Gemelos',
              fecha_nacimiento: '2023-01-01',
              sexo: 'MASCULINO',
              responsables: [
                {
                  nombres: 'Padre Uno',
                  apellidos: 'Lopez',
                  telefono: '55511111',
                  documento: { tipo: 'CUI', numero: '2020303040101' },
                  parentesco: 'Padre',
                  es_principal: true,
                  autoriza_atencion: true,
                },
                {
                  nombres: 'Padre Dos',
                  apellidos: 'Lopez',
                  telefono: '55522222',
                  documento: { tipo: 'CUI', numero: '2020-30304-0101' },
                  parentesco: 'Padre',
                  es_principal: false,
                  autoriza_atencion: true,
                },
              ],
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'PACIENTE_DUPLICADO');
          assert.match(error.message, /duplicada/i);
          return true;
        },
      );
    });

    it('rechaza alta pediátrica con más de 100 responsables arrojando LIMITE_AGREGADO', async () => {
      const muchosResponsables = Array.from({ length: 101 }, (_, i) => ({
        nombres: `Tutor ${i}`,
        apellidos: 'Prueba',
        telefono: '55512345',
        parentesco: 'Tutor',
        es_principal: i === 0,
        autoriza_atencion: true,
      }));

      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Pediatrico',
              apellidos: 'MuchosTutores',
              fecha_nacimiento: '2023-01-01',
              sexo: 'MASCULINO',
              responsables: muchosResponsables,
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'LIMITE_AGREGADO');
          return true;
        },
      );
    });
  });

  describe('ActualizarPaciente', () => {
    let pacienteId: UUID;

    beforeEach(async () => {
      const creado = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Ana Beatriz',
          apellidos: 'Ochoa Ruiz',
          fecha_nacimiento: '1992-04-12',
          sexo: 'FEMENINO',
          telefono: '55598765',
          identificacion: { tipo: 'CUI', numero: '5555123450101' },
        },
      });
      pacienteId = creado.respuesta.id as UUID;
    });

    it('actualiza campos demográficos e incrementa versión con bloqueo optimista', async () => {
      const resActualizado = await actualizarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
        claveIdempotencia: uuidPublico(randomUUID()),
        cambios: {
          version_esperada: 1,
          telefono: '55511111',
          direccion: 'Zona 10, Ciudad de Guatemala',
        },
      });

      const actualizado = resActualizado.respuesta;
      assert.equal(actualizado.id, pacienteId);
      assert.equal(actualizado.version, 2);
      assert.equal(actualizado.telefono, '55511111');
      assert.equal(actualizado.direccion, 'Zona 10, Ciudad de Guatemala');
      assert.equal(actualizado.nombres, 'Ana Beatriz'); // conserva campos omitidos
    });

    it('rechaza versión esperada discordante con conflicto 409', async () => {
      await assert.rejects(
        async () => {
          await actualizarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            id: pacienteId,
            claveIdempotencia: uuidPublico(randomUUID()),
            cambios: {
              version_esperada: 99,
              telefono: '55500000',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'VERSION_DESACTUALIZADA');
          return true;
        },
      );
    });

    it('libera reserva de identidad previa al retirar o cambiar documento', async () => {
      // Retirar identificación (null elimina campo opcional)
      const resActualizado = await actualizarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
        claveIdempotencia: uuidPublico(randomUUID()),
        cambios: {
          version_esperada: 1,
          identificacion: null,
        },
      });
      const actualizado = resActualizado.respuesta;
      assert.equal(actualizado.identificacion, undefined);

      // Ahora otro paciente puede registrarse con la identificación liberada
      const nuevo = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Nuevo',
          apellidos: 'Titular',
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '5555123450101' },
        },
      });
      assert.ok(nuevo.respuesta.id);
    });

    it('rechaza grupo_sanguineo en actualización de paciente no hospitalario', async () => {
      const respPed = await registrarPaciente.ejecutar({
        contexto: contextoPediatria,
        bundle: bundlePediatria,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Nino',
          apellidos: 'Pediatrico',
          fecha_nacimiento: '2022-01-01',
          sexo: 'MASCULINO',
          responsables: [
            {
              nombres: 'Tutor',
              apellidos: 'Legal',
              telefono: '55533333',
              parentesco: 'Tutor',
              es_principal: true,
              autoriza_atencion: true,
            },
          ],
        },
      });

      await assert.rejects(
        async () => {
          await actualizarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            id: respPed.respuesta.id as UUID,
            claveIdempotencia: uuidPublico(randomUUID()),
            cambios: {
              version_esperada: 1,
              grupo_sanguineo: 'A+',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /HOSPITAL_GENERAL/);
          return true;
        },
      );
    });

    it('serializa actualizaciones concurrentes impidiendo colisión de versiones (bloqueo optimista concurrente)', async () => {
      const resultados = await Promise.allSettled([
        actualizarPaciente.ejecutar({
          contexto: contextoHospital,
          bundle: bundleHospital,
          id: pacienteId,
          claveIdempotencia: uuidPublico(randomUUID()),
          cambios: {
            version_esperada: 1,
            telefono: '55511111',
          },
        }),
        actualizarPaciente.ejecutar({
          contexto: contextoHospital,
          bundle: bundleHospital,
          id: pacienteId,
          claveIdempotencia: uuidPublico(randomUUID()),
          cambios: {
            version_esperada: 1,
            telefono: '55522222',
          },
        }),
      ]);

      const exitosos = resultados.filter((r) => r.status === 'fulfilled');
      const fallidos = resultados.filter((r) => r.status === 'rejected');

      assert.equal(exitosos.length, 1);
      assert.equal(fallidos.length, 1);

      const error = (fallidos[0] as PromiseRejectedResult).reason as ErrorDominio;
      assert.equal(error.codigo, 'VERSION_DESACTUALIZADA');

      const pacienteFinal = await consultarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
      });
      assert.equal(pacienteFinal.version, 2);
    });

    it('preserva las revisiones históricas en el repositorio tras actualizar paciente', async () => {
      const resActualizado = await actualizarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
        claveIdempotencia: uuidPublico(randomUUID()),
        cambios: {
          version_esperada: 1,
          telefono: '55599887',
        },
      });

      assert.equal(resActualizado.respuesta.version, 2);

      const lector = (bundleHospital.pacientes as RepositorioPacientesMemoria).crearLector();
      const v1 = (await lector.pacientes.porVersion(pacienteId, 1 as Version)) as Paciente | null;
      assert.ok(v1);
      assert.equal(v1.version, 1);
      assert.equal(v1.telefono, '55598765');

      const v2 = (await lector.pacientes.porVersion(pacienteId, 2 as Version)) as Paciente | null;
      assert.ok(v2);
      assert.equal(v2.version, 2);
      assert.equal(v2.telefono, '55599887');
    });

    it('rechaza cambios de teléfono o dirección compuestos solo por espacios en blanco', async () => {
      await assert.rejects(
        async () => {
          await actualizarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            id: pacienteId,
            claveIdempotencia: uuidPublico(randomUUID()),
            cambios: {
              version_esperada: 1,
              telefono: '    ',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /espacios/i);
          return true;
        },
      );

      await assert.rejects(
        async () => {
          await actualizarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            id: pacienteId,
            claveIdempotencia: uuidPublico(randomUUID()),
            cambios: {
              version_esperada: 1,
              direccion: '   \t  ',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /espacios/i);
          return true;
        },
      );

      const conservado = await consultarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
      });
      assert.equal(conservado.version, 1);
      assert.equal(conservado.telefono, '55598765');
    });

    it('aísla los eventos de historial por pacienteId en la UoW en memoria', async () => {
      const otroPaciente = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Otro',
          apellidos: 'Paciente Historial',
          fecha_nacimiento: '1995-05-05',
          sexo: 'FEMENINO',
        },
      });

      const lector = (bundleHospital.pacientes as RepositorioPacientesMemoria).crearLector();
      const filtro = { limite: 50, orden: 'ASC' as const };
      const eventos1 = await lector.historial.eventos(pacienteId, filtro);
      assert.ok(eventos1.elementos.length > 0);
      assert.ok(eventos1.elementos.every((ev) => (ev as EventoAuditoria).recursoId === pacienteId));

      const eventos2 = await lector.historial.eventos(otroPaciente.respuesta.id as UUID, filtro);
      assert.ok(eventos2.elementos.length > 0);
      assert.ok(eventos2.elementos.every((ev) => (ev as EventoAuditoria).recursoId === otroPaciente.respuesta.id));

      const eventosInexistente = await lector.historial.eventos(uuidPublico(randomUUID()), filtro);
      assert.equal(eventosInexistente.elementos.length, 0);
    });

    it('respeta orden ASC y DESC y devuelve cursor de continuación en historial de eventos', async () => {
      let segundo = 1;
      const relojSec = {
        ahora: () => instanteUtc(new Date(Date.UTC(2026, 0, 1, 10, 0, segundo++)).toISOString()),
      };
      const registrarSec = new RegistrarPaciente({
        ...dependenciasComandoPorDefecto,
        reloj: relojSec,
      });
      const actualizarSec = new ActualizarPaciente({
        ...dependenciasComandoPorDefecto,
        reloj: relojSec,
      });

      const pacCreado = await registrarSec.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Historial',
          apellidos: 'Paginacion',
          fecha_nacimiento: '1980-01-01',
          sexo: 'MASCULINO',
        },
      });
      const histPacId = pacCreado.respuesta.id as UUID;

      await actualizarSec.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: histPacId,
        claveIdempotencia: uuidPublico(randomUUID()),
        cambios: {
          version_esperada: 1,
          telefono: '55512345',
        },
      });

      const lector = (bundleHospital.pacientes as RepositorioPacientesMemoria).crearLector();

      // Consulta en orden DESC con limite 1: debe devolver el evento más reciente (actualización) y siguienteCursor
      const pag1Desc = await lector.historial.eventos(histPacId, { limite: 1, orden: 'DESC' });
      assert.equal(pag1Desc.elementos.length, 1);
      assert.equal((pag1Desc.elementos[0] as EventoAuditoria).caso, 'paciente.actualizar');
      assert.ok(pag1Desc.siguienteCursor);

      // Consulta página 2 con cursor en orden DESC: debe devolver el evento anterior (alta) y sin cursor
      const pag2Desc = await lector.historial.eventos(histPacId, {
        limite: 1,
        orden: 'DESC',
        cursor: pag1Desc.siguienteCursor,
      });
      assert.equal(pag2Desc.elementos.length, 1);
      assert.equal((pag2Desc.elementos[0] as EventoAuditoria).caso, 'paciente.registrar');
      assert.equal(pag2Desc.siguienteCursor, undefined);

      // Consulta en orden ASC con limite 1: debe devolver el evento más antiguo (alta) y siguienteCursor
      const pag1Asc = await lector.historial.eventos(histPacId, { limite: 1, orden: 'ASC' });
      assert.equal(pag1Asc.elementos.length, 1);
      assert.equal((pag1Asc.elementos[0] as EventoAuditoria).caso, 'paciente.registrar');
      assert.ok(pag1Asc.siguienteCursor);

      const pag2Asc = await lector.historial.eventos(histPacId, {
        limite: 1,
        orden: 'ASC',
        cursor: pag1Asc.siguienteCursor,
      });
      assert.equal(pag2Asc.elementos.length, 1);
      assert.equal((pag2Asc.elementos[0] as EventoAuditoria).caso, 'paciente.actualizar');
      assert.equal(pag2Asc.siguienteCursor, undefined);
    });
  });

  describe('ConsultarPaciente y BuscarPacientes', () => {
    let pacienteId: UUID;

    beforeEach(async () => {
      const creado = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Gustavo Adolfo',
          apellidos: 'Becquer Soto',
          fecha_nacimiento: '1975-02-17',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '7777123450101' },
        },
      });
      pacienteId = creado.respuesta.id as UUID;
    });

    it('obtiene paciente existente por UUID', async () => {
      const consultado = await consultarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
      });

      assert.equal(consultado.id, pacienteId);
      assert.equal(consultado.nombres, 'Gustavo Adolfo');
    });

    it('aplica aislamiento institucional y no encuentra paciente de otro bundle', async () => {
      await assert.rejects(
        async () => {
          await consultarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            id: pacienteId,
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'RECURSO_NO_ENCONTRADO');
          return true;
        },
      );
    });

    it('busca pacientes por término de nombre o documento', async () => {
      const resultado = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Gustavo' },
      });

      assert.equal(resultado.data.length, 1);
      assert.equal(resultado.data[0]!.id, pacienteId);
    });

    it('encuentra paciente con nombres y apellidos combinados mayores a 120 caracteres', async () => {
      // 64 caracteres en nombres empezando con 'Ana' y 60 caracteres en apellidos
      const nombresLargos = 'Ana ' + 'A'.repeat(60);
      const apellidosLargos = 'B'.repeat(60);
      const creado = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: nombresLargos,
          apellidos: apellidosLargos,
          fecha_nacimiento: '1989-05-05',
          sexo: 'FEMENINO',
        },
      });

      const resultado = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Ana' },
      });

      assert.ok(resultado.data.some((p) => p.id === creado.respuesta.id));
    });

    it('rechaza cursor inválido o con orden/filtros discordantes', async () => {
      const pag1 = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Gustavo', limite: 1, orden: 'ASC' },
      });

      await assert.rejects(
        async () => {
          await buscarPacientes.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            entrada: { q: 'Gustavo', cursor: 'cursor-invalido-malformado' },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          return true;
        },
      );

      if (pag1.meta.siguiente_cursor) {
        await assert.rejects(
          async () => {
            await buscarPacientes.ejecutar({
              contexto: contextoHospital,
              bundle: bundleHospital,
              entrada: { q: 'Gustavo', cursor: pag1.meta.siguiente_cursor!, orden: 'DESC' },
            });
          },
          (error: ErrorDominio) => {
            assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
            return true;
          },
        );
      }
    });

    it('ordena resultados por fecha_registro y UUID de forma determinista', async () => {
      let tiempoSec = 1;
      const relojSecuencial = {
        ahora: () => instanteUtc(new Date(Date.UTC(2026, 0, 1, 10, 0, tiempoSec++)).toISOString()),
      };
      const registrarConReloj = new RegistrarPaciente({
        ...dependenciasComandoPorDefecto,
        reloj: relojSecuencial,
      });

      const p1 = await registrarConReloj.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Zacarias Orden',
          apellidos: 'Test',
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
        },
      });

      const p2 = await registrarConReloj.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Abel Orden',
          apellidos: 'Test',
          fecha_nacimiento: '1991-01-01',
          sexo: 'MASCULINO',
        },
      });

      const resAsc = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Orden', orden: 'ASC' },
      });

      assert.equal(resAsc.data.length, 2);
      assert.equal(resAsc.data[0]!.id, p1.respuesta.id);
      assert.equal(resAsc.data[1]!.id, p2.respuesta.id);

      const resDesc = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Orden', orden: 'DESC' },
      });

      assert.equal(resDesc.data.length, 2);
      assert.equal(resDesc.data[0]!.id, p2.respuesta.id);
      assert.equal(resDesc.data[1]!.id, p1.respuesta.id);
    });

    it('encuentra paciente por documento formateado con guiones y espacios', async () => {
      const res = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: '7777-12345-0101' },
      });

      assert.equal(res.data.length, 1);
      assert.equal(res.data[0]!.id, pacienteId);
    });

    it('exige coincidencia exacta de documento y prefijo de nombre descartando coincidencias infijas o parciales', async () => {
      // Coincidencia exacta de documento funciona
      const resDocExacto = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: '7777123450101' },
      });
      assert.equal(resDocExacto.data.length, 1);

      // Subcadena parcial de documento no coincide
      const resDocSubcadena = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: '12345' },
      });
      assert.equal(resDocSubcadena.data.length, 0);

      // Búsqueda por prefijo de nombre o apellido funciona
      const resPrefijo1 = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Gusta' },
      });
      assert.equal(resPrefijo1.data.length, 1);

      const resPrefijo2 = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Adol' },
      });
      assert.equal(resPrefijo2.data.length, 1);

      // Coincidencia infija (subcadena intermedia dentro de palabras) se descarta
      const resInfijo1 = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'tavo' },
      });
      assert.equal(resInfijo1.data.length, 0);

      const resInfijo2 = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'dolfo' },
      });
      assert.equal(resInfijo2.data.length, 0);
    });

    it('mapea metadatos de baja al esquema canónico ArchivoRegistrado con fecha_hora y actor_id', () => {
      const pacienteArchivado: Paciente = {
        id: uuidPublico(randomUUID()),
        codigoLegible: 'HOSP-ABC123',
        institucion: 'HOSPITAL_GENERAL',
        nombres: 'Paciente',
        apellidos: 'Archivado',
        fechaNacimiento: fechaCivil('1970-01-01'),
        sexo: 'MASCULINO',
        estado: 'ARCHIVADO',
        version: 2 as Version,
        fechaRegistro: instanteUtc(new Date().toISOString()),
        baja: {
          causa: 'FALLECIMIENTO',
          motivo: 'Causa médica confirmada',
          fecha: instanteUtc(new Date().toISOString()),
          actorId: uuidPublico(randomUUID()),
        },
      };

      const dto = mapearPacienteDto(pacienteArchivado);
      assert.ok(dto.baja);
      assert.equal(dto.baja.causa, 'FALLECIMIENTO');
      assert.equal(dto.baja.motivo, 'Causa médica confirmada');
      assert.equal(dto.baja.fecha_hora, pacienteArchivado.baja!.fecha);
      assert.equal(dto.baja.actor_id, pacienteArchivado.baja!.actorId);
      assert.equal('fecha' in (dto.baja as unknown as Record<string, unknown>), false);
      assert.equal('actorId' in (dto.baja as unknown as Record<string, unknown>), false);
    });

    it('asegura atomicidad completa en memoria: ante fallo durante procesamiento de UoW no deja mutaciones parciales', async () => {
      // Paciente semilla con número de pasaporte de 60 caracteres (permitido en lectura/legado)
      const numPasaporte60 = 'P'.repeat(60);
      const pacienteLegadoId = uuidPublico(randomUUID());
      const pacienteLegado: Paciente = {
        id: pacienteLegadoId,
        codigoLegible: 'HOSP-LEG001',
        institucion: 'HOSPITAL_GENERAL',
        nombres: 'Paciente',
        apellidos: 'Legado Pasaporte',
        fechaNacimiento: fechaCivil('1975-06-15'),
        sexo: 'MASCULINO',
        estado: 'ACTIVO',
        version: 1 as Version,
        fechaRegistro: instanteUtc(new Date().toISOString()),
        identificacion: {
          tipo: 'PASAPORTE',
          numero: numPasaporte60,
        },
      };

      repoHospital.guardar(pacienteLegado);

      // Intentar actualizar con identificacion: null (intentará liberar la identidad, fallando por límite de 40 chars)
      await assert.rejects(
        async () => {
          await actualizarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            id: pacienteLegadoId,
            cambios: {
              version_esperada: 1,
              identificacion: null,
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          return true;
        },
      );

      // Verificar que el paciente en memoria NO fue mutado parcialmente:
      // Conserva versión 1 y su identificación previa
      const pacienteDespues = await repoHospital.porId(pacienteLegadoId);
      assert.ok(pacienteDespues);
      assert.equal(pacienteDespues.version, 1);
      assert.equal(pacienteDespues.identificacion?.numero, numPasaporte60);

      // No existe revisión huérfana de versión 1
      const rev = (await repoHospital.crearLector().pacientes.porVersion(pacienteLegadoId, 1 as Version)) as Paciente | null;
      assert.equal(rev?.version, 1);
    });
  });
});
