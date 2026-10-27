import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { RegistrarPaciente } from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { ActualizarPaciente } from '../../src/aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import { ConsultarPaciente } from '../../src/aplicacion/casos-uso/pacientes/consultar-paciente.js';
import { BuscarPacientes } from '../../src/aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import { crearPoolPostgresql } from '../../src/adaptadores/salida/postgresql/crear-pool-postgresql.js';
import {
  crearRepositorioPacientesPostgresql,
  crearUnidadDeTrabajoPacientesPostgresql,
} from '../../src/adaptadores/salida/postgresql/pacientes/crear-bundle-pacientes-postgresql.js';
import { RepositorioPacientesPostgresql } from '../../src/adaptadores/salida/postgresql/pacientes/repositorio-pacientes-postgresql.js';
import { crearPoolMysql } from '../../src/adaptadores/salida/mysql/crear-pool-mysql.js';
import {
  crearRepositorioPacientesMysql,
  crearUnidadDeTrabajoPacientesMysql,
} from '../../src/adaptadores/salida/mysql/pacientes/crear-bundle-pacientes-mysql.js';
import { RepositorioPacientesMysql } from '../../src/adaptadores/salida/mysql/pacientes/repositorio-pacientes-mysql.js';
import { crearConsultaHistorialSql } from '../../src/adaptadores/salida/sql/consulta-historial-sql.js';
import { crearRepositorioCuentaPostgresql } from '../../src/adaptadores/salida/postgresql/repositorio-cuenta-postgresql.js';
import { crearRepositorioCuentaMysql } from '../../src/adaptadores/salida/mysql/repositorio-cuenta-mysql.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';

const puertoPg = process.env.PG_TEST_PORT;
const secretoPg = process.env.PG_TEST_SECRET_FILE;
const puertoMysql = process.env.MYSQL_TEST_PORT;
const secretoMysql = process.env.MYSQL_TEST_SECRET_FILE;

