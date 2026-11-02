import type { EjecutorSql } from '../../../sql/tipos-sql.js';
import type { SolicitudServicioHospital, RegistroServicioHospital, TipoServicioHospital } from '../../../../../aplicacion/puertos/servicios-hospitalarios.js';
import type { ContextoAutenticado } from '../../../../../aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../../dominio/compartido/version.js';
import { porId } from './lecturas-servicios.js';

export interface EstadoComandoHospital { readonly id: string; readonly fecha: string; readonly ids: readonly string[]; }
const invalida=(mensaje:string): never=>{throw new ErrorDominio('REFERENCIA_INCOMPATIBLE',mensaje);};
const conflicto=(mensaje:string): never=>{throw new ErrorDominio('ESTADO_INVALIDO',mensaje);};
const version=(actual:unknown,esperada:unknown)=>{if(Number(actual)!==Number(esperada))throw new ErrorDominio('VERSION_DESACTUALIZADA','El recurso cambió. Actualice los datos.');};
function objeto(v:unknown): Record<string,unknown>{return v as Record<string,unknown>;}
function lista(v:unknown): Record<string,unknown>[] { return v as Record<string,unknown>[]; }
export function tipoAccion(s:SolicitudServicioHospital): TipoServicioHospital {
  return s.accion.startsWith('orden')?'orden':s.accion.startsWith('poliza')?'poliza':s.accion.startsWith('resultado')?'resultado':'procedimiento';
}
export async function pacienteBloqueado(sql:EjecutorSql,id:string) {
  const r=await sql.consultar(`SELECT p.id_paciente,p.revision,p.id_publico,h.estado_historial,
    CONCAT_WS(' ',p.primer_nombre,p.segundo_nombre,p.primer_apellido,p.segundo_apellido) AS nombre,COALESCE(p.cui,'') AS documento
    FROM paciente p JOIN historial_clinico h USING(id_paciente) WHERE p.id_publico=$1 FOR UPDATE OF p,h`,[id]);
  if(!r.filas[0])throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
  return r.filas[0];
}
export async function guardar(sql:EjecutorSql,tipo:TipoServicioHospital,pacienteId:string,contenido:Record<string,unknown>,estable:EstadoComandoHospital,consultaId?:string,ordenId?:string) {
  if(Buffer.byteLength(JSON.stringify(contenido),'utf8')>240000)throw new ErrorDominio('SOLICITUD_INVALIDA','El recurso supera el tamaño permitido.');
  await sql.consultar(`INSERT INTO hospital_servicios.recursos(id,tipo,paciente_id,consulta_id,orden_id,revision,contenido,fecha_hora)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) ON CONFLICT(id) DO UPDATE SET revision=EXCLUDED.revision,contenido=EXCLUDED.contenido`,
    [contenido.id,tipo,pacienteId,consultaId??null,ordenId??null,contenido.version,JSON.stringify(contenido),estable.fecha]);
  return { id:uuidPublico(contenido.id),pacienteId:uuidPublico(pacienteId),version:versionPositiva(Number(contenido.version)),tipo,contenido } satisfies RegistroServicioHospital;
}
export async function aplicar(sql:EjecutorSql,contexto:ContextoAutenticado,s:SolicitudServicioHospital,estable:EstadoComandoHospital,paciente:Record<string,unknown>) {
  const e=s.datos, tipo=tipoAccion(s);
  const previa=s.recursoId?await porId(sql,tipo,s.recursoId,s.pacienteId):null;
  if(s.recursoId&&!previa)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Recurso no encontrado para el paciente.');
  if(previa)version(previa.version,e.versionEsperada);
  const esNueva=['ordenCrear','polizaAfiliar','procedimientoRegistrar'].includes(s.accion);
  if(esNueva){version(paciente.revision,e.versionPaciente);if(paciente.estado_historial!=='ACTIVO')conflicto('El expediente archivado no admite procesos nuevos.');}
  const autor=await sql.consultar(`SELECT id_personal,id_publico,numero_colegiado,
    CONCAT_WS(' ',primer_nombre,segundo_nombre,primer_apellido,segundo_apellido) AS nombre FROM personal_medico WHERE id_publico=$1 AND estado='ACTIVO' FOR SHARE`,[contexto.cuenta.profesional?.id??null]);
  const medico=autor.filas[0];
  if(!s.accion.startsWith('poliza')&&!medico)throw new ErrorDominio('SIN_PERMISO','Se requiere médico vigente.');
  let consulta:Record<string,unknown>|undefined;
  if(e.consultaId){
    const r=await sql.consultar(`SELECT c.id_consulta,c.revision,c.id_publico FROM consulta c JOIN historial_clinico h USING(id_historial)
      WHERE c.id_publico=$1 AND h.id_paciente=$2 FOR SHARE OF c`,[e.consultaId,paciente.id_paciente]);
    consulta=r.filas[0];if(!consulta)invalida('La consulta no pertenece al paciente.');version(consulta!.revision,e.versionConsulta);
  }
  let respuesta:RegistroServicioHospital;
  switch(s.accion){
    case 'ordenCrear': {
      const pruebas=e.pruebasIds as string[];
      const items:Record<string,unknown>[]=[];
      for(let i=0;i<pruebas.length;i++){
        const r=await sql.consultar(`SELECT em.id_examen,em.id_publico,em.nombre,em.tipo,ce.metodo,ce.tipo_muestra FROM examen_medico em JOIN hospital_servicios.catalogo_examen ce USING(id_examen) WHERE em.id_publico=$1 AND ce.activo FOR SHARE OF em`,[pruebas[i]]);
        const examen=r.filas[0];if(!examen)invalida('Examen de catálogo no disponible.');
        const ps=await sql.consultar(`SELECT p.id_publico AS "parametroId",p.nombre,u.id_publico AS "unidadId",COALESCE(u.codigo,'') AS "unidadMedida",ep.referencia AS "rangoReferencia"
          FROM hospital_servicios.examen_parametro ep JOIN parametro_examen p USING(id_parametro) LEFT JOIN unidad_medida u USING(id_unidad)
          WHERE ep.id_examen=$1 AND ep.activo ORDER BY p.id_publico FOR SHARE OF p`,[examen!.id_examen]);
        if(!ps.filas.length||ps.filas.length>100)invalida('El examen no tiene parámetros preparados.');
        items.push({id:estable.ids[i],pruebaId:examen!.id_publico,codigoPrueba:`EX-${String(examen!.id_publico).slice(0,8)}`,nombre:examen!.nombre,seccion:examen!.tipo,
          metodoAnalitico:examen!.metodo,tipoMuestra:examen!.tipo_muestra,parametros:ps.filas,estado:'PENDIENTE'});
      }
      await sql.consultar(`INSERT INTO orden_examen(id_publico,id_consulta,id_personal_solicitante,fecha_solicitud,indicaciones) VALUES($1,$2,$3,$4,$5)`,[estable.id,consulta!.id_consulta,medico!.id_personal,estable.fecha,e.motivoClinico]);
      for(const item of items)await sql.consultar(`INSERT INTO detalle_orden_examen(id_publico,id_orden,id_examen,indicaciones_muestra)
        SELECT $1,o.id_orden,em.id_examen,$4 FROM orden_examen o,examen_medico em WHERE o.id_publico=$2 AND em.id_publico=$3`,[item.id,estable.id,item.pruebaId,item.tipoMuestra]);
      const contenido={id:estable.id,version:1,pacienteId:s.pacienteId,pacienteNombre:paciente.nombre,pacienteDpi:paciente.documento,
        consultaId:e.consultaId,medicoSolicitanteId:medico!.id_publico,medicoSolicitanteNombre:medico!.nombre,medicoColegiado:medico!.numero_colegiado,
        codigoLegible:`ORD-${estable.id.slice(0,8)}`,institucionId:'HOSPITAL_GENERAL',fechaSolicitud:estable.fecha,estado:'SOLICITADA',prioridad:e.prioridad,
        motivoClinico:e.motivoClinico,...(e.diagnosticoPresuntivoCIE10?{diagnosticoPresuntivoCIE10:e.diagnosticoPresuntivoCIE10}:{}),items};
      respuesta=await guardar(sql,'orden',s.pacienteId,contenido,estable,String(e.consultaId));break;
    }
    case 'ordenCancelar': {
      if(previa!.contenido.estado!=='SOLICITADA')conflicto('Solo una orden sin resultados puede cancelarse.');
      const datos:Record<string,unknown>={...previa!.contenido,estado:'CANCELADA',version:previa!.version+1,motivoCancelacion:e.motivo};
      await sql.consultar("UPDATE orden_examen SET estado='CANCELADA',revision=revision+1 WHERE id_publico=$1",[s.recursoId]);
      respuesta=await guardar(sql,'orden',s.pacienteId,datos,estable,String(datos.consultaId));break;
    }
    case 'resultadoRegistrar': {
      // recursoId identifica la orden; cada emisión/corrección es una fila nueva e inmutable.
      throw new Error('RESULTADO_DEBE_DESPACHARSE_POR_ORDEN');
    }
    case 'procedimientoRegistrar': {
      const cat=await sql.consultar(`SELECT p.id_procedimiento,p.nombre FROM procedimiento p JOIN hospital_servicios.catalogo_procedimiento c USING(id_procedimiento) WHERE p.id_publico=$1 AND c.activo FOR SHARE OF p`,[e.procedimientoId]);
      if(!cat.filas[0])invalida('Procedimiento de catálogo no activo.');
      const enlace=await sql.consultar(`SELECT h.id_publico,h.estado FROM hospitalizacion_consulta hc JOIN hospitalizacion h USING(id_hospitalizacion) WHERE hc.id_consulta=$1 FOR SHARE OF h`,[consulta!.id_consulta]);
      if(enlace.filas[0]&&enlace.filas[0].estado!=='ACTIVA')conflicto('La estancia vinculada está finalizada.');
      await sql.consultar(`INSERT INTO procedimiento_realizado(id_publico,id_procedimiento,id_consulta,id_personal_responsable,fecha_hora,resultado,observaciones) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [estable.id,cat.filas[0]!.id_procedimiento,consulta!.id_consulta,medico!.id_personal,estable.fecha,e.resultado,e.observaciones??null]);
      const contenido={id:estable.id,version:1,pacienteId:s.pacienteId,consultaId:e.consultaId,procedimientoId:e.procedimientoId,nombre:cat.filas[0]!.nombre,
        fechaHora:estable.fecha,profesionalId:medico!.id_publico,profesionalNombre:medico!.nombre,resultado:e.resultado,...(e.observaciones?{observaciones:e.observaciones}:{}),
        origen:enlace.filas[0]?'HOSPITALIZACION':'CONSULTA',origenReferencia:enlace.filas[0]?.id_publico??e.consultaId};
      respuesta=await guardar(sql,'procedimiento',s.pacienteId,contenido,estable,String(e.consultaId));break;
    }
    case 'polizaAfiliar': respuesta=await afiliar(sql,s,estable,paciente);break;
    case 'polizaEstado': {
      const datos={...previa!.contenido,version:previa!.version+1,estadoVigencia:e.estado,motivoEstado:e.motivo};
      await sql.consultar("UPDATE paciente_poliza SET estado_afiliacion=$2,revision=revision+1 WHERE id_publico=$1",[s.recursoId,e.estado==='ACTIVA'?'ACTIVA':'INACTIVA']);
      respuesta=await guardar(sql,'poliza',s.pacienteId,datos,estable);break;
    }
  }
  return {respuesta,previa};
}
async function afiliar(sql:EjecutorSql,s:SolicitudServicioHospital,estable:EstadoComandoHospital,paciente:Record<string,unknown>){
  const e=s.datos,t=objeto(e.titular);
  const cat=await sql.consultar(`SELECT p.id_plan,p.nombre_plan,p.moneda,p.porcentaje_cobertura,(p.monto_maximo_cobertura*100)::bigint AS limite,
    a.nombre AS aseguradora FROM plan_seguro p JOIN aseguradora a USING(id_aseguradora)
    WHERE p.id_publico=$1 AND a.id_publico=$2 AND p.estado='ACTIVO' AND a.estado='ACTIVA' FOR SHARE OF p,a`,[e.planId,e.aseguradoraId]);
  const plan=cat.filas[0];if(!plan||plan.moneda!=='GTQ')invalida('Plan/aseguradora no activos o moneda no compatible.');
  const titular=await sql.consultar('SELECT * FROM titular_seguro WHERE cui=$1 FOR UPDATE',[t.numeroIdentificacion]);
  let idTitular= titular.filas[0]?.id_titular;
  if(idTitular){const f=titular.filas[0]!;if(f.primer_nombre!==t.nombres||f.primer_apellido!==t.apellidos||f.telefono!==t.telefonoContacto)invalida('El titular existente tiene otros datos. Debe reconciliarse sin sobrescribir su identidad.');}
  else { const r=await sql.consultar(`INSERT INTO titular_seguro(id_publico,primer_nombre,primer_apellido,cui,telefono) VALUES($1,$2,$3,$4,$5) RETURNING id_titular`,[estable.ids[0],t.nombres,t.apellidos,t.numeroIdentificacion,t.telefonoContacto]);idTitular=r.filas[0]!.id_titular; }
  const existente=await sql.consultar(`SELECT *,to_char(fecha_inicio,'YYYY-MM-DD') AS desde,to_char(fecha_vencimiento,'YYYY-MM-DD') AS hasta FROM poliza WHERE numero_poliza=$1 FOR UPDATE`,[e.numeroPoliza]);
  let idPoliza=existente.filas[0]?.id_poliza;
  if(idPoliza){const f=existente.filas[0]!;if(Number(f.id_plan)!==Number(plan!.id_plan)||Number(f.id_titular)!==Number(idTitular)||f.desde!==e.vigenciaDesde||f.hasta!==e.vigenciaHasta||f.estado!=='ACTIVA')invalida('La póliza existente no coincide con plan, titular o vigencia.');}
  else {const r=await sql.consultar(`INSERT INTO poliza(id_publico,id_plan,id_titular,numero_poliza,fecha_inicio,fecha_vencimiento) VALUES($1,$2,$3,$4,$5::date,$6::date) RETURNING id_poliza`,[estable.ids[1],plan!.id_plan,idTitular,e.numeroPoliza,e.vigenciaDesde,e.vigenciaHasta]);idPoliza=r.filas[0]!.id_poliza;}
  await sql.consultar(`INSERT INTO paciente_poliza(id_publico,id_paciente,id_poliza,numero_afiliado,parentesco_titular,fecha_inicio_cobertura,fecha_fin_cobertura) VALUES($1,$2,$3,$4,$5,$6::date,$7::date)`,[estable.id,paciente.id_paciente,idPoliza,e.numeroCertificado,t.parentesco,e.vigenciaDesde,e.vigenciaHasta]);
  return guardar(sql,'poliza',s.pacienteId,{id:estable.id,version:1,pacienteId:s.pacienteId,aseguradoraId:e.aseguradoraId,aseguradoraNombre:plan!.aseguradora,
    planId:e.planId,planNombre:plan!.nombre_plan,numeroPoliza:e.numeroPoliza,numeroCertificado:e.numeroCertificado,vigenciaDesde:e.vigenciaDesde,vigenciaHasta:e.vigenciaHasta,
    estadoVigencia:'ACTIVA',porcentajeCobertura:Number(plan!.porcentaje_cobertura),moneda:'GTQ',copagoCentavos:e.copagoCentavos,
    limiteMaximoAnualCentavos:plan!.limite===null?null:Number(plan!.limite),titular:{...t,nombreCompleto:`${t.nombres} ${t.apellidos}`},...(e.observaciones?{observaciones:e.observaciones}:{})},estable);
}
export async function registrarResultado(sql:EjecutorSql,contexto:ContextoAutenticado,s:SolicitudServicioHospital,estable:EstadoComandoHospital,paciente:Record<string,unknown>){
  const e=s.datos;
  if(!s.recursoId)invalida('Falta orden.');
  const orden=await porId(sql,'orden',s.recursoId!,s.pacienteId);
  if(!orden)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Orden no encontrada para el paciente.');
  version(orden.version,e.versionEsperada);
  if(orden.contenido.estado==='CANCELADA')conflicto('La orden está cancelada.');
  const items=lista(orden.contenido.items),item=items.find(x=>x.pruebaId===e.pruebaId);
  if(!item)invalida('El examen no está incluido en la orden.');
  const parametros=lista(item!.parametros),entrada=lista(e.parametros);
  if(entrada.length!==parametros.length||new Set(entrada.map(x=>x.parametroId)).size!==entrada.length||entrada.some(p=>!parametros.some(x=>x.parametroId===p.parametroId)))invalida('Los parámetros no corresponden al examen solicitado.');
  const anterior=item!.resultadoId?await porId(sql,'resultado',uuidPublico(item!.resultadoId),s.pacienteId):null;
  if(anterior){version(anterior.version,e.versionResultado);if(typeof e.motivoCorreccion!=='string'||!e.motivoCorreccion.trim())invalida('La corrección requiere motivo y versión de resultado.');}
  else if(e.versionResultado!==undefined)invalida('El resultado previo no existe.');
  const medico=await sql.consultar(`SELECT id_personal,id_publico,numero_colegiado,CONCAT_WS(' ',primer_nombre,segundo_nombre,primer_apellido,segundo_apellido) AS nombre FROM personal_medico WHERE id_publico=$1 AND estado='ACTIVO' FOR SHARE`,[contexto.cuenta.profesional!.id]);
  if(!medico.filas[0])throw new ErrorDominio('SIN_PERMISO','Médico no disponible.');
  const siguiente=(anterior?.version??0)+1;
  await sql.consultar(`INSERT INTO resultado_examen(id_publico,id_detalle_orden,version,fecha_resultado,informe_texto,observaciones)
    SELECT $1,id_detalle_orden,$3,$4,$5,$6 FROM detalle_orden_examen WHERE id_publico=$2`,[estable.id,item!.id,siguiente,estable.fecha,e.interpretacionClinica,e.observacionesTecnicas??null]);
  const valores:Record<string,unknown>[]=[];
  for(let i=0;i<entrada.length;i++){
    const v=entrada[i]!,p=parametros.find(x=>x.parametroId===v.parametroId)!;
    const numero=typeof v.valorMedido==='string'&&/^-?\d{1,12}(\.\d{1,6})?$/.test(v.valorMedido)?v.valorMedido:null;
    const escrito=await sql.consultar(`INSERT INTO resultado_detalle(id_publico,id_resultado,secuencia,id_parametro,fecha_hora_medicion,valor_numerico,valor_texto,id_unidad,referencia_texto,observaciones)
      SELECT $1,r.id_resultado,$3,p.id_parametro,$4,$5::numeric,$6,u.id_unidad,$8,$9 FROM resultado_examen r CROSS JOIN parametro_examen p LEFT JOIN unidad_medida u ON u.id_publico=$7 WHERE r.id_publico=$2 AND p.id_publico=$10 RETURNING id_resultado_detalle`,
      [estable.ids[i],estable.id,i+1,estable.fecha,numero,v.valorMedido,p.unidadId??null,p.rangoReferencia,v.alerta,p.parametroId]);
    if(escrito.filas.length!==1)invalida('El parámetro o su referencia ya no están disponibles.');
    valores.push({...p,valorMedido:v.valorMedido,alerta:v.alerta});
  }
  const contenido={id:estable.id,version:siguiente,pacienteId:s.pacienteId,pacienteNombre:paciente.nombre,ordenId:orden.id,codigoOrden:orden.contenido.codigoLegible,
    pruebaId:e.pruebaId,nombrePrueba:item!.nombre,seccion:item!.seccion,metodoAnalitico:item!.metodoAnalitico,fechaEmision:estable.fecha,
    responsableId:medico.filas[0]!.id_publico,responsableAnalisis:medico.filas[0]!.nombre,colegiadoResponsable:medico.filas[0]!.numero_colegiado,
    estado:'VALIDADO',parametros:valores,interpretacionClinica:e.interpretacionClinica,...(e.observacionesTecnicas?{observacionesTecnicas:e.observacionesTecnicas}:{}),
    ...(anterior?{corrigeId:anterior.id,motivoCorreccion:e.motivoCorreccion}:{})};
  const respuesta=await guardar(sql,'resultado',s.pacienteId,contenido,estable,String(orden.contenido.consultaId),orden.id);
  const nuevos=items.map(x=>x.id===item!.id?{...x,estado:'COMPLETADO',resultadoId:respuesta.id,versionResultado:siguiente}:x);
  const estado=nuevos.every(x=>x.estado==='COMPLETADO')?'COMPLETADA':'EN_PROCESO';
  await sql.consultar('UPDATE orden_examen SET estado=$2,revision=revision+1 WHERE id_publico=$1',[orden.id,estado]);
  await guardar(sql,'orden',s.pacienteId,{...orden.contenido,version:orden.version+1,items:nuevos,estado},estable,String(orden.contenido.consultaId));
  return {respuesta,previa:orden};
}
