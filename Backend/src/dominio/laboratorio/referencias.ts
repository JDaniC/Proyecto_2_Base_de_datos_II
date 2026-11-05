import {objetoCerrado,textoClinico} from '../clinica/consulta.js';
import {solicitudInvalida} from '../compartido/error-dominio.js';
export type TipoReferenciaAdministrativa='solicitante'|'tipoMuestra'|'proveedor';
const campos:Record<TipoReferenciaAdministrativa,readonly string[]>={
 solicitante:['nombre','tipo','entidadColegiacion','numeroColegiado','institucion','telefono','correo','activo'],
 tipoMuestra:['codigo','nombre','recipiente','descripcion','condicionesConservacion','activo'],
 proveedor:['nombre','tipoIdentificacion','numeroIdentificacion','telefono','correo','direccion','activo'],
};
export function validarReferenciaAdministrativa(tipo:TipoReferenciaAdministrativa,entrada:unknown):Readonly<Record<string,unknown>>{
 if(!['solicitante','tipoMuestra','proveedor'].includes(tipo))throw solicitudInvalida('Referencia no admitida.');
 const e=objetoCerrado(entrada,campos[tipo]);
 if(typeof e.activo!=='boolean')throw solicitudInvalida('Estado booleano requerido.','activo');
 const r:Record<string,unknown>={nombre:textoClinico(e.nombre,'nombre',200).trim(),activo:e.activo};
 const obligatorios=tipo==='tipoMuestra'?{codigo:40,recipiente:200}:tipo==='proveedor'?{tipoIdentificacion:40,numeroIdentificacion:80}:{};
 for(const [k,max] of Object.entries(obligatorios))r[k]=textoClinico(e[k],k,max).trim();
 if(tipo==='solicitante'){
  if(!['MEDICO','INSTITUCION'].includes(e.tipo as string))throw solicitudInvalida('Tipo de solicitante inválido.');r.tipo=e.tipo;
  if(e.tipo==='MEDICO'){r.entidadColegiacion=textoClinico(e.entidadColegiacion,'entidadColegiacion',200).trim();r.numeroColegiado=textoClinico(e.numeroColegiado,'numeroColegiado',60).trim();}
  else if(e.entidadColegiacion!==undefined||e.numeroColegiado!==undefined)throw solicitudInvalida('La institución no tiene colegiación individual.');
 }
 const opcionales:Record<string,number>={institucion:200,telefono:40,correo:254,descripcion:2000,condicionesConservacion:2000,direccion:2000};
 for(const k of campos[tipo])if(e[k]!==undefined&&opcionales[k]!==undefined)r[k]=e[k]===null?null:textoClinico(e[k],k,opcionales[k]!).trim();
 return Object.freeze(r);
}
