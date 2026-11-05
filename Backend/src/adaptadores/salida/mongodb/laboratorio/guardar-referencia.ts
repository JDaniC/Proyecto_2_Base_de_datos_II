import type {Db,ClientSession,Document} from 'mongodb';
import {validarReferenciaAdministrativa,type TipoReferenciaAdministrativa} from '../../../../dominio/laboratorio/referencias.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import type {CambioPlanificado} from '../../../../aplicacion/puertos/nucleo.js';
const colecciones={solicitante:'solicitantes',tipoMuestra:'tipos_muestra',proveedor:'proveedores'} as const;
const fisicos:Record<string,string>={nombre:'nombre',tipo:'tipo',entidadColegiacion:'entidad_colegiacion',numeroColegiado:'numero_colegiado',institucion:'institucion',telefono:'telefono',correo:'correo',activo:'activo',codigo:'codigo',recipiente:'recipiente_requerido',descripcion:'descripcion',condicionesConservacion:'condiciones_conservacion',tipoIdentificacion:'tipo_identificacion',numeroIdentificacion:'numero_identificacion',direccion:'direccion'};
export async function guardarReferenciaMongodb(db:Db,session:ClientSession,c:CambioPlanificado):Promise<void>{
 const n=c.nuevoEstado as {id:string;version:number;datos:unknown;tipoReferencia:TipoReferenciaAdministrativa};
 const datos=validarReferenciaAdministrativa(n.tipoReferencia,n.datos);
 if(n.id!==c.recursoId||colecciones[n.tipoReferencia]!==c.agregado||n.version!==(c.versionAnterior===null?1:c.versionAnterior+1))throw new ErrorDominio('ESTADO_INVALIDO','Plan de referencia incompatible.');
 const campos:Document={revision:n.version};
 const retirados:Document={};
 for(const [k,v]of Object.entries(datos)){const campo=n.tipoReferencia==='solicitante'&&k==='nombre'?'nombre_completo':fisicos[k]!;if(v===null)retirados[campo]='';else campos[campo]=v;}
 const col=db.collection<{_id:string}&Document>(c.agregado);
 if(c.versionAnterior===null)await col.insertOne({_id:uuidPublico(n.id),...campos},{session});
 else{const r=await col.updateOne({_id:n.id,revision:c.versionAnterior},Object.keys(retirados).length?{$set:campos,$unset:retirados}:{$set:campos},{session});if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La referencia cambió.');}
}
