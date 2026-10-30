import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearContextoAutenticado, type CuentaAutorizada } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import type { DependenciasClinicas } from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import { AtencionClinica } from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import { GestionarCitas } from '../../src/aplicacion/casos-uso/citas/gestionar-citas.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { crearPoolMysql } from '../../src/adaptadores/salida/mysql/crear-pool-mysql.js';
import { crearPoolPostgresql } from '../../src/adaptadores/salida/postgresql/crear-pool-postgresql.js';
import { crearRepositorioCuentaPostgresql } from '../../src/adaptadores/salida/postgresql/repositorio-cuenta-postgresql.js';
import { crearRepositorioCuentaMysql } from '../../src/adaptadores/salida/mysql/repositorio-cuenta-mysql.js';
import {
  crearClinicaPostgresql,
  crearRepositorioPacientesPostgresql,
  crearUnidadDeTrabajoPacientesPostgresql,
} from '../../src/adaptadores/salida/postgresql/pacientes/crear-bundle-pacientes-postgresql.js';
import {
  crearClinicaMysql,
  crearRepositorioPacientesMysql,
  crearUnidadDeTrabajoPacientesMysql,
} from '../../src/adaptadores/salida/mysql/pacientes/crear-bundle-pacientes-mysql.js';
import type { PoolSql } from '../../src/adaptadores/salida/sql/tipos-sql.js';

const puertoPg = process.env.PG_TEST_PORT;
const secretoPg = process.env.PG_TEST_SECRET_FILE;
const puertoMysql = process.env.MYSQL_TEST_PORT;
const secretoMysql = process.env.MYSQL_TEST_SECRET_FILE;

const dependencias: DependenciasClinicas = {
  reloj: { ahora: () => instanteUtc(new Date().toISOString()) },
  ids: { nuevo: () => uuidPublico(randomUUID()) },
  hash: { sha256: async (texto) => createHash('sha256').update(texto, 'utf8').digest('hex') },
};

test('PostgreSQL: cita + atención compuesta persisten, se reconstruyen y son atómicas', {
  skip: !puertoPg || !secretoPg,
}, async (t) => {
  const pool = await crearPoolPostgresql({
    host: '127.0.0.1', puerto: Number(puertoPg), baseDatos: 'hospital_general',
    usuario: 'hospital_app', archivoContrasena: secretoPg as string,
  });
  t.after(async () => pool.cerrar());
  await verificarClinica(pool, 'postgresql');
});

test('MySQL: cita + atención compuesta persisten, se reconstruyen y son atómicas', {
  skip: !puertoMysql || !secretoMysql,
}, async (t) => {
  const pool = await crearPoolMysql({
    host: '127.0.0.1', puerto: Number(puertoMysql), baseDatos: 'clinica_odontologica',
    usuario: 'clinica_app', archivoContrasena: secretoMysql as string,
  });
  t.after(async () => pool.cerrar());
  await verificarClinica(pool, 'mysql');
});

