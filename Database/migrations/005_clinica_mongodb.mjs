import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const leer = nombre => JSON.parse(readFileSync(new URL(`./esquemas/005_consultas_mongodb_${nombre}.json`, import.meta.url), 'utf8'));
const anterior = leer('v1');
const objetivo = leer('v2');
const ordenar = v => Array.isArray(v) ? v.map(ordenar) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k,ordenar(v[k])])) : v;
const hash = v => createHash('sha256').update(JSON.stringify(ordenar(v))).digest('hex');
export const manifiestoClinicaMongodb = Object.freeze({id: 5, version: 2,
  anterior: hash(anterior.validador), huella: hash(objetivo.validador)});

/** ADMIN, escritores detenidos, respaldo verificado. No hace backfill ni inventa procedencia. */
export async function migrarClinicaMongodb(db, {antesDeCollMod, despuesDeCollMod} = {}) {
  const info = (await db.listCollections({name: 'consultas_clinicas'}, {nameOnly: false}).toArray())[0];
  const actual = info && hash(info.options?.validator);
  if (!info || info.options.validationLevel !== 'strict' || info.options.validationAction !== 'error' ||
    ![manifiestoClinicaMongodb.anterior, manifiestoClinicaMongodb.huella].includes(actual)) throw new Error('MODELO_CLINICO_DESCONOCIDO');
  const indices = await db.collection('consultas_clinicas').listIndexes().toArray();
  for (const esperado of anterior.indices) {
    const ix = indices.find(i => i.name === esperado.name);
    if (!ix || JSON.stringify(ix.key) !== JSON.stringify(esperado.key) || Boolean(ix.unique) !== Boolean(esperado.unique) ||
      hash(ix.partialFilterExpression ?? null) !== hash(esperado.partialFilterExpression ?? null)) throw new Error('INDICE_CLINICO_INCOMPATIBLE');
  }
  const revisiones = await db.collection('revisiones').listIndexes().toArray();
  if (!revisiones.some(i => i.unique && JSON.stringify(i.key) === JSON.stringify({tipo_recurso: 1,recurso_id: 1,version: 1}))) throw new Error('INDICE_VERSION_FALTANTE');
  if (await db.collection('consultas_clinicas').countDocuments({$nor: [objetivo.validador]})) throw new Error('DOCUMENTOS_CLINICOS_INCOMPATIBLES');
  const historial = await db.collection('historial_modelo').findOne({id: 1});
  if (!historial || historial.version !== 1 || !['LISTO','RECONCILIAR'].includes(historial.estado)) throw new Error('RECONCILIACION_HISTORIAL_REQUERIDA');
  const incompleto = await db.collection('consultas_clinicas').findOne({$or: [
    {profesional_historico: {$exists: false}}, {'diagnosticos': {$elemMatch: {registrado_por: {$exists: false}}}},
    {'tratamientos': {$elemMatch: {registrado_por: {$exists: false}}}},
    {receta: {$exists: true}, 'receta.entidad_colegiacion_historica': {$exists: false}},
  ]}, {projection: {_id: 1}});
  // Se amplía el validador aun con legado; ese legado mantiene su puerta RECONCILIAR.
  await antesDeCollMod?.();
  await db.collection('historial_modelo').updateOne({id: 5}, {$set: {...manifiestoClinicaMongodb, estado: 'MIGRANDO'}}, {upsert: true});
  await db.command({collMod: 'consultas_clinicas', validator: objetivo.validador, validationLevel: 'strict', validationAction: 'error'});
  await despuesDeCollMod?.();
  const reconciliar = incompleto || historial.estado === 'RECONCILIAR';
  await db.collection('historial_modelo').updateOne({id: 5}, {$set: {...manifiestoClinicaMongodb, estado: reconciliar ? 'RECONCILIAR' : 'LISTO'}}, {upsert: true});
  if (incompleto) await db.collection('historial_modelo').updateOne({id: 1}, {$set: {estado: 'RECONCILIAR'}});
  return {...manifiestoClinicaMongodb, estado: reconciliar ? 'RECONCILIAR' : 'LISTO'};
}
