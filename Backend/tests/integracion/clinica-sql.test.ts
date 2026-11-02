import { GestionarHospitalizaciones } from '../../src/aplicacion/casos-uso/hospital/gestionar-hospitalizaciones.js';
import { ConsultarHospitalizaciones } from '../../src/aplicacion/casos-uso/hospital/consultar-hospitalizaciones.js';
import { CambiarEstadoHistorial } from '../../src/aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import { ConsultarCitas } from '../../src/aplicacion/casos-uso/citas/consultar-citas.js';
import { ConsultarAntecedentesClinicos, ActualizarAntecedentesClinicos } from '../../src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.js';
import { ConsultarCatalogosClinicos } from '../../src/aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.js';
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
  crearHospitalPostgresql,
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
  const permisos = ['historial.archivar', 'pacientes.administrar', 'historial.leer', 'citas.administrar', 'consultas.registrar',
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
    ...(dialecto === 'postgresql' ? { hospital: crearHospitalPostgresql(pool) } : {}),
    institucion, estadoPersistencia: 'DISPONIBLE', clinica, uow, pacientes,
  };

  const agenda = new GestionarCitas(dependencias);
  const atencion = new AtencionClinica(dependencias);
  const consultorio = 'Consultorio 1';
  const signos = { peso_kg: 70.5, talla_cm: 175, temperatura_c: null, presion_sistolica: 120,
    presion_diastolica: 80, frecuencia_cardiaca_lpm: 72, frecuencia_respiratoria_rpm: 16,
    saturacion_oxigeno_pct: 98 };
  const diagnostico = institucion === 'HOSPITAL_GENERAL'
    ? { codigo_cie: 'J00', nombre: 'Rinofaringitis aguda', es_principal: true, observacion: '' }
    : { codigo_cie: 'K02.9', nombre: 'Caries dental', es_principal: true };
  const tratamiento = institucion === 'HOSPITAL_GENERAL'
    ? { descripcion: 'Reposo relativo', indicaciones: 'Hidratación y control en 48 horas' }
    : { descripcion: 'Profilaxis dental', indicaciones: 'Cepillado tres veces al día' };
  const receta = { observaciones: '', medicamentos: [{
    nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500 mg', dosis: 'D'.repeat(200),
    frecuencia: 'F'.repeat(200), duracion: 'T'.repeat(200), via: 'Oral', indicaciones: 'Después de alimentos',
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
  assert.deepEqual(await clinica.citas.porId(cita.respuesta.id), cita.respuesta);
  assert.equal((await pacientes.porId(uuidPublico(pacienteId)))?.version, 2);

  // 2) Atención compuesta: consulta finalizada, signos, diagnósticos, tratamientos y receta.
  const completa = await atencion.ejecutar('completa', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: { paciente_id: pacienteId, version_paciente: 2, cita_id: cita.respuesta.id, version_cita: 1,
      motivo: 'Dolor faríngeo', sintomas: 'Odinofagia de 48 horas', signos_vitales: signos,
      observaciones: '', diagnosticos: [diagnostico], tratamientos: [tratamiento], receta },
  });
  assert.equal(completa.httpStatus, 201);
  assert.equal(completa.respuesta.estado, 'FINALIZADA');
  assert.equal(completa.respuesta.version, 1);
  assert.equal(completa.respuesta.receta?.estado, 'EMITIDA');

  const leida = await clinica.consultas.porId(completa.respuesta.id);
  assert.ok(leida);
  assert.equal(new Date(leida.fecha_hora).getTime(), new Date(completa.respuesta.fecha_hora).getTime());
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

  // Una atención previa puede finalizar después del archivo (A-F01).
  if (dialecto === 'postgresql') await pool.consultar(
    "UPDATE historial_clinico SET estado_historial = 'ARCHIVADO', causa_baja='TRASLADO', motivo_baja='Prueba sintética', fecha_baja=CURRENT_TIMESTAMP, actor_baja=$2 WHERE id_paciente = (SELECT id_paciente FROM paciente WHERE id_publico = $1)", [pacienteId, cuentaId]);
  const finalizada = await atencion.ejecutar('finalizar', {
    contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()), id: abierta.respuesta.id,
    entrada: { version_esperada: 1 },
  });
  assert.equal(finalizada.respuesta.estado, 'FINALIZADA');
  assert.equal((await clinica.citas.porId(segundaCita.respuesta.id))?.estado, 'ATENDIDA');
  if (dialecto === 'postgresql') await pool.consultar(
    "UPDATE historial_clinico SET estado_historial = 'ACTIVO' WHERE id_paciente = (SELECT id_paciente FROM paciente WHERE id_publico = $1)", [pacienteId]);
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
  // E03-P1-03: corrección completa, versiones previas y archivo real por caso de uso.
  const corregida = await atencion.ejecutar('corregir', {contexto, bundle,
    claveIdempotencia: uuidPublico(randomUUID()), id: recuperada.respuesta.id,
    entrada: {version_esperada: 1, motivo_correccion: 'Ajuste sintético trazable', contenido: {
      motivo: 'Motivo corregido', sintomas: 'Síntoma corregido', signos_vitales: {},
      diagnosticos: [], tratamientos: [], receta: {...receta, observaciones: 'Versión corregida'},
    }}});
  assert.equal(corregida.respuesta.version, 2);
  assert.deepEqual(await clinica.consultas.porId(corregida.respuesta.id), corregida.respuesta);
  assert.deepEqual(await clinica.consultas.porVersion(corregida.respuesta.id, versionPositiva(1)), recuperada.respuesta);
  assert.equal(corregida.respuesta.receta?.version, 2);
  const estado = new CambiarEstadoHistorial(dependencias);
  const antesArchivo = (await pacientes.porId(uuidPublico(pacienteId)))!;
  const cuarta = await agenda.ejecutar('crear', {contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()), entrada: {
    paciente_id: pacienteId, version_paciente: antesArchivo.version, profesional_id: profesionalId,
    fecha: '2026-11-05', hora_inicio: '11:00', duracion_minutos: 30, motivo: 'Carrera de archivo'}});
  const versionCarrera = (await pacientes.porId(uuidPublico(pacienteId)))!.version;
  const parametrosArchivo = {contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()), id: uuidPublico(pacienteId),
    entrada: {version_esperada: versionCarrera, causa: 'TRASLADO', motivo: 'Traslado sintético'}};
  const carrera = await Promise.allSettled([
    estado.ejecutar('archivar', parametrosArchivo),
    atencion.ejecutar('abrir', {contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()), entrada: {
      paciente_id: pacienteId, version_paciente: versionCarrera, cita_id: cuarta.respuesta.id, version_cita: 1,
      motivo: 'Atención concurrente', sintomas: '', signos_vitales: {}}}),
  ]);
  assert.equal(carrera.filter(r => r.status === 'fulfilled').length, 1);
  const archivo = carrera[0]!.status === 'fulfilled' ? carrera[0]!.value : await estado.ejecutar('archivar', {
    ...parametrosArchivo, claveIdempotencia: uuidPublico(randomUUID()), entrada: {...parametrosArchivo.entrada,
      version_esperada: (await pacientes.porId(uuidPublico(pacienteId)))!.version}});
  if (carrera[1]!.status === 'fulfilled') {
    await atencion.ejecutar('finalizar', {contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
      id: carrera[1]!.value.respuesta.id, entrada: {version_esperada: 1}});
  }
  assert.equal(archivo.respuesta.estado, 'ARCHIVADO');
  assert.equal((await pacientes.porId(uuidPublico(pacienteId)))?.estado, 'ARCHIVADO');
  await assert.rejects(atencion.ejecutar('abrir', {contexto, bundle, claveIdempotencia: uuidPublico(randomUUID()),
    entrada: {paciente_id: pacienteId, version_paciente: (await pacientes.porId(uuidPublico(pacienteId)))!.version,
      ...(dialecto === 'mysql' ? {cita_id: tercera.respuesta.id, version_cita: 2} : {}),
      motivo: 'No permitido', sintomas: '', signos_vitales: {}}}), /archivado/);
  const trasArchivo = await atencion.ejecutar('corregir', {contexto, bundle,
    claveIdempotencia: uuidPublico(randomUUID()), id: corregida.respuesta.id,
    entrada: {version_esperada: 2, motivo_correccion: 'Ajuste después de archivo', contenido: {
      motivo: 'Corrección posterior', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: []}}});
  assert.equal(trasArchivo.respuesta.receta, undefined);
  assert.equal((await clinica.consultas.porVersion(corregida.respuesta.id, versionPositiva(2)))?.receta?.version, 2);
  await assert.rejects(atencion.ejecutar('corregir', {contexto, bundle: bundleConFallo,
    claveIdempotencia: uuidPublico(randomUUID()), id: trasArchivo.respuesta.id, entrada: {
      version_esperada: 3, motivo_correccion: 'Rollback sintético de revisión', contenido: {
        motivo: 'No debe persistir', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: []}}}));
  assert.deepEqual(await clinica.consultas.porId(trasArchivo.respuesta.id), trasArchivo.respuesta);
  assert.equal(await clinica.consultas.porVersion(trasArchivo.respuesta.id, versionPositiva(4)), null);

  if (dialecto === 'mysql') {
    await verificarFlujoDentalDosRolesMysql(pool, bundle, clinica, pacientes, profesionalId);
  } else if (dialecto === 'postgresql') {
    await verificarHospitalizacionesPostgresql(pool, bundle, profesionalId, contexto);
  }
}

