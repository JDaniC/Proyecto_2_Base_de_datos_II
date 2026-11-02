import {useEffect,useState} from 'react';
import {useServices} from '../../../app/ServiceContext';
import type {AntecedentesClinicos,AlergiaRegistro} from '../../../services/types';
import {Panel} from '../../../design-system/components/Panel';
import {Button} from '../../../design-system/components/Button';
import {Alert} from '../../../design-system/components/Alert';
import {getErrorMessage} from '../../../services/errors';
import {useConfirmedCommand} from '../../hospital/components/useConfirmedCommand';

export function HospitalAntecedentesView({pacienteId,editable,onActualizado}:{pacienteId:string;editable:boolean;onActualizado:()=>void}){
  const {patientRepository}=useServices();
  const [datos,setDatos]=useState<AntecedentesClinicos|null>(null),[error,setError]=useState(''),[pendiente,setPendiente]=useState(false);
  const [tipo,setTipo]=useState<'patologicos'|'quirurgicos'|'familiares'|'medicamentosActuales'|'alergias'>('patologicos');
  const [texto,setTexto]=useState(''),[reaccion,setReaccion]=useState(''),[severidad,setSeveridad]=useState<AlergiaRegistro['severidad']>('LEVE');
  const comando=useConfirmedCommand<AntecedentesClinicos>();
  useEffect(()=>{let vivo=true;patientRepository.obtenerAntecedentes?.('HOSPITAL_GENERAL',pacienteId).then(d=>{if(vivo)setDatos(d);}).catch(e=>{if(vivo)setError(getErrorMessage(e,'No se pudieron leer los antecedentes.'));});return()=>{vivo=false;};},[pacienteId,patientRepository]);
  return <Panel title="Antecedentes y alergias">
    {error&&<Alert variant="danger" title="Antecedentes">{error}</Alert>}
    {!datos?<p>Los antecedentes deben cargarse antes de poder ampliarlos.</p>:<>
      {(['patologicos','quirurgicos','familiares','medicamentosActuales'] as const).map(t=><div key={t}><strong>{{patologicos:'Patológicos',quirurgicos:'Quirúrgicos',familiares:'Familiares',medicamentosActuales:'Medicamentos actuales'}[t]}</strong><ul>{datos[t].map((d,i)=><li key={i}>{d}</li>)}</ul></div>)}
      <strong>Alergias</strong><ul>{datos.alergias.map((a,i)=><li key={i}>{a.sustancia} · {a.severidad} · {a.reaccion}</li>)}</ul>
      {editable&&<form onSubmit={async e=>{e.preventDefault();setPendiente(true);setError('');try{
        const nuevo:AntecedentesClinicos=tipo==='alergias'?{...datos,alergias:[...datos.alergias,{sustancia:texto.trim(),reaccion:reaccion.trim(),severidad}]}:{...datos,[tipo]:[...datos[tipo],texto.trim()]};
        const dto=comando.preparar(nuevo);
        const r=await patientRepository.actualizarAntecedentes!('HOSPITAL_GENERAL',pacienteId,dto,dto.versionPaciente);
        setDatos(r);comando.limpiar();setTexto('');setReaccion('');onActualizado();
      }catch(err){comando.error(err);setError(getErrorMessage(err,'No se pudo guardar el antecedente.'));}finally{setPendiente(false);}}}>
        {comando.incierto&&<p>La confirmación está pendiente. Reintenta la misma solicitud.</p>}
        <fieldset disabled={pendiente||comando.incierto} style={{border:0,padding:0,display:'grid',gap:12}}>
          <label>Tipo de antecedente <select value={tipo} onChange={e=>setTipo(e.target.value as typeof tipo)}><option value="patologicos">Patológico</option><option value="quirurgicos">Quirúrgico</option><option value="familiares">Familiar</option><option value="medicamentosActuales">Medicamento actual</option><option value="alergias">Alergia</option></select></label>
          <label>Descripción <input required maxLength={tipo==='alergias'?150:2000} value={texto} onChange={e=>setTexto(e.target.value)}/></label>
          {tipo==='alergias'&&<><label>Severidad <select value={severidad} onChange={e=>setSeveridad(e.target.value as typeof severidad)}><option>LEVE</option><option>MODERADA</option><option>SEVERA</option></select></label><label>Reacción <input required maxLength={500} value={reaccion} onChange={e=>setReaccion(e.target.value)}/></label></>}
        </fieldset><Button type="submit" disabled={pendiente||!texto.trim()}>{pendiente?'Guardando…':'Agregar antecedente'}</Button>
      </form>}
    </>}
  </Panel>;
}
