import type { EjecutorSql } from '../../sql/tipos-sql.js';
import type { PuertosClinicos,AntecedentesClinicos,RegistroAntecedente,AlergiaAntecedente } from '../../../../aplicacion/puertos/clinica.js';
import type { CambioPlanificado } from '../../../../aplicacion/puertos/nucleo.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';

export function crearAntecedentesHospital(sql:EjecutorSql):NonNullable<PuertosClinicos['antecedentes']>{
  return {async porPaciente(id){
    const r=await sql.consultar(`SELECT a.id_publico,a.tipo,a.descripcion,a.observaciones FROM antecedente_medico a JOIN paciente p USING(id_paciente) WHERE p.id_publico=$1 ORDER BY a.id_antecedente LIMIT 101`,[id]);
    const al=await sql.consultar(`SELECT pa.id_publico,a.nombre,pa.severidad,pa.tipo_reaccion,to_char(pa.fecha_registro,'YYYY-MM-DD') AS fecha FROM paciente_alergia pa JOIN paciente p USING(id_paciente) JOIN alergia a USING(id_alergia) WHERE p.id_publico=$1 ORDER BY pa.id_paciente_alergia LIMIT 101`,[id]);
    if(r.filas.length>100||al.filas.length>100)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Antecedentes extensos requieren lectura histórica paginada.');
    const datos:AntecedentesClinicos={patologicos:[],quirurgicos:[],familiares:[],alergias:[],medicamentos_actuales:[],registros:[]};
    const patologicos:string[]=[],quirurgicos:string[]=[],familiares:string[]=[],medicamentos:string[]=[],alergias:AlergiaAntecedente[]=[],registros:RegistroAntecedente[]=[];
    for(const f of r.filas){
      let fecha='';try{fecha=String((JSON.parse(String(f.observaciones)) as Record<string,unknown>)?.fechaRegistro??'');}catch{/* Observación legada preservada en su fila. */}
      const tipo=String(f.tipo),descripcion=String(f.descripcion);registros.push({id:uuidPublico(f.id_publico),tipo,descripcion,fecha_registro:fecha});
      if(tipo==='QUIRURGICO')quirurgicos.push(descripcion);else if(tipo==='FAMILIAR')familiares.push(descripcion);else if(tipo==='MEDICAMENTO_ACTUAL')medicamentos.push(descripcion);else patologicos.push(descripcion);
    }
    for(const f of al.filas){
      if(!['LEVE','MODERADA','SEVERA'].includes(String(f.severidad)))throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Alergia legada requiere reconciliar severidad.');
      const sustancia=String(f.nombre),severidad=String(f.severidad) as AlergiaAntecedente['severidad'],reaccion=String(f.tipo_reaccion??'');
      alergias.push({sustancia,severidad,reaccion,fechaRegistro:String(f.fecha)});
      registros.push({id:uuidPublico(f.id_publico),tipo:'ALERGIA',descripcion:`${sustancia} [${severidad}]: ${reaccion}`,fecha_registro:String(f.fecha)});
    }
    return {...datos,patologicos,quirurgicos,familiares,alergias,medicamentos_actuales:medicamentos,registros};
  }};
}
/** La interfaz hospitalaria v1 amplía antecedentes; no elimina ni reinterpreta registros existentes. */
export async function ampliarAntecedentesHospital(sql:EjecutorSql,c:CambioPlanificado){
  const nuevos=c.nuevoEstado as AntecedentesClinicos,actual=await crearAntecedentesHospital(sql).porPaciente(c.recursoId);
  if(actual.registros.some(r=>!nuevos.registros.some(n=>n.id===r.id&&n.descripcion===r.descripcion&&n.tipo===r.tipo)))throw new ErrorDominio('SOLICITUD_INVALIDA','Los antecedentes existentes se conservan; agregue un registro nuevo para ampliarlos.');
  if(nuevos.registros.length>100)throw new ErrorDominio('SOLICITUD_INVALIDA','Máximo de 100 antecedentes.');
  for(const n of nuevos.registros){
    if(actual.registros.some(r=>r.id===n.id))continue;
    if(n.tipo==='ALERGIA'){
      const a=nuevos.alergias.find(a=>`${a.sustancia} [${a.severidad}]: ${a.reaccion}`===n.descripcion);
      if(!a||a.sustancia.length>150)throw new ErrorDominio('SOLICITUD_INVALIDA','Alergia inválida.');
      const cat=await sql.consultar(`INSERT INTO alergia(nombre) VALUES($1) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_alergia`,[a.sustancia]);
      await sql.consultar(`INSERT INTO paciente_alergia(id_publico,id_paciente,id_alergia,tipo_reaccion,severidad,fecha_registro)
        SELECT $1,id_paciente,$3,$4,$5,$6::date FROM paciente WHERE id_publico=$2`,[n.id,c.recursoId,cat.filas[0]!.id_alergia,a.reaccion,a.severidad,n.fecha_registro]);
    }else await sql.consultar(`INSERT INTO antecedente_medico(id_publico,id_paciente,tipo,descripcion,observaciones)
      SELECT $1,id_paciente,$3,$4,$5 FROM paciente WHERE id_publico=$2`,[n.id,c.recursoId,n.tipo,n.descripcion,JSON.stringify({fechaRegistro:n.fecha_registro})]);
  }
}
