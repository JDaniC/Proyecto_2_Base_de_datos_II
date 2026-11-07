import {createHash} from 'node:crypto';

const ordenar=v=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(ordenar(v))).digest('hex');
const HUELLA_ORIGEN='847d819eff4737623af6323b217d69f1550c1e283122d0c4376e954bd9f048aa';
const id={bsonType:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'};
const indicesOrigen=[
 {name:'uq_resultado_serie_version',key:{serie_resultado_id:1,version:1},unique:true},
 {name:'ix_resultado_orden_item',key:{orden_id:1,item_id:1,fecha_analisis:1,_id:1}},
 {name:'ix_resultado_estado_fecha',key:{estado:1,fecha_analisis:1,_id:1}},
];
const indicesDestino=[...indicesOrigen,
 {name:'ix_resultado_fecha',key:{fecha_analisis:1,_id:1}},
 {name:'ix_resultado_orden_fecha',key:{orden_id:1,fecha_analisis:1,_id:1}},
 {name:'ix_resultado_item_fecha',key:{item_id:1,fecha_analisis:1,_id:1}},
 {name:'ix_resultado_serie_fecha',key:{serie_resultado_id:1,fecha_analisis:1,_id:1}},
 {name:'ix_resultado_paciente_fecha',key:{paciente_id:1,fecha_analisis:1,_id:1},partialFilterExpression:{paciente_id:{$type:'string'}}},
 {name:'ix_resultado_repeticion',key:{resultado_repetido_de_id:1,fecha_analisis:1,_id:1},partialFilterExpression:{resultado_repetido_de_id:{$type:'string'}}},
];
export const manifiestoResultadosMongodb=Object.freeze({id:12,version:1,huella:hash({id:12,version:1,origen:HUELLA_ORIGEN,indices:indicesDestino})});

function destinoDesde(origen){
 const destino=structuredClone(origen),json=destino.$and?.[0]?.$jsonSchema;
 if(!json?.properties||!Array.isArray(json.required)||!Array.isArray(json.allOf))throw new Error('ESQUEMA_RESULTADOS_DESCONOCIDO');
 json.properties.paciente_id=structuredClone(id);json.properties.resultado_repetido_de_id=structuredClone(id);
 // Solo documentos nuevos de aplicación requieren paciente; el campo queda opcional para preservar legado sin inventar vínculos.
 json.allOf.push({anyOf:[{not:{required:['resultado_repetido_de_id']}},{properties:{version:{enum:[1]}},not:{required:['resultado_anterior_id']}}]});
 return destino;
}
/** En listIndexes un índice sin collation usa simple; el esperado sin collation hereda la colección. */
function indiceCompatible(actual,esperado,collationColeccion={locale:'simple'}){return actual&&JSON.stringify(actual.key)===JSON.stringify(esperado.key)&&Boolean(actual.unique)===Boolean(esperado.unique)&&hash(actual.partialFilterExpression??null)===hash(esperado.partialFilterExpression??null)&&hash(actual.collation??{locale:'simple'})===hash(esperado.collation??collationColeccion);}

/** ADMIN, respaldo externo verificado y escritores de resultados detenidos. No modifica documentos clínicos. */
export async function migrarResultadosLaboratorioMongodb(db,{escritoresDetenidos=false,despuesDeValidador}={}){
 if(!escritoresDetenidos)throw new Error('DETENER_ESCRITORES_RESULTADOS');
 const modelos=db.collection('historial_modelo'),previa=await modelos.findOne({id:11});
 if(!previa||previa.version!==1||previa.estado!=='LISTO')throw new Error('LABORATORIO_011_NO_LISTO');
 const manifiestoPrevio=await modelos.findOne({id:12});
 if(manifiestoPrevio&&(manifiestoPrevio.version!==1||manifiestoPrevio.huella!==manifiestoResultadosMongodb.huella||!['MIGRANDO','LISTO'].includes(manifiestoPrevio.estado)))throw new Error('MANIFIESTO_RESULTADOS_INCOMPATIBLE');
 const info=(await db.listCollections({name:'resultados'},{nameOnly:false}).toArray())[0];
 if(!info||info.options?.validationLevel!=='strict'||info.options?.validationAction!=='error')throw new Error('ESQUEMA_RESULTADOS_DESCONOCIDO');
 let origen=info.options.validator,destino;
 if(hash(origen)===HUELLA_ORIGEN)destino=destinoDesde(origen);
 else{
  // En recuperación, el respaldo inmutable permite reconstruir y reconocer exactamente el destino esperado.
  const respaldo=manifiestoPrevio?.respaldo?.validator;
  if(!respaldo||hash(respaldo)!==HUELLA_ORIGEN)throw new Error('ESQUEMA_RESULTADOS_DESCONOCIDO');
  destino=destinoDesde(respaldo);if(hash(origen)!==hash(destino))throw new Error('ESQUEMA_RESULTADOS_DESCONOCIDO');
 }
 const indices=await db.collection('resultados').listIndexes().toArray(),collationColeccion=info.options?.collation??{locale:'simple'};
 for(const esperado of indicesOrigen)if(!indiceCompatible(indices.find(v=>v.name===esperado.name),esperado,collationColeccion))throw new Error('INDICE_RESULTADOS_INCOMPATIBLE');
 for(const esperado of indicesDestino){const actual=indices.find(v=>v.name===esperado.name);if(actual&&!indiceCompatible(actual,esperado,collationColeccion))throw new Error('INDICE_RESULTADOS_INCOMPATIBLE');if(!actual&&indices.some(v=>JSON.stringify(v.key)===JSON.stringify(esperado.key)))throw new Error('INDICE_RESULTADOS_INCOMPATIBLE');}
 if(await db.collection('resultados').countDocuments({$nor:[destino]}))throw new Error('DOCUMENTOS_RESULTADOS_INCOMPATIBLES');
 const huellaValidador=hash(destino);
 await modelos.updateOne({id:12},{$setOnInsert:{respaldo:{validator:origen,indices:indicesOrigen},manifiestoAnterior:manifiestoPrevio??null},$set:{...manifiestoResultadosMongodb,huellaValidador,estado:'MIGRANDO'}},{upsert:true});
 await db.command({collMod:'resultados',validator:destino,validationLevel:'strict',validationAction:'error'});
 await despuesDeValidador?.();
 for(const {key,...opciones} of indicesDestino)await db.collection('resultados').createIndex(key,opciones);
 await modelos.updateOne({id:12,huella:manifiestoResultadosMongodb.huella,huellaValidador},{$set:{estado:'LISTO'}});
 return {...manifiestoResultadosMongodb,huellaValidador,estado:'LISTO'};
}
