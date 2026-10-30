import { obtenerPlan } from '../centro_pediatrico_firestore.mjs';
import { validarDocumento } from '../firebase/modelo_pediatrico.mjs';
export const CONTRATO_CLINICA_FIRESTORE = 'clinica-pediatrica-v1-snapshot-2026-10-29';
export const HUELLA_ANTERIOR = 'd5f341030fb4740264245a67dc39f04298b0e263f2b6ef28086f38f529562a29';
/** Parar escritores antes de migrar. Cursor durable y copia íntegra por UUID; no elimina datos. */
export async function prepararClinicaFirestore(db, {despuesDePagina} = {}) {
  const plan = await obtenerPlan(); const ref = db.doc('clinica_configuracion/modelo');
  await db.runTransaction(async t => {
    const [previo, historial, modelo] = await Promise.all([t.get(ref),t.get(db.doc('historial_configuracion/modelo')),t.get(db.doc('configuracion/modelo'))]);
    const origenV1 = modelo.get('version_esquema') === 1 && modelo.get('hash_modelo') === HUELLA_ANTERIOR;
    const objetivoV2 = modelo.get('version_esquema') === 2 && modelo.get('hash_modelo') === plan.hash_modelo;
    if (!modelo.exists || !(origenV1 || objetivoV2)) throw new Error('MANIFIESTO_CLINICO_INCOMPATIBLE');
    if (historial.get('version') !== 1 || historial.get('estado') !== 'LISTO') throw new Error('REQUIERE_MIGRACION_004_RECONCILIADA');
    if (previo.exists) {
      if (previo.get('version') !== 1 || previo.get('contrato') !== CONTRATO_CLINICA_FIRESTORE || previo.get('huella') !== plan.hash_modelo) throw new Error('MANIFIESTO_CLINICO_INCOMPATIBLE');
      return;
    }
    t.create(db.doc('clinica_migracion_006_respaldo/modelo'),modelo.data());
    t.create(ref,{version:1,contrato:CONTRATO_CLINICA_FIRESTORE,huella:plan.hash_modelo,estado:'MIGRANDO',cursor:'',reconciliar:false});
  });
  while (true) {
    const estado = (await ref.get()).data(); if (estado.estado !== 'MIGRANDO') return estado;
    let q = db.collection('consultas').orderBy('__name__'); if (estado.cursor) q = q.startAfter(estado.cursor);
    const pagina = await q.limit(20).get();
    if (pagina.empty) {
      return db.runTransaction(async t => {
        const [actual,modelo] = await Promise.all([t.get(ref),t.get(db.doc('configuracion/modelo'))]);
        if (actual.get('cursor') !== estado.cursor) throw new Error('CURSOR_MIGRACION_CAMBIO');
        const nuevo = {...actual.data(),estado:actual.get('reconciliar') ? 'RECONCILIAR' : 'LISTO'};
        t.set(ref,nuevo);
        t.update(modelo.ref,{version_esquema:2,hash_modelo:plan.hash_modelo,rutas:plan.rutas,revision:Number(modelo.get('revision'))+1});
        return nuevo;
      });
    }
    for (const doc of pagina.docs) {
      await db.runTransaction(async t => {
        const [actual,origen,respaldo] = await Promise.all([t.get(ref),t.get(doc.ref),t.get(db.doc(`clinica_migracion_006_respaldo/${doc.id}`))]);
        if (actual.get('estado') !== 'MIGRANDO') throw new Error('ESTADO_MIGRACION_CAMBIO');
        if (actual.get('cursor') >= doc.id) return;
        const datos = origen.data();
        if (!datos) throw new Error('CONSULTA_CAMBIO_DURANTE_MIGRACION');
        validarDocumento(`consultas/${doc.id}`,datos);
        const signos = datos.signos_vitales ?? Object.fromEntries(Object.entries(datos.control_crecimiento ?? {}).map(([k,v])=>[k === 'frecuencia_cardiaca' ? 'frecuencia_cardiaca_lpm' : k,v]));
        const nuevo = {...datos,...(Object.keys(signos).length ? {signos_vitales:signos} : {})};
        validarDocumento(`consultas/${doc.id}`,nuevo);
        if (!respaldo.exists) t.create(respaldo.ref,datos);
        t.set(doc.ref,nuevo);
        t.update(ref,{cursor:doc.id,reconciliar:actual.get('reconciliar') || !datos.snapshot_v1});
      });
    }
    await despuesDePagina?.();
  }
}
