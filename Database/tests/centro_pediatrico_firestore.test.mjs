import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { modelos, validarDocumento, validarResponsables, idAplicacion, claveUnica, claveOperacion, tamanoDocumento, ErrorModelo } from '../firebase/modelo_pediatrico.mjs';
import { obtenerPlan, validarDestino } from '../centro_pediatrico_firestore.mjs';
import { crearFixtures } from './fixtures_firestore.mjs';

const { filas, ids, fecha } = crearFixtures();
const copiar = structuredClone;
const fila = (prefijo) => filas.find(([r]) => r.startsWith(prefijo));
const rechazo = (accion) => assert.throws(accion, ErrorModelo);
for (const [ruta, datos] of filas) {
  const patron = modelos.find((m) => m.ruta.split('/').length === ruta.split('/').length && m.ruta.split('/').every((p, i) => p.startsWith('{') || p === ruta.split('/')[i])).ruta;
  test(`documento valido: ${patron}`, () => assert.ok(validarDocumento(ruta, datos)));
  test(`campo requerido: ${patron}`, () => {
    const v = copiar(datos); delete v.revision;
    rechazo(() => validarDocumento(ruta, v));
  });
}
const invalidos = [
  ['baja sin causa', 'pacientes/', (v) => { v.estado = 'ARCHIVADO'; }],
  ['identidad incompleta', 'pacientes/', (v) => { v.tipo_documento = 'PRUEBA'; }],
  ['fecha civil invalida', 'pacientes/', (v) => { v.fecha_nacimiento = '2020-02-31'; }],
  ['array de controles de crecimiento', 'consultas/', (v) => { v.control_crecimiento = [{ peso_kg: 1 }]; }],
  ['peso negativo', 'consultas/', (v) => { v.control_crecimiento.peso_kg = -1; }],
  ['diagnosticos sin principal', 'consultas/', (v) => { v.diagnosticos[0].es_principal = false; }],
  ['diagnostico repetido', 'consultas/', (v) => { v.diagnosticos.push({ ...v.diagnosticos[0], es_principal: false }); }],
  ['receta sin dosis', 'consultas/', (v) => { delete v.receta.medicamentos[0].dosis; }],
  ['receta con otro prescriptor', 'consultas/', (v) => { v.receta.prescriptor_id = randomUUID(); }],
  ['consulta sin autorizacion historica', 'consultas/', (v) => { delete v.autorizacion_historica; }],
  ['tratamiento con fechas invertidas', 'consultas/', (v) => { v.tratamientos[0].fecha_fin = new Date('2000-01-01'); }],
  ['contrasena local no admitida', 'usuarios/', (v) => { v.contrasena_hash = 'SINTETICO'; }],
  ['institucion ajena', 'usuarios/', (v) => { v.institucion_id = 'HOSPITAL_GENERAL'; }],
  ['permisos repetidos', 'roles/', (v) => { v.permisos.push(v.permisos[0]); }],
  ['revision fraccionaria', 'usuarios/', (v) => { v.revision = 1.5; }],
  ['estado ajeno al catalogo', 'citas/', (v) => { v.estado = 'OTRO'; }],
  ['cancelacion sin motivo', 'citas/', (v) => { v.estado = 'CANCELADA'; }],
  ['aplicacion anulada sin motivo', 'aplicaciones_vacuna/', (v) => { v.estado = 'ANULADA'; }],
  ['reserva de identidad con otro numero', 'identidades_paciente/', (v) => { v.numero_documento = 'OTRO'; }],
  ['idempotencia con otra clave', 'operaciones/', (v) => { v.clave = 'OTRA'; }],
  ['lista mayor de 100', 'roles/', (v) => { v.permisos = Array.from({ length: 101 }, (_, i) => `PRUEBA-${i}`); }],
  ['objeto desconocido en receta', 'consultas/', (v) => { v.receta.clave_secreta = 'PRUEBA'; }],
  ['NaN en dato flexible', 'auditoria/', (v) => { v.detalle = { prueba: NaN }; }],
  ['lista anidada directamente', 'auditoria/', (v) => { v.detalle = { prueba: [[1]] }; }],
  ['documento mayor de 256 KiB', 'auditoria/', (v) => { v.detalle = { prueba: 'x'.repeat(256 * 1024) }; }],
];
for (const [titulo, prefijo, transformar] of invalidos) {
  test(titulo, () => { const [ruta, datos] = fila(prefijo); const v = copiar(datos); transformar(v); rechazo(() => validarDocumento(ruta, v)); });
}
test('UUID de ruta invalido', () => rechazo(() => validarDocumento('pacientes/incorrecto', filas[0][1])));
test('ruta desconocida', () => rechazo(() => validarDocumento(`coleccion_ajena/${randomUUID()}`, filas[0][1])));
test('reserva de identidad no expone documento en ID', () => {
  assert.equal(claveUnica(' prueba ', ' Documento-Sintetico '), claveUnica('PRUEBA', 'DOCUMENTO-SINTETICO'));
  assert.match(claveUnica('PRUEBA', 'DOCUMENTO-SINTETICO'), /^[0-9a-f]{64}$/);
});
test('la composicion de claves no confunde partes', () => assert.notEqual(claveUnica('AB', 'C'), claveUnica('A', 'BC')));
test('idempotencia conserva la clave opaca como en los otros motores', () => {
  assert.notEqual(claveOperacion('INST', ids.actor, 'RegistrarPaciente', 'clave'), claveOperacion('INST', ids.actor, 'RegistrarPaciente', 'CLAVE'));
  assert.notEqual(claveOperacion('INST', ids.actor, 'RegistrarPaciente', 'clave'), claveOperacion('INST', ids.actor, 'RegistrarPaciente', ' clave '));
});
test('fecha invalida tampoco se permite en datos flexibles', () => {
  const [ruta, datos] = fila('auditoria/'); const v = copiar(datos); v.detalle = { fecha: new Date('invalida') };
  rechazo(() => validarDocumento(ruta, v));
});
test('ID de dosis estable y distinto al cambiar paciente', () => {
  assert.equal(idAplicacion(ids.paciente, ids.vacuna, ids.dosis), ids.aplicacion);
  assert.notEqual(idAplicacion(randomUUID(), ids.vacuna, ids.dosis), ids.aplicacion);
});
test('ID de aplicacion debe coincidir con sus datos', () => {
  const [ruta, datos] = fila('aplicaciones_vacuna/'); const v = copiar(datos); v.paciente_id = randomUUID();
  rechazo(() => validarDocumento(ruta, v));
});
test('al menos un responsable principal activo', () => {
  rechazo(() => validarResponsables([]));
  rechazo(() => validarResponsables([{ es_principal: true, estado: 'INACTIVO' }]));
  assert.doesNotThrow(() => validarResponsables([{ es_principal: true, estado: 'ACTIVO' }, { es_principal: true, estado: 'ACTIVO' }]));
});
test('Timestamp leido del SDK conserva fecha al validar', () => {
  const [ruta, datos] = filas[0]; const v = copiar(datos); v.fecha_apertura = Timestamp.fromDate(fecha);
  assert.equal(validarDocumento(ruta, v).fecha_apertura.getTime(), fecha.getTime());
});
test('calculo de tamano considera UTF-8 y nombre del documento', () => {
  assert.ok(tamanoDocumento('pruebas/uno', { valor: 'ñ' }) > tamanoDocumento('pruebas/uno', { valor: 'n' }));
  assert.ok(tamanoDocumento('pruebas/documento-largo', { valor: 1 }) > tamanoDocumento('pruebas/uno', { valor: 1 }));
});
test('plan offline incluye 23 rutas, 15 colecciones raiz, 12 indices y cuatro roles', async () => {
  const plan = await obtenerPlan();
  assert.equal(plan.rutas.length, 23); assert.equal(plan.colecciones_raiz.length, 15);
  assert.equal(plan.indices_compuestos, 12); assert.equal(plan.roles.length, 4);
});
test('destino exige proyecto explicito y demo local coherente', () => {
  rechazo(() => validarDestino(undefined));
  rechazo(() => validarDestino('demo-bdii-pediatria', '(default)', ''));
  rechazo(() => validarDestino('proyecto-real', '(default)', '127.0.0.1:8188'));
  rechazo(() => validarDestino('demo-bdii-pediatria', '(default)', 'https://servidor:8188'));
  assert.ok(validarDestino('demo-bdii-pediatria', '(default)', '127.0.0.1:8188'));
});
