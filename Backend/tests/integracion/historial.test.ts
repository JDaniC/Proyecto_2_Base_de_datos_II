import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { crearPoolPostgresql } from '../../src/adaptadores/salida/postgresql/crear-pool-postgresql.js';
import { crearPoolMysql } from '../../src/adaptadores/salida/mysql/crear-pool-mysql.js';
import { crearHistorialSql } from '../../src/adaptadores/salida/historial/historial-sql.js';
import { crearHistorialMongodb } from '../../src/adaptadores/salida/historial/historial-mongodb.js';
import { crearHistorialFirestore } from '../../src/adaptadores/salida/historial/historial-firestore.js';
import { crearRepositorioPacientesPostgresql } from '../../src/adaptadores/salida/postgresql/pacientes/crear-bundle-pacientes-postgresql.js';
import { crearRepositorioPacientesMysql } from '../../src/adaptadores/salida/mysql/pacientes/crear-bundle-pacientes-mysql.js';
import { crearRepositorioPacientesMongodb } from '../../src/adaptadores/salida/mongodb/pacientes/repositorio-pacientes-mongodb.js';
import { crearClienteFirestore } from '../../src/adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearRepositorioPacientesFirestore } from '../../src/adaptadores/salida/firestore/pacientes/crear-bundle-pacientes-firestore.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import { eventosCA07, verificarCA07 } from '../fixtures/ca07-historial.js';

for (const motor of ['postgresql', 'mysql'] as const) test(`CA07 ${motor}: historial real`, { skip: !process.env.HISTORIAL_ISOLATED }, async (t) => {
  const pg = motor === 'postgresql';
  const pool = pg ? await crearPoolPostgresql({ host: '127.0.0.1', puerto: Number(process.env.PG_TEST_PORT), baseDatos: 'hospital_general', usuario: 'hospital_app', archivoContrasena: process.env.PG_TEST_SECRET_FILE! })
    : await crearPoolMysql({ host: '127.0.0.1', puerto: Number(process.env.MYSQL_TEST_PORT), baseDatos: 'clinica_odontologica', usuario: 'clinica_app', archivoContrasena: process.env.MYSQL_TEST_SECRET_FILE! });
  t.after(() => pool.cerrar());
  const pacienteId = randomUUID();
  await pool.consultar(pg ? "INSERT INTO paciente(id_publico,primer_nombre,primer_apellido) VALUES($1,'Paciente','CA07')" : "INSERT INTO paciente(id_publico,nombres,apellidos) VALUES(?,'Paciente','CA07')", [pacienteId]);
  const bundle: BundleInstitucional = { institucion: pg ? 'HOSPITAL_GENERAL' : 'CLINICA_ODONTOLOGICA', estadoPersistencia: 'DISPONIBLE',
    pacientes: pg ? crearRepositorioPacientesPostgresql(pool) : crearRepositorioPacientesMysql(pool), historial: crearHistorialSql(pool, motor) };
  const eventos = eventosCA07(bundle);
  for (const e of eventos) await pool.consultar(pg ? 'INSERT INTO hospital_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES($1,$2,$3,$4,$5::jsonb)' : 'INSERT INTO clinica_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES(?,?,?,?,?)', [e.id, pacienteId, e.tipo, e.fechaHora, JSON.stringify(e)]);
  await verificarCA07(t, bundle, pacienteId, eventos, async (e) => {
    await pool.consultar(pg ? 'INSERT INTO hospital_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES($1,$2,$3,$4,$5::jsonb)' : 'INSERT INTO clinica_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES(?,?,?,?,?)', [e.id, pacienteId, e.tipo, e.fechaHora, JSON.stringify(e)]);
  });
  await assert.rejects(pool.consultar(`UPDATE ${pg ? 'hospital_historial' : 'clinica_historial'}.modelo SET estado='LISTO' WHERE id=1`));
  await assert.rejects(pool.consultar(`DELETE FROM ${pg ? 'hospital_historial' : 'clinica_historial'}.eventos`));
});
test('CA07 MongoDB: historial real en replica set', { skip: !process.env.HISTORIAL_ISOLATED }, async (t) => {
  const cliente = new MongoClient(`mongodb://127.0.0.1:${process.env.MONGO_TEST_PORT}/?directConnection=true`, { auth: { username: 'laboratorio_app', password: readFileSync(process.env.MONGO_TEST_SECRET_FILE!, 'utf8').trim() }, authSource: 'laboratorio_clinico' });
  t.after(() => cliente.close()); const db = cliente.db('laboratorio_clinico'); const pacienteId = randomUUID();
  await db.collection<{_id: string; [key: string]: unknown}>('pacientes').insertOne({ _id: pacienteId, revision: 1, codigo_paciente: 'CA07', primer_nombre: 'Paciente', primer_apellido: 'CA07', nombre_busqueda: 'PACIENTE CA07', claves_nombre: ['P'], contactos: [], fecha_registro: new Date(), activo: true, historial: { id_historial: randomUUID(), numero_historial: 'CA07', fecha_apertura: new Date(), estado: 'ACTIVO' } });
  const bundle: BundleInstitucional = { institucion: 'LABORATORIO_CLINICO', estadoPersistencia: 'DISPONIBLE', pacientes: crearRepositorioPacientesMongodb(db), historial: crearHistorialMongodb(db) };
  const eventos = eventosCA07(bundle);
  await db.collection<{_id: string; [key: string]: unknown}>('historial_eventos').insertMany(eventos.map((e) => ({ _id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: e.fechaHora, contenido: e })));
  await verificarCA07(t, bundle, pacienteId, eventos, async (e) => { await db.collection<{_id: string; [key: string]: unknown}>('historial_eventos').insertOne({ _id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: e.fechaHora, contenido: e }); });
});
test('CA07 Firestore: historial en emulador', { skip: !process.env.HISTORIAL_ISOLATED }, async (t) => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  const cliente = crearClienteFirestore({ projectId: process.env.GCLOUD_PROJECT!, databaseId: '(default)', institucionalId: 'CENTRO_MEDICO_PEDIATRICO' });
  t.after(() => cliente.cerrar()); const db = cliente.firestore; const pacienteId = randomUUID();
  await db.doc(`pacientes/${pacienteId}`).set({ revision: 1, nombres: 'Paciente', apellidos: 'CA07', nombre_busqueda: 'PACIENTE CA07', fecha_nacimiento: '2020-01-01', estado: 'ACTIVO', fecha_apertura: new Date() });
  const bundle: BundleInstitucional = { institucion: 'CENTRO_MEDICO_PEDIATRICO', estadoPersistencia: 'DISPONIBLE', pacientes: crearRepositorioPacientesFirestore(cliente), historial: crearHistorialFirestore(db) };
  const eventos = eventosCA07(bundle);
  for (const e of eventos) await db.doc(`historial_eventos/${e.id}`).create({ id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: e.fechaHora, contenido: e });
  await verificarCA07(t, bundle, pacienteId, eventos, async (e) => { await db.doc(`historial_eventos/${e.id}`).create({ id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: e.fechaHora, contenido: e }); });
});
