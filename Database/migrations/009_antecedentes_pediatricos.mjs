/** Extensión aditiva: no altera M04 ni reinterpreta antecedentes legados sin autoría.
 * Detener escritores pediátricos antes de ejecutar. Respaldo y cursor son durables.
 */
export const CONTRATO_ANTECEDENTES_PEDIATRICOS = 'antecedentes-pediatricos-v1-2026-11-01';
export async function prepararAntecedentesPediatricos(db, {despuesDePagina} = {}) {
  const ref=db.doc('pediatria_configuracion/antecedentes');
  await db.runTransaction(async t=>{
    const [anterior,clinica]=await Promise.all([t.get(ref),t.get(db.doc('clinica_configuracion/modelo'))]);
    if(clinica.get('estado')!=='LISTO'||clinica.get('version')!==1)throw new Error('REQUIERE_CLINICA_006_LISTA');
    if(anterior.exists){
      if(anterior.get('version')!==1||anterior.get('contrato')!==CONTRATO_ANTECEDENTES_PEDIATRICOS)throw new Error('CONTRATO_ANTECEDENTES_INCOMPATIBLE');
      return;
    }
    t.create(ref,{version:1,contrato:CONTRATO_ANTECEDENTES_PEDIATRICOS,estado:'MIGRANDO',cursor:'',reconciliar:false});
  });
  while(true){
    const estado=(await ref.get()).data();
    if(estado.estado!=='MIGRANDO')return estado;
    let query=db.collection('pacientes').orderBy('__name__');
    if(estado.cursor)query=query.startAfter(estado.cursor);
    const pagina=await query.limit(20).get();
    if(pagina.empty)return db.runTransaction(async t=>{
      const actual=await t.get(ref);
      if(actual.get('estado')!=='MIGRANDO'||actual.get('cursor')!==estado.cursor)throw new Error('MIGRACION_CONCURRENTE');
      const nuevo={...actual.data(),estado:actual.get('reconciliar')?'RECONCILIAR':'LISTO'};
      t.set(ref,nuevo);return nuevo;
    });
    for(const paciente of pagina.docs)await db.runTransaction(async t=>{
      const [actual,alergias,antecedentes]=await Promise.all([t.get(ref),t.get(paciente.ref.collection('alergias').limit(101)),t.get(paciente.ref.collection('antecedentes').limit(101))]);
      if(actual.get('estado')!=='MIGRANDO')throw new Error('MIGRACION_ESTADO_CAMBIO');
      if(actual.get('cursor')>=paciente.id)return;
      if(alergias.size>100||antecedentes.size>100)throw new Error('LEGADO_EXCEDE_LIMITE_RECONCILIAR');
      // Copia íntegra; el nuevo modelo no finge fecha/autor ni ausencia de alergias.
      for(const [tipo,docs] of [['alergias',alergias.docs],['antecedentes',antecedentes.docs]]){
        for(const doc of docs)t.create(db.doc(`pediatria_respaldo_009/${paciente.id}/${tipo}/${doc.id}`),doc.data());
      }
      t.update(ref,{cursor:paciente.id,reconciliar:actual.get('reconciliar')||!alergias.empty||!antecedentes.empty});
    });
    await despuesDePagina?.();
  }
}
