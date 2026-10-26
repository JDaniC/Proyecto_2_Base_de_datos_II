import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { LectorTransaccional } from '../../src/aplicacion/puertos/nucleo.js';
import type { PlanConfirmacion, ComandoEstable } from '../../src/aplicacion/puertos/nucleo.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { crearPoolMysql } from '../../src/adaptadores/salida/mysql/crear-pool-mysql.js';
import { crearRepositorioCuentaMysql } from '../../src/adaptadores/salida/mysql/repositorio-cuenta-mysql.js';
import { crearPoolPostgresql } from '../../src/adaptadores/salida/postgresql/crear-pool-postgresql.js';
import { crearRepositorioCuentaPostgresql } from '../../src/adaptadores/salida/postgresql/repositorio-cuenta-postgresql.js';
import {
  crearRepositorioCuentaInstitucionalPostgresql,
  crearRepositorioCuentaInstitucionalMysql,
} from '../../src/adaptadores/salida/identidad/repositorios-cuenta-sql.js';
import type { PoolSql } from '../../src/adaptadores/salida/sql/tipos-sql.js';
import { crearUnidadDeTrabajoSql } from '../../src/adaptadores/salida/sql/unidad-de-trabajo-sql.js';

const puertoPg = process.env.PG_TEST_PORT;
const secretoPg = process.env.PG_TEST_SECRET_FILE;
const puertoMysql = process.env.MYSQL_TEST_PORT;
const secretoMysql = process.env.MYSQL_TEST_SECRET_FILE;

test('PostgreSQL: mapper, atomicidad, repetición idempotente y pool recuperado', {
  skip: !puertoPg || !secretoPg,
}, async (t) => {
  const pool = await crearPoolPostgresql({
    host: '127.0.0.1', puerto: Number(puertoPg), baseDatos: 'hospital_general',
    usuario: 'hospital_app', archivoContrasena: secretoPg as string,
  });
  t.after(async () => pool.cerrar());
  await verificarFlujos(pool, 'postgresql', 'HOSPITAL_GENERAL', crearRepositorioCuentaPostgresql, crearRepositorioCuentaInstitucionalPostgresql);
});

test('MySQL: mapper, atomicidad, repetición idempotente y pool recuperado', {
  skip: !puertoMysql || !secretoMysql,
}, async (t) => {
  const pool = await crearPoolMysql({
    host: '127.0.0.1', puerto: Number(puertoMysql), baseDatos: 'clinica_odontologica',
    usuario: 'clinica_app', archivoContrasena: secretoMysql as string,
  });
  t.after(async () => pool.cerrar());
  await verificarFlujos(pool, 'mysql', 'CLINICA_ODONTOLOGICA', crearRepositorioCuentaMysql, crearRepositorioCuentaInstitucionalMysql);
});

