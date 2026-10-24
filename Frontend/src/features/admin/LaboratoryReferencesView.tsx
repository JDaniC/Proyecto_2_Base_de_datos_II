import React, { useEffect, useState } from 'react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { CategoriaReferenciaLab, ReferenciaLaboratorio } from '../../services/types';
import { Panel } from '../../design-system/components/Panel';
import { Input } from '../../design-system/components/Input';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { Alert } from '../../design-system/components/Alert';
import { getErrorMessage } from '../../services/errors';

export const LaboratoryReferencesView: React.FC<{ category: string }> = ({ category }) => {
  const { sesion } = useAuthSession();
  const { catalogRepository } = useServices();
  const categoria = category as CategoriaReferenciaLab;
  const tieneContacto = categoria === 'solicitantes' || categoria === 'proveedores';
  const [items, setItems] = useState<ReferenciaLaboratorio[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<ReferenciaLaboratorio> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    catalogRepository.obtenerReferenciasLaboratorio(sesion!.institucionId, categoria).then(setItems).catch(e => setError(getErrorMessage(e, 'No se pudo cargar el catálogo.')));
  }, [catalogRepository, categoria, sesion]);
  const save = async (item: Omit<ReferenciaLaboratorio, 'id'> & { id?: string }) => {
    setBusy(true); setError(null);
    try {
      const saved = await catalogRepository.guardarReferenciaLaboratorio(sesion!.institucionId, item);
      setItems(prev => prev.some(r => r.id === saved.id) ? prev.map(r => r.id === saved.id ? saved : r) : [...prev, saved]);
      setEditing(null);
    } catch (e) { setError(getErrorMessage(e, 'No se pudo guardar el registro.')); }
    finally { setBusy(false); }
  };
  return <Panel>
    {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, marginBottom: 20 }}>
      <Input label="Buscar por nombre" value={search} onChange={e => setSearch(e.target.value)} />
      <Button onClick={() => { setError(null); setEditing({ nombre: '', contacto: '', estado: 'ACTIVO' }); }}>Agregar registro</Button>
    </div>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead><tr><th>Nombre</th>{tieneContacto && <th>Contacto</th>}<th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>{items.filter(r => r.nombre.toLowerCase().includes(search.trim().toLowerCase())).map(item => <tr key={item.id} style={{ borderTop: '1px solid var(--color-divider)' }}>
        <td style={{ padding: '16px 8px' }}>{item.nombre}</td>{tieneContacto && <td>{item.contacto || '—'}</td>}<td><Badge variant={item.estado === 'ACTIVO' ? 'success' : 'neutral'}>{item.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge></td>
        <td><div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" size="sm" onClick={() => { setError(null); setEditing(item); }}>Editar</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => void save({ ...item, estado: item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' })}>{item.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}</Button></div></td>
      </tr>)}</tbody></table>{items.length === 0 && <p>No hay registros en este catálogo.</p>}</div>
    {editing && <Modal isOpen onClose={() => setEditing(null)} title={editing.id ? 'Editar registro' : 'Agregar registro'}>
      <form onSubmit={e => { e.preventDefault(); void save({ ...editing, categoria, nombre: editing.nombre || '', estado: editing.estado || 'ACTIVO' }); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <Alert variant="danger">{error}</Alert>}
        <Input label="Nombre" value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} required />
        {tieneContacto && <Input label="Contacto" value={editing.contacto || ''} onChange={e => setEditing({ ...editing, contacto: e.target.value })} />}
        <div style={{ display: 'flex', justifyContent: 'end', gap: 12 }}><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" loading={busy}>Guardar</Button></div>
      </form>
    </Modal>}
  </Panel>;
};
