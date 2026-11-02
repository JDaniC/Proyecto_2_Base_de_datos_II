import {useRef,useState} from 'react';
import {useServices} from '../../../app/ServiceContext';
import type {Paciente,ResponsablePediatrico,ResponsableEncontrado} from '../../../services/types';
import {getErrorMessage} from '../../../services/errors';
import {Panel} from '../../../design-system/components/Panel';
import {Button} from '../../../design-system/components/Button';
import {Modal} from '../../../design-system/components/Modal';
import {Alert} from '../../../design-system/components/Alert';
type Accion='crear'|'contacto'|'vinculo'|'baja'|'vinculacion';
export function PediatricGuardiansHttpView({paciente,puedeEditar,onActualizar}:{paciente:Paciente;puedeEditar:boolean;onActualizar:()=>Promise<void>}){
 const {patientRepository}=useServices();
 const [accion,setAccion]=useState<Accion>(),[seleccion,setSeleccion]=useState<ResponsablePediatrico>(),[encontrado,setEncontrado]=useState<ResponsableEncontrado>();
 const [nombres,setNombres]=useState(''),[apellidos,setApellidos]=useState(''),[telefono,setTelefono]=useState(''),[tipo,setTipo]=useState('CUI'),[numero,setNumero]=useState(''),[parentesco,setParentesco]=useState(''),[principal,setPrincipal]=useState(false),[autoriza,setAutoriza]=useState(false),[motivo,setMotivo]=useState('');
 const [error,setError]=useState<string>(),[ocupado,setOcupado]=useState(false),[incierto,setIncierto]=useState(false);
 const pendiente=useRef<(()=>Promise<void>)|undefined>(undefined);
 const abrir=(a:Accion,r?:ResponsablePediatrico)=>{setAccion(a);setSeleccion(r);setEncontrado(undefined);setNombres(r?.nombres??'');setApellidos(r?.apellidos??'');setTelefono(r?.telefono??'');setParentesco(r?.parentesco??'');setPrincipal(r?.esPrincipal??false);setAutoriza(r?.autorizaAtencion??false);setNumero('');setMotivo('');setError(undefined);};
 const enviar=async(op:()=>Promise<void>)=>{setOcupado(true);setError(undefined);pendiente.current=op;try{await op();pendiente.current=undefined;setIncierto(false);setAccion(undefined);await onActualizar();}catch(e){setError(getErrorMessage(e,'No se pudo confirmar el cambio.'));if([0,503,504].includes((e as {status:number}).status))setIncierto(true);}finally{setOcupado(false);}};
 const guardar=()=>{
  if(!accion||!patientRepository.gestionarResponsablePediatrico)return;
  const datos:Record<string,unknown>={version_paciente:paciente.version};
  let rid=seleccion?.id;
  if(accion==='crear')Object.assign(datos,{nombres,apellidos,telefono,documento:{tipo,numero},parentesco,es_principal:principal,autoriza_atencion:autoriza});
  if(accion==='contacto')Object.assign(datos,{version_responsable:seleccion?.version,nombres,apellidos,telefono});
  if(accion==='vinculo')Object.assign(datos,{version_vinculo:seleccion?.versionVinculo,parentesco,es_principal:principal,autoriza_atencion:autoriza});
  if(accion==='baja')Object.assign(datos,{version_vinculo:seleccion?.versionVinculo,motivo});
  if(accion==='vinculacion'){
   if(!encontrado){setError('Busca y selecciona al responsable antes de vincular.');return;}
   rid=encontrado.responsable.id;Object.assign(datos,{version_responsable:encontrado.responsable.version,...(encontrado.version_vinculo?{version_vinculo:encontrado.version_vinculo}:{}),parentesco,es_principal:principal,autoriza_atencion:autoriza});
  }
  const a=accion;void enviar(()=>patientRepository.gestionarResponsablePediatrico!(paciente.id,a,datos,rid));
 };
 const buscar=async()=>{setOcupado(true);setError(undefined);setEncontrado(undefined);try{if(!patientRepository.buscarResponsablePediatrico)throw new Error('Búsqueda no disponible.');setEncontrado(await patientRepository.buscarResponsablePediatrico(paciente.id,tipo,numero));}catch(e){setError(getErrorMessage(e,'Responsable no encontrado.'));}finally{setOcupado(false);}};
 return <Panel title="Responsables vinculados" subtitle="El contacto es compartido; principalidad y autorización se deciden para cada menor.">
  {(paciente.responsables??[]).map(r=><div key={r.id} style={{marginBottom:16}}><p>{r.nombre} · {r.telefono} · {r.parentesco}{r.esPrincipal?' · Principal':''} · {r.autorizaAtencion?'Autoriza atención':'Sin autorización de atención'}</p>
   {puedeEditar&&paciente.estado==='ACTIVO'&&<><Button variant="secondary" onClick={()=>abrir('contacto',r)}>Editar contacto de {r.nombre}</Button>{' '}<Button variant="secondary" onClick={()=>abrir('vinculo',r)}>Editar vínculo de {r.nombre}</Button>{' '}<Button variant="danger" onClick={()=>abrir('baja',r)}>Dar de baja a {r.nombre}</Button></>}
  </div>)}
  {puedeEditar&&paciente.estado==='ACTIVO'&&<><Button onClick={()=>abrir('crear')}>Nuevo responsable</Button>{' '}<Button variant="secondary" onClick={()=>abrir('vinculacion')}>Vincular responsable registrado</Button></>}
  <Modal isOpen={Boolean(accion)} onClose={()=>{if(!ocupado&&!incierto)setAccion(undefined);}} title={accion==='contacto'?'Actualizar contacto compartido':accion==='baja'?'Dar de baja el vínculo':'Gestionar responsable'} footer={incierto?<Button loading={ocupado} onClick={()=>pendiente.current&&void enviar(pendiente.current)}>Reintentar misma solicitud</Button>:<><Button variant="secondary" disabled={ocupado} onClick={()=>setAccion(undefined)}>Cancelar</Button><Button disabled={ocupado||!puedeEditar||paciente.estado!=='ACTIVO'} onClick={guardar}>Guardar responsable</Button></>}>
   {error&&<Alert variant="danger">{error}</Alert>}
   {incierto?<Alert variant="warning">Resultado pendiente de confirmar. Reintenta la misma solicitud.</Alert>:<fieldset disabled={ocupado}>
    {(accion==='crear'||accion==='vinculacion')&&<><label>Tipo de documento <select value={tipo} onChange={e=>{setTipo(e.target.value);setEncontrado(undefined);}}><option>CUI</option><option>PASAPORTE</option></select></label><label>Número de documento <input aria-label="Número de documento" value={numero} onChange={e=>{setNumero(e.target.value);setEncontrado(undefined);}}/></label></>}
    {accion==='vinculacion'&&<><Button onClick={()=>void buscar()}>Buscar responsable</Button>{encontrado&&<p>{encontrado.responsable.nombre} · {encontrado.responsable.telefono}{encontrado.activo?' · Ya vinculado':''}</p>}</>}
    {(accion==='crear'||accion==='contacto')&&<><label>Nombres <input aria-label="Nombres del responsable" value={nombres} onChange={e=>setNombres(e.target.value)}/></label><label>Apellidos <input aria-label="Apellidos del responsable" value={apellidos} onChange={e=>setApellidos(e.target.value)}/></label><label>Teléfono <input aria-label="Teléfono del responsable" value={telefono} onChange={e=>setTelefono(e.target.value)}/></label>{accion==='contacto'&&<p>Este contacto cambia para todos los menores que comparten al responsable. Las consultas anteriores conservan sus datos históricos.</p>}</>}
    {['crear','vinculo','vinculacion'].includes(accion??'')&&<><label>Parentesco <input aria-label="Parentesco" value={parentesco} onChange={e=>setParentesco(e.target.value)}/></label><label><input type="checkbox" checked={principal} onChange={e=>setPrincipal(e.target.checked)}/>Principal</label><label><input type="checkbox" checked={autoriza} onChange={e=>setAutoriza(e.target.checked)}/>Autoriza atención</label></>}
    {accion==='baja'&&<><p>Se desactiva el vínculo y se conserva su historia. El menor debe mantener al menos un principal.</p><label>Motivo <input aria-label="Motivo de baja" value={motivo} onChange={e=>setMotivo(e.target.value)}/></label></>}
   </fieldset>}
  </Modal>
 </Panel>;
}
