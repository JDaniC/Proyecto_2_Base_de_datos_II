import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {PoolSql} from '../../src/adaptadores/salida/sql/tipos-sql.js';
import type {ContextoAutenticado} from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type {BundleInstitucional} from '../../src/aplicacion/puertos/bundle-institucional.js';
import type {AccionServicioHospital} from '../../src/aplicacion/puertos/servicios-hospitalarios.js';
import {ServiciosHospitalarios} from '../../src/aplicacion/casos-uso/hospital/servicios-hospitalarios.js';
import {crearServiciosHospital} from '../../src/adaptadores/salida/postgresql/hospital/servicios/crear-servicios-hospital.js';

export async function verificarServiciosHospitalarios(pool:PoolSql,contexto:ContextoAutenticado){
  const servicio=new ServiciosHospitalarios();
  const bundle:BundleInstitucional={institucion:'HOSPITAL_GENERAL',estadoPersistencia:'DISPONIBLE',serviciosHospital:crearServiciosHospital(pool)};
  async function nuevoPaciente(){
    const pid=randomUUID(),cid=randomUUID();
    await pool.consultar("INSERT INTO paciente(id_publico,primer_nombre,primer_apellido) VALUES($1,'Paciente','Especializado sintético')",[pid]);
    await pool.consultar("INSERT INTO historial_clinico(id_paciente,numero_historial) SELECT id_paciente,$2 FROM paciente WHERE id_publico=$1",[pid,randomUUID().slice(0,20)]);
    await pool.consultar(`INSERT INTO consulta(id_publico,id_historial,id_personal_atendio,motivo_consulta)
      SELECT $1,h.id_historial,m.id_personal,'Consulta de fixture especializada' FROM historial_clinico h JOIN paciente p USING(id_paciente)
      CROSS JOIN personal_medico m WHERE p.id_publico=$2 AND m.id_publico=$3`,[cid,pid,contexto.cuenta.profesional!.id]);
    return {pid,cid};
  }
  const p=await nuevoPaciente(),otro=await nuevoPaciente();
  const versionPaciente=async(pid=p.pid)=>Number((await pool.consultar('SELECT revision FROM paciente WHERE id_publico=$1',[pid])).filas[0]!.revision);
  const ejecutar=async(accion:AccionServicioHospital,datos:Record<string,unknown>,id?:string,pid=p.pid,clave=randomUUID())=>servicio.ejecutar(contexto,bundle,accion,pid,id,datos,clave);
  const catalogo=await servicio.catalogos(contexto,bundle);
  assert.equal(catalogo.examenes!.length,2);
  assert.equal(typeof catalogo.examenes![0]!.version,'number');
  const examen=catalogo.examenes!.find(x=>String(x.nombre).startsWith('Hemograma'))!,extra=catalogo.examenes!.find(x=>String(x.nombre).startsWith('Glucosa'))!;
  const parametro=(examen.parametros as Record<string,unknown>[])[0]!,ajeno=(extra.parametros as Record<string,unknown>[])[0]!;
  const entradaOrden=async()=>({consultaId:p.cid,versionConsulta:1,versionPaciente:await versionPaciente(),pruebasIds:[examen.id],prioridad:'RUTINA',motivoClinico:'Evaluación sintética'});
  await assert.rejects(ejecutar('ordenCrear',{...await entradaOrden(),consultaId:otro.cid}),{codigo:'REFERENCIA_INCOMPATIBLE'});
  const body=await entradaOrden(),key=randomUUID();
  const orden=await ejecutar('ordenCrear',body,undefined,p.pid,key);
  assert.deepEqual(await ejecutar('ordenCrear',body,undefined,p.pid,key),orden);
  await assert.rejects(ejecutar('ordenCrear',{...body,motivoClinico:'Otra intención'},undefined,p.pid,key),{codigo:'CLAVE_REUTILIZADA'});
  assert.equal(orden.contenido.medicoSolicitanteId,contexto.cuenta.profesional!.id);
  const emitir={versionEsperada:orden.version,pruebaId:examen.id,parametros:[{parametroId:parametro.parametroId,valorMedido:'13.5',alerta:'NORMAL'}],interpretacionClinica:'Interpretación sintética'};
  await assert.rejects(ejecutar('resultadoRegistrar',{...emitir,parametros:[{parametroId:ajeno.parametroId,valorMedido:'1',alerta:'NORMAL'}]},orden.id),{codigo:'REFERENCIA_INCOMPATIBLE'});
  assert.equal(Number((await pool.consultar('SELECT count(*) AS total FROM resultado_examen')).filas[0]!.total),0);
  const resultado=await ejecutar('resultadoRegistrar',emitir,orden.id);
  assert.equal(resultado.contenido.responsableId,contexto.cuenta.profesional!.id);
  assert.equal((await servicio.porId(contexto,bundle,'orden',orden.id)).contenido.estado,'COMPLETADA');
  const ordenTras=await servicio.porId(contexto,bundle,'orden',orden.id);
  await assert.rejects(ejecutar('resultadoRegistrar',{...emitir,versionEsperada:ordenTras.version},orden.id),{codigo:'VERSION_DESACTUALIZADA'});
  const correccion=await ejecutar('resultadoRegistrar',{...emitir,versionEsperada:ordenTras.version,versionResultado:1,motivoCorreccion:'Rectificación sintética',interpretacionClinica:'Interpretación corregida'},orden.id);
  assert.equal(correccion.version,2);
  assert.equal((await servicio.porId(contexto,bundle,'resultado',resultado.id)).contenido.interpretacionClinica,'Interpretación sintética');
  assert.equal(Number((await pool.consultar('SELECT count(*) AS total FROM resultado_examen')).filas[0]!.total),2);
  assert.equal(Number((await pool.consultar('SELECT count(*) AS total FROM resultado_detalle')).filas[0]!.total),2);
  await assert.rejects(ejecutar('ordenCancelar',{versionEsperada:3,motivo:'No permitido'},orden.id),{codigo:'ESTADO_INVALIDO'});
  const ordenConcurrente=await ejecutar('ordenCrear',await entradaOrden());
  const carreras=await Promise.allSettled([1,2].map(()=>ejecutar('resultadoRegistrar',{...emitir,versionEsperada:1},ordenConcurrente.id)));
  assert.equal(carreras.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(carreras.filter(x=>x.status==='rejected').length,1);
  const copia=await pool.consultar('SELECT count(*) AS total FROM orden_examen');
  const versionAntes=await versionPaciente();
  const poolFallo:PoolSql={...pool,adquirir:async()=>{
    const c=await pool.adquirir();return {...c,consultar:async(sql,args)=>{if(sql.startsWith('INSERT INTO auditoria'))throw new Error('FALLO_AUDITORIA_SINTETICO');return c.consultar(sql,args);}};
  }};
  await assert.rejects(servicio.ejecutar(contexto,{...bundle,serviciosHospital:crearServiciosHospital(poolFallo)},'ordenCrear',p.pid,undefined,await entradaOrden(),randomUUID()));
  assert.equal((await pool.consultar('SELECT count(*) AS total FROM orden_examen')).filas[0]!.total,copia.filas[0]!.total);
  assert.equal(await versionPaciente(),versionAntes);
  const aseg=catalogo.aseguradoras![0]!,plan=(aseg.planes as Record<string,unknown>[])[0]!;
  const anio=new Date().getUTCFullYear();
  const seguro={versionPaciente:await versionPaciente(),aseguradoraId:aseg.id,planId:plan.id,numeroPoliza:`POL-${randomUUID().slice(0,16)}`,numeroCertificado:'CERT-1',vigenciaDesde:`${anio}-01-01`,vigenciaHasta:`${anio+1}-12-31`,
    titular:{nombres:'Titular',apellidos:'Sintético',numeroIdentificacion:'1234567890123',telefonoContacto:'55550000',parentesco:'TITULAR'},copagoCentavos:1500};
  await assert.rejects(ejecutar('polizaAfiliar',{...seguro,vigenciaHasta:'2000-01-01'}),{codigo:'SOLICITUD_INVALIDA'});
  await assert.rejects(ejecutar('polizaAfiliar',{...seguro,copagoCentavos:1.5}),{codigo:'SOLICITUD_INVALIDA'});
  const poliza=await ejecutar('polizaAfiliar',seguro);
  assert.equal(poliza.contenido.copagoCentavos,1500);
  await assert.rejects(ejecutar('polizaEstado',{versionEsperada:1,estado:'SUSPENDIDA',motivo:'Ajena'},poliza.id,otro.pid),{codigo:'RECURSO_NO_ENCONTRADO'});
  await ejecutar('polizaEstado',{versionEsperada:1,estado:'SUSPENDIDA',motivo:'Suspensión sintética'},poliza.id);
  const compartida=await ejecutar('polizaAfiliar',{...seguro,versionPaciente:await versionPaciente(otro.pid),numeroCertificado:'CERT-2'},undefined,otro.pid);
  assert.equal((await servicio.porId(contexto,bundle,'poliza',compartida.id)).contenido.estadoVigencia,'ACTIVA');
  assert.equal((await servicio.porId(contexto,bundle,'poliza',poliza.id)).contenido.estadoVigencia,'SUSPENDIDA');
  assert.equal(Number((await pool.consultar('SELECT count(*) AS total FROM poliza')).filas[0]!.total),1);
  assert.equal(Number((await pool.consultar('SELECT count(*) AS total FROM paciente_poliza')).filas[0]!.total),2);
  const proc=catalogo.procedimientos![0]!;
  const realizado=await ejecutar('procedimientoRegistrar',{versionPaciente:await versionPaciente(),consultaId:p.cid,versionConsulta:1,procedimientoId:proc.id,resultado:'Evolución sintética sin incidencias'});
  assert.equal(realizado.contenido.profesionalId,contexto.cuenta.profesional!.id);
  assert.equal(Number((await pool.consultar('SELECT count(*) AS total FROM procedimiento_realizado')).filas[0]!.total),1);
  await assert.rejects(pool.consultar('UPDATE hospital_servicios.catalogo_procedimiento SET activo=false'), {code:'42501'});
  const inactivo=catalogo.procedimientos!.find(p=>p.activo===false)!;
  await assert.rejects(ejecutar('procedimientoRegistrar',{versionPaciente:await versionPaciente(),consultaId:p.cid,versionConsulta:1,procedimientoId:inactivo.id,resultado:'No debe registrarse'}),{codigo:'REFERENCIA_INCOMPATIBLE'});
  const ordenRollback=await ejecutar('ordenCrear',await entradaOrden());
  const resultadosAntes=Number((await pool.consultar('SELECT count(*) AS n FROM resultado_examen')).filas[0]!.n);
  const detallesAntes=Number((await pool.consultar('SELECT count(*) AS n FROM resultado_detalle')).filas[0]!.n);
  for(const prefijo of ['INSERT INTO resultado_detalle','INSERT INTO auditoria']){
    const fallo:PoolSql={...pool,adquirir:async()=>{const c=await pool.adquirir();return {...c,consultar:async(sql,args)=>{if(sql.startsWith(prefijo))throw new Error('FALLO_RESULTADO_SINTETICO');return c.consultar(sql,args);}};}};
    await assert.rejects(servicio.ejecutar(contexto,{...bundle,serviciosHospital:crearServiciosHospital(fallo)},'resultadoRegistrar',p.pid,ordenRollback.id,{...emitir,versionEsperada:1},randomUUID()));
    assert.equal(Number((await pool.consultar('SELECT count(*) AS n FROM resultado_examen')).filas[0]!.n),resultadosAntes);
    assert.equal(Number((await pool.consultar('SELECT count(*) AS n FROM resultado_detalle')).filas[0]!.n),detallesAntes);
    assert.equal((await servicio.porId(contexto,bundle,'orden',ordenRollback.id)).version,1);
  }
  const pendiente=await ejecutar('ordenCrear',await entradaOrden());
  await pool.consultar("UPDATE historial_clinico SET estado_historial='ARCHIVADO',causa_baja='OTRA_ADMINISTRATIVA',motivo_baja='Ensayo sintético',fecha_baja=CURRENT_TIMESTAMP,actor_baja=$2 WHERE id_paciente=(SELECT id_paciente FROM paciente WHERE id_publico=$1)",[p.pid,contexto.cuenta.id]);
  await assert.rejects(ejecutar('ordenCrear',await entradaOrden()),{codigo:'ESTADO_INVALIDO'});
  await ejecutar('resultadoRegistrar',{...emitir,versionEsperada:1},pendiente.id);
  assert.equal((await servicio.porId(contexto,bundle,'orden',pendiente.id)).contenido.estado,'COMPLETADA');
}
