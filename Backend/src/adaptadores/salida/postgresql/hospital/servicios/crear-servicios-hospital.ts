import { randomUUID,createHash } from 'node:crypto';
import { serializarJCS } from '../../../../../dominio/compartido/json-canonico.js';
import { uuidPublico } from '../../../../../dominio/compartido/uuid.js';
import { instanteUtc } from '../../../../../dominio/compartido/instante-utc.js';
import { ErrorDominio } from '../../../../../dominio/compartido/error-dominio.js';
import type { LectorTransaccional } from '../../../../../aplicacion/puertos/nucleo.js';
import type { PuertosServiciosHospital, RegistroServicioHospital } from '../../../../../aplicacion/puertos/servicios-hospitalarios.js';
import { crearUnidadDeTrabajoSql } from '../../../sql/unidad-de-trabajo-sql.js';
import type { EjecutorSql,PoolSql } from '../../../sql/tipos-sql.js';
import { crearRepositorioCuentaPostgresql } from '../../repositorio-cuenta-postgresql.js';
import { preparado,catalogos,listar,porId,hoyHospital } from './lecturas-servicios.js';
import { aplicar,pacienteBloqueado,registrarResultado } from './escrituras-servicios.js';

async function seguro<T>(operar:()=>Promise<T>):Promise<T>{try{return await operar();}catch(error){if(error instanceof ErrorDominio)throw error;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No fue posible consultar los servicios hospitalarios.');}}
function proyectar(r:RegistroServicioHospital,hoy=hoyHospital()):RegistroServicioHospital {
  if(r.tipo!=='poliza')return r;
  const c=r.contenido,expirada=String(c.vigenciaHasta)<hoy;
  return {...r,contenido:{...c,estadoVigencia:c.estadoVigencia==='ACTIVA'&&expirada?'VENCIDA':c.estadoVigencia,
    vigente:c.estadoVigencia==='ACTIVA'&&!expirada&&String(c.vigenciaDesde)<=hoy}};
}
export function crearServiciosHospital(pool:PoolSql):PuertosServiciosHospital {
  return {
    catalogos:()=>seguro(()=>catalogos(pool)),
    listar:(tipo,filtro)=>seguro(async()=>{
      // Vigencia se determina al leer; no modifica la historia administrativa guardada.
      const hoy=hoyHospital();const filas=await listar(pool,tipo,filtro,hoy);return filas.map(r=>proyectar(r,hoy));
    }),
    porId:(tipo,id,paciente)=>seguro(async()=>{await preparado(pool);const r=await porId(pool,tipo,id,paciente);return r?proyectar(r):null;}),
    async ejecutar(contexto,solicitud){
      const id=uuidPublico(randomUUID()),fecha=instanteUtc(new Date().toISOString()),ids=Array.from({length:110},()=>randomUUID());
      const hash=createHash('sha256').update(serializarJCS(JSON.parse(JSON.stringify({pacienteId:solicitud.pacienteId,recursoId:solicitud.recursoId??null,datos:solicitud.datos})))).digest('hex');
      const uow=crearUnidadDeTrabajoSql({dialecto:'postgresql',pool,serializarClavePostgresql:true,
        crearLector:executor=>({executor,cuentas:crearRepositorioCuentaPostgresql(executor)} as unknown as LectorTransaccional),aplicarCambios:async()=>{}});
      const caso=`hospital.${solicitud.accion}`;
      const resultado=await uow.ejecutar<RegistroServicioHospital>(contexto,{id,claveIdempotencia:solicitud.clave,caso,hashEntrada:hash,instante:fecha,ids:{}},async lector=>{
        const sql=(lector as unknown as {executor:EjecutorSql}).executor;
        await preparado(sql);
        const cuenta=await crearRepositorioCuentaPostgresql(sql).porUid(contexto.identidad.uid),administrativa=solicitud.accion.startsWith('poliza');
        if(!cuenta||cuenta.estado!=='ACTIVA'||cuenta.id!==contexto.cuenta.id||cuenta.institucion!=='HOSPITAL_GENERAL'||
          cuenta.version!==contexto.cuenta.version||(administrativa?!cuenta.permisos.includes('pacientes.administrar'):
            !cuenta.roles.includes('MEDICO')||!cuenta.permisos.includes('historial.leer')||!cuenta.permisos.includes('consultas.registrar')||!cuenta.profesional?.activo||cuenta.profesional.id!==contexto.cuenta.profesional?.id))throw new ErrorDominio('SIN_PERMISO','La autorización institucional ya no está vigente.');
        const paciente=await pacienteBloqueado(sql,solicitud.pacienteId);
        if(solicitud.recursoId)await sql.consultar('SELECT id FROM hospital_servicios.recursos WHERE id=$1 AND paciente_id=$2 FOR UPDATE',[solicitud.recursoId,solicitud.pacienteId]);
        const estable={id,fecha,ids};
        const {respuesta,previa}=solicitud.accion==='resultadoRegistrar'?await registrarResultado(sql,contexto,solicitud,estable,paciente):await aplicar(sql,contexto,solicitud,estable,paciente);
        await sql.consultar('UPDATE paciente SET revision=revision+1 WHERE id_publico=$1',[solicitud.pacienteId]);
        if(solicitud.accion.startsWith('orden')||solicitud.accion==='resultadoRegistrar'){
          const f=fecha.replace(/\.(\d+)Z$/,(_,n:string)=>`.${n.padEnd(9,'0')}Z`);
          await sql.consultar(`INSERT INTO hospital_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES($1,$2,'EXAMEN',$3,$4::jsonb)`,
            [id,solicitud.pacienteId,f,JSON.stringify({id,fechaHora:f,tipo:'EXAMEN',recursoId:solicitud.accion==='resultadoRegistrar'?solicitud.recursoId:respuesta.id,titulo:solicitud.accion==='resultadoRegistrar'?'Resultado de examen emitido':solicitud.accion==='ordenCancelar'?'Orden de examen cancelada':'Orden de examen solicitada'})]);
        }
        return {tipo:'CONFIRMAR',cambios:[],revisiones:previa?[{id:uuidPublico(ids[109]),agregado:`hospital_${previa.tipo}`,recursoId:previa.id,versionAnterior:previa.version,snapshotAnterior:previa.contenido}]:[],
          auditoria:[{id,actorId:cuenta.id,caso,recursoId:respuesta.id,fechaHora:fecha,correlacion:contexto.correlacion}],
          resultado:{httpStatus:201,respuesta,correlacionOriginal:contexto.correlacion}};
      });
      return resultado.respuesta;
    },
  };
}