test('PostgreSQL: persistencia de pacientes, búsqueda, concurrencia optimista y archivo en hospital_general', {
  skip: !puertoPg || !secretoPg,
}, async (t) => {
  const pool = await crearPoolPostgresql({
    host: '127.0.0.1',
    puerto: Number(puertoPg),
    baseDatos: 'hospital_general',
    usuario: 'hospital_app',
    archivoContrasena: secretoPg as string,
  });
  t.after(async () => pool.cerrar());

  const uid = `medico-pg-${randomUUID()}`;
  const cuentaId = randomUUID();
  const nombre = `MEDICO_${randomUUID().slice(0, 8)}`;

  await pool.consultar(
    'INSERT INTO usuario (id_publico, nombre_usuario, auth_uid, institucion_id, estado) VALUES ($1, $2, $3, $4, $5)',
    [cuentaId, nombre, uid, 'HOSPITAL_GENERAL', 'ACTIVO'],
  );
  const profesional = await pool.consultar<{ id_personal: number | string }>(
    "INSERT INTO personal_medico (primer_nombre, primer_apellido, estado) VALUES ('DR', 'HOSPITAL', 'ACTIVO') RETURNING id_personal",
  );
  await pool.consultar('UPDATE usuario SET id_personal = $1 WHERE auth_uid = $2', [profesional.filas[0]?.id_personal, uid]);

  const rolPermisos = JSON.stringify(['pacientes.administrar', 'historial.archivar', 'historial.leer']);
  await pool.consultar("INSERT INTO rol (nombre, permisos) VALUES ('SECRETARIA', $1::jsonb) ON CONFLICT (nombre) DO UPDATE SET permisos = EXCLUDED.permisos", [rolPermisos]);
  const resUsuario = await pool.consultar<{ id_usuario: number | string }>(
    'SELECT id_usuario FROM usuario WHERE auth_uid = $1',
    [uid],
  );
  const idUsuarioInterno = resUsuario.filas[0]?.id_usuario;
  assert.ok(idUsuarioInterno !== undefined);

  await pool.consultar(
    'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT $1, id_rol FROM rol WHERE nombre = $2',
    [idUsuarioInterno, 'SECRETARIA'],
  );

  const cuentaDb = await crearRepositorioCuentaPostgresql(pool).porUid(uid);
  assert.ok(cuentaDb);

  const contexto = crearContextoAutenticado(
    { uid, institucion: 'HOSPITAL_GENERAL', emitidoEn: instanteUtc('2026-10-27T12:00:00Z') },
    cuentaDb,
    uuidPublico(randomUUID()),
  );

  const repoPg = new RepositorioPacientesPostgresql(pool);
  const bundle: BundleInstitucional = Object.freeze({
    institucion: 'HOSPITAL_GENERAL',
    estadoPersistencia: 'DISPONIBLE',
    pacientes: crearRepositorioPacientesPostgresql(pool),
    uow: crearUnidadDeTrabajoPacientesPostgresql(pool),
  });

  const registrar = new RegistrarPaciente(dependenciasComandoPorDefecto);
  const actualizar = new ActualizarPaciente(dependenciasComandoPorDefecto);
  const consultar = new ConsultarPaciente();
  const buscar = new BuscarPacientes();

  // 1. Alta de paciente hospitalario con CUI y contacto de emergencia
  const cuiValido = '2489123450101';
  const idempotencyKey = uuidPublico(randomUUID());

  const altaRes = await registrar.ejecutar({
    contexto,
    bundle,
    claveIdempotencia: idempotencyKey,
    entrada: {
      nombres: 'Carlos Alberto',
      apellidos: 'Gómez Morales',
      fecha_nacimiento: '1990-05-15',
      sexo: 'MASCULINO',
      identificacion: { tipo: 'CUI', numero: cuiValido },
      telefono: '50255551234',
      correo: 'carlos.gomez@ejemplo.com',
      direccion: 'Avenida Elena 12-34, Zona 1, Ciudad de Guatemala',
      grupo_sanguineo: 'O+',
      contacto_emergencia: {
        nombres: 'María Antonieta',
        apellidos: 'Morales López',
        parentesco: 'MADRE',
        telefono: '50255554321',
      },
    },
  });

  const pacienteCreado = altaRes.respuesta;
  const pacienteId = uuidPublico(pacienteCreado.id);
  assert.ok(pacienteId);
  assert.equal(pacienteCreado.nombres, 'Carlos Alberto');
  assert.equal(pacienteCreado.apellidos, 'Gómez Morales');
  assert.equal(pacienteCreado.grupo_sanguineo, 'O+');
  assert.equal(pacienteCreado.version, 1);
  assert.equal(pacienteCreado.estado, 'ACTIVO');

  // 2. Repetición idempotente
  const repeticion = await registrar.ejecutar({
    contexto,
    bundle,
    claveIdempotencia: idempotencyKey,
    entrada: {
      nombres: 'Carlos Alberto',
      apellidos: 'Gómez Morales',
      fecha_nacimiento: '1990-05-15',
      sexo: 'MASCULINO',
      identificacion: { tipo: 'CUI', numero: cuiValido },
      telefono: '50255551234',
      correo: 'carlos.gomez@ejemplo.com',
      direccion: 'Avenida Elena 12-34, Zona 1, Ciudad de Guatemala',
      grupo_sanguineo: 'O+',
      contacto_emergencia: {
        nombres: 'María Antonieta',
        apellidos: 'Morales López',
        parentesco: 'MADRE',
        telefono: '50255554321',
      },
    },
  });
  assert.equal(repeticion.respuesta.id, pacienteId);
  assert.equal(repeticion.correlacionOriginal, altaRes.correlacionOriginal);

  // 3. Clave de idempotencia reutilizada con distinta carga útil
  await assert.rejects(
    () => registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: idempotencyKey,
      entrada: {
        nombres: 'Otro Nombre',
        apellidos: 'Gómez Morales',
        fecha_nacimiento: '1990-05-15',
        sexo: 'MASCULINO',
        identificacion: { tipo: 'CUI', numero: cuiValido },
      },
    }),
    (err: ErrorDominio) => err.codigo === 'CLAVE_REUTILIZADA',
  );

  // 4. Conflicto de identidad duplicada (mismo CUI con otra clave)
  await assert.rejects(
    () => registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(randomUUID()),
      entrada: {
        nombres: 'Hermano Gemelo',
        apellidos: 'Gómez Morales',
        fecha_nacimiento: '1990-05-15',
        sexo: 'MASCULINO',
        identificacion: { tipo: 'CUI', numero: cuiValido },
      },
    }),
    (err: ErrorDominio) => err.codigo === 'PACIENTE_DUPLICADO',
  );

  // 5. Consultar por ID y por versión
  const consultado = await consultar.ejecutar({ contexto, bundle, id: pacienteId });
  assert.equal(consultado.id, pacienteId);
  assert.equal(consultado.nombres, 'Carlos Alberto');
  assert.equal(consultado.contacto_emergencia?.nombres, 'María Antonieta');
  assert.equal(consultado.contacto_emergencia?.telefono, '50255554321');

  const titular = await repoPg.titularIdentidad({ tipo: 'CUI', numero: cuiValido });
  assert.equal(titular, pacienteId);

  const version1 = await repoPg.porVersion(pacienteId, versionPositiva(1));
  assert.ok(version1);
  assert.equal(version1.version, 1);

  // 6. Búsqueda por CUI exacto y por prefijo de nombre con acentos
  const resBusquedaDoc = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: cuiValido, limite: 10, orden: 'ASC' },
  });
  assert.equal(resBusquedaDoc.data.length, 1);
  assert.equal(resBusquedaDoc.data[0]?.id, pacienteId);

  // Registro de segundo paciente con el mismo apellido para verificar paginación con precisión de microsegundos
  const cuiValido2 = '2489123450102';
  const alta2 = await registrar.ejecutar({
    contexto,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    entrada: {
      nombres: 'Ana Sofía',
      apellidos: 'Gómez Castillo',
      fecha_nacimiento: '1995-08-20',
      sexo: 'FEMENINO',
      identificacion: { tipo: 'CUI', numero: cuiValido2 },
      telefono: '50255559988',
    },
  });
  const paciente2Id = uuidPublico(alta2.respuesta.id);

  // Escape de comodines SQL: búsqueda por '%' no debe coincidir con pacientes
  const resBusquedaComodin = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: '%', limite: 10, orden: 'ASC' },
  });
  assert.equal(resBusquedaComodin.data.length, 0, 'la búsqueda por % escapado no debe devolver registros');

  // Búsqueda por prefijo sin acento "Gomez" debe encontrar ambos pacientes
  const resBusquedaPrefijo = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: 'Gomez', limite: 10, orden: 'ASC' },
  });
  assert.ok(resBusquedaPrefijo.data.some((p) => p.id === pacienteId));
  assert.ok(resBusquedaPrefijo.data.some((p) => p.id === paciente2Id));

  // Paginación con cursor y microsegundos: primera página con límite 1
  const pag1 = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: 'Gomez', limite: 1, orden: 'ASC' },
  });
  assert.equal(pag1.data.length, 1);
  assert.ok(pag1.meta.siguiente_cursor);

  // Segunda página usando el cursor generado
  const pag2 = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: 'Gomez', limite: 1, orden: 'ASC', cursor: pag1.meta.siguiente_cursor },
  });
  assert.equal(pag2.data.length, 1);
  assert.notEqual(pag2.data[0]?.id, pag1.data[0]?.id, 'la segunda página debe avanzar al siguiente paciente');

  // Rechazo de cursor alterado / sin firma válida
  await assert.rejects(
    () => buscar.ejecutar({
      contexto,
      bundle,
      entrada: { q: 'Gomez', limite: 1, orden: 'ASC', cursor: pag1.meta.siguiente_cursor + '_corrupto' },
    }),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );

  // 7. Actualización y concurrencia optimista
  const modificado = await actualizar.ejecutar({
    contexto,
    bundle,
    id: pacienteId,
    claveIdempotencia: uuidPublico(randomUUID()),
    cambios: {
      version_esperada: 1,
      telefono: '50259998877',
      contacto_emergencia: {
        nombres: 'María',
        apellidos: 'Morales',
        parentesco: 'MADRE',
        telefono: '50259991122',
      },
    },
  });
  assert.equal(modificado.respuesta.version, 2);
  assert.equal(modificado.respuesta.telefono, '50259998877');

  // Intento de actualización con versión desactualizada (stale version 1)
  await assert.rejects(
    () => actualizar.ejecutar({
      contexto,
      bundle,
      id: pacienteId,
      claveIdempotencia: uuidPublico(randomUUID()),
      cambios: {
        version_esperada: 1,
        telefono: '50251110000',
      },
    }),
    (err: ErrorDominio) => err.codigo === 'VERSION_DESACTUALIZADA',
  );

  // 8. Archivo del paciente mediante UoW
  await bundle.uow?.ejecutar(
    contexto,
    {
      id: uuidPublico(randomUUID()),
      caso: 'ARCHIVAR_PACIENTE',
      claveIdempotencia: uuidPublico(randomUUID()),
      hashEntrada: 'test-hash-archivo-pg',
      instante: instanteUtc('2026-10-27T12:30:00Z'),
      ids: { recurso_id: pacienteId },
    },
    async () => ({
      tipo: 'CONFIRMAR',
      resultado: {
        httpStatus: 200,
        respuesta: { estado: 'ARCHIVADO' },
        correlacionOriginal: uuidPublico(randomUUID()),
      },
      revisiones: [],
      cambios: [
        {
          agregado: 'historiales',
          tipo: 'MODIFICAR',
          recursoId: pacienteId,
          versionAnterior: versionPositiva(1),
          nuevoEstado: {
            causa: 'TRASLADO',
            motivo: 'Traslado a hospital departamental de Quetzaltenango',
            fecha: '2026-10-27T12:30:00Z',
            actorId: contexto.cuenta.id,
          },
        },
      ],
      auditoria: [
        {
          id: uuidPublico(randomUUID()),
          actorId: contexto.cuenta.id,
          caso: 'ARCHIVAR_PACIENTE',
          recursoId: pacienteId,
          fechaHora: instanteUtc('2026-10-27T12:30:00Z'),
          correlacion: uuidPublico(randomUUID()),
        },
      ],
    }),
  );

  const consultadoArchivado = await repoPg.porId(pacienteId);
  assert.equal(consultadoArchivado?.estado, 'ARCHIVADO');
  assert.equal(consultadoArchivado?.baja?.causa, 'TRASLADO');
  assert.ok(consultadoArchivado?.baja?.motivo);

  // 9. Historial de auditoría en PostgreSQL
  const consultaHistorial = crearConsultaHistorialSql(pool, 'postgresql');
  const paginaEventos = await consultaHistorial.eventos(pacienteId, { limite: 20, orden: 'ASC' });
  assert.ok(paginaEventos.elementos.length >= 2, 'debe registrar eventos de auditoría para registro y modificaciones');
});

