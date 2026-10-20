import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Ban,
  RotateCcw,
  Users,
  ShieldCheck,
  FlaskConical
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { CrearUsuarioModal } from './CrearUsuarioModal';
import { RolesPermissionsMatrixView } from './RolesPermissionsMatrixView';
import { LaboratorioPersonalView } from './LaboratorioPersonalView';
import { UsuarioInstitucional, EstadoCuenta } from '../../services/types';

export const UsersManagementPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { userRepository } = useServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'usuarios';

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioInstitucional[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoCuenta>('TODOS');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

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
    try {
      const actualizado = await userRepository.cambiarEstado(institucionId, usuario.id, nuevoEstado);
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
      const accionTxt =
        nuevoEstado === 'ACTIVO' ? 'habilitada' : nuevoEstado === 'INACTIVO' ? 'suspendida' : 'marcada como pendiente';
      setMensajeExito(`Cuenta de ${usuario.nombreCompleto} ${accionTxt} exitosamente.`);
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de la cuenta');
    }
  };

  const handleUsuarioCreado = (nuevo: UsuarioInstitucional) => {
    setUsuarios((prev) => [nuevo, ...prev]);
    setMensajeExito(`Usuario ${nuevo.nombreCompleto} aprovisionado exitosamente con rol ${nuevo.rolEtiqueta}.`);
    setTimeout(() => setMensajeExito(null), 5000);
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideTexto =
      u.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.authUid.toLowerCase().includes(busqueda.toLowerCase());

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
          {activeTab === 'roles'
            ? 'Roles y Permisos (V16)'
            : activeTab === 'personal-laboratorio'
            ? 'Personal de Laboratorio (L14)'
            : 'Gestión de Usuarios (V15)'}
        </strong>
      </nav>

      {/* Tabs de Navegación Institucional */}
      <div
        role="tablist"
        aria-label="Submódulos de Administración de Cuentas"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0'
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'usuarios'}
          type="button"
          onClick={() => setSearchParams({ tab: 'usuarios' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'usuarios' ? 700 : 500,
            color: activeTab === 'usuarios' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'usuarios' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Users size={16} />
          <span>Usuarios y Cuentas (V15)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'roles'}
          type="button"
          onClick={() => setSearchParams({ tab: 'roles' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'roles' ? 700 : 500,
            color: activeTab === 'roles' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <ShieldCheck size={16} />
          <span>Matriz de Roles y Permisos (V16)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'personal-laboratorio'}
          type="button"
          onClick={() => setSearchParams({ tab: 'personal-laboratorio' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'personal-laboratorio' ? 700 : 500,
            color: activeTab === 'personal-laboratorio' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'personal-laboratorio' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <FlaskConical size={16} />
          <span>Personal de Laboratorio (L14)</span>
        </button>
      </div>

      {/* Renderizado Condicional por Pestaña */}
      {activeTab === 'roles' ? (
        <RolesPermissionsMatrixView />
      ) : activeTab === 'personal-laboratorio' ? (
        <LaboratorioPersonalView />
      ) : (
        <>
          {/* Alerta de notificación */}
          {mensajeExito && (
            <div
              role="status"
              style={{
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success-text)',
                border: '1px solid var(--color-success-border)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* Cabecera Principal */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
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
                  Administración de Usuarios y Cuentas (V15)
                </h1>
                <Badge variant="primary">{sesion?.institucionNombre || 'Institución Activa'}</Badge>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '720px', lineHeight: 1.5 }}>
                Gestión de provisión de cuentas, asignación de roles institucionales y control de ciclo de vida
                (<code>PENDIENTE → ACTIVO → INACTIVO</code>). El alcance está estrictamente delimitado a esta institución.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setShowCrearModal(true)}
              leftIcon={<UserPlus size={16} />}
            >
              Aprovisionar Usuario Institucional
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
              placeholder="Buscar por nombre, correo electrónico o UID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Filtro por Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                {est === 'TODOS' ? 'Todos los estados' : est}
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
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px',
                color: 'var(--color-text)'
              }}
            >
              <option value="TODOS">Todos los roles</option>
              {rolesUnicos.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Tabla de Usuarios */}
      <Panel
        title={`Usuarios Registrados (${usuariosFiltrados.length})`}
        subtitle="Listado con estado de cuenta, rol institucional y acciones de control"
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
            <SkeletonLoader height="36px" />
            <SkeletonLoader height="36px" />
            <SkeletonLoader height="36px" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', backgroundColor: 'var(--color-panel)' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Usuario Institucional</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Rol Asignado</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Estado Cuenta</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Vínculo Profesional</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>UID Autenticación</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
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

                      {/* UID */}
                      <td style={{ padding: '12px' }}>
                        <code style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {u.authUid}
                        </code>
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
        </>
      )}
    </div>
  );
};
