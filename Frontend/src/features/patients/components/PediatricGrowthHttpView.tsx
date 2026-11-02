import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useServices} from '../../../app/ServiceContext';
import type {MedicionPediatrica} from '../../../services/types';
import {getErrorMessage} from '../../../services/errors';
import {Panel} from '../../../design-system/components/Panel';
import {Button} from '../../../design-system/components/Button';
import {Alert} from '../../../design-system/components/Alert';
export function PediatricGrowthHttpView({pacienteId}:{pacienteId:string}){
 const {patientRepository}=useServices();
 const [datos,setDatos]=useState<MedicionPediatrica[]|null>(null),[cursor,setCursor]=useState<string>(),[siguiente,setSiguiente]=useState<string>();
 const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[rango,setRango]=useState<{desde?:string;hasta?:string}>({});
 const [error,setError]=useState<string>(),[intento,setIntento]=useState(0);
 useEffect(()=>{let vivo=true;setDatos(null);setError(undefined);
  if(!patientRepository.obtenerCrecimientoPediatrico){setError('Lectura de crecimiento no disponible.');return;}
  patientRepository.obtenerCrecimientoPediatrico(pacienteId,{...rango,cursor,limite:20}).then(r=>{if(vivo){setDatos(r.elementos);setSiguiente(r.siguienteCursor);}}).catch(e=>{if(vivo)setError(getErrorMessage(e,'No se pudo cargar crecimiento.'));});
  return ()=>{vivo=false;};
 },[patientRepository,pacienteId,cursor,rango,intento]);
 return <Panel title="Crecimiento desde consultas" subtitle="Mediciones vigentes por consulta; las correcciones conservan las versiones anteriores.">
  <form onSubmit={e=>{e.preventDefault();setCursor(undefined);setRango({desde:desde?new Date(`${desde}T00:00:00-06:00`).toISOString():undefined,hasta:hasta?new Date(`${hasta}T00:00:00-06:00`).toISOString():undefined});}}>
   <label>Desde <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></label>{' '}
   <label>Hasta (sin incluir) <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/></label>{' '}<Button type="submit" variant="secondary">Consultar fechas</Button>
  </form>
  {error?<Alert variant="danger">{error} <Button onClick={()=>setIntento(x=>x+1)}>Reintentar</Button></Alert>:datos===null?<p>Cargando mediciones…</p>:<>
   <div style={{overflowX:'auto'}}><table><thead><tr>{['Consulta','Edad (meses)','Peso (kg)','Talla (cm)','Perímetro cefálico (cm)','IMC (kg/m²)'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>
    {datos.map(m=><tr key={m.consultaId}><td><Link to={`/pacientes/${pacienteId}/consultas/${m.consultaId}`}>{m.fecha} · v{m.versionConsulta}</Link></td><td>{m.edadMeses??'Sin fecha de nacimiento'}</td><td>{m.pesoKg??'Sin dato'}</td><td>{m.tallaCm??'Sin dato'}</td><td>{m.perimetroCefalicoCm??'Sin dato'}</td><td>{m.imc??'No calculable'}</td></tr>)}
   </tbody></table></div>{!datos.length&&<p>No hay consultas en este intervalo.</p>}
   <p>El IMC es un cálculo aritmético. No se muestran curvas ni interpretaciones clínicas automáticas.</p>
   <Button variant="secondary" disabled={!cursor} onClick={()=>setCursor(undefined)}>Primera página</Button>{' '}<Button disabled={!siguiente} onClick={()=>setCursor(siguiente)}>Siguiente</Button>
  </>}
 </Panel>;
}