test('MySQL: persistencia de pacientes, paciente sin documento, concurrencia optimista y archivo en clinica_odontologica', {
  skip: !puertoMysql || !secretoMysql,
}, async (t) => {
  const pool = await crearPoolMysql({
    host: '127.0.0.1',
    puerto: Number(puertoMysql),
    baseDatos: 'clinica_odontologica',
    usuario: 'clinica_app',
    archivoContrasena: secretoMysql as string,
  });
  t.after(async () => pool.cerrar());

  const uid = `odontologo-my-${randomUUID()}`;
  const cuentaId = randomUUID();
  const nombre = `ODONTO_${randomUUID().slice(0, 8)}`;

  await pool.consultar(
    'INSERT INTO usuario (id_publico, nombre_usuario, auth_uid, institucion_id, estado) VALUES (?, ?, ?, ?, ?)',
    [cuentaId, nombre, uid, 'CLINICA_ODONTOLOGICA', 'ACTIVO'],
  );
  const colegiado = `COL-${randomUUID().slice(0, 8)}`;
  await pool.consultar(
    "INSERT INTO odontologo (nombres, apellidos, colegiado) VALUES ('DRA', 'DENTAL', ?)",
    [colegiado],
  );
  const profesional = await pool.consultar<{ id_odontologo: number | string }>(
    'SELECT id_odontologo FROM odontologo WHERE colegiado = ?',
    [colegiado],
  );
  await pool.consultar('UPDATE usuario SET id_odontologo = ? WHERE auth_uid = ?', [profesional.filas[0]?.id_odontologo, uid]);

  const rolPermisos = JSON.stringify(['pacientes.administrar', 'historial.archivar', 'historial.leer']);
  await pool.consultar("INSERT INTO rol (nombre, permisos) VALUES ('ODONTOLOGO', ?) ON DUPLICATE KEY UPDATE permisos = VALUES(permisos)", [rolPermisos]);
  const resUsuario = await pool.consultar<{ id_usuario: number | string }>(
    'SELECT id_usuario FROM usuario WHERE auth_uid = ?',
    [uid],
  );
  const idUsuarioInterno = resUsuario.filas[0]?.id_usuario;
  assert.ok(idUsuarioInterno !== undefined);

  await pool.consultar(
    'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE nombre = ?',
    [idUsuarioInterno, 'ODONTOLOGO'],
  );

  const cuentaDb = await crearRepositorioCuentaMysql(pool).porUid(uid);
  assert.ok(cuentaDb);

  const contexto = crearContextoAutenticado(
    { uid, institucion: 'CLINICA_ODONTOLOGICA', emitidoEn: instanteUtc('2026-10-27T12:00:00Z') },
    cuentaDb,
    uuidPublico(randomUUID()),
  );

  const repoMysql = new RepositorioPacientesMysql(pool);
  const bundle: BundleInstitucional = Object.freeze({
    institucion: 'CLINICA_ODONTOLOGICA',
    estadoPersistencia: 'DISPONIBLE',
    pacientes: crearRepositorioPacientesMysql(pool),
    uow: crearUnidadDeTrabajoPacientesMysql(pool),
  });

  const registrar = new RegistrarPaciente(dependenciasComandoPorDefecto);
  const actualizar = new ActualizarPaciente(dependenciasComandoPorDefecto);
  const consultar = new ConsultarPaciente();
  const buscar = new BuscarPacientes();

  // 1. Alta de paciente dental sin documento de identificación (con sexo y dirección demográfica)
  const altaSinDoc = await registrar.ejecutar({
    contexto,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    entrada: {
      nombres: 'Estela Beatriz',
      apellidos: 'Ramírez Solís',
      fecha_nacimiento: '1985-11-20',
      sexo: 'FEMENINO',
      telefono: '50244441111',
      correo: 'estela.ramirez@ejemplo.com',
      direccion: '5ta Avenida 12-45 Zona 1, Ciudad',
    },
  });

  const pacienteSinDoc = altaSinDoc.respuesta;
  const pacienteSinDocId = uuidPublico(pacienteSinDoc.id);
  assert.ok(pacienteSinDocId);
  assert.equal(pacienteSinDoc.identificacion, undefined);
  assert.equal(pacienteSinDoc.estado, 'ACTIVO');
  assert.equal(pacienteSinDoc.sexo, 'FEMENINO');
  assert.equal(pacienteSinDoc.direccion, '5ta Avenida 12-45 Zona 1, Ciudad');

  // Verificar en base de datos: NO debe existir registro en identidades_paciente
  const resIdent = await pool.consultar(
    'SELECT ip.clave FROM identidades_paciente ip JOIN paciente p ON ip.id_paciente = p.id_paciente WHERE p.id_publico = ?',
    [pacienteSinDocId],
  );
  assert.equal(resIdent.filas.length, 0, 'paciente sin documento no debe tener fila en identidades_paciente');

  // Verificar persistencia de sexo y dirección directamente en la tabla paciente de MySQL
  const filaDbInicial = await pool.consultar<{ sexo: string; direccion: string }>(
    'SELECT sexo, direccion FROM paciente WHERE id_publico = ?',
    [pacienteSinDocId],
  );
  assert.equal(filaDbInicial.filas[0]?.sexo, 'FEMENINO');
  assert.equal(filaDbInicial.filas[0]?.direccion, '5ta Avenida 12-45 Zona 1, Ciudad');

  // 2. Alta de paciente dental CON pasaporte
  const pasaporteNum = `P${randomUUID().slice(0, 8).toUpperCase()}`;
  const altaConDoc = await registrar.ejecutar({
    contexto,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    entrada: {
      nombres: 'John Michael',
      apellidos: 'Smith',
      fecha_nacimiento: '1978-03-12',
      sexo: 'MASCULINO',
      identificacion: { tipo: 'PASAPORTE', numero: pasaporteNum },
      telefono: '50244442222',
    },
  });

  const pacienteConDoc = altaConDoc.respuesta;
  const pacienteConDocId = uuidPublico(pacienteConDoc.id);
  assert.equal(pacienteConDoc.identificacion?.tipo, 'PASAPORTE');

  const titularPasaporte = await repoMysql.titularIdentidad({ tipo: 'PASAPORTE', numero: pasaporteNum });
  assert.equal(titularPasaporte, pacienteConDocId);

  // Conflicto de pasaporte duplicado
  await assert.rejects(
    () => registrar.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(randomUUID()),
      entrada: {
        nombres: 'Otro Turista',
        apellidos: 'Smith',
        fecha_nacimiento: '1980-01-01',
        sexo: 'MASCULINO',
        identificacion: { tipo: 'PASAPORTE', numero: pasaporteNum },
      },
    }),
    (err: ErrorDominio) => err.codigo === 'PACIENTE_DUPLICADO',
  );

  // 3. Búsqueda y paginación en MySQL
  const consultadoSinDoc = await consultar.ejecutar({ contexto, bundle, id: pacienteSinDocId });
  assert.equal(consultadoSinDoc.id, pacienteSinDocId);
  assert.equal(consultadoSinDoc.nombres, 'Estela Beatriz');
  assert.equal(consultadoSinDoc.sexo, 'FEMENINO');
  assert.equal(consultadoSinDoc.direccion, '5ta Avenida 12-45 Zona 1, Ciudad');

  // Escape de comodines en MySQL: búsqueda por '%' no debe coincidir con pacientes
  const resBusquedaComodinMy = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: '%', limite: 10, orden: 'ASC' },
  });
  assert.equal(resBusquedaComodinMy.data.length, 0, 'la búsqueda por % en MySQL no debe coincidir con pacientes');

  const resBusqueda = await buscar.ejecutar({
    contexto,
    bundle,
    entrada: { q: 'Estela', limite: 10, orden: 'ASC' },
  });
  assert.ok(resBusqueda.data.some((p) => p.id === pacienteSinDocId));

  // 4. Modificación y concurrencia optimista
  const modificado = await actualizar.ejecutar({
    contexto,
    bundle,
    id: pacienteSinDocId,
    claveIdempotencia: uuidPublico(randomUUID()),
    cambios: {
      version_esperada: 1,
      telefono: '50244449999',
      direccion: 'Nueva Dirección Modificada 7ma Calle 3-21',
    },
  });
  assert.equal(modificado.respuesta.version, 2);
  assert.equal(modificado.respuesta.telefono, '50244449999');
  assert.equal(modificado.respuesta.direccion, 'Nueva Dirección Modificada 7ma Calle 3-21');

  const consultadoModificado = await repoMysql.porId(pacienteSinDocId);
  assert.equal(consultadoModificado?.direccion, 'Nueva Dirección Modificada 7ma Calle 3-21');

  const filaDbModificada = await pool.consultar<{ direccion: string }>(
    'SELECT direccion FROM paciente WHERE id_publico = ?',
    [pacienteSinDocId],
  );
  assert.equal(filaDbModificada.filas[0]?.direccion, 'Nueva Dirección Modificada 7ma Calle 3-21');

  await assert.rejects(
    () => actualizar.ejecutar({
      contexto,
      bundle,
      id: pacienteSinDocId,
      claveIdempotencia: uuidPublico(randomUUID()),
      cambios: {
        version_esperada: 1,
        telefono: '50244440000',
      },
    }),
    (err: ErrorDominio) => err.codigo === 'VERSION_DESACTUALIZADA',
  );

  // 5. Archivo del paciente dental mediante UoW
  await bundle.uow?.ejecutar(
    contexto,
    {
      id: uuidPublico(randomUUID()),
      caso: 'ARCHIVAR_PACIENTE',
      claveIdempotencia: uuidPublico(randomUUID()),
      hashEntrada: 'test-hash-archivo-mysql',
      instante: instanteUtc('2026-10-27T12:30:00Z'),
      ids: { recurso_id: pacienteSinDocId },
    },
    async () => ({
      tipo: 'CONFIRMAR',
      resultado: {
        httpStatus: 200,
        respuesta: { estado: 'ARCHIVADO' },
        correlacionOriginal: uuidPublico(randomUUID()),
      },
      revisiones: [],
      cambios: [
        {
          agregado: 'historiales',
          tipo: 'MODIFICAR',
          recursoId: pacienteSinDocId,
          versionAnterior: versionPositiva(1),
          nuevoEstado: {
            causa: 'FALLECIMIENTO',
            motivo: 'Certificado de defunción presentado por familiar',
            fecha: '2026-10-27T12:30:00Z',
            actorId: contexto.cuenta.id,
          },
        },
      ],
      auditoria: [
        {
          id: uuidPublico(randomUUID()),
          actorId: contexto.cuenta.id,
          caso: 'ARCHIVAR_PACIENTE',
          recursoId: pacienteSinDocId,
          fechaHora: instanteUtc('2026-10-27T12:30:00Z'),
          correlacion: uuidPublico(randomUUID()),
        },
      ],
    }),
  );

  const consultadoArchivado = await repoMysql.porId(pacienteSinDocId);
  assert.equal(consultadoArchivado?.estado, 'ARCHIVADO');
  assert.equal(consultadoArchivado?.baja?.causa, 'FALLECIMIENTO');

  // En MySQL el paciente debe figurar con estado 'INACTIVO' y el historial 'ARCHIVADO'
  const resDb = await pool.consultar<{ estado: string; hist_estado: string }>(
    'SELECT p.estado, h.estado AS hist_estado FROM paciente p JOIN historial_clinico h ON p.id_paciente = h.id_paciente WHERE p.id_publico = ?',
    [pacienteSinDocId],
  );
  assert.equal(resDb.filas[0]?.estado, 'INACTIVO');
  assert.equal(resDb.filas[0]?.hist_estado, 'ARCHIVADO');
});
