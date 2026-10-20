import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Filter,
  X,
  FileText,
  Edit2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import {
  Paciente,
  EstadoPaciente,
  SexoAdministrativo,
  ResultadoPaginadoPacientes
} from '../../services/types';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';

export const PatientsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();

  const [terminoBusqueda, setTerminoBusqueda] = useState(searchParams.get('q') || '');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPaciente | 'TODOS'>(
    (searchParams.get('estado') as EstadoPaciente) || 'TODOS'
  );
  const [filtroSexo, setFiltroSexo] = useState<SexoAdministrativo | 'TODOS'>(
    (searchParams.get('sexo') as SexoAdministrativo) || 'TODOS'
  );
  const [orden, setOrden] = useState<'NOMBRE_ASC' | 'NOMBRE_DESC' | 'FECHA_REGISTRO'>('NOMBRE_ASC');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [cursorActual, setCursorActual] = useState<string | undefined>(undefined);
  const [historialCursores, setHistorialCursores] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoPaginadoPacientes | null>(null);
  const [cargando, setCargando] = useState(true);

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const cargarPacientes = useCallback(
    async (cursor?: string) => {
      setCargando(true);
      try {
        const res = await patientRepository.buscar(institucionId, {
          q: terminoBusqueda,
          estado: filtroEstado,
          sexo: filtroSexo,
          orden,
          cursor,
          limite: 10
        });
        setResultado(res);
      } catch (err) {
        console.error('Error cargando pacientes:', err);
      } finally {
        setCargando(false);
      }
    },
    [institucionId, patientRepository, terminoBusqueda, filtroEstado, filtroSexo, orden]
  );

  useEffect(() => {
    setCursorActual(undefined);
    setHistorialCursores([]);
    cargarPacientes(undefined);
  }, [cargarPacientes]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      ...(terminoBusqueda ? { q: terminoBusqueda } : {}),
      ...(filtroEstado !== 'TODOS' ? { estado: filtroEstado } : {}),
      ...(filtroSexo !== 'TODOS' ? { sexo: filtroSexo } : {})
    });
    setCursorActual(undefined);
    setHistorialCursores([]);
    cargarPacientes(undefined);
  };

  const handleLimpiarFiltros = () => {
    setTerminoBusqueda('');
    setFiltroEstado('TODOS');
    setFiltroSexo('TODOS');
    setOrden('NOMBRE_ASC');
    setSearchParams({});
    setCursorActual(undefined);
    setHistorialCursores([]);
  };

  const handleSiguientePagina = () => {
    if (resultado?.siguienteCursor) {
      setHistorialCursores((prev) => [...prev, cursorActual || 'cur_0']);
      setCursorActual(resultado.siguienteCursor);
      cargarPacientes(resultado.siguienteCursor);
    }
  };

  const handleAnteriorPagina = () => {
    if (historialCursores.length > 0) {
      const nuevoHistorial = [...historialCursores];
      const prevCursor = nuevoHistorial.pop();
      setHistorialCursores(nuevoHistorial);
      setCursorActual(prevCursor === 'cur_0' ? undefined : prevCursor);
      cargarPacientes(prevCursor === 'cur_0' ? undefined : prevCursor);
    }
  };

  const totalFiltrosActivos =
    (filtroEstado !== 'TODOS' ? 1 : 0) + (filtroSexo !== 'TODOS' ? 1 : 0) + (orden !== 'NOMBRE_ASC' ? 1 : 0);

  return (
    <div style={{ padding: '32px 32px 48px' }}>
      {/* Breadcrumb */}
      <nav
        aria-label="Migas de pan"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginBottom: '16px'
        }}
      >
        <span
          onClick={() => navigate('/panel')}
          style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
        >
          Inicio
        </span>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>Pacientes</span>
      </nav>

      {/* Encabezado y Acción Primaria */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: 'var(--color-strong)',
                margin: 0
              }}
            >
              Pacientes del centro
            </h1>
            {resultado && (
              <Badge variant="neutral">
                {resultado.totalEncontrados} {resultado.totalEncontrados === 1 ? 'paciente' : 'pacientes'}
              </Badge>
            )}
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              marginTop: '4px',
              marginBottom: 0
            }}
          >
            Búsqueda, consulta y administración de expedientes clínicos autorizados en{' '}
            <strong style={{ color: 'var(--color-strong)' }}>{sesion?.institucionNombre}</strong>.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus size={18} />}
          onClick={() => navigate('/pacientes/nuevo')}
          aria-label="Registrar nuevo paciente"
        >
          Nuevo paciente
        </Button>
      </div>

      {/* Barra de Búsqueda y Botón de Filtros */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        <form
          onSubmit={handleBuscar}
          style={{
            flex: '1 1 360px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="search"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por nombre, documento de identificación o código de expediente..."
            aria-label="Buscador de pacientes"
            style={{
              width: '100%',
              height: 'var(--height-input)',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-input)',
              padding: '0 44px 0 44px',
              fontSize: '14px',
              color: 'var(--color-strong)',
              outline: 'none',
              transition: 'all var(--transition-fast)'
            }}
          />
          {terminoBusqueda && (
            <button
              type="button"
              onClick={() => {
                setTerminoBusqueda('');
                cargarPacientes(undefined);
              }}
              aria-label="Limpiar texto de búsqueda"
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          )}
        </form>

        <Button
          variant={mostrarFiltros || totalFiltrosActivos > 0 ? 'primary' : 'secondary'}
          leftIcon={<Filter size={16} />}
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          aria-expanded={mostrarFiltros}
          aria-label="Alternar panel de filtros"
        >
          Filtros {totalFiltrosActivos > 0 && `(${totalFiltrosActivos})`}
        </Button>
      </div>

      {/* Sugerencias Rápidas de Demostración */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          fontSize: '12px',
          color: 'var(--color-text-secondary)'
        }}
      >
        <span>Búsquedas frecuentes demo:</span>
        {institucionId === 'HOSPITAL_GENERAL' && (
          <>
            <button
              type="button"
              onClick={() => {
                setTerminoBusqueda('Roberto');
                cargarPacientes(undefined);
              }}
              style={{
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--color-strong)'
              }}
            >
              Roberto Estrada
            </button>
            <button
              type="button"
              onClick={() => {
                setTerminoBusqueda('Claudia');
                cargarPacientes(undefined);
              }}
              style={{
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--color-strong)'
              }}
            >
              Claudia Méndez
            </button>
            <button
              type="button"
              onClick={() => {
                setTerminoBusqueda('HC-HOSP-0112');
                cargarPacientes(undefined);
              }}
              style={{
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--color-strong)'
              }}
            >
              HC-HOSP-0112
            </button>
          </>
        )}
        {institucionId === 'CENTRO_PEDIATRICO' && (
          <>
            <button
              type="button"
              onClick={() => {
                setTerminoBusqueda('Mateo');
                cargarPacientes(undefined);
              }}
              style={{
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--color-strong)'
              }}
            >
              Mateo Álvarez
            </button>
            <button
              type="button"
              onClick={() => {
                setTerminoBusqueda('Sofía');
                cargarPacientes(undefined);
              }}
              style={{
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--color-strong)'
              }}
            >
              Sofía Lemus
            </button>
          </>
        )}
      </div>

      {/* Panel Desplegable de Filtros */}
      {mostrarFiltros && (
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-border-panel)',
            borderRadius: 'var(--radius-panel)',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto',
            gap: '16px',
            alignItems: 'end'
          }}
        >
          <div>
            <label
              htmlFor="filtro-estado"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Estado del expediente
            </label>
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoPaciente | 'TODOS')}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                padding: '0 12px',
                fontSize: '13px'
              }}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Solo activos</option>
              <option value="ARCHIVADO">Solo archivados</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-sexo"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Sexo administrativo
            </label>
            <select
              id="filtro-sexo"
              value={filtroSexo}
              onChange={(e) => setFiltroSexo(e.target.value as SexoAdministrativo | 'TODOS')}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                padding: '0 12px',
                fontSize: '13px'
              }}
            >
              <option value="TODOS">Todos</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-orden"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Ordenación
            </label>
            <select
              id="filtro-orden"
              value={orden}
              onChange={(e) =>
                setOrden(e.target.value as 'NOMBRE_ASC' | 'NOMBRE_DESC' | 'FECHA_REGISTRO')
              }
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                padding: '0 12px',
                fontSize: '13px'
              }}
            >
              <option value="NOMBRE_ASC">Nombre (A - Z)</option>
              <option value="NOMBRE_DESC">Nombre (Z - A)</option>
              <option value="FECHA_REGISTRO">Registro más reciente</option>
            </select>
          </div>

          <div>
            <Button variant="ghost" size="sm" onClick={handleLimpiarFiltros}>
              Restablecer
            </Button>
          </div>
        </div>
      )}

      {/* Contenedor Principal de la Tabla */}
      {cargando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonLoader variant="rectangular" height="64px" />
          <SkeletonLoader variant="rectangular" height="64px" />
          <SkeletonLoader variant="rectangular" height="64px" />
          <SkeletonLoader variant="rectangular" height="64px" />
        </div>
      ) : resultado && resultado.items.length > 0 ? (
        <div
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-panel)'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '14px'
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-panel)',
                    borderBottom: '1px solid var(--color-divider)'
                  }}
                >
                  <th
                    style={{
                      padding: '14px 20px',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Paciente
                  </th>
                  <th
                    style={{
                      padding: '14px 16px',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Expediente / Identificación
                  </th>
                  <th
                    style={{
                      padding: '14px 16px',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Contacto
                  </th>
                  <th
                    style={{
                      padding: '14px 16px',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Estado
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      textAlign: 'right'
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {resultado.items.map((paciente: Paciente) => (
                  <tr
                    key={paciente.id}
                    style={{
                      borderBottom: '1px solid var(--color-divider)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Nombre y Edad */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                        {paciente.nombreCompleto}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span>{paciente.edadAnios} años</span>
                        <span>•</span>
                        <span>
                          {paciente.sexo === 'MASCULINO'
                            ? 'Masculino'
                            : paciente.sexo === 'FEMENINO'
                            ? 'Femenino'
                            : 'Otro'}
                        </span>
                        <span>•</span>
                        <span>Nac: {paciente.fechaNacimiento}</span>
                      </div>
                    </td>

                    {/* Expediente y Documento */}
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            fontSize: '13px'
                          }}
                        >
                          {paciente.codigoLegible}
                        </span>
                        {paciente.estadoAlergias === 'CON_ALERGIAS' && (
                          <Badge variant="warning">
                            Alergias
                          </Badge>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '2px'
                        }}
                      >
                        {paciente.tipoIdentificacion}: {paciente.numeroIdentificacion}
                      </div>
                    </td>

                    {/* Teléfono y Ubicación */}
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ color: 'var(--color-text)', fontSize: '13px' }}>
                        {paciente.telefono}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '2px',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {paciente.direccion}
                      </div>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '16px 16px' }}>
                      <Badge
                        variant={paciente.estado === 'ACTIVO' ? 'success' : 'neutral'}
                      >
                        {paciente.estado === 'ACTIVO' ? 'Activo' : 'Archivado'}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '8px'
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<FileText size={15} />}
                          onClick={() => navigate(`/pacientes/${paciente.id}`)}
                          aria-label={`Ver expediente de ${paciente.nombreCompleto}`}
                        >
                          Ver expediente
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit2 size={15} />}
                          onClick={() => navigate(`/pacientes/${paciente.id}/editar`)}
                          aria-label={`Editar paciente ${paciente.nombreCompleto}`}
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación por Cursor Opaco */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--color-divider)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--color-panel)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Página {resultado.paginaActual} · Mostrando {resultado.items.length} de{' '}
              {resultado.totalEncontrados} registros autorizados
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ChevronLeft size={16} />}
                disabled={historialCursores.length === 0}
                onClick={handleAnteriorPagina}
                aria-label="Página anterior"
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ChevronRight size={16} />}
                disabled={!resultado.hayMas}
                onClick={handleSiguientePagina}
                aria-label="Página siguiente"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No se encontraron pacientes"
          description={
            terminoBusqueda
              ? `No hay expedientes clínicos que coincidan con «${terminoBusqueda}» bajo los filtros aplicados.`
              : 'No hay pacientes registrados en este centro médico.'
          }
          actionText={terminoBusqueda ? 'Limpiar filtros' : 'Registrar paciente'}
          onAction={terminoBusqueda ? handleLimpiarFiltros : () => navigate('/pacientes/nuevo')}
        />
      )}
    </div>
  );
};
