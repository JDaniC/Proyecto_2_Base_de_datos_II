import { getDisplayLabel } from '../../services/displayLabels';
import { Alert } from '../../design-system/components/Alert';
import { getErrorMessage } from '../../services/errors';
import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { CrearUsuarioModal } from './CrearUsuarioModal';
import { UsuarioInstitucional, EstadoCuenta } from '../../services/types';

export const UsersManagementPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { userRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioInstitucional[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoCuenta>('TODOS');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await userRepository.listarUsuarios(institucionId);
      setUsuarios(data);
    } catch (err) {
      // Manejar error silenciosamente con fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, [institucionId, userRepository]);

  const handleCambiarEstado = async (usuario: UsuarioInstitucional, nuevoEstado: EstadoCuenta) => {
    setErrorAccion(null);
    try {
      const actualizado = await userRepository.cambiarEstado(institucionId, usuario.id, nuevoEstado);
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
      const accionTxt =
        nuevoEstado === 'ACTIVO' ? 'habilitada' : nuevoEstado === 'INACTIVO' ? 'suspendida' : 'marcada como pendiente';
      setMensajeExito(`Cuenta de ${usuario.nombreCompleto} ${accionTxt} exitosamente.`);
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: any) {
      setErrorAccion(getErrorMessage(err, 'Error al cambiar estado de la cuenta'));
    }
  };

  const handleUsuarioCreado = (nuevo: UsuarioInstitucional) => {
    setUsuarios((prev) => [nuevo, ...prev]);
    setMensajeExito(`Usuario ${nuevo.nombreCompleto} creado con el rol ${nuevo.rolEtiqueta}.`);
    setTimeout(() => setMensajeExito(null), 5000);
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideTexto =
      u.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase());

    if (!coincideTexto) return false;

    if (filtroEstado !== 'TODOS' && u.estado !== filtroEstado) return false;
    if (filtroRol !== 'TODOS' && u.rolId !== filtroRol) return false;

    return true;
  });

  const rolesUnicos = Array.from(new Set(usuarios.map((u) => u.rolId)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Administración</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>
          Usuarios de laboratorio
        </strong>
      </nav>

          {/* Alerta de notificación */}
          {errorAccion && <Alert variant="danger" title="No se pudo actualizar la cuenta." onClose={() => setErrorAccion(null)}>{errorAccion}</Alert>}
      {mensajeExito && <Alert variant="success" onClose={() => setMensajeExito(null)}>{mensajeExito}</Alert>}

          {/* Cabecera Principal */}
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-panel)',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  Administración de Usuarios y Cuentas
                </h1>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '720px', lineHeight: 1.5 }}>
                Administra las cuentas, los roles y los accesos de esta institución.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setShowCrearModal(true)}
              leftIcon={<UserPlus size={16} />}
            >
              Crear usuario
            </Button>
          </div>

      {/* Panel de Filtros y Búsqueda */}
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
          {/* Buscador */}
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <Search
              size={16}
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
              placeholder="Buscar por nombre o correo electrónico..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Filtro por Estado */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--color-text-secondary)" />
            {(['TODOS', 'ACTIVO', 'PENDIENTE', 'INACTIVO'] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setFiltroEstado(est)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: filtroEstado === est ? 700 : 500,
                  backgroundColor: filtroEstado === est ? 'var(--color-selection)' : 'transparent',
                  color: filtroEstado === est ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: filtroEstado === est ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {est === 'TODOS' ? 'Todos los estados' : getDisplayLabel(est)}
              </button>
            ))}
          </div>

          {/* Filtro por Rol */}
          <div>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              style={{
                padding: '7px 12px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px',
                color: 'var(--color-text)'
              }}
            >
              <option value="TODOS">Todos los roles</option>
              {rolesUnicos.map((rol) => (
                <option key={rol} value={rol}>
                  {usuarios.find((u) => u.rolId === rol)?.rolEtiqueta || getDisplayLabel(rol)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Tabla de Usuarios */}
      <Panel
        title={`Usuarios Registrados (${usuariosFiltrados.length})`}
        subtitle="Cuentas, roles y accesos de esta institución"
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
            <SkeletonLoader height="36px" />
            <SkeletonLoader height="36px" />
            <SkeletonLoader height="36px" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', backgroundColor: 'var(--color-panel)' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Usuario Institucional</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Rol Asignado</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Estado Cuenta</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Vínculo Profesional</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No se encontraron usuarios institucionales con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u, idx) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : 'var(--color-panel)'
                      }}
                    >
                      {/* Usuario */}
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: 'var(--color-strong)', display: 'block', fontSize: '14px' }}>
                          {u.nombreCompleto}
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {u.email}
                        </span>
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: 'var(--color-selection)',
                            color: 'var(--color-primary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                        >
                          {u.rolEtiqueta}
                        </span>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '12px' }}>
                        <Badge
                          variant={
                            u.estado === 'ACTIVO'
                              ? 'success'
                              : u.estado === 'PENDIENTE'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {u.estado === 'ACTIVO'
                            ? 'Activo'
                            : u.estado === 'PENDIENTE'
                            ? 'Pendiente'
                            : 'Inactivo'}
                        </Badge>
                      </td>

                      {/* Vínculo */}
                      <td style={{ padding: '12px', color: 'var(--color-text)' }}>
                        {u.profesionalVinculado ? (
                          <span>{u.profesionalVinculado}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                            Sin vínculo clínico
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {u.estado === 'PENDIENTE' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCambiarEstado(u, 'ACTIVO')}
                              leftIcon={<CheckCircle2 size={13} color="var(--color-primary)" />}
                            >
                              Habilitar
                            </Button>
                          )}
                          {u.estado === 'ACTIVO' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCambiarEstado(u, 'INACTIVO')}
                              leftIcon={<Ban size={13} />}
                            >
                              Suspender
                            </Button>
                          )}
                          {u.estado === 'INACTIVO' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCambiarEstado(u, 'ACTIVO')}
                              leftIcon={<RotateCcw size={13} />}
                            >
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Modal para crear nuevo usuario */}
      {showCrearModal && (
        <CrearUsuarioModal
          isOpen={showCrearModal}
          onClose={() => setShowCrearModal(false)}
          onUsuarioCreado={handleUsuarioCreado}
        />
      )}

    </div>
  );
};
