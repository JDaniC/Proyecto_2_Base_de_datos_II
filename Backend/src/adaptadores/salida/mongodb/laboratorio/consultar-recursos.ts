import type {Db,ClientSession,Document,Filter} from 'mongodb';
import type {Permiso} from '../../../../dominio/compartido/autorizacion.js';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type {ConsultasLaboratorio,ItemCatalogoLaboratorio} from '../../../../aplicacion/puertos/laboratorio.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../../dominio/compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../../../dominio/compartido/error-dominio.js';
import {verificarLaboratorioMongodb} from './verificar-preparacion.js';
import {crearLectorOrdenMongodb} from './leer-orden.js';
import {crearLectorMuestraMongodb} from './leer-muestra.js';
import {crearLectoresReferenciasMongodb} from './leer-referencias.js';
import {CursorCatalogoLaboratorio} from './cursor-catalogo.js';
const colecciones={solicitantes:'solicitantes',tiposMuestra:'tipos_muestra',metodos:'metodos',pruebas:'pruebas',proveedores:'proveedores'} as const;
export function crearConsultasLaboratorioMongodb(db:Db,codec=new CursorCatalogoLaboratorio()):ConsultasLaboratorio{
 function exigir(c:ContextoAutenticado,permisos:readonly Permiso[]){if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||!permisos.some(p=>c.cuenta.permisos.includes(p)))throw new ErrorDominio('SIN_PERMISO','No puede consultar este recurso.');}
 async function snapshot<T>(leer:(s:ClientSession)=>Promise<T>):Promise<T>{
  await verificarLaboratorioMongodb(db);const s=db.client.startSession();
  try{s.startTransaction({readConcern:{level:'snapshot'}});const valor=await leer(s);await s.commitTransaction();return valor;}
  catch(e){if(s.inTransaction())await s.abortTransaction();if(e instanceof ErrorDominio)throw e;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No fue posible consultar laboratorio.');}finally{await s.endSession();}
 }
 return {
  async ordenPorId(c,id){exigir(c,['ordenes.administrar']);return snapshot(s=>crearLectorOrdenMongodb(db,s).porId(uuidPublico(id)));},
  async muestraPorId(c,id){exigir(c,['muestras.administrar']);return snapshot(s=>crearLectorMuestraMongodb(db,s).porId(uuidPublico(id)));},
  async listarCatalogo(c,tipo,f,p){
   if(!Object.hasOwn(colecciones,tipo))throw solicitudInvalida('Catálogo no admitido.');
   exigir(c,tipo==='solicitantes'||tipo==='proveedores'?['ordenes.administrar']:['ordenes.administrar','muestras.administrar','resultados.analizar','resultados.validar']);
   if(Object.keys(f).some(k=>!['activo','q'].includes(k))||(f.activo!==undefined&&typeof f.activo!=='boolean')||(f.q!==undefined&&(typeof f.q!=='string'||!f.q.trim()||f.q.length>120))||!Number.isInteger(p.limite)||p.limite<1||p.limite>100||!['ASC','DESC'].includes(p.orden))throw solicitudInvalida('Consulta de catálogo inválida.');
   const q=f.q?.trim()??'',filtro:Filter<{_id:string}&Document>={};if(f.activo!==undefined)filtro.activo=f.activo;
   if(q){const literal=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const nombre=tipo==='solicitantes'?'nombre_completo':'nombre';filtro.$or=[{[nombre]:{$regex:`^${literal}`,$options:'i'}},...(['metodos','pruebas','tiposMuestra'].includes(tipo)?[{codigo:{$regex:`^${literal}`,$options:'i'}}]:[])];}
   const ambito=JSON.stringify(['LABORATORIO_CLINICO',c.cuenta.id,c.cuenta.version,[...c.cuenta.permisos].sort(),tipo,f.activo??null,q,p.orden]);
   if(p.cursor!==undefined)filtro._id={[p.orden==='ASC'?'$gt':'$lt']:codec.decodificar(p.cursor,ambito)};
   const resultado=await snapshot(async session=>{
    const docs=await db.collection<{_id:string}&Document>(colecciones[tipo]).find(filtro,{session,maxTimeMS:3000}).sort({_id:p.orden==='ASC'?1:-1}).limit(p.limite+1).toArray();
    const refs=crearLectoresReferenciasMongodb(db,session),elementos:ItemCatalogoLaboratorio[]=[];
    for(const d of docs.slice(0,p.limite)){
     const id=uuidPublico(d._id);
     if(tipo==='pruebas'){
      const prueba=await refs.pruebaPorId(id);if(!prueba||typeof d.area!=='string'||!d.area.trim())throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Catálogo incompleto.');
      elementos.push({...prueba,area:d.area,revision:versionPositiva(Number(d.revision))});
     }else if(tipo==='metodos'){
      const metodo=await refs.metodoPorId(id);if(!metodo||(d.descripcion!==undefined&&typeof d.descripcion!=='string'))throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Método incompleto.');
      elementos.push({...metodo,revision:versionPositiva(Number(d.revision)),...(d.descripcion===undefined?{}:{descripcion:d.descripcion})});
     }else{
      const dato=tipo==='solicitantes'?await refs.solicitantePorId(id):tipo==='tiposMuestra'?await refs.tipoMuestraPorId(id):await refs.proveedorPorId(id);
      if(!dato)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Catálogo inconsistente.');elementos.push(dato);
     }
    }
    return {elementos,ultimo:docs[Math.min(docs.length,p.limite)-1]?._id,mas:docs.length>p.limite};
   });
   return {elementos:resultado.elementos,...(resultado.mas&&resultado.ultimo?{siguienteCursor:codec.codificar(ambito,resultado.ultimo)}:{})};
  },
 };
}
