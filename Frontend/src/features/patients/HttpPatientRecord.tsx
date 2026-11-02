import { PatientExamsView } from './components/PatientExamsView';
import { PatientInsurancesView } from './components/PatientInsurancesView';
import { PatientProceduresView } from './components/PatientProceduresView';
import { HospitalAntecedentesView } from './components/HospitalAntecedentesView';
import { ArchivePatientModal } from './components/ArchivePatientModal';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useServices } from '../../app/ServiceContext';
import { useAuthSession } from '../../app/AuthSessionContext';
import type { AntecedentesClinicos, ExpedienteCompleto, FiltrosHistorial, Paciente } from '../../services/types';
import { getErrorMessage } from '../../services/errors';
import { getDisplayLabel } from '../../services/displayLabels';
import { Button } from '../../design-system/components/Button';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Alert } from '../../design-system/components/Alert';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { ClinicalTimeline } from './components/ClinicalTimeline';

/** Ficha E02/E04: perfil autorizado, antecedentes clínicos odontológicos e índice de eventos paginado. */
export const HttpPatientRecord: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const { sesion } = useAuthSession();
  return <PatientRecord key={`${sesion?.cuentaId}/${pacienteId}`} />;
};

const PatientRecord: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();
  const navigate = useNavigate();
  const [search,setSearch]=useSearchParams();
  const tab=search.get('tab')??'general';
  const hospital=sesion?.institucionId==='HOSPITAL_GENERAL';
  const general=!hospital||!['examenes','seguros','procedimientos'].includes(tab);
  const [archivoAbierto, setArchivoAbierto] = useState(false);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [expediente, setExpediente] = useState<ExpedienteCompleto | null>(null);
  const [antecedentes, setAntecedentes] = useState<AntecedentesClinicos | null>(null);
  const [nuevaAlergia, setNuevaAlergia] = useState('');
  const [nuevaCondicion, setNuevaCondicion] = useState('');
  const [guardandoAntecedentes, setGuardandoAntecedentes] = useState(false);
  const [errorAntecedentes, setErrorAntecedentes] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistorial>({ orden: 'ASC', limite: 20 });
  const [previos, setPrevios] = useState<(string | undefined)[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  const puedeLeer = Boolean(sesion?.permisos.includes('historial.leer'));
  const puedeEditar = Boolean(sesion?.permisos.includes('pacientes.administrar'));
  const puedeRegistrarClinica = Boolean(sesion?.permisos.includes('consultas.registrar'));
  const esOdontologia = sesion?.institucionId === 'CLINICA_ODONTOLOGICA';

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    setErrorAntecedentes(null);
    setPaciente(null);
    setExpediente(null);
    setAntecedentes(null);
    if (!sesion || !pacienteId) { setCargando(false); return; }
    const carga = puedeLeer
      ? patientRepository.obtenerExpedienteCompleto(sesion.institucionId, pacienteId, filtros)
      : patientRepository.obtenerPorId(sesion.institucionId, pacienteId);
    const cargaAntecedentes =
      puedeLeer && esOdontologia && patientRepository.obtenerAntecedentes
        ? patientRepository.obtenerAntecedentes(sesion.institucionId, pacienteId)
        : Promise.resolve(null);
    Promise.allSettled([carga, cargaAntecedentes]).then(([resExp, resAnt]) => {
      if (!vigente) return;
      if (resExp.status === 'fulfilled') {
        const data = resExp.value;
        if (data && 'paciente' in data) { setPaciente(data.paciente); setExpediente(data); }
        else setPaciente(data as Paciente | null);
      } else {
        setError(getErrorMessage(resExp.reason, 'No se pudo cargar el perfil. Reintenta la consulta.'));
      }
      if (resAnt.status === 'fulfilled') {
        if (resAnt.value) setAntecedentes(resAnt.value);
      } else {
        setErrorAntecedentes(getErrorMessage(resAnt.reason, 'No fue posible cargar los antecedentes clínicos. Las modificaciones permanecen bloqueadas.'));
      }
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [patientRepository, sesion, pacienteId, puedeLeer, esOdontologia, filtros, reintento]);

  const handleGuardarAntecedente = async (tipo: 'ALERGIA' | 'CONDICION') => {
    if (!sesion || !paciente || !patientRepository.actualizarAntecedentes) return;
    if (!antecedentes) {
      setErrorAntecedentes('No es posible guardar antecedentes porque no se pudieron cargar los registros previos.');
      return;
    }
    const texto = (tipo === 'ALERGIA' ? nuevaAlergia : nuevaCondicion).trim();
    if (!texto) return;
    setGuardandoAntecedentes(true);
    setErrorAntecedentes(null);
    try {
      const alergiasBase = antecedentes?.alergias ?? [];
      const patologicosBase = antecedentes?.patologicos ?? [];
      const alergias =
        tipo === 'ALERGIA'
          ? alergiasBase.some((a) => a.sustancia.toLowerCase() === texto.toLowerCase())
            ? alergiasBase
            : [...alergiasBase, { sustancia: texto, severidad: 'MODERADA' as const, reaccion: 'Alergia reportada en ficha odontológica' }]
          : alergiasBase;
      const patologicos =
        tipo === 'CONDICION' ? Array.from(new Set([...patologicosBase, texto])) : patologicosBase;
      const actualizado = await patientRepository.actualizarAntecedentes(
        sesion.institucionId,
        paciente.id,
        {
          patologicos,
          quirurgicos: antecedentes?.quirurgicos ?? [],
          familiares: antecedentes?.familiares ?? [],
          alergias,
          medicamentosActuales: antecedentes?.medicamentosActuales ?? [],
          versionPaciente: antecedentes?.versionPaciente ?? paciente.version,
        },
        antecedentes?.versionPaciente ?? paciente.version
      );
      setAntecedentes(actualizado);
      if (actualizado.versionPaciente !== undefined) {
        setPaciente((prev) => (prev ? { ...prev, version: actualizado.versionPaciente } : prev));
      }
      if (tipo === 'ALERGIA') setNuevaAlergia('');
      else setNuevaCondicion('');
    } catch (err: unknown) {
      setErrorAntecedentes(getErrorMessage(err, 'No se pudieron actualizar los antecedentes clínicos.'));
    } finally {
      setGuardandoAntecedentes(false);
    }
  };

  return <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
    <nav aria-label="Migas de pan"><Button variant="ghost" onClick={() => navigate('/pacientes')}>Pacientes</Button> / Perfil</nav>
    {error ? <Alert variant="danger" title="No se pudo cargar">{error}<Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button></Alert>
      : cargando ? <SkeletonLoader variant="card" height="300px" />
      : !paciente ? <Alert variant="warning" title="Paciente no encontrado">No existe un paciente disponible con este identificador en tu institución.</Alert>
      : <>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', margin: '24px 0' }}>
          <div style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere' }}><h1>{paciente.nombreCompleto}</h1><p>{paciente.codigoLegible} · <Badge variant={paciente.estado === 'ACTIVO' ? 'success' : 'neutral'}>{paciente.estado === 'ACTIVO' ? 'Expediente activo' : 'Expediente archivado'}</Badge></p></div>
          {sesion?.permisos.includes('consultas.registrar') && paciente.estado === 'ACTIVO' && <Button onClick={() => navigate(`/pacientes/${paciente.id}/consultas/nueva`)}>Registrar atención</Button>}
          {sesion?.permisos.includes('historial.archivar') && (paciente.estado === 'ACTIVO' || sesion.institucionId === 'CENTRO_PEDIATRICO') && <Button variant="secondary" onClick={() => setArchivoAbierto(true)}>{paciente.estado === 'ACTIVO' ? 'Archivar expediente' : 'Reactivar expediente'}</Button>}
          {puedeEditar && <Button variant="secondary" onClick={() => navigate(`/pacientes/${paciente.id}/editar`)}>Editar datos del paciente</Button>}
        </header>
        {archivoAbierto && sesion && <ArchivePatientModal isOpen onClose={() => setArchivoAbierto(false)} paciente={paciente}
          onConfirmArchivar={async (causa, motivo) => { await patientRepository.archivar(sesion.institucionId, paciente.id, causa, motivo, paciente.version); setReintento(n => n + 1); }}
          onConfirmReactivar={async (motivo, correccion) => { await patientRepository.reactivar(sesion.institucionId, paciente.id, motivo, correccion, paciente.version); setReintento(n => n + 1); }} />}
        <Panel title="Datos del paciente" style={{ marginBottom: '24px' }}>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              ['Nacimiento', paciente.fechaNacimiento || 'Sin dato'],
              ['Edad', paciente.edadAnios === null ? 'Sin dato' : `${paciente.edadAnios} años`],
              ['Sexo administrativo', paciente.sexoLegado || (paciente.sexo ? getDisplayLabel(paciente.sexo) : 'Sin dato')],
              ['Identificación', paciente.numeroIdentificacion ? `${paciente.tipoIdentificacionLegado || paciente.tipoIdentificacion}: ${paciente.numeroIdentificacion}` : 'Sin documento registrado'],
              ['Teléfono', paciente.telefono || 'Sin dato'], ['Correo', paciente.correo || 'Sin dato'], ['Dirección', paciente.direccion || 'Sin dato'],
              ...(paciente.institucionId === 'HOSPITAL_GENERAL' ? [['Grupo sanguíneo', paciente.grupoSanguineo || 'Sin dato']] : []),
            ].map(([etiqueta, valor]) => <div key={etiqueta}><dt style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{etiqueta}</dt><dd style={{ margin: '4px 0', overflowWrap: 'anywhere' }}>{valor}</dd></div>)}
          </dl>
          {paciente.contactoEmergencia && <p>Contacto de emergencia: {paciente.contactoEmergencia.nombre} · {paciente.contactoEmergencia.parentesco} · {paciente.contactoEmergencia.telefono}</p>}
          {paciente.estado === 'ARCHIVADO' && <p>Archivo: {paciente.causaArchivo ? getDisplayLabel(paciente.causaArchivo) : 'Sin dato'} · {paciente.motivoArchivo}</p>}
        </Panel>
        {hospital && <nav aria-label="Secciones del expediente" style={{display:'flex',gap:12,marginBottom:24}}>
          {['general',...(puedeLeer?['examenes','procedimientos']:[]),...(puedeLeer||puedeEditar?['seguros']:[])].map(t=><Button key={t} variant={tab===t?'primary':'secondary'} onClick={()=>setSearch({tab:t})}>{({general:'General',examenes:'Exámenes',seguros:'Seguros',procedimientos:'Procedimientos'} as Record<string,string>)[t]}</Button>)}
        </nav>}
        {hospital&&tab==='examenes'&&puedeLeer&&<PatientExamsView pacienteId={paciente.id} pacienteNombre={paciente.nombreCompleto} esArchivado={paciente.estado==='ARCHIVADO'} onActualizado={()=>setReintento(n=>n+1)}/>}
        {hospital&&tab==='procedimientos'&&puedeLeer&&<PatientProceduresView pacienteId={paciente.id} pacienteNombre={paciente.nombreCompleto} esArchivado={paciente.estado==='ARCHIVADO'} onActualizado={()=>setReintento(n=>n+1)}/>}
        {hospital&&tab==='seguros'&&(puedeLeer||puedeEditar)&&<PatientInsurancesView pacienteId={paciente.id} pacienteNombre={paciente.nombreCompleto} pacienteDpi={paciente.tipoIdentificacion==='CUI'?paciente.numeroIdentificacion??'':''} pacienteTelefono={paciente.telefono??''} pacienteNombres={paciente.nombres} pacienteApellidos={paciente.apellidos} esArchivado={paciente.estado==='ARCHIVADO'} onActualizado={()=>setReintento(n=>n+1)}/>}
        {hospital&&general&&puedeLeer&&<HospitalAntecedentesView pacienteId={paciente.id} editable={puedeRegistrarClinica&&paciente.estado==='ACTIVO'} onActualizado={()=>setReintento(n=>n+1)}/>}
        {puedeLeer && esOdontologia && (
          <Panel title="Antecedentes clínicos odontológicos" style={{ marginBottom: '24px' }}>
            {errorAntecedentes && <Alert variant="danger" title="Error en antecedentes">{errorAntecedentes}</Alert>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <strong>Alergias registradas</strong>
                {errorAntecedentes ? (
                  <p style={{ color: 'var(--color-danger-text)', fontSize: '13px' }}>Error al consultar antecedentes clínicos</p>
                ) : (antecedentes?.alergias ?? []).length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>Sin alergias registradas</p>
                ) : (
                  <ul>
                    {(antecedentes?.alergias ?? []).map((alergia) => (
                      <li key={alergia.sustancia}>
                        {alergia.sustancia} ({alergia.severidad}) — {alergia.reaccion}
                      </li>
                    ))}
                  </ul>
                )}
                {puedeRegistrarClinica && paciente.estado === 'ACTIVO' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      aria-label="Nueva alergia odontológica"
                      type="text"
                      disabled={!antecedentes || guardandoAntecedentes}
                      value={nuevaAlergia}
                      onChange={(e) => setNuevaAlergia(e.target.value)}
                      placeholder="Ej. Penicilina"
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    />
                    <Button size="sm" variant="secondary" disabled={!antecedentes || guardandoAntecedentes || !nuevaAlergia.trim()} onClick={() => void handleGuardarAntecedente('ALERGIA')}>
                      Agregar alergia
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <strong>Condiciones sistémicas y antecedentes médicos</strong>
                {errorAntecedentes ? (
                  <p style={{ color: 'var(--color-danger-text)', fontSize: '13px' }}>Error al consultar condiciones clínicas</p>
                ) : (antecedentes?.patologicos ?? []).length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>Sin condiciones relevantes registradas</p>
                ) : (
                  <ul>
                    {(antecedentes?.patologicos ?? []).map((cond) => <li key={cond}>{cond}</li>)}
                  </ul>
                )}
                {puedeRegistrarClinica && paciente.estado === 'ACTIVO' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      aria-label="Nuevo antecedente odontológico"
                      type="text"
                      disabled={!antecedentes || guardandoAntecedentes}
                      value={nuevaCondicion}
                      onChange={(e) => setNuevaCondicion(e.target.value)}
                      placeholder="Ej. Hipertensión controlada"
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    />
                    <Button size="sm" variant="secondary" disabled={!antecedentes || guardandoAntecedentes || !nuevaCondicion.trim()} onClick={() => void handleGuardarAntecedente('CONDICION')}>
                      Agregar antecedente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}
        {paciente.responsables && <Panel title="Responsables vinculados" style={{ marginBottom: '24px' }}>
          {paciente.responsables.map((r) => <p key={r.id}>{r.nombre} · {r.parentesco} · {r.telefono}{r.esPrincipal ? ' · Principal' : ''} · {r.autorizaAtencion ? 'Autoriza atención' : 'Sin autorización de atención'}</p>)}
        </Panel>}
        {general && (puedeLeer && expediente ? <Panel title="Actividad e historial">
          <ClinicalTimeline eventos={expediente.eventos} servidor={{ orden: filtros.orden ?? 'ASC', tipo: filtros.tipo, cambiar: (orden, tipo) => { setPrevios([]); setFiltros({ orden, tipo, limite: 20 }); } }} />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <span>Página {previos.length + 1} · {expediente.eventos.length} eventos</span>
            <Button variant="secondary" disabled={!previos.length} onClick={() => { const copia = [...previos]; const cursor = copia.pop(); setPrevios(copia); setFiltros({ ...filtros, cursor }); }}>Anterior</Button>
            <Button variant="secondary" disabled={!expediente.siguienteCursor} onClick={() => { setPrevios([...previos, filtros.cursor]); setFiltros({ ...filtros, cursor: expediente.siguienteCursor }); }}>Siguiente</Button>
          </div>
        </Panel> : <Alert variant="info" title="Perfil administrativo">Tu cuenta permite consultar los datos administrativos del paciente.</Alert>)}
      </>}
  </div>;
};
