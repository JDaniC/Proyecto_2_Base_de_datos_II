import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Users,
  RefreshCw,
  Lock
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import {
  DefinicionRolInstitucional,
  DefinicionPermiso,
  CategoriaPermiso,
  PermisoId,
  RolId
} from '../../services/types';

const CATEGORIAS_INFO: Record<CategoriaPermiso, { label: string; color: string }> = {
  PACIENTES: { label: 'Gestión de Pacientes e Historiales', color: 'var(--color-primary)' },
  CLINICA: { label: 'Atención Médica y Prescripciones', color: '#0d9488' },
  LABORATORIO: { label: 'Laboratorio Clínico y Validación', color: '#e11d48' },
  ADMINISTRACION: { label: 'Administración, Auditoría y Seguridad', color: '#d97706' }
};

export const RolesPermissionsMatrixView: React.FC = () => {
  const { sesion } = useAuthSession();
  const { userRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [roles, setRoles] = useState<DefinicionRolInstitucional[]>([]);
  const [catalogoPermisos, setCatalogoPermisos] = useState<DefinicionPermiso[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<'TODAS' | CategoriaPermiso>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<DefinicionRolInstitucional | null>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'info'; texto: string } | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [rolesData, permisosData] = await Promise.all([
        userRepository.obtenerRolesInstitucionales(institucionId),
        userRepository.obtenerCatalogoPermisos()
      ]);
      setRoles(rolesData);
      setCatalogoPermisos(permisosData);
      if (rolesData.length > 0) {
        setRolSeleccionado(rolesData[0]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId, userRepository]);

  const handleTogglePermiso = async (rolId: RolId, permisoId: PermisoId) => {
    const rolActual = roles.find((r) => r.id === rolId);
    if (!rolActual) return;

    const tienePermiso = rolActual.permisos.includes(permisoId);
    const nuevosPermisos = tienePermiso
      ? rolActual.permisos.filter((p) => p !== permisoId)
      : [...rolActual.permisos, permisoId];

    // Impedir que el Administrador se quede sin permiso de usuarios.administrar
    if (rolId === 'ADMIN_INSTITUCIONAL' && permisoId === 'usuarios.administrar' && tienePermiso) {
      alert('Seguridad institucional: No es posible revocar «usuarios.administrar» al Administrador Institucional.');
      return;
    }

    setGuardando(true);
    try {
      const rolActualizado = await userRepository.actualizarPermisosRol(institucionId, rolId, nuevosPermisos);
      setRoles((prev) => prev.map((r) => (r.id === rolId ? rolActualizado : r)));
      if (rolSeleccionado?.id === rolId) {
        setRolSeleccionado(rolActualizado);
      }
      setNotificacion({
        tipo: 'success',
        texto: `Permiso «${permisoId}» ${tienePermiso ? 'revocado de' : 'asignado a'} ${rolActual.etiqueta} con trazabilidad de auditoría.`
      });
      setTimeout(() => setNotificacion(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar permisos');
    } finally {
      setGuardando(false);
    }
  };

  const permisosFiltrados = catalogoPermisos.filter((permiso) => {
    if (filtroCategoria !== 'TODAS' && permiso.categoria !== filtroCategoria) {
      return false;
    }
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      const coincideNombre = permiso.nombre.toLowerCase().includes(q);
      const coincideId = permiso.id.toLowerCase().includes(q);
      const coincideDesc = permiso.descripcion.toLowerCase().includes(q);
      return coincideNombre || coincideId || coincideDesc;
    }
    return true;
  });

  if (loading) {
    return <SkeletonLoader variant="rectangular" height="320px" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerta de notificación de auditoría */}
      {notificacion && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notificacion.texto}</span>
        </div>
      )}

      {/* Cabecera del Módulo V16 */}
      <Panel>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-selection)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Matriz Institucional de Roles y Permisos (V16)
              </h2>
              <Badge variant="info">RBAC Estricto</Badge>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Control de acceso basado en roles con alcance institucional estricto. La activación de permisos
              gobierna la visibilidad de pantallas, acceso a notas clínicas sensibles (CA18), órdenes de
              laboratorio y potestad de prescripción médica.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} className={guardando ? 'animate-spin' : ''} />}
              onClick={cargarDatos}
            >
              Actualizar matriz
            </Button>
          </div>
        </div>
      </Panel>

      {/* Filtros de la Matriz */}
      <Panel>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Búsqueda */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)'
              }}
            />
            <input
              type="text"
              placeholder="Buscar por permiso, código técnico o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Filtros por Categoría */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Filter size={14} color="var(--color-text-secondary)" />
            {(['TODAS', 'PACIENTES', 'CLINICA', 'LABORATORIO', 'ADMINISTRACION'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: filtroCategoria === cat ? 700 : 500,
                  backgroundColor: filtroCategoria === cat ? 'var(--color-selection)' : 'transparent',
                  color: filtroCategoria === cat ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: filtroCategoria === cat ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {cat === 'TODAS' ? 'Todas las áreas' : CATEGORIAS_INFO[cat]?.label.split(' ')[0] || cat}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Disposición: Matriz Principal + Panel Lateral de Detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Tabla Matricial de Permisos */}
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', minWidth: '240px', color: 'var(--color-text-secondary)' }}>
                    Permiso Institucional
                  </th>
                  {roles.map((rol) => {
                    const isSelected = rolSeleccionado?.id === rol.id;
                    return (
                      <th
                        key={rol.id}
                        onClick={() => setRolSeleccionado(rol)}
                        style={{
                          padding: '12px 10px',
                          textAlign: 'center',
                          minWidth: '110px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--color-selection)' : 'transparent',
                          borderTopLeftRadius: '6px',
                          borderTopRightRadius: '6px',
                          borderBottom: isSelected ? '2px solid var(--color-primary)' : 'none'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: isSelected ? 'var(--color-primary)' : 'var(--color-strong)', fontSize: '12px' }}>
                          {rol.etiqueta}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {rol.totalUsuarios ?? 0} usuarios
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {permisosFiltrados.map((permiso) => (
                  <tr
                    key={permiso.id}
                    style={{
                      borderBottom: '1px solid var(--color-divider)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{permiso.nombre}</span>
                        {permiso.esCritico && (
                          <Badge variant="warning">Crítico</Badge>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {permiso.id}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {permiso.descripcion}
                      </div>
                    </td>

                    {roles.map((rol) => {
                      const tiene = rol.permisos.includes(permiso.id);
                      const isSelected = rolSeleccionado?.id === rol.id;
                      return (
                        <td
                          key={rol.id}
                          style={{
                            padding: '12px 10px',
                            textAlign: 'center',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.03)' : 'transparent'
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`${tiene ? 'Revocar' : 'Asignar'} ${permiso.id} a ${rol.etiqueta}`}
                            onClick={() => handleTogglePermiso(rol.id, permiso.id)}
                            disabled={guardando}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px',
                              borderRadius: '6px',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            {tiene ? (
                              <CheckCircle2 size={18} color="var(--color-success)" />
                            ) : (
                              <XCircle size={18} color="var(--color-border)" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Panel Lateral: Detalle del Rol Seleccionado */}
        {rolSeleccionado && (
          <Panel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                  Detalle del Rol Institucional
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: '4px 0 0 0' }}>
                  {rolSeleccionado.etiqueta}
                </h3>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Código: {rolSeleccionado.id}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--color-background-alt)',
                  borderRadius: 'var(--radius-input)',
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  lineHeight: 1.5
                }}
              >
                {rolSeleccionado.descripcion}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <Users size={15} color="var(--color-primary)" />
                <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>
                  {rolSeleccionado.totalUsuarios ?? 0} usuarios activos
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>en esta institución</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)' }}>
                    Permisos Efectivos
                  </span>
                  <Badge variant="info">
                    {rolSeleccionado.permisos.length} / {catalogoPermisos.length}
                  </Badge>
                </div>

                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    padding: '8px'
                  }}
                >
                  {rolSeleccionado.permisos.map((pId) => {
                    const def = catalogoPermisos.find((p) => p.id === pId);
                    return (
                      <div
                        key={pId}
                        style={{
                          fontSize: '12px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-background-alt)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={13} color="var(--color-success)" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: 'var(--color-strong)' }}>
                          {def?.nombre || pId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advertencia de Seguridad */}
              <div
                style={{
                  backgroundColor: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  borderRadius: 'var(--radius-input)',
                  padding: '10px 12px',
                  display: 'flex',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#92400e',
                  lineHeight: 1.4
                }}
              >
                <Lock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Los cambios de permisos aplican inmediatamente a todas las cuentas con este rol en la institución activa y generan un registro inmutable en auditoría.
                </span>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};