async function verificarHospitalizacionesPostgresql(
  pool: PoolSql,
  bundle: BundleInstitucional,
  medicoId: string,
  contexto: ReturnType<typeof crearContextoAutenticado>,
): Promise<void> {
  const hospital = bundle.hospital;
  assert.ok(hospital, 'El adaptador hospitalario debe estar conectado');

  // Insertar un paciente activo nuevo para la prueba hospitalaria
  const pacHospId = randomUUID();
  await pool.consultar(
    `INSERT INTO paciente (id_publico, primer_nombre, primer_apellido)
     VALUES ($1, 'Carlos', 'Gómez')`,
    [pacHospId],
  );
  const idPacInterno = await pool.consultar<{ id_paciente: number }>(
    'SELECT id_paciente FROM paciente WHERE id_publico = $1',
    [pacHospId],
  );
  await pool.consultar(
    `INSERT INTO historial_clinico (id_paciente, numero_historial)
     VALUES ($1, $2)`,
    [idPacInterno.filas[0]!.id_paciente, `HOSP-${randomUUID().slice(0, 8)}`],
  );

  // Asegurar que existan al menos dos camas disponibles
  const habRes = await pool.consultar<{ id_habitacion: number }>(
    `INSERT INTO habitacion (numero, piso, tipo)
     VALUES ($1, '2', 'Medicina Interna')
     RETURNING id_habitacion`,
    [`HAB-${randomUUID().slice(0, 6)}`],
  );
  const idHab = habRes.filas[0]!.id_habitacion;

  const cama1Res = await pool.consultar<{ id_publico: string }>(
    `INSERT INTO cama (id_habitacion, numero_cama)
     VALUES ($1, 'A')
     RETURNING id_publico`,
    [idHab],
  );
  const cama2Res = await pool.consultar<{ id_publico: string }>(
    `INSERT INTO cama (id_habitacion, numero_cama)
     VALUES ($1, 'B')
     RETURNING id_publico`,
    [idHab],
  );

  const cama1Id = uuidPublico(cama1Res.filas[0]!.id_publico);
  const cama2Id = uuidPublico(cama2Res.filas[0]!.id_publico);
  const pacienteUuid = uuidPublico(pacHospId);
  const medicoUuid = uuidPublico(medicoId);

  const servicio = new GestionarHospitalizaciones();
  const ingresoEntrada = {
    pacienteId: pacienteUuid, camaId: cama1Id, motivoIngreso: 'Ingreso verificable',
    diagnosticoIngresoCIE: 'Z09', diagnosticoIngresoNombre: 'Seguimiento', versionEsperadaCama: versionPositiva(1),
  };
  // Rechazo administrativo también desde aplicación (sin depender del guard HTTP).
  const administrativo = crearContextoAutenticado(contexto.identidad,
    { ...contexto.cuenta, permisos: ['pacientes.administrar'] }, contexto.correlacion);
  await assert.rejects(new ConsultarHospitalizaciones().ejecutarListado(administrativo, bundle),
    { codigo: 'SIN_PERMISO' });
  await assert.rejects(servicio.ingresar(contexto, bundle, ingresoEntrada), { codigo: 'SOLICITUD_INVALIDA' });
  // Una referencia ajena falla después de INSERT: la UoW debe revertir ingreso y cama.
  await assert.rejects(hospital.hospitalizaciones.ingresar({ ...ingresoEntrada,
    consultasEnlazadasIds: [uuidPublico(randomUUID())], comando: { contexto, clave: randomUUID() } }, medicoUuid),
    { codigo: 'REFERENCIA_INCOMPATIBLE' });
  const sinParciales = await hospital.hospitalizaciones.porPaciente(pacienteUuid);
  assert.equal(sinParciales.length, 0);
  assert.equal((await hospital.camas.porId(cama1Id))?.estado, 'DISPONIBLE');
  const claveIngreso = randomUUID();
  // 1. Ingreso hospitalario ocupa cama1
  const simultaneos = await Promise.all([1, 2].map(() => servicio.ingresar(contexto, bundle, ingresoEntrada, claveIngreso)));
  const ingreso = simultaneos[0]!;
  assert.deepEqual(JSON.parse(JSON.stringify(simultaneos[0])), JSON.parse(JSON.stringify(simultaneos[1])));
  assert.deepEqual(JSON.parse(JSON.stringify(await servicio.ingresar(contexto, bundle, ingresoEntrada, claveIngreso))), JSON.parse(JSON.stringify(ingreso)));
  await assert.rejects(servicio.ingresar(contexto, bundle, { ...ingresoEntrada, motivoIngreso: 'Intención distinta' }, claveIngreso),
    { codigo: 'CLAVE_REUTILIZADA' });

  assert.equal(ingreso.estado, 'ACTIVA');
  assert.equal(ingreso.camaActual?.camaId, cama1Id);

  // 2. Comprobar que cama1 queda OCUPADA y rechaza segundo ingreso (CA17)
  const camasTrasIngreso = await hospital.camas.listar();
  const c1 = camasTrasIngreso.find((c) => c.id === cama1Id);
  assert.equal(c1?.estado, 'OCUPADA');

  await assert.rejects(
    hospital.hospitalizaciones.ingresar({
    comando: { contexto, clave: randomUUID() },
      pacienteId: pacienteUuid,
      camaId: cama1Id,
      motivoIngreso: 'Segundo intento concurrente',
      diagnosticoIngresoCIE: 'Z09',
      diagnosticoIngresoNombre: 'Examen',
    }, medicoUuid),
    (err: unknown) => {
      const error = err as { codigo?: string };
      return error.codigo === 'ESTADO_INVALIDO' || error.codigo === 'CAMA_NO_DISPONIBLE';
    },
    'Debe rechazar ocupar una cama que ya está asignada',
  );

  // Fallo inyectado después del cierre de cama: rollback conserva el período abierto.
  const poolConFallo: PoolSql = { ...pool, adquirir: async () => {
    const conexion = await pool.adquirir();
    return { ...conexion, consultar: async (sql, valores) => {
      if (sql.includes('INSERT INTO asignacion_cama')) throw new Error('FALLO_TRAS_CIERRE_CAMA');
      return conexion.consultar(sql, valores);
    } };
  } };
  await assert.rejects(crearHospitalPostgresql(poolConFallo).hospitalizaciones.asignarCama({
    comando: { contexto, clave: randomUUID() }, hospitalizacionId: ingreso.id, nuevaCamaId: cama2Id,
    fechaInicio: new Date().toISOString(), versionEsperada: ingreso.version,
  }, medicoUuid));
  assert.deepEqual(await hospital.hospitalizaciones.porId(ingreso.id), ingreso);
  await assert.rejects(hospital.hospitalizaciones.asignarCama({
    comando: { contexto, clave: randomUUID() }, hospitalizacionId: ingreso.id, nuevaCamaId: cama2Id,
    fechaInicio: '2000-01-01T00:00:00.000Z', versionEsperada: ingreso.version,
  }, medicoUuid), { codigo: 'SOLICITUD_INVALIDA' });
  // Habitación fuera de servicio invalida camas aunque estén disponibles individualmente.
  await pool.consultar("UPDATE habitacion SET estado_operativo='MANTENIMIENTO' WHERE id_habitacion=$1", [idHab]);
  assert.equal((await hospital.camas.porId(cama2Id))?.estado, 'MANTENIMIENTO');
  await assert.rejects(hospital.hospitalizaciones.asignarCama({
    comando: { contexto, clave: randomUUID() }, hospitalizacionId: ingreso.id, nuevaCamaId: cama2Id,
    fechaInicio: new Date().toISOString(), versionEsperada: ingreso.version,
  }, medicoUuid), { codigo: 'ESTADO_INVALIDO' });
  await pool.consultar("UPDATE habitacion SET estado_operativo='DISPONIBLE' WHERE id_habitacion=$1", [idHab]);
  // 3. Traslado atómico a cama2
  const trasladada = await hospital.hospitalizaciones.asignarCama({
    comando: { contexto, clave: randomUUID() },
    hospitalizacionId: ingreso.id,
    nuevaCamaId: cama2Id,
    fechaInicio: new Date().toISOString(),
    motivo: 'Traslado a cuidados intermedios',
    versionEsperada: ingreso.version,
  }, medicoUuid);

  assert.equal(trasladada.camaActual?.camaId, cama2Id);
  assert.equal(trasladada.asignacionesCama[1]?.motivoCambio, 'Traslado a cuidados intermedios');

  // Comprobar que cama1 fue liberada y cama2 quedó ocupada
  const camasTrasTraslado = await hospital.camas.listar();
  assert.equal(camasTrasTraslado.find((c) => c.id === cama1Id)?.estado, 'DISPONIBLE');
  assert.equal(camasTrasTraslado.find((c) => c.id === cama2Id)?.estado, 'OCUPADA');

  // 4. Agregar nota de evolución
  const conNota = await hospital.hospitalizaciones.agregarNotaEvolucion({
    comando: { contexto, clave: randomUUID() },
    hospitalizacionId: ingreso.id,
    notaClinica: 'Evolución satisfactoria sin complicaciones.',
    versionEsperada: trasladada.version,
  }, {
    id: medicoUuid,
    nombre: 'Médico Hospitalario',
    colegiado: 'COL-123',
  });
  assert.equal(conNota.notasEvolucion.length, 1);

  assert.equal(conNota.notasEvolucion[0]?.medicoNombre, 'Ana María Méndez Ruiz');
  const obsAutor = await pool.consultar<{ observaciones: string }>('SELECT observaciones FROM hospitalizacion WHERE id_publico=$1', [ingreso.id]);
  assert.equal(JSON.parse(obsAutor.filas[0]!.observaciones).notasEvolucion[0].medicoId, medicoUuid);
  for (const tipoEgreso of ['', 'INVALIDO']) {
    await assert.rejects(servicio.egresar(contexto, bundle, ingreso.id, {
      fechaEgreso: new Date().toISOString(), tipoEgreso: tipoEgreso as 'ALTA_MEDICA',
      diagnosticoEgresoCIE: '', diagnosticoEgresoNombre: '', resumenClinico: '', versionEsperada: conNota.version,
    }, randomUUID()), { codigo: 'SOLICITUD_INVALIDA' });
  }
  assert.deepEqual(await hospital.hospitalizaciones.porId(ingreso.id), conNota);
  // 5. Egreso hospitalario libera ocupación
  const egresada = await hospital.hospitalizaciones.egresar({
    comando: { contexto, clave: randomUUID() },
    hospitalizacionId: ingreso.id,
    fechaEgreso: new Date().toISOString(),
    tipoEgreso: 'ALTA_MEDICA',
    diagnosticoEgresoCIE: 'Z09',
    diagnosticoEgresoNombre: 'Recuperación completa',
    resumenClinico: 'Alta médica concedida sin secuelas.',
    versionEsperada: conNota.version,
  }, medicoUuid);

  assert.equal(egresada.estado, 'FINALIZADA');
  assert.equal(egresada.camaActual, undefined);

  const camasTrasEgreso = await hospital.camas.listar();
  assert.equal(camasTrasEgreso.find((c) => c.id === cama2Id)?.estado, 'DISPONIBLE');
  const proyeccion = await pool.consultar<{ total: string }>(
    "SELECT count(*) AS total FROM hospital_historial.eventos WHERE paciente_id=$1 AND tipo='HOSPITALIZACION'", [pacienteUuid]);
  assert.equal(Number(proyeccion.filas[0]?.total), 4);
  const revisiones = await pool.consultar<{ total: string }>(
    "SELECT count(*) AS total FROM revisiones WHERE recurso_id=$1 AND tipo_recurso='hospitalizaciones'", [ingreso.id]);
  assert.equal(Number(revisiones.filas[0]?.total), 3);
  await assert.rejects(hospital.hospitalizaciones.agregarProcedimiento({
    comando: { contexto, clave: randomUUID() }, hospitalizacionId: ingreso.id,
    nombre: 'No autorizado tras egreso', resultado: 'No debe persistir', versionEsperada: egresada.version,
  }, { id: medicoUuid, nombre: 'Sintético' }), { codigo: 'ESTADO_INVALIDO' });
  assert.deepEqual(await hospital.hospitalizaciones.porId(ingreso.id), egresada);
  // Sesiones independientes compiten realmente por la misma cama.
  const competidores = await Promise.allSettled([1, 2].map(() => hospital.hospitalizaciones.ingresar({
    ...ingresoEntrada, comando: { contexto, clave: randomUUID() }, versionEsperadaCama: undefined,
  }, medicoUuid)));
  assert.equal(competidores.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(competidores.filter(r => r.status === 'rejected').length, 1);
  const ganadora = competidores.find(r => r.status === 'fulfilled');
  assert.ok(ganadora?.status === 'fulfilled');
  const inicioFuturo = new Date(Date.now() + 60000).toISOString();
  const futura = await hospital.hospitalizaciones.asignarCama({
    comando: { contexto, clave: randomUUID() }, hospitalizacionId: ganadora.value.id,
    nuevaCamaId: cama2Id, fechaInicio: inicioFuturo, motivo: 'Cambio programado',
    versionEsperada: ganadora.value.version,
  }, medicoUuid);
  assert.equal(futura.camaActual?.camaId, cama1Id);
  assert.equal((await hospital.camas.porId(cama1Id))?.estado, 'OCUPADA');
  assert.equal((await hospital.camas.porId(cama2Id))?.estado, 'DISPONIBLE');
  assert.equal(futura.asignacionesCama[1]?.motivoCambio, 'Cambio programado');
  // Archivo rechaza nueva atención pero permite terminar la estancia anterior.
  await pool.consultar("UPDATE historial_clinico SET estado_historial='ARCHIVADO', causa_baja='OTRA_ADMINISTRATIVA', motivo_baja='Archivo sintético', fecha_baja=CURRENT_TIMESTAMP, actor_baja=$2 WHERE id_paciente=$1", [idPacInterno.filas[0]!.id_paciente, contexto.cuenta.id]);
  await assert.rejects(hospital.hospitalizaciones.ingresar({ ...ingresoEntrada, camaId: cama2Id,
    comando: { contexto, clave: randomUUID() }, versionEsperadaCama: undefined }, medicoUuid), { codigo: 'ESTADO_INVALIDO' });
  await hospital.hospitalizaciones.egresar({ comando: { contexto, clave: randomUUID() },
    hospitalizacionId: ganadora.value.id, fechaEgreso: new Date(Date.now() + 120000).toISOString(),
    tipoEgreso: 'ALTA_MEDICA', diagnosticoEgresoCIE: 'Z09', diagnosticoEgresoNombre: 'Alta',
    resumenClinico: 'Estable', versionEsperada: futura.version }, medicoUuid);

  const paginaUno = await hospital.hospitalizaciones.listar(undefined, { pagina: 1, limite: 1 });
  const paginaDos = await hospital.hospitalizaciones.listar(undefined, { pagina: 2, limite: 1 });
  assert.equal(paginaUno.length, 2, 'incluye un centinela para hayMas, no detalle completo');
  assert.equal(paginaDos.length, 1);
  assert.notEqual(paginaUno[0]?.id, paginaDos[0]?.id);
  assert.equal('notasEvolucion' in paginaUno[0]!, false);
  assert.equal('asignacionesCama' in paginaUno[0]!, false);
  await assert.rejects(hospital.hospitalizaciones.listar(undefined, { pagina: 0, limite: 1 }), { codigo: 'SOLICITUD_INVALIDA' });

}

async function verificarFlujoDentalDosRolesMysql(
  pool: PoolSql,
  bundle: BundleInstitucional,
  clinica: NonNullable<BundleInstitucional['clinica']>,
  pacientes: NonNullable<BundleInstitucional['pacientes']>,
  odontologoPublicoId: string,
): Promise<void> {
  const secretariaPublicoId = randomUUID();
  const cuentaSecId = randomUUID();
  const uidSec = `sec-odo-${randomUUID()}`;
  const pacienteDentalId = randomUUID();

  await pool.consultar(
    `INSERT INTO secretaria (id_publico, nombres, apellidos, telefono)
     VALUES (?, 'Laura', 'Gómez', '5555-1234')`,
    [secretariaPublicoId],
  );
  const idSecretariaInterno = await pool.consultar<{ id: number | string }>(
    'SELECT id_secretaria AS id FROM secretaria WHERE id_publico = ?',
    [secretariaPublicoId],
  );
  await pool.consultar(
    `INSERT INTO usuario (id_publico, id_secretaria, nombre_usuario, auth_uid, institucion_id, estado)
     VALUES (?, ?, ?, ?, 'CLINICA_ODONTOLOGICA', 'ACTIVO')`,
    [cuentaSecId, idSecretariaInterno.filas[0]?.id, `sec_${randomUUID().slice(0, 8)}`, uidSec],
  );
  const permisosSecretaria = ['pacientes.administrar', 'citas.administrar'];
  await pool.consultar(
    "INSERT INTO rol (nombre, permisos) VALUES ('SECRETARIA', ?) ON DUPLICATE KEY UPDATE permisos = VALUES(permisos)",
    [JSON.stringify(permisosSecretaria)],
  );
  await pool.consultar(
    "INSERT INTO usuario_rol (id_usuario, id_rol) SELECT u.id_usuario, r.id_rol FROM usuario u, rol r WHERE u.auth_uid = ? AND r.nombre = 'SECRETARIA'",
    [uidSec],
  );

  await pool.consultar(
    `INSERT INTO paciente (id_publico, nombres, apellidos, fecha_nacimiento, sexo)
     VALUES (?, 'Sofía', 'Castillo', '1994-08-12', 'FEMENINO')`,
    [pacienteDentalId],
  );
  const idPacInterno = await pool.consultar<{ id: number | string }>(
    'SELECT id_paciente AS id FROM paciente WHERE id_publico = ?',
    [pacienteDentalId],
  );
  await pool.consultar(
    `INSERT INTO historial_clinico (id_publico, id_paciente, estado)
     VALUES (?, ?, 'ACTIVO')`,
    [randomUUID(), idPacInterno.filas[0]?.id],
  );

  const cuentaSec = await crearRepositorioCuentaMysql(pool).porUid(uidSec);
  assert.ok(cuentaSec);
  const ctxSecretaria = crearContextoAutenticado(
    { uid: uidSec, institucion: 'CLINICA_ODONTOLOGICA', emitidoEn: instanteUtc(new Date().toISOString()) },
    cuentaSec,
    uuidPublico(randomUUID()),
  );

  // Obtener contexto del ODONTOLOGO existente
  const filaUidOdo = await pool.consultar<{ auth_uid: string }>(
    'SELECT u.auth_uid FROM usuario u JOIN odontologo o ON o.id_odontologo = u.id_odontologo WHERE o.id_publico = ? LIMIT 1',
    [odontologoPublicoId],
  );
  const uidOdo = String(filaUidOdo.filas[0]?.auth_uid);
  const cuentaOdo = await crearRepositorioCuentaMysql(pool).porUid(uidOdo);
  assert.ok(cuentaOdo);
  const ctxOdontologo = crearContextoAutenticado(
    { uid: uidOdo, institucion: 'CLINICA_ODONTOLOGICA', emitidoEn: instanteUtc(new Date().toISOString()) },
    cuentaOdo,
    uuidPublico(randomUUID()),
  );

  const agenda = new GestionarCitas(dependencias);
  const lecturaCitas = new ConsultarCitas();
  const atencion = new AtencionClinica(dependencias);
  const leerAnt = new ConsultarAntecedentesClinicos();
  const actAnt = new ActualizarAntecedentesClinicos(dependencias);
  const catalogos = new ConsultarCatalogosClinicos();

  // 1) SECRETARIA consulta directorio de odontólogos pero NO puede leer ni editar antecedentes ni abrir consulta (RF-C08, CA18)
  const profesionales = await catalogos.listarProfesionales(ctxSecretaria, bundle);
  assert.ok(profesionales.some((p) => p.id === odontologoPublicoId));
  await assert.rejects(leerAnt.ejecutar(ctxSecretaria, bundle, pacienteDentalId), /SIN_PERMISO|permiso/);
  await assert.rejects(
    actAnt.ejecutar({
      contexto: ctxSecretaria,
      bundle,
      claveIdempotencia: uuidPublico(randomUUID()),
      id: uuidPublico(pacienteDentalId),
      entrada: {
        version_esperada: 1,
        patologicos: ['Asma'],
        quirurgicos: [],
        familiares: [],
        alergias: [],
        medicamentos_actuales: [],
      },
    }),
    /SIN_PERMISO|permiso/,
  );

  // 2) SECRETARIA crea cita para el ODONTOLOGO y se persiste id_secretaria + secretaria_gestora (RF-C02, RF-C03)
  const citaCreada = await agenda.ejecutar('crear', {
    contexto: ctxSecretaria,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    entrada: {
      paciente_id: pacienteDentalId,
      version_paciente: 1,
      profesional_id: odontologoPublicoId,
      fecha: '2026-11-12',
      hora_inicio: '09:00',
      duracion_minutos: 30,
      motivo: 'Dolor molar inferior derecho',
      consultorio: 'Sillón 2',
    },
  });
  assert.equal(citaCreada.httpStatus, 201);
  const citaLeida1 = await lecturaCitas.porId(ctxSecretaria, bundle, citaCreada.respuesta.id);
  assert.equal(citaLeida1.secretaria_gestora, 'Laura Gómez');

  // 3) SECRETARIA reprograma la cita con motivo y se registra en revisiones (CA06)
  const citaReprog = await agenda.ejecutar('reprogramar', {
    contexto: ctxSecretaria,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    id: citaCreada.respuesta.id,
    entrada: {
      version_esperada: 1,
      fecha: '2026-11-12',
      hora_inicio: '10:30',
      duracion_minutos: 30,
      motivo: 'Cambio de turno solicitado por paciente',
    },
  });
  assert.equal(citaReprog.httpStatus, 200);
  const revisionesCita = await lecturaCitas.revisiones(ctxOdontologo, bundle, citaCreada.respuesta.id, {});
  assert.equal(revisionesCita.elementos.length, 1);
  assert.equal(revisionesCita.elementos[0]?.motivo_cambio, 'Cambio de turno solicitado por paciente');
  assert.equal(revisionesCita.elementos[0]?.anterior.hora_inicio, '09:00');
  assert.equal(revisionesCita.elementos[0]?.actual.hora_inicio, '10:30');

  // 4) ODONTOLOGO registra antecedentes clínicos en MySQL (tabla antecedente) y consulta catálogo (RF-C04, RF-C06)
  const catOdo = await catalogos.obtenerCatalogoOdontologia(ctxOdontologo, bundle);
  assert.ok(catOdo.diagnosticos.length > 0);
  assert.ok(catOdo.procedimientos.length > 0);

  const pacAntesAnt = (await pacientes.porId(uuidPublico(pacienteDentalId)))!;
  const antGuardados = await actAnt.ejecutar({
    contexto: ctxOdontologo,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    id: uuidPublico(pacienteDentalId),
    entrada: {
      version_esperada: pacAntesAnt.version,
      patologicos: ['Hipertensión arterial controlada'],
      quirurgicos: ['Exodoncia terceros molares (2022)'],
      familiares: [],
      alergias: [{ sustancia: 'Penicilina', severidad: 'SEVERA', reaccion: 'Anfilaxia' }],
      medicamentos_actuales: ['Losartán 50 mg'],
    },
  });
  assert.equal(antGuardados.httpStatus, 200);
  const antLeidos = await leerAnt.ejecutar(ctxOdontologo, bundle, pacienteDentalId);
  assert.deepEqual(antLeidos.patologicos, ['Hipertensión arterial controlada']);
  assert.deepEqual(antLeidos.quirurgicos, ['Exodoncia terceros molares (2022)']);
  assert.equal(antLeidos.alergias[0]?.sustancia, 'Penicilina');
  assert.equal(antLeidos.alergias[0]?.severidad, 'SEVERA');

  const filasAntMysql = await pool.consultar<{ total: number | string }>(
    'SELECT count(*) AS total FROM antecedente a JOIN historial_clinico h ON h.id_historial = a.id_historial JOIN paciente p ON p.id_paciente = h.id_paciente WHERE p.id_publico = ?',
    [pacienteDentalId],
  );
  assert.equal(Number(filasAntMysql.filas[0]?.total), 4);

  // 5) ODONTOLOGO atiende la cita reprogramada: se preserva id_secretaria y la cita pasa a ATENDIDA (RF-C03, RF-C05..C07)
  const pacAntesAtencion = (await pacientes.porId(uuidPublico(pacienteDentalId)))!;
  const consultaDental = await atencion.ejecutar('completa', {
    contexto: ctxOdontologo,
    bundle,
    claveIdempotencia: uuidPublico(randomUUID()),
    entrada: {
      paciente_id: pacienteDentalId,
      version_paciente: pacAntesAtencion.version,
      cita_id: citaCreada.respuesta.id,
      version_cita: 2,
      motivo: 'Dolor molar inferior derecho',
      sintomas: 'Sensibilidad térmica aguda en pieza 46',
      signos_vitales: { presion_sistolica: 120, presion_diastolica: 80 },
      observaciones: 'Se realiza obturación con resina compuesta',
      diagnosticos: [{ codigo_cie: 'K02.1', nombre: 'Caries de la dentina', es_principal: true }],
      tratamientos: [{ descripcion: 'Restauración con resina compuesta fotocurada', indicaciones: 'Evitar alimentos duros por 24 horas' }],
      receta: {
        observaciones: 'Analgésico postoperatorio',
        medicamentos: [{
          nombre: 'Ibuprofeno 400 mg',
          presentacion: 'Tableta recubierta',
          concentracion: '400 mg',
          dosis: '1 tableta',
          frecuencia: 'Cada 8 horas',
          duracion: '3 días',
          via: 'Oral',
          indicaciones: 'Tomar después de los alimentos',
        }],
      },
    },
  });
  assert.equal(consultaDental.httpStatus, 201);
  assert.equal(consultaDental.respuesta.estado, 'FINALIZADA');

  const citaFinal = await lecturaCitas.porId(ctxOdontologo, bundle, citaCreada.respuesta.id);
  assert.equal(citaFinal.estado, 'ATENDIDA');
  assert.equal(citaFinal.secretaria_gestora, 'Laura Gómez');
}
