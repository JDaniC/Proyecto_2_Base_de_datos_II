import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useServices } from '../../app/ServiceContext';
import { useAuthSession } from '../../app/AuthSessionContext';
import type { ExpedienteCompleto, FiltrosHistorial, Paciente } from '../../services/types';
import { getErrorMessage } from '../../services/errors';
import { getDisplayLabel } from '../../services/displayLabels';
import { Button } from '../../design-system/components/Button';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Alert } from '../../design-system/components/Alert';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { ClinicalTimeline } from './components/ClinicalTimeline';

/** Ficha E02: perfil autorizado e índice de eventos paginado, sin inferir detalle clínico. */
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
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [expediente, setExpediente] = useState<ExpedienteCompleto | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistorial>({ orden: 'ASC', limite: 20 });
  const [previos, setPrevios] = useState<(string | undefined)[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  const puedeLeer = Boolean(sesion?.permisos.includes('historial.leer'));
  const puedeEditar = Boolean(sesion?.permisos.includes('pacientes.administrar'));

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    setPaciente(null);
    setExpediente(null);
    if (!sesion || !pacienteId) { setCargando(false); return; }
    const carga = puedeLeer
      ? patientRepository.obtenerExpedienteCompleto(sesion.institucionId, pacienteId, filtros)
      : patientRepository.obtenerPorId(sesion.institucionId, pacienteId);
    carga.then((data) => {
      if (!vigente) return;
      if (data && 'paciente' in data) { setPaciente(data.paciente); setExpediente(data); }
      else setPaciente(data as Paciente | null);
    }).catch((err: unknown) => {
      if (vigente) setError(getErrorMessage(err, 'No se pudo cargar el perfil. Reintenta la consulta.'));
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [patientRepository, sesion, pacienteId, puedeLeer, filtros, reintento]);

  return <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
    <nav aria-label="Migas de pan"><Button variant="ghost" onClick={() => navigate('/pacientes')}>Pacientes</Button> / Perfil</nav>
    {error ? <Alert variant="danger" title="No se pudo cargar">{error}<Button onClick={() => setReintento((n) => n + 1)}>Reintentar</Button></Alert>
      : cargando ? <SkeletonLoader variant="card" height="300px" />
      : !paciente ? <Alert variant="warning" title="Paciente no encontrado">No existe un paciente disponible con este identificador en tu institución.</Alert>
      : <>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', margin: '24px 0' }}>
          <div style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere' }}><h1>{paciente.nombreCompleto}</h1><p>{paciente.codigoLegible} · <Badge variant={paciente.estado === 'ACTIVO' ? 'success' : 'neutral'}>{paciente.estado === 'ACTIVO' ? 'Expediente activo' : 'Expediente archivado'}</Badge></p></div>
          {puedeEditar && <Button variant="secondary" onClick={() => navigate(`/pacientes/${paciente.id}/editar`)}>Editar datos del paciente</Button>}
        </header>
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
        {paciente.responsables && <Panel title="Responsables vinculados" style={{ marginBottom: '24px' }}>
          {paciente.responsables.map((r) => <p key={r.id}>{r.nombre} · {r.parentesco} · {r.telefono}{r.esPrincipal ? ' · Principal' : ''} · {r.autorizaAtencion ? 'Autoriza atención' : 'Sin autorización de atención'}</p>)}
        </Panel>}
        {puedeLeer && expediente ? <Panel title="Actividad e historial">
          <ClinicalTimeline eventos={expediente.eventos} servidor={{ orden: filtros.orden ?? 'ASC', tipo: filtros.tipo, cambiar: (orden, tipo) => { setPrevios([]); setFiltros({ orden, tipo, limite: 20 }); } }} />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <span>Página {previos.length + 1} · {expediente.eventos.length} eventos</span>
            <Button variant="secondary" disabled={!previos.length} onClick={() => { const copia = [...previos]; const cursor = copia.pop(); setPrevios(copia); setFiltros({ ...filtros, cursor }); }}>Anterior</Button>
            <Button variant="secondary" disabled={!expediente.siguienteCursor} onClick={() => { setPrevios([...previos, filtros.cursor]); setFiltros({ ...filtros, cursor: expediente.siguienteCursor }); }}>Siguiente</Button>
          </div>
        </Panel> : <Alert variant="info" title="Perfil administrativo">Tu cuenta permite consultar los datos administrativos del paciente.</Alert>}
      </>}
  </div>;
};
