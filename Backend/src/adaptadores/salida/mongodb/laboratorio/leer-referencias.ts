import type {Db,ClientSession,Document} from 'mongodb';
import type {UUID} from '../../../../dominio/compartido/uuid.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../../dominio/compartido/version.js';
import {congelarPrueba} from '../../../../dominio/laboratorio/ordenes.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import type {PuertosLaboratorio} from '../../../../aplicacion/puertos/laboratorio.js';
type Referencias=Pick<PuertosLaboratorio,'solicitantePorId'|'tipoMuestraPorId'|'metodoPorId'|'proveedorPorId'|'pruebaPorId'|'revisionPruebaPorId'|'revisionMetodoPorId'>;
const texto=(v:unknown):string=>{if(typeof v!=='string'||!v.trim())throw new Error('TEXTO_INVALIDO');return v;};
const activo=(v:unknown):boolean=>{if(typeof v!=='boolean')throw new Error('ESTADO_INVALIDO');return v;};
const opcionales=(d:Document,campos:Record<string,string>)=>Object.fromEntries(Object.entries(campos).filter(([,fisico])=>d[fisico]!==undefined).map(([nombre,fisico])=>[nombre,texto(d[fisico])]));
/** Todos los accesos conservan session y UUID; actividad se devuelve, no se oculta como inexistencia. */
export function crearLectoresReferenciasMongodb(db:Db,session:ClientSession):Referencias{
 async function leer<T>(coleccion:string,id:UUID,mapear:(d:Document)=>T):Promise<T|null>{
  try{
   const d=await db.collection<{_id:string}&Document>(coleccion).findOne({_id:uuidPublico(id)},{session});
   return d?mapear(d):null;
  }catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La referencia de laboratorio requiere preparación compatible.');}
 }
 return {
  revisionMetodoPorId:id=>leer('metodos',id,d=>versionPositiva(Number(d.revision))),
  revisionPruebaPorId:id=>leer('pruebas',id,d=>versionPositiva(Number(d.revision))),
  solicitantePorId:id=>leer('solicitantes',id,d=>{
   if(!['MEDICO','INSTITUCION'].includes(d.tipo))throw new Error('TIPO_INVALIDO');
   return Object.freeze({id:uuidPublico(d._id),version:versionPositiva(Number(d.revision)),nombre:texto(d.nombre_completo),tipo:d.tipo as 'MEDICO'|'INSTITUCION',activo:activo(d.activo),
    ...opcionales(d,{institucion:'institucion',telefono:'telefono',correo:'correo'}),
    ...(d.tipo==='MEDICO'?{entidadColegiacion:texto(d.entidad_colegiacion),numeroColegiado:texto(d.numero_colegiado)}:{})});
  }),
  tipoMuestraPorId:id=>leer('tipos_muestra',id,d=>Object.freeze({id:uuidPublico(d._id),version:versionPositiva(Number(d.revision)),codigo:texto(d.codigo),nombre:texto(d.nombre),recipiente:texto(d.recipiente_requerido),activo:activo(d.activo),...opcionales(d,{descripcion:'descripcion',condicionesConservacion:'condiciones_conservacion'})})),
  metodoPorId:id=>leer('metodos',id,d=>Object.freeze({id:uuidPublico(d._id),version:versionPositiva(Number(d.version)),codigo:texto(d.codigo),nombre:texto(d.nombre),activo:activo(d.activo)})),
  proveedorPorId:id=>leer('proveedores',id,d=>Object.freeze({id:uuidPublico(d._id),version:versionPositiva(Number(d.revision)),nombre:texto(d.nombre),activo:activo(d.activo),tipoIdentificacion:texto(d.tipo_identificacion),numeroIdentificacion:texto(d.numero_identificacion),...opcionales(d,{telefono:'telefono',correo:'correo',direccion:'direccion'})})),
  pruebaPorId:id=>leer('pruebas',id,d=>{
   const habilitada=activo(d.activo);
   // Validar estructura aunque esté inactiva; aplicación decide si admite selección nueva.
   const p=congelarPrueba({id:uuidPublico(d._id),codigo:texto(d.codigo),nombre:texto(d.nombre),version:versionPositiva(Number(d.version)),activo:true,
    metodoId:uuidPublico(d.metodo_id),tiposMuestraIds:d.tipo_muestra_ids,parametros:(d.parametros as Document[]).map(v=>({id:uuidPublico(v.parametro_id),codigo:texto(v.codigo),nombre:texto(v.nombre),tipo:v.tipo_valor,obligatorio:v.obligatorio,
     ...(v.unidad_sugerida===undefined?{}:{unidad:texto(v.unidad_sugerida)}),...(v.opciones_permitidas===undefined?{}:{opciones:v.opciones_permitidas})}))});
   return Object.freeze({...p,activo:habilitada});
  }),
 };
}