async function verificarFlujos(
  pool: PoolSql,
  dialecto: 'postgresql' | 'mysql',
  institucion: 'HOSPITAL_GENERAL' | 'CLINICA_ODONTOLOGICA',
  crearRepositorioCuenta: typeof crearRepositorioCuentaPostgresql,
  crearRepositorioInstitucional: typeof crearRepositorioCuentaInstitucionalPostgresql,
): Promise<void> {
  const uid = `test-${randomUUID()}`;
  const cuentaId = randomUUID();
  const nombre = `UOW_${randomUUID()}`;
  const rolNombre = 'MEDICO';
  if (dialecto === 'postgresql') {
    await pool.consultar(
      'INSERT INTO usuario (id_publico, nombre_usuario, auth_uid, institucion_id, estado) VALUES ($1, $2, $3, $4, $5)',
      [cuentaId, nombre, uid, institucion, 'PENDIENTE'],
    );
    const profesional = await pool.consultar<{ id_personal: number | string }>(
      "INSERT INTO personal_medico (primer_nombre, primer_apellido, estado) VALUES ('TEST', 'UOW', 'ACTIVO') RETURNING id_personal",
    );
    await pool.consultar('UPDATE usuario SET id_personal = $1 WHERE auth_uid = $2', [profesional.filas[0]?.id_personal, uid]);
  } else {
    await pool.consultar(
      'INSERT INTO usuario (id_publico, nombre_usuario, auth_uid, institucion_id, estado) VALUES (?, ?, ?, ?, ?)',
      [cuentaId, nombre, uid, institucion, 'PENDIENTE'],
    );
    const colegiado = `TEST-${randomUUID()}`;
    await pool.consultar(
      "INSERT INTO odontologo (nombres, apellidos, colegiado) VALUES ('TEST', 'UOW', ?)",
      [colegiado],
    );
    const profesional = await pool.consultar<{ id_odontologo: number | string }>(
      'SELECT id_odontologo FROM odontologo WHERE colegiado = ?', [colegiado],
    );
    await pool.consultar('UPDATE usuario SET id_odontologo = ? WHERE auth_uid = ?', [profesional.filas[0]?.id_odontologo, uid]);
  }
  const actor = await pool.consultar<{ id_usuario: number | string }>(
    dialecto === 'postgresql' ? 'SELECT id_usuario FROM usuario WHERE auth_uid = $1' : 'SELECT id_usuario FROM usuario WHERE auth_uid = ?',
    [uid],
  );
  const idActor = actor.filas[0]?.id_usuario;
  assert.ok(idActor !== undefined);
  const rolPermisos = JSON.stringify(['pacientes.administrar']);
  if (dialecto === 'postgresql') {
    await pool.consultar("INSERT INTO rol (nombre, permisos) VALUES ('MEDICO', $1::jsonb)", [rolPermisos]);
    await pool.consultar(
      'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT $1, id_rol FROM rol WHERE nombre = $2',
      [idActor, rolNombre],
    );
  } else {
    await pool.consultar("INSERT INTO rol (nombre, permisos) VALUES ('MEDICO', ?)", [rolPermisos]);
    await pool.consultar(
      'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE nombre = ?',
      [idActor, rolNombre],
    );
  }

  const cuentasAdmin = crearRepositorioInstitucional(pool);
  const cuentaPendiente = await cuentasAdmin.porUid(uid);
  assert.ok(cuentaPendiente);
  assert.equal(cuentaPendiente.estado, 'PENDIENTE');
  assert.equal(await cuentasAdmin.activarPendiente?.(uid, cuentaPendiente.version), true);
  const activacionesConcurrentes = await Promise.all([
    cuentasAdmin.activarPendiente?.(uid, cuentaPendiente.version),
    cuentasAdmin.activarPendiente?.(uid, cuentaPendiente.version),
  ]);
  assert.deepEqual(activacionesConcurrentes, [true, true]);
  const cuenta = await cuentasAdmin.porUid(uid);
  assert.ok(cuenta);
  assert.equal(cuenta.id, cuentaId);
  assert.equal(cuenta.estado, 'ACTIVA');
  assert.equal(cuenta.version, versionPositiva(2));
  assert.equal('actor_id' in cuenta, false);
  assert.deepEqual(cuenta.roles, ['MEDICO']);
  assert.deepEqual(cuenta.permisos, ['pacientes.administrar']);
  assert.deepEqual(cuenta.profesional, { id: cuenta.profesional?.id, activo: true });

  const contexto = crearContextoAutenticado(
    { uid, institucion, emitidoEn: instanteUtc('2026-10-25T18:00:00Z') }, cuenta, uuidPublico(randomUUID()),
  );
  const clave = uuidPublico(randomUUID());
  const comando = crearComando(clave);
  const recurso = uuidPublico(randomUUID());
  const cambio = {
    agregado: 'rol', tipo: 'CREAR', recursoId: recurso, versionAnterior: null,
    nuevoEstado: { nombre: recurso },
  } as const;
  const revision = {
    id: uuidPublico(randomUUID()), agregado: 'rol', recursoId: recurso,
    versionAnterior: versionPositiva(1), snapshotAnterior: { estado: 'ANTERIOR' },
  } as const;
  const eventoId = uuidPublico(randomUUID());
  const auditoria = {
    id: eventoId, actorId: contexto.cuenta.id, caso: comando.caso,
    recursoId: recurso, fechaHora: comando.instante, correlacion: contexto.correlacion,
    motivo: 'causa sintetica de auditoria',
  } as const;

  const unidad = crearUnidadDeTrabajoSql({
    dialecto, pool,
    crearLector: (executor) => ({ cuentas: crearRepositorioCuenta(executor) }) as LectorTransaccional,
    aplicarCambios: async (executor, _ctx, _cmd, cambios) => {
      const [primerCambio] = cambios;
      assert.ok(primerCambio);
      const marcador = dialecto === 'postgresql' ? '$1' : '?';
      const revisionPrevias = await executor.consultar<{ total: number | string }>(
        `SELECT COUNT(*) AS total FROM revisiones WHERE recurso_id = ${marcador}`,
        [primerCambio.recursoId],
      );
      assert.equal(Number(revisionPrevias.filas[0]?.total ?? 0), 1, 'la revisión anterior debe existir antes de aplicar el cambio');
      const nombreRol = primerCambio.recursoId;
      if (dialecto === 'postgresql') {
        await executor.consultar("INSERT INTO rol (nombre, descripcion, permisos) VALUES ($1, 'TEST', '[]'::jsonb)", [nombreRol]);
      } else {
        await executor.consultar("INSERT INTO rol (nombre, descripcion, permisos) VALUES (?, 'TEST', '[]')", [nombreRol]);
      }
    },
  });

  const plan = (accion: string, eventoAccion = accion): PlanConfirmacion<{ id: string }> => ({
    tipo: 'CONFIRMAR', cambios: [cambio], revisiones: [revision],
    auditoria: [{ ...auditoria, caso: eventoAccion }],
    resultado: { httpStatus: 201, respuesta: { id: recurso }, correlacionOriginal: contexto.correlacion },
  });
  const comandoFallo = { ...comando, id: uuidPublico(randomUUID()), claveIdempotencia: uuidPublico(randomUUID()) };
  await assert.rejects(
    unidad.ejecutar(contexto, comandoFallo, async () => plan(comandoFallo.caso, '')),
    (error: unknown) => typeof error === 'object' && error !== null && 'codigo' in error && error.codigo === 'ESTADO_INVALIDO',
  );
  assert.equal(await contar(pool, dialecto, 'rol', 'nombre', recurso), 0);
  assert.equal(await contar(pool, dialecto, 'revisiones', 'recurso_id', recurso), 0);
  assert.equal(await contar(pool, dialecto, 'auditoria', 'id_publico', eventoId), 0);
  assert.equal(await contar(pool, dialecto, 'operaciones', 'clave', comandoFallo.claveIdempotencia), 0);

  let planes = 0;
  const ejecutar = () => unidad.ejecutar(contexto, comando, async () => {
    planes += 1;
    return plan(comando.caso);
  });
  const resultados = await Promise.all([ejecutar(), ejecutar()]);
  assert.equal(resultados.length, 2);
  assert.ok(resultados.every((resultado) => resultado.respuesta.id === recurso));
  assert.ok(planes >= 1 && planes <= 2);
  assert.equal(await contar(pool, dialecto, 'rol', 'nombre', recurso), 1);
  assert.equal(await contar(pool, dialecto, 'revisiones', 'recurso_id', recurso), 1);
  assert.equal(await contar(pool, dialecto, 'auditoria', 'id_publico', eventoId), 1);
  assert.equal(await contar(pool, dialecto, 'operaciones', 'clave', clave), 1);
  const timestampGuardado = await pool.consultar<{ fecha_utc: string }>(
    dialecto === 'postgresql'
      ? "SELECT to_char(fecha_hora, 'YYYY-MM-DD HH24:MI:SS.MS') AS fecha_utc FROM operaciones WHERE clave = $1"
      : "SELECT DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s.%f') AS fecha_utc FROM operaciones WHERE clave = ?",
    [clave],
  );
  assert.equal(timestampGuardado.filas[0]?.fecha_utc,
    dialecto === 'postgresql' ? '2026-10-25 18:00:00.000' : '2026-10-25 18:00:00.000000');
  const detalleAuditoria = await pool.consultar<{ detalle: unknown }>(
    dialecto === 'postgresql' ? 'SELECT detalle FROM auditoria WHERE id_publico = $1' : 'SELECT detalle FROM auditoria WHERE id_publico = ?',
    [eventoId],
  );
  const detalle = typeof detalleAuditoria.filas[0]?.detalle === 'string'
    ? JSON.parse(detalleAuditoria.filas[0].detalle as string) as Record<string, unknown>
    : detalleAuditoria.filas[0]?.detalle as Record<string, unknown> | undefined;
  assert.equal(detalle?.correlacion, contexto.correlacion);
  assert.equal(detalle?.motivo, 'causa sintetica de auditoria');
  await assert.rejects(pool.consultar(
    dialecto === 'postgresql'
      ? 'CREATE TABLE uow_ddl_no_debe_crearse (id integer)'
      : 'CREATE TABLE uow_ddl_no_debe_crearse (id integer)',
  ));
  await assert.rejects(pool.consultar('SELECT version, huella FROM modelo_database WHERE id = 1'));
  await assert.rejects(pool.consultar(
    dialecto === 'postgresql'
      ? 'DELETE FROM auditoria WHERE id_publico = $1'
      : 'DELETE FROM auditoria WHERE id_publico = ?',
    [eventoId],
  ));
  assert.equal(await contar(pool, dialecto, 'auditoria', 'id_publico', eventoId), 1);

  const unidadFalloSql = (aplicarCambios: Parameters<typeof crearUnidadDeTrabajoSql>[0]['aplicarCambios']) =>
    crearUnidadDeTrabajoSql({ dialecto, pool, crearLector: () => ({}) as LectorTransaccional, aplicarCambios });
  const planSinCambios: PlanConfirmacion<null> = {
    tipo: 'CONFIRMAR', cambios: [], revisiones: [], auditoria: [],
    resultado: { httpStatus: 200, respuesta: null, correlacionOriginal: contexto.correlacion },
  };
  const claveFk = uuidPublico(randomUUID());
  const comandoFk = crearComando(claveFk, 'TEST_FK_SQL');
  await assert.rejects(
    unidadFalloSql(async (executor) => {
      await executor.consultar(
        dialecto === 'postgresql'
          ? 'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2)'
          : 'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)',
        [idActor, 987654321],
      );
    }).ejecutar(contexto, comandoFk, async () => planSinCambios),
    (error: unknown) => typeof error === 'object' && error !== null && 'codigo' in error && error.codigo === 'REFERENCIA_INCOMPATIBLE',
  );
  assert.equal(await contar(pool, dialecto, 'operaciones', 'clave', claveFk), 0);

  const clavePermiso = uuidPublico(randomUUID());
  const comandoPermiso = crearComando(clavePermiso, 'TEST_PERMISO_SQL');
  await assert.rejects(
    unidadFalloSql(async (executor) => {
      await executor.consultar(
        dialecto === 'postgresql'
          ? 'DELETE FROM auditoria WHERE id_publico = $1'
          : 'DELETE FROM auditoria WHERE id_publico = ?',
        [eventoId],
      );
    }).ejecutar(contexto, comandoPermiso, async () => planSinCambios),
    (error: unknown) => typeof error === 'object' && error !== null && 'codigo' in error && error.codigo === 'SIN_PERMISO',
  );
  assert.equal(await contar(pool, dialecto, 'auditoria', 'id_publico', eventoId), 1);
  assert.equal(await contar(pool, dialecto, 'operaciones', 'clave', clavePermiso), 0);

  if (dialecto === 'mysql') await verificarSignalTriggerMysql(pool, contexto, idActor);

  const reutilizada = { ...comando, hashEntrada: 'f'.repeat(64) };
  await assert.rejects(
    unidad.ejecutar(contexto, reutilizada, async () => plan(comando.caso)),
    (error: unknown) => typeof error === 'object' && error !== null && 'codigo' in error && error.codigo === 'CLAVE_REUTILIZADA',
  );

  await verificarReintentoDeadlock(pool, dialecto, contexto);
}

