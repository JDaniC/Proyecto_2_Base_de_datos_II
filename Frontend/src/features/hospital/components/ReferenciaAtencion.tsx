import {useEffect,useState} from 'react';
import {useServices} from '../../../app/ServiceContext';
import type {EventoHistorial} from '../../../services/types';
import {Button} from '../../../design-system/components/Button';
export interface ReferenciaAtencionValor {consultaId:string;versionConsulta:number;versionPaciente:number;}
export function ReferenciaAtencion({pacienteId,onCambio,disabled=false}:{pacienteId:string;onCambio:(v:ReferenciaAtencionValor|null)=>void;disabled?:boolean}){
  const {patientRepository}=useServices();
  const [eventos,setEventos]=useState<EventoHistorial[]>([]),[cursor,setCursor]=useState<string>(),[version,setVersion]=useState(0),[error,setError]=useState(''),[consulta,setConsulta]=useState('');
  useEffect(()=>{
    let vigente=true;setConsulta('');setEventos([]);setCursor(undefined);setVersion(0);setError('');onCambio(null);
    if(pacienteId&&patientRepository.obtenerHistorial)Promise.all([patientRepository.obtenerPorId('HOSPITAL_GENERAL',pacienteId),patientRepository.obtenerHistorial('HOSPITAL_GENERAL',pacienteId,{tipo:'CONSULTA',orden:'DESC',limite:100})]).then(([p,h])=>{
      if(!vigente)return;setVersion(p?.version??0);setEventos(h.eventos);setCursor(h.siguienteCursor);
    }).catch(()=>{if(vigente)setError('No se pudieron cargar las consultas del paciente.');});
    return()=>{vigente=false;};
  },[pacienteId,patientRepository,onCambio]);
  const porConsulta=new Map<string,EventoHistorial>();
  for(const e of eventos){const id=e.consultaId||e.recursoId;if(id&&(!porConsulta.has(id)||(porConsulta.get(id)!.versionConsulta??0)<(e.versionConsulta??0)))porConsulta.set(id,e);}
  return <div>
    <label>Consulta que origina el proceso
      <select aria-label="Consulta que origina el proceso" disabled={disabled||!version} value={consulta} onChange={e=>{const id=e.target.value;setConsulta(id);const evento=porConsulta.get(id);onCambio(evento?{consultaId:id,versionConsulta:evento.versionConsulta??0,versionPaciente:version}:null);}}>
        <option value="">Seleccione una consulta del paciente</option>
        {[...porConsulta].map(([id,e])=><option key={id} value={id}>{e.titulo} · {e.fechaHora}</option>)}
      </select>
    </label>
    {error&&<div role="alert">{error}</div>}
    {cursor&&<Button disabled={disabled} onClick={async()=>{try{const p=await patientRepository.obtenerHistorial!('HOSPITAL_GENERAL',pacienteId,{tipo:'CONSULTA',orden:'DESC',limite:100,cursor});setEventos(xs=>[...xs,...p.eventos]);setCursor(p.siguienteCursor);}catch{setError('No se pudieron cargar más consultas.');}}}>Más consultas</Button>}
  </div>;
}