async function verificarClinica(pool: PoolSql, dialecto: 'postgresql' | 'mysql'): Promise<void> {
  const institucion = dialecto === 'postgresql' ? 'HOSPITAL_GENERAL' : 'CLINICA_ODONTOLOGICA';
  const rol = dialecto === 'postgresql' ? 'MEDICO' : 'ODONTOLOGO';
  const permisos = ['pacientes.administrar', 'historial.leer', 'citas.administrar', 'consultas.registrar',
    'diagnosticos.registrar', 'tratamientos.registrar', 'recetas.emitir'];
  const uid = `clinica-${randomUUID()}`;
  const cuentaId = randomUUID();
  const profesionalId = randomUUID();
  const pacienteId = randomUUID();

  if (dialecto === 'postgresql') {
    const profesional = await pool.consultar<{ id: number | string }>(
      `INSERT INTO personal_medico (id_publico, primer_nombre, segundo_nombre, primer_apellido,
         segundo_apellido, numero_colegiado, entidad_colegiacion, estado)
       VALUES ($1, 'Ana', 'María', 'Méndez', 'Ruiz', $2, 'Colegio de Médicos', 'ACTIVO')
       RETURNING id_personal AS id`,
      [profesionalId, `COL-${randomUUID().slice(0, 12)}`],
    );
    await pool.consultar(
      `INSERT INTO usuario (id_publico, id_personal, nombre_usuario, auth_uid, institucion_id, estado)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVO')`,
      [cuentaId, profesional.filas[0]?.id, `med_${randomUUID().slice(0, 8)}`, uid, institucion],
    );
    await pool.consultar(
      "INSERT INTO rol (nombre, permisos) VALUES ('MEDICO', $1::jsonb) ON CONFLICT (nombre) DO UPDATE SET permisos = EXCLUDED.permisos",
      [JSON.stringify(permisos)],
    );
    await pool.consultar(
      'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT u.id_usuario, r.id_rol FROM usuario u, rol r WHERE u.auth_uid = $1 AND r.nombre = $2',
      [uid, rol],
    );
    const paciente = await pool.consultar<{ id: number | string }>(
      `INSERT INTO paciente (id_publico, primer_nombre, primer_apellido, fecha_nacimiento, sexo)
       VALUES ($1, 'Luis', 'Pérez', '1990-05-04', 'MASCULINO') RETURNING id_paciente AS id`,
      [pacienteId],
    );
    await pool.consultar(
      `INSERT INTO historial_clinico (id_publico, id_paciente, numero_historial, estado_historial)
       VALUES ($1, $2, $3, 'ACTIVO')`,
      [randomUUID(), paciente.filas[0]?.id, `HC-${randomUUID().slice(0, 12)}`],
    );
  } else {
    const profesional = await pool.consultar<{ id: number | string }>(
      `INSERT INTO odontologo (id_publico, nombres, apellidos, colegiado, entidad_colegiacion)
       VALUES (?, 'Ana', 'Méndez', ?, 'Colegio de Odontólogos')`,
      [profesionalId, `OD-${randomUUID().slice(0, 12)}`],
    );
    const idOdontologo = await pool.consultar<{ id: number | string }>(
      'SELECT id_odontologo AS id FROM odontologo WHERE id_publico = ?', [profesionalId],
    );
    assert.ok(profesional.filas.length === 0 || idOdontologo.filas.length === 1);
    await pool.consultar(
      `INSERT INTO usuario (id_publico, id_odontologo, nombre_usuario, auth_uid, institucion_id, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
      [cuentaId, idOdontologo.filas[0]?.id, `od_${randomUUID().slice(0, 8)}`, uid, institucion],
    );
    await pool.consultar(
      "INSERT INTO rol (nombre, permisos) VALUES (?, ?) ON DUPLICATE KEY UPDATE permisos = VALUES(permisos)",
      [rol, JSON.stringify(permisos)],
    );
    await pool.consultar(
      'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT u.id_usuario, r.id_rol FROM usuario u, rol r WHERE u.auth_uid = ? AND r.nombre = ?',
      [uid, rol],
    );
    const paciente = await pool.consultar<{ id: number | string }>(
      `INSERT INTO paciente (id_publico, nombres, apellidos, fecha_nacimiento, sexo)
       VALUES (?, 'Luis', 'Pérez', '1990-05-04', 'MASCULINO')`,
      [pacienteId],
    );
    const idPaciente = await pool.consultar<{ id: number | string }>(
      'SELECT id_paciente AS id FROM paciente WHERE id_publico = ?', [pacienteId],
    );
    assert.ok(paciente.filas.length === 0 || idPaciente.filas.length === 1);
    await pool.consultar(
      `INSERT INTO historial_clinico (id_publico, id_paciente, estado)
       VALUES (?, ?, 'ACTIVO')`,
      [randomUUID(), idPaciente.filas[0]?.id],
    );
  }

  const cuenta = dialecto === 'postgresql'
    ? await crearRepositorioCuentaPostgresql(pool).porUid(uid)
    : await crearRepositorioCuentaMysql(pool).porUid(uid);
  assert.ok(cuenta);
  const contexto = crearContextoAutenticado(
    { uid, institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
    cuenta as CuentaAutorizada,
    uuidPublico(randomUUID()),
  );

  const clinica = dialecto === 'postgresql' ? crearClinicaPostgresql(pool) : crearClinicaMysql(pool);
  const uow = dialecto === 'postgresql'
    ? crearUnidadDeTrabajoPacientesPostgresql(pool)
    : crearUnidadDeTrabajoPacientesMysql(pool);
  const pacientes = dialecto === 'postgresql'
    ? crearRepositorioPacientesPostgresql(pool)
    : crearRepositorioPacientesMysql(pool);
  const bundle: BundleInstitucional = {
    institucion, estadoPersistencia: 'DISPONIBLE', clinica, uow, pacientes,
  };

  const agenda = new GestionarCitas(dependencias);
  const atencion = new AtencionClinica(dependencias);
  const consultorio = 'Consultorio 1';
  const signos = { peso_kg: 70.5, talla_cm: 175, temperatura_c: null, presion_sistolica: 120,
    presion_diastolica: 80, frecuencia_cardiaca_lpm: 72, frecuencia_respiratoria_rpm: 16,
    saturacion_oxigeno_pct: 98 };
  const diagnostico = institucion === 'HOSPITAL_GENERAL'
    ? { codigo_cie: 'J00', nombre: 'Rinofaringitis aguda', es_principal: true, observacion: 'Cuadro leve' }
    : { codigo_cie: 'K02.9', nombre: 'Caries dental', es_principal: true };
  const tratamiento = institucion === 'HOSPITAL_GENERAL'
    ? { descripcion: 'Reposo relativo', indicaciones: 'Hidratación y control en 48 horas' }
    : { descripcion: 'Profilaxis dental', indicaciones: 'Cepillado tres veces al día' };
  const receta = { observaciones: 'Sin alergias conocidas', medicamentos: [{
    nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500 mg', dosis: '1 tableta',
    frecuencia: 'Cada 8 horas', duracion: '3 días', via: 'Oral', indicaciones: 'Después de alimentos',
  }] };

  // 1) Agenda real: crea cita y avanza la revisión del paciente.
  const cita = await agenda.ejecutar('crear', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: { paciente_id: pacienteId, version_paciente: 1, profesional_id: profesionalId,
      fecha: '2026-11-02', hora_inicio: '09:00', duracion_minutos: 30, motivo: 'Control', consultorio },
  });
  assert.equal(cita.httpStatus, 201);
  assert.equal(cita.respuesta.estado, 'PROGRAMADA');
  assert.equal(cita.respuesta.consultorio, consultorio);
  assert.equal((await pacientes.porId(uuidPublico(pacienteId)))?.version, 2);

  // 2) Atención compuesta: consulta finalizada, signos, diagnósticos, tratamientos y receta.
  const completa = await atencion.ejecutar('completa', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: { paciente_id: pacienteId, version_paciente: 2, cita_id: cita.respuesta.id, version_cita: 1,
      motivo: 'Dolor faríngeo', sintomas: 'Odinofagia de 48 horas', signos_vitales: signos,
      observaciones: 'Sin signos de alarma', diagnosticos: [diagnostico], tratamientos: [tratamiento], receta },
  });
  assert.equal(completa.httpStatus, 201);
  assert.equal(completa.respuesta.estado, 'FINALIZADA');
  assert.equal(completa.respuesta.version, 1);
  assert.equal(completa.respuesta.receta?.estado, 'EMITIDA');

  const leida = await clinica.consultas.porId(completa.respuesta.id);
  assert.ok(leida);
  assert.equal(leida?.estado, 'FINALIZADA');
  assert.equal(leida?.motivo, 'Dolor faríngeo');
  assert.deepEqual(leida?.signos_vitales, signos);
  assert.deepEqual(leida?.diagnosticos.map((d) => [d.codigo_cie, d.nombre, d.es_principal]), [[diagnostico.codigo_cie, diagnostico.nombre, true]]);
  assert.deepEqual(leida?.tratamientos.map((t) => [t.descripcion, t.indicaciones]), [[tratamiento.descripcion, tratamiento.indicaciones]]);
  assert.equal(leida?.receta?.id, completa.respuesta.receta?.id);
  assert.equal(leida?.receta?.medicamentos[0]?.nombre, 'Paracetamol');

  const citaAtendida = await clinica.citas.porId(cita.respuesta.id);
  assert.equal(citaAtendida?.estado, 'ATENDIDA');
  assert.equal((await clinica.consultas.porCita(cita.respuesta.id))?.id, completa.respuesta.id);
  assert.equal((await pacientes.porId(uuidPublico(pacienteId)))?.version, 3);

  // 3) Proyección de historial en la misma transacción.
  const eventos = await pool.consultar<{ total: number | string }>(
    dialecto === 'postgresql'
      ? 'SELECT count(*) AS total FROM hospital_historial.eventos WHERE paciente_id = $1'
      : 'SELECT count(*) AS total FROM clinica_historial.eventos WHERE paciente_id = ?',
    [pacienteId],
  );
  assert.equal(Number(eventos.filas[0]?.total), 4);

  // 4) Falla posterior a escrituras parciales: la cita ya tiene consulta y todo revierte.
  await assert.rejects(
    atencion.ejecutar('completa', {
      contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
      entrada: { paciente_id: pacienteId, version_paciente: 3, cita_id: cita.respuesta.id, version_cita: 2,
        motivo: 'Repetición', sintomas: 'No debe persistir', signos_vitales: signos,
        diagnosticos: [diagnostico], tratamientos: [tratamiento] },
    }),
    /REFERENCIA_INCOMPATIBLE|no es elegible|ya tiene una consulta/,
  );
  const consultasPaciente = await pool.consultar<{ total: number | string }>(
    dialecto === 'postgresql'
      ? 'SELECT count(*) AS total FROM consulta c JOIN historial_clinico h ON h.id_historial=c.id_historial JOIN paciente p ON p.id_paciente=h.id_paciente WHERE p.id_publico = $1'
      : 'SELECT count(*) AS total FROM consulta_odontologica c JOIN historial_clinico h ON h.id_historial=c.id_historial JOIN paciente p ON p.id_paciente=h.id_paciente WHERE p.id_publico = ?',
    [pacienteId],
  );
  assert.equal(Number(consultasPaciente.filas[0]?.total), 1);

  // 5) Apertura y cierre: EN_CURSO se deriva de la consulta ABIERTA y no se pierde la historia.
  const segundaCita = await agenda.ejecutar('crear', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: { paciente_id: pacienteId, version_paciente: 3, profesional_id: profesionalId,
      fecha: '2026-11-03', hora_inicio: '10:00', duracion_minutos: 30, motivo: 'Seguimiento' },
  });
  const abierta = await atencion.ejecutar('abrir', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: { paciente_id: pacienteId, version_paciente: 4, cita_id: segundaCita.respuesta.id,
      version_cita: 1, motivo: 'Seguimiento', sintomas: 'Evolución favorable', signos_vitales: signos },
  });
  assert.equal(abierta.respuesta.estado, 'ABIERTA');
  assert.equal((await clinica.citas.porId(segundaCita.respuesta.id))?.estado, 'EN_CURSO');

  const finalizada = await atencion.ejecutar('finalizar', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()), id: abierta.respuesta.id,
    entrada: { version_esperada: 1 },
  });
  assert.equal(finalizada.respuesta.estado, 'FINALIZADA');
  assert.equal((await clinica.citas.porId(segundaCita.respuesta.id))?.estado, 'ATENDIDA');
  const versionUno = await clinica.consultas.porVersion(abierta.respuesta.id, versionPositiva(1));
  assert.ok(versionUno);
  assert.equal(versionUno.estado, 'ABIERTA');
  assert.deepEqual(versionUno.signos_vitales, signos);
  assert.deepEqual(leida.profesional, completa.respuesta.profesional);
  assert.deepEqual(leida.diagnosticos, completa.respuesta.diagnosticos);
  assert.deepEqual(leida.tratamientos, completa.respuesta.tratamientos);
  assert.deepEqual(leida.receta, completa.respuesta.receta);

  // CA05: forzar fallo después de escrituras clínicas y antes de auditoría.
  const antes = await pacientes.porId(uuidPublico(pacienteId));
  assert.ok(antes);
  const tercera = await agenda.ejecutar('crear', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: { paciente_id: pacienteId, version_paciente: antes.version, profesional_id: profesionalId,
      fecha: '2026-11-04', hora_inicio: '11:00', duracion_minutos: 30, motivo: 'Rollback' },
  });
  const revisionAntes = (await pacientes.porId(uuidPublico(pacienteId)))!.version;
  let falloInyectado = false;
  const poolConFallo: PoolSql = {
    consultar: pool.consultar.bind(pool), cerrar: async () => {},
    adquirir: async () => {
      const conexion = await pool.adquirir();
      return {
        iniciar: conexion.iniciar.bind(conexion), confirmar: conexion.confirmar.bind(conexion),
        revertir: conexion.revertir.bind(conexion), liberar: conexion.liberar.bind(conexion),
        consultar: async (sql, parametros) => {
          if (/INSERT INTO\s+auditoria/i.test(sql)) {
            falloInyectado = true;
            throw new Error('FALLO_AUDITORIA_SINTETICO');
          }
          return conexion.consultar(sql, parametros);
        },
      };
    },
  };
  const bundleConFallo = { ...bundle, uow: dialecto === 'postgresql'
    ? crearUnidadDeTrabajoPacientesPostgresql(poolConFallo)
    : crearUnidadDeTrabajoPacientesMysql(poolConFallo) };
  const clave = uuidPublico(randomUUID());
  const entrada = { paciente_id: pacienteId, version_paciente: revisionAntes,
    cita_id: tercera.respuesta.id, version_cita: 1, motivo: 'Rollback', sintomas: '',
    signos_vitales: signos, diagnosticos: [diagnostico], tratamientos: [tratamiento], receta };
  await assert.rejects(atencion.ejecutar('completa', {
    contexto, bundle: bundleConFallo, claveIdempotencia: clave, entrada,
  }));
  assert.equal(falloInyectado, true);
  assert.equal(await clinica.consultas.porCita(tercera.respuesta.id), null);
  assert.equal((await clinica.citas.porId(tercera.respuesta.id))?.estado, 'PROGRAMADA');
  assert.equal((await pacientes.porId(uuidPublico(pacienteId)))?.version, revisionAntes);
  const recuperada = await atencion.ejecutar('completa', {
    contexto, bundle, claveIdempotencia: clave, entrada,
  });
  const repetida = await atencion.ejecutar('completa', {
    contexto, bundle, claveIdempotencia: clave, entrada,
  });
  assert.deepEqual(repetida.respuesta, recuperada.respuesta);
}