async function verificarSignalTriggerMysql(
  pool: PoolSql,
  contexto: ReturnType<typeof crearContextoAutenticado>,
  idActor: number | string,
): Promise<void> {
  const marca = randomUUID();
  await pool.consultar('INSERT INTO paciente (nombres, apellidos, correo) VALUES (?, ?, ?)', ['TEST', 'TRIGGER', `trigger-${marca}@example.invalid`]);
  const pacientes = await pool.consultar<{ id_paciente: number | string }>('SELECT id_paciente FROM paciente WHERE correo = ?', [`trigger-${marca}@example.invalid`]);
  const idPaciente = pacientes.filas[0]?.id_paciente;
  assert.ok(idPaciente !== undefined);
  const apellidosSecretaria = `TRIGGER-${marca}`;
  await pool.consultar("INSERT INTO secretaria (nombres, apellidos) VALUES ('TEST', ?)", [apellidosSecretaria]);
  const secretarias = await pool.consultar<{ id_secretaria: number | string }>(
    'SELECT id_secretaria FROM secretaria WHERE apellidos = ?', [apellidosSecretaria],
  );
  const idSecretaria = secretarias.filas[0]?.id_secretaria;
  assert.ok(idSecretaria !== undefined);
  const odontologos = await pool.consultar<{ id_odontologo: number | string }>(
    'SELECT id_odontologo FROM usuario WHERE id_usuario = ?', [idActor],
  );
  const idOdontologoCita = odontologos.filas[0]?.id_odontologo;
  assert.ok(idOdontologoCita !== undefined && idOdontologoCita !== null);
  await pool.consultar("INSERT INTO odontologo (nombres, apellidos, colegiado) VALUES ('TEST', 'OTRO', ?)", [`OTRO-${marca}`]);
  const odontologoNuevo = await pool.consultar<{ id_odontologo: number | string }>(
    'SELECT id_odontologo FROM odontologo WHERE colegiado = ?', [`OTRO-${marca}`],
  );
  const idOdontologoIncompatible = odontologoNuevo.filas[0]?.id_odontologo;
  assert.ok(idOdontologoIncompatible !== undefined);
  await pool.consultar('INSERT INTO cita (id_paciente, id_odontologo, id_secretaria, fecha_hora, motivo) VALUES (?, ?, ?, ?, ?)',
    [idPaciente, idOdontologoCita, idSecretaria, '2026-10-25 18:00:00', 'TEST']);
  const citas = await pool.consultar<{ id_cita: number | string }>(
    'SELECT id_cita FROM cita WHERE id_paciente = ? ORDER BY id_cita DESC LIMIT 1', [idPaciente],
  );
  const idCita = citas.filas[0]?.id_cita;
  assert.ok(idCita !== undefined);
  await pool.consultar("INSERT INTO historial_clinico (id_paciente, estado) VALUES (?, 'ACTIVO')", [idPaciente]);
  const historiales = await pool.consultar<{ id_historial: number | string }>(
    'SELECT id_historial FROM historial_clinico WHERE id_paciente = ?', [idPaciente],
  );
  const idHistorial = historiales.filas[0]?.id_historial;
  assert.ok(idHistorial !== undefined);

  const clave = uuidPublico(randomUUID());
  const cmd = crearComando(clave, 'TEST_TRIGGER_MYSQL');
  const unidad = crearUnidadDeTrabajoSql({
    dialecto: 'mysql', pool,
    crearLector: () => ({}) as LectorTransaccional,
    aplicarCambios: async (executor) => {
      await executor.consultar(
        "INSERT INTO consulta_odontologica (id_historial, id_cita, id_odontologo, motivo, estado) VALUES (?, ?, ?, 'TEST', 'ABIERTA')",
        [idHistorial, idCita, idOdontologoIncompatible],
      );
    },
  });
  await assert.rejects(
    unidad.ejecutar(contexto, cmd, async () => ({
      tipo: 'CONFIRMAR', cambios: [], revisiones: [], auditoria: [],
      resultado: { httpStatus: 201, respuesta: { ok: true }, correlacionOriginal: contexto.correlacion },
    })),
    (error: unknown) => typeof error === 'object' && error !== null && 'codigo' in error && error.codigo === 'ESTADO_INVALIDO',
  );
  assert.equal(await contar(pool, 'mysql', 'consulta_odontologica', 'id_cita', idCita), 0);
  assert.equal(await contar(pool, 'mysql', 'operaciones', 'clave', clave), 0);
}

