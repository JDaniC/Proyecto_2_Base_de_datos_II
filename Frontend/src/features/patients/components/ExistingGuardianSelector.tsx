import React, { useEffect, useRef, useState } from 'react';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import type { Paciente, ResponsablePediatrico } from '../../../services/types';
import { getErrorMessage } from '../../../services/errors';
import { Input } from '../../../design-system/components/Input';
import { Button } from '../../../design-system/components/Button';
import { Alert } from '../../../design-system/components/Alert';

/** Reutiliza la lectura administrativa de un menor, sin un catálogo masivo de responsables. */
export const ExistingGuardianSelector: React.FC<{ seleccionado: ResponsablePediatrico | null; onSelect: (responsable: ResponsablePediatrico | null) => void }> = ({ seleccionado, onSelect }) => {
  const { patientRepository } = useServices();
  const { sesion } = useAuthSession();
  const [q, setQ] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [responsables, setResponsables] = useState<ResponsablePediatrico[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [consulta, setConsulta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const solicitud = useRef(0);
  useEffect(() => () => { solicitud.current++; }, []);
  async function buscar(siguiente?: string) {
    if (!sesion || !q.trim() || (siguiente && consulta !== q.trim())) return;
    const actual = ++solicitud.current;
    setCargando(true); setError(null); setResponsables([]); onSelect(null);
    const termino = q.trim();
    try {
      const pagina = await patientRepository.buscar(sesion.institucionId, { q: termino, estado: 'TODOS', orden: 'ASC', limite: 10, cursor: siguiente });
      if (actual === solicitud.current) { setPacientes(pagina.items); setCursor(pagina.siguienteCursor); setConsulta(termino); }
    } catch (err) { if (actual === solicitud.current) { setError(getErrorMessage(err, 'No se pudo buscar al menor.')); setPacientes([]); setCursor(undefined); } }
    finally { if (actual === solicitud.current) setCargando(false); }
  }
  async function cargar(id: string) {
    if (!sesion) return;
    const actual = ++solicitud.current;
    setCargando(true); setError(null); setResponsables([]); onSelect(null);
    try {
      const perfil = await patientRepository.obtenerPorId(sesion.institucionId, id);
      if (actual === solicitud.current) { setResponsables(perfil?.responsables ?? []); if (!perfil?.responsables?.length) setError('Este perfil no tiene responsables disponibles.'); }
    } catch (err) { if (actual === solicitud.current) setError(getErrorMessage(err, 'No se pudieron consultar los responsables.')); }
    finally { if (actual === solicitud.current) setCargando(false); }
  }
  return <div style={{ marginBottom: '20px' }}>
    <p>Busca un menor de esta institución y selecciona al responsable que también se vinculará con el nuevo paciente.</p>
    <Input label="Buscar menor con responsable registrado" maxLength={120} value={q} onChange={(e) => { solicitud.current++; setCargando(false); setQ(e.target.value); setPacientes([]); setResponsables([]); setCursor(undefined); setConsulta(''); setError(null); onSelect(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void buscar(); } }} />
    <Button type="button" variant="secondary" disabled={cargando || !q.trim()} onClick={() => buscar()}>Buscar menor</Button>
    {error && <Alert variant="warning" title="Selección de responsable">{error}</Alert>}
    {cargando && <p role="status">Consultando perfiles…</p>}
    {!cargando && consulta && !pacientes.length && !error && <p>No se encontraron menores para esta búsqueda.</p>}
    {pacientes.map((p) => <div key={p.id}><Button type="button" variant="ghost" disabled={cargando} onClick={() => cargar(p.id)}>Ver responsables de {p.nombreCompleto}</Button></div>)}
    {cursor && <Button type="button" variant="secondary" disabled={cargando} onClick={() => buscar(cursor)}>Más menores</Button>}
    {responsables.map((r) => <div key={r.id}><Button type="button" variant="secondary" disabled={!r.version} onClick={() => onSelect(r)}>Vincular a {r.nombre}</Button></div>)}
    {seleccionado && <Alert variant="info" title="Responsable seleccionado">{seleccionado.nombre} · {seleccionado.documento || 'Documento registrado'} · {seleccionado.telefono}. Sus datos personales se conservan; el parentesco y la autorización se fijan para este menor.</Alert>}
  </div>;
};
