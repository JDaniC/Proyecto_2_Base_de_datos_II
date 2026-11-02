import type { EjecutorSql } from '../../../sql/tipos-sql.js';
import type { FiltroServiciosHospital, RegistroServicioHospital, TipoServicioHospital } from '../../../../../aplicacion/puertos/servicios-hospitalarios.js';
import { uuidPublico, type UUID } from '../../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../../dominio/compartido/version.js';
import { ErrorDominio } from '../../../../../dominio/compartido/error-dominio.js';

export function hoyHospital(){
  const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const v=(t:string)=>partes.find(p=>p.type===t)!.value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}
export async function preparado(sql: EjecutorSql) {
  const r=await sql.consultar<{version:number;estado:string}>(`SELECT s.version,CASE WHEN h.estado='LISTO' AND h.version=1 THEN s.estado ELSE 'RECONCILIAR' END AS estado FROM hospital_servicios.modelo s CROSS JOIN hospital_historial.modelo h WHERE s.id=1 AND h.id=1`);
  if (r.filas[0]?.version!==1 || r.filas[0]?.estado!=='LISTO') throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Servicios hospitalarios requieren preparación o reconciliación.');
}
export function registro(f: Record<string,unknown>): RegistroServicioHospital {
  const contenido=typeof f.contenido==='string' ? JSON.parse(f.contenido) as Record<string,unknown> : f.contenido as Record<string,unknown>;
  if (Buffer.byteLength(JSON.stringify(contenido),'utf8')>260000) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Proyección excesiva.');
  if(contenido.id!==f.id||contenido.pacienteId!==f.paciente_id||Number(contenido.version)!==Number(f.revision))throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Proyección inconsistente.');
  return {id:uuidPublico(f.id),pacienteId:uuidPublico(f.paciente_id),version:versionPositiva(Number(f.revision)),tipo:f.tipo as TipoServicioHospital,contenido};
}
export async function porId(sql:EjecutorSql,tipo:TipoServicioHospital,id:UUID,pacienteId?:UUID) {
  const r=await sql.consultar('SELECT * FROM hospital_servicios.recursos WHERE tipo=$1 AND id=$2'+(pacienteId?' AND paciente_id=$3':''),pacienteId?[tipo,id,pacienteId]:[tipo,id]);
  return r.filas[0] ? registro(r.filas[0]) : null;
}
export async function listar(sql:EjecutorSql,tipo:TipoServicioHospital,f:FiltroServiciosHospital,hoy=hoyHospital()) {
  await preparado(sql);
  if(tipo==='procedimiento'&&f.pacienteId){
    const r=await sql.consultar(`SELECT * FROM (
      SELECT id,tipo,paciente_id,revision,contenido,fecha_hora FROM hospital_servicios.recursos WHERE tipo='procedimiento' AND paciente_id=$1
      UNION ALL
      SELECT (x->>'id')::uuid,'procedimiento',p.id_publico,1,
        x || jsonb_build_object('id',x->>'id','version',1,'pacienteId',p.id_publico,'origen','HOSPITALIZACION','origenReferencia',h.id_publico),
        (x->>'fechaHora')::timestamptz
      FROM hospitalizacion h JOIN paciente p USING(id_paciente)
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE((CASE WHEN pg_input_is_valid(h.observaciones,'jsonb') THEN h.observaciones::jsonb ELSE '{}'::jsonb END)->'procedimientos','[]'::jsonb)) x
      WHERE p.id_publico=$1) todos ORDER BY fecha_hora DESC,id DESC LIMIT $2 OFFSET $3`,[f.pacienteId,f.limite+1,(f.pagina-1)*f.limite]);
    return r.filas.map(registro);
  }
  const args:unknown[]=[tipo], filtros=['tipo=$1'];
  if(f.pacienteId){args.push(f.pacienteId);filtros.push(`paciente_id=$${args.length}`);}
  if(f.ordenId){args.push(f.ordenId);filtros.push(`orden_id=$${args.length}`);}
  if(f.estado){if(tipo==='poliza')args.push(hoy);args.push(f.estado);filtros.push(`${tipo==='poliza'?`CASE WHEN contenido->>'estadoVigencia'='ACTIVA' AND contenido->>'vigenciaHasta'<$${args.length-1} THEN 'VENCIDA' ELSE contenido->>'estadoVigencia' END`:"contenido->>'estado'"}=$${args.length}`);}
  args.push(f.limite+1,(f.pagina-1)*f.limite);
  const r=await sql.consultar(`SELECT * FROM hospital_servicios.recursos WHERE ${filtros.join(' AND ')} ORDER BY fecha_hora DESC,id DESC LIMIT $${args.length-1} OFFSET $${args.length}`,args);
  return r.filas.map(registro);
}
export async function catalogos(sql:EjecutorSql) {
  await preparado(sql);
  const examenes=await sql.consultar(`SELECT e.id_publico AS id,e.nombre,COALESCE(e.tipo,'') AS seccion,e.revision AS version,c.activo AS activo,
    c.metodo AS "metodoAnalitico",c.tipo_muestra AS "tipoMuestra",c.tiempo_horas AS "tiempoEntregaHoras",
    COALESCE((SELECT jsonb_agg(jsonb_build_object('parametroId',p.id_publico,'nombre',p.nombre,'unidadMedida',COALESCE(u.codigo,''),'rangoReferencia',ep.referencia) ORDER BY p.id_publico)
      FROM hospital_servicios.examen_parametro ep JOIN parametro_examen p USING(id_parametro) LEFT JOIN unidad_medida u USING(id_unidad)
      WHERE ep.id_examen=e.id_examen AND ep.activo),'[]'::jsonb) AS parametros
    FROM examen_medico e JOIN hospital_servicios.catalogo_examen c USING(id_examen) ORDER BY e.nombre LIMIT 101`);
  const aseguradoras=await sql.consultar(`SELECT a.id_publico AS id,a.nombre,a.telefono AS "telefonoAutorizaciones",a.estado,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id_publico,'nombrePlan',p.nombre_plan,'porcentajeCobertura',p.porcentaje_cobertura,
      'activo',p.estado='ACTIVO','moneda',p.moneda,'limiteCentavos',(p.monto_maximo_cobertura*100)::bigint) ORDER BY p.id_publico)
      FROM plan_seguro p WHERE p.id_aseguradora=a.id_aseguradora),'[]'::jsonb) AS planes FROM aseguradora a ORDER BY a.nombre LIMIT 101`);
  const procedimientos=await sql.consultar(`SELECT p.id_publico AS id,p.nombre,p.descripcion,c.activo FROM procedimiento p JOIN hospital_servicios.catalogo_procedimiento c USING(id_procedimiento) ORDER BY p.nombre LIMIT 101`);
  const especialidades=await sql.consultar('SELECT id_publico AS id,nombre,descripcion FROM especialidad ORDER BY nombre LIMIT 101');
  const medicamentos=await sql.consultar(`SELECT m.id_publico AS id,m.nombre,m.presentacion,u.codigo AS unidad FROM medicamento m LEFT JOIN unidad_medida u ON u.id_unidad=m.id_unidad_base ORDER BY m.nombre LIMIT 101`);
  const grupos=[examenes.filas,aseguradoras.filas,procedimientos.filas,especialidades.filas,medicamentos.filas];
  if(grupos.some(g=>g.length>100)||examenes.filas.some(e=>(e.parametros as unknown[]).length>100)||aseguradoras.filas.some(a=>(a.planes as unknown[]).length>100))throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Catálogo extenso requiere preparación paginada.');
  const respuesta={examenes:examenes.filas.map(e=>({...e,version:versionPositiva(Number(e.version))})),aseguradoras:aseguradoras.filas,procedimientos:procedimientos.filas,especialidades:especialidades.filas,medicamentos:medicamentos.filas};
  if(Buffer.byteLength(JSON.stringify(respuesta),'utf8')>240000)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Catálogo excesivo.');
  return respuesta;
}