async function verificarReintentoDeadlock(
  pool: PoolSql,
  dialecto: 'postgresql' | 'mysql',
  contexto: ReturnType<typeof crearContextoAutenticado>,
): Promise<void> {
  const nombreA = `DEADLOCK_A_${randomUUID()}`;
  const nombreB = `DEADLOCK_B_${randomUUID()}`;
  if (dialecto === 'postgresql') {
    await pool.consultar("INSERT INTO rol (nombre, permisos) VALUES ($1, '[]'::jsonb), ($2, '[]'::jsonb)", [nombreA, nombreB]);
  } else {
    await pool.consultar("INSERT INTO rol (nombre, permisos) VALUES (?, '[]'), (?, '[]')", [nombreA, nombreB]);
  }
  let listos = 0;
  let liberarBarrera!: () => void;
  const barrera = new Promise<void>((resolve) => { liberarBarrera = resolve; });
  const intentos: Record<string, number> = { DEADLOCK_A: 0, DEADLOCK_B: 0 };
  const comandoA = crearComando(uuidPublico(randomUUID()), 'DEADLOCK_A');
  const comandoB = crearComando(uuidPublico(randomUUID()), 'DEADLOCK_B');
  const unidadConDeadlock = crearUnidadDeTrabajoSql({
    dialecto, pool,
    crearLector: () => ({}) as LectorTransaccional,
    aplicarCambios: async (executor, _ctx, comando) => {
      const lado = comando.caso as 'DEADLOCK_A' | 'DEADLOCK_B';
      const intento = (intentos[lado] ?? 0) + 1;
      intentos[lado] = intento;
      const primero = lado === 'DEADLOCK_A' ? nombreA : nombreB;
      const segundo = lado === 'DEADLOCK_A' ? nombreB : nombreA;
      const p = dialecto === 'postgresql' ? '$1' : '?';
      const actualizar = async (nombre: string, valor: string) => executor.consultar(
        `UPDATE rol SET descripcion = ${p} WHERE nombre = ${dialecto === 'postgresql' ? '$2' : '?'}`,
        [valor, nombre],
      );
      if (intento === 1) {
        await actualizar(primero, `${lado}_PRIMERO`);
        listos += 1;
        if (listos === 2) liberarBarrera();
        await barrera;
        await actualizar(segundo, `${lado}_SEGUNDO`);
      } else {
        await actualizar(nombreA, `${lado}_REINTENTO_A`);
        await actualizar(nombreB, `${lado}_REINTENTO_B`);
      }
    },
  });
  const reintentar = (cmd: ComandoEstable) => unidadConDeadlock.ejecutar(contexto, cmd, async () => ({
    tipo: 'CONFIRMAR', cambios: [{ agregado: 'rol', tipo: 'ACTUALIZAR', recursoId: uuidPublico(randomUUID()), versionAnterior: null, nuevoEstado: {} }],
    revisiones: [], auditoria: [],
    resultado: { httpStatus: 200, respuesta: { estado: 'ok' }, correlacionOriginal: contexto.correlacion },
  }));
  await Promise.all([reintentar(comandoA), reintentar(comandoB)]);
  assert.ok((intentos.DEADLOCK_A ?? 0) > 1 || (intentos.DEADLOCK_B ?? 0) > 1);
}

function crearComando(clave: ReturnType<typeof uuidPublico>, caso = 'TEST_UOW_SQL'): ComandoEstable {
  return {
    id: uuidPublico(randomUUID()), claveIdempotencia: clave, caso,
    hashEntrada: 'a'.repeat(64), instante: instanteUtc('2026-10-25T18:00:00Z'), ids: Object.freeze({}),
  };
}

async function contar(pool: PoolSql, dialecto: 'postgresql' | 'mysql', tabla: string, columna: string, valor: unknown): Promise<number> {
  const p = dialecto === 'postgresql' ? '$1' : '?';
  const resultado = await pool.consultar<{ total: number | string }>(
    `SELECT COUNT(*) AS total FROM ${tabla} WHERE ${columna} = ${p}`, [valor],
  );
  return Number(resultado.filas[0]?.total ?? 0);
}
