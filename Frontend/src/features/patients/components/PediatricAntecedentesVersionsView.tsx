import {useState} from 'react';
import {useServices} from '../../../app/ServiceContext';
import type {SnapshotAntecedentesPediatricos,RevisionAntecedentesPediatricos} from '../../../services/types';
import {Panel} from '../../../design-system/components/Panel';
import {Button} from '../../../design-system/components/Button';
import {Alert} from '../../../design-system/components/Alert';
import {getErrorMessage} from '../../../services/errors';
const etiquetas:Record<string,string>={edadGestacionalSemanas:'Gestación (semanas)',pesoNacimientoGramos:'Peso al nacer (g)',tallaNacimientoCm:'Talla al nacer (cm)',apgar1Minuto:'Apgar 1 minuto',apgar5Minutos:'Apgar 5 minutos',tipoParto:'Tipo de parto',lactanciaMaternaExclusivaMeses:'Lactancia exclusiva (meses)',complicacionesPerinatales:'Complicaciones'};
const etiquetasHistoria:Record<string,string>={patologicos:'Patológicos',quirurgicos:'Quirúrgicos',familiares:'Familiares',medicamentosActuales:'Medicamentos actuales'};
function Snapshot({dato,titulo}:{dato:SnapshotAntecedentesPediatricos;titulo:string}){return <section><h3>{titulo} · v{dato.version}</h3>
 {dato.alergias.map(a=><p key={a.id}>{a.sustancia} · {a.severidad} · {a.reaccion} · {a.activa?'Vigente en esta versión':'Desactivada en esta versión'}</p>)}
 {dato.verificacionSinAlergias&&<p>Ausencia de alergias verificada en esta versión.</p>}
 {dato.historia&&Object.entries(dato.historia).map(([k,lista])=><div key={k}><strong>{etiquetasHistoria[k]??k}</strong>{lista.map((texto:string,i:number)=><p key={i}>{texto}</p>)}</div>)}
 {dato.perinatales&&Object.entries(dato.perinatales).map(([k,v])=><p key={k}>{etiquetas[k]??k}: {String(v)}</p>)}
 {dato.version===0&&<p>Sin registro previo.</p>}
 </section>;}
export function PediatricAntecedentesVersionsView({pacienteId,versionActual}:{pacienteId:string;versionActual:number}){
 const {patientRepository}=useServices();const [version,setVersion]=useState(versionActual),[error,setError]=useState<string>(),[ocupado,setOcupado]=useState(false);
 const [revision,setRevision]=useState<RevisionAntecedentesPediatricos>();
 return <Panel title="Historia de antecedentes" subtitle="Versiones conservadas; estos datos corresponden al momento del cambio.">
  <form onSubmit={async e=>{e.preventDefault();setOcupado(true);setRevision(undefined);setError(undefined);try{if(!patientRepository.obtenerVersionAntecedentesPediatricos)throw new Error('Historia no disponible.');setRevision(await patientRepository.obtenerVersionAntecedentesPediatricos(pacienteId,version));}catch(e){setError(getErrorMessage(e,'No se pudo leer la versión.'));}finally{setOcupado(false);}}}>
   <label>Versión de antecedentes <input type="number" aria-label="Versión de antecedentes" min={1} max={versionActual} required value={version} onChange={e=>setVersion(Number(e.target.value))}/></label>{' '}<Button type="submit" loading={ocupado}>Consultar versión</Button>
  </form>{error&&<Alert variant="danger">{error}</Alert>}{revision&&<><p>Motivo: {revision.motivo} · {revision.fechaHora}</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16}}><Snapshot dato={revision.anterior} titulo="Anterior al cambio"/><Snapshot dato={revision.actual} titulo="Resultado histórico del cambio"/></div></>}
 </Panel>;
}
