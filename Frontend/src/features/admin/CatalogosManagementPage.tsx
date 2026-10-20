import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  UserCheck,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Syringe,
  Plus,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { RegistrarMedicoModal } from './RegistrarMedicoModal';
import {
  MedicoCatalogo,
  AseguradoraCatalogo,
  ProcedimientoOdontologico,
  PruebaLaboratorioCatalogo,
  VacunaCatalogo
} from '../../services/types';
import { CATALOGO_CIE10, CatalogoCIE10Item } from '../../services/clinicalCatalogs';

type CatalogoTab =
  | 'personal-medico'
  | 'aseguradoras'
  | 'odontologia'
  | 'laboratorio'
  | 'vacunas'
  | 'cie10-medicamentos';

export const CatalogosManagementPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { catalogRepository } = useServices();
  const [searchParams, setSearchParams] = useSearchParams();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';
  const activeTab = (searchParams.get('tab') as CatalogoTab) || 'personal-medico';

  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Estados de datos por catálogo
  const [medicos, setMedicos] = useState<MedicoCatalogo[]>([]);
  const [aseguradoras, setAseguradoras] = useState<AseguradoraCatalogo[]>([]);
  const [procedimientosOdonto, setProcedimientosOdonto] = useState<ProcedimientoOdontologico[]>([]);
  const [pruebasLab, setPruebasLab] = useState<PruebaLaboratorioCatalogo[]>([]);
  const [vacunas, setVacunas] = useState<VacunaCatalogo[]>([]);

  // Modales
  const [showModalMedico, setShowModalMedico] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [m, a, o, l, v] = await Promise.all([
        catalogRepository.obtenerMedicos(institucionId),
        catalogRepository.obtenerAseguradoras(institucionId),
        catalogRepository.obtenerProcedimientosOdontologicos(institucionId),
        catalogRepository.obtenerPruebasLaboratorio(institucionId),
        catalogRepository.obtenerVacunas(institucionId)
      ]);
      setMedicos(m);
      setAseguradoras(a);
      setProcedimientosOdonto(o);
      setPruebasLab(l);
      setVacunas(v);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId, catalogRepository]);

  const handleToggleEstadoMedico = async (medico: MedicoCatalogo) => {
    const nuevoEstado = medico.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const actualizado = await catalogRepository.cambiarEstadoMedico(institucionId, medico.id, nuevoEstado);
      setMedicos((prev) => prev.map((m) => (m.id === actualizado.id ? actualizado : m)));
      setNotificacion(`Estado de ${medico.nombre} modificado a ${nuevoEstado}.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const handleMedicoCreado = (nuevo: MedicoCatalogo) => {
    setMedicos((prev) => [nuevo, ...prev]);
    setNotificacion(`Médico ${nuevo.nombre} colegiado ${nuevo.colegiado} registrado exitosamente.`);
    setTimeout(() => setNotificacion(null), 5000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Administración</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Catálogos Institucionales (V17)</strong>
      </nav>

      {/* Alerta de notificación */}
      {notificacion && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
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
          <span>{notificacion}</span>
        </div>
      )}

      {/* Cabecera Principal V17 */}
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
              <BookOpen size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Catálogos Institucionales Unificados (V17)
            </h1>
            <Badge variant="primary">{sesion?.institucionNombre || 'Institución Activa'}</Badge>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
            Contenedor maestro con navegación por pestañas unificadas para personal médico (H08), entidades aseguradoras
            (H05), aranceles odontológicos (C05), pruebas de laboratorio versionadas (L10), vacunas pediátricas (P04) y
            catálogo CIE-10.
          </p>
        </div>

        {activeTab === 'personal-medico' && (
          <Button
            variant="primary"
            onClick={() => setShowModalMedico(true)}
            leftIcon={<Plus size={16} />}
          >
            Registrar Médico (H08)
          </Button>
        )}
      </div>

      {/* Tabs con subrayado de 3px */}
      <div
        role="tablist"
        aria-label="Catálogos Institucionales"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'personal-medico'}
          type="button"
          onClick={() => setSearchParams({ tab: 'personal-medico' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'personal-medico' ? 700 : 500,
            color: activeTab === 'personal-medico' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'personal-medico' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <UserCheck size={16} />
          <span>Personal Médico (H08)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'aseguradoras'}
          type="button"
          onClick={() => setSearchParams({ tab: 'aseguradoras' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'aseguradoras' ? 700 : 500,
            color: activeTab === 'aseguradoras' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'aseguradoras' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <ShieldCheck size={16} />
          <span>Aseguradoras (H05)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'odontologia'}
          type="button"
          onClick={() => setSearchParams({ tab: 'odontologia' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'odontologia' ? 700 : 500,
            color: activeTab === 'odontologia' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'odontologia' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Stethoscope size={16} />
          <span>Catálogos Odontológicos (C05)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'laboratorio'}
          type="button"
          onClick={() => setSearchParams({ tab: 'laboratorio' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'laboratorio' ? 700 : 500,
            color: activeTab === 'laboratorio' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'laboratorio' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <FlaskConical size={16} />
          <span>Pruebas de Laboratorio (L10)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'vacunas'}
          type="button"
          onClick={() => setSearchParams({ tab: 'vacunas' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'vacunas' ? 700 : 500,
            color: activeTab === 'vacunas' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'vacunas' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Syringe size={16} />
          <span>Vacunas y Dosis (P04)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'cie10-medicamentos'}
          type="button"
          onClick={() => setSearchParams({ tab: 'cie10-medicamentos' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'cie10-medicamentos' ? 700 : 500,
            color: activeTab === 'cie10-medicamentos' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cie10-medicamentos' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <BookOpen size={16} />
          <span>CIE-10 Nosológico</span>
        </button>
      </div>

      {/* Buscador Común */}
      <Panel>
        <div style={{ position: 'relative' }}>
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
            placeholder="Filtrar registros del catálogo activo por nombre, código o propiedad..."
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
      </Panel>

      {/* Contenido según Pestaña Activa */}
      {loading ? (
        <SkeletonLoader variant="rectangular" height="280px" />
      ) : activeTab === 'personal-medico' ? (
        /* Pestaña H08: Personal Médico y Especialidades */
        <Panel>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Personal Médico y Especialidades Asignadas (H08)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Mantenimiento de facultativos, validación de colegiado CMG y vinculación nosológica a consultas y citas.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Profesional</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Colegiado</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Especialidad Principal</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Subespecialidades</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {medicos
                  .filter((m) =>
                    busqueda ? m.nombre.toLowerCase().includes(busqueda.toLowerCase()) || m.colegiado.toLowerCase().includes(busqueda.toLowerCase()) : true
                  )
                  .map((med) => (
                    <tr key={med.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{med.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{med.email}</div>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{med.colegiado}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="primary">{med.especialidadPrincipal}</Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {med.especialidadesSecundarias.length > 0 ? (
                          med.especialidadesSecundarias.map((sub, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-block',
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-background-alt)',
                                border: '1px solid var(--color-border)',
                                marginRight: '4px'
                              }}
                            >
                              {sub}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant={med.estado === 'ACTIVO' ? 'success' : 'neutral'}>{med.estado}</Badge>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant={med.estado === 'ACTIVO' ? 'ghost' : 'secondary'}
                          onClick={() => handleToggleEstadoMedico(med)}
                        >
                          {med.estado === 'ACTIVO' ? 'Suspender' : 'Reactivar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : activeTab === 'aseguradoras' ? (
        /* Pestaña H05: Aseguradoras y Coberturas */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Panel>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Entidades Aseguradoras y Planes de Cobertura (H05)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Convenios institucionales de facturación y coberturas porcentuales hospitalarias.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {aseguradoras
                .filter((a) =>
                  busqueda ? a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || a.codigoAseguradora.toLowerCase().includes(busqueda.toLowerCase()) : true
                )
                .map((aseg) => (
                  <div
                    key={aseg.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      padding: '16px',
                      backgroundColor: 'var(--color-background)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>{aseg.nombre}</h4>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                          {aseg.codigoAseguradora}
                        </span>
                      </div>
                      <Badge variant="success">{aseg.estado}</Badge>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                      Autorizaciones: <strong style={{ color: 'var(--color-strong)' }}>{aseg.telefonoAutorizaciones}</strong>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                        Planes Acreditados ({aseg.planes.length})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {aseg.planes.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              fontSize: '12px',
                              backgroundColor: 'var(--color-background-alt)',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontWeight: 500, color: 'var(--color-strong)' }}>{p.nombrePlan}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Badge variant="info">{p.porcentajeCobertura}% cob.</Badge>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                Ded. Q {p.deducibleBaseGTQ}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      ) : activeTab === 'odontologia' ? (
        /* Pestaña C05: Catálogos Odontológicos (Sin odontograma) */
        <Panel>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Catálogo de Procedimientos y Aranceles Odontológicos (C05)
              </h3>
              <Badge variant="neutral">Sin odontograma</Badge>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Nomenclatura nosológica de intervenciones estomatológicas, duración estimada de sillón y arancel referencial.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Código</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Procedimiento</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Categoría</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Duración Estimada</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Arancel Referencial</th>
                </tr>
              </thead>
              <tbody>
                {procedimientosOdonto
                  .filter((p) =>
                    busqueda ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase()) : true
                  )
                  .map((proc) => (
                    <tr key={proc.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{proc.codigo}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-strong)' }}>{proc.nombre}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="info">{proc.categoria}</Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
                          <Clock size={13} /> {proc.duracionEstimadaMin} min
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-strong)' }}>
                        Q {proc.arancelReferencialGTQ.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : activeTab === 'laboratorio' ? (
        /* Pestaña L10: Pruebas de Laboratorio Versionadas (CA16) */
        <Panel>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Catálogo de Pruebas y Parámetros Versionados de Laboratorio (L10)
              </h3>
              <Badge variant="warning">Regla CA16</Badge>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Mantenimiento de determinaciones bioquímicas. La edición de pruebas con órdenes previas crea una nueva versión
              inmutable para garantizar la trazabilidad analítica pericial.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pruebasLab
              .filter((p) =>
                busqueda ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigoPrueba.toLowerCase().includes(busqueda.toLowerCase()) : true
              )
              .map((prueba) => (
                <div
                  key={prueba.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    padding: '16px',
                    backgroundColor: 'var(--color-background)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {prueba.codigoPrueba}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                          {prueba.nombre}
                        </h4>
                        <Badge variant="info">v{prueba.version}.0</Badge>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        Sección: <strong>{prueba.seccion}</strong> • Muestra: <em>{prueba.tipoMuestra}</em> • Método: {prueba.metodoAnalitico}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Entrega: <strong>{prueba.tiempoEntregaHoras} h</strong>
                      </span>
                      <Badge variant="success">ACTIVA</Badge>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-divider)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Parámetros Analíticos y Rangos Biológicos ({prueba.parametros.length})
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', marginTop: '6px' }}>
                      {prueba.parametros.map((par) => (
                        <div
                          key={par.parametroId}
                          style={{
                            fontSize: '12px',
                            backgroundColor: 'var(--color-background-alt)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ fontWeight: 500, color: 'var(--color-strong)' }}>{par.nombre}</span>
                          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            {par.rangoReferencia} {par.unidadMedida}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      ) : activeTab === 'vacunas' ? (
        /* Pestaña P04: Catálogo de Vacunas y Dosis (P04) */
        <Panel>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Catálogo Oficial de Inmunizaciones y Esquema Pediátrico (P04)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Biológicos del esquema nacional MSPAS con versiones inmutables y edades recomendadas para control de niño sano.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {vacunas
              .filter((v) =>
                busqueda ? v.nombreVacuna.toLowerCase().includes(busqueda.toLowerCase()) || v.enfermedadPrevenida.toLowerCase().includes(busqueda.toLowerCase()) : true
              )
              .map((vac) => (
                <div
                  key={vac.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    padding: '16px',
                    backgroundColor: 'var(--color-background)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                        {vac.nombreVacuna}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Previene: <strong style={{ color: 'var(--color-strong)' }}>{vac.enfermedadPrevenida}</strong> • Vía: {vac.viaAdministracion}
                      </div>
                    </div>
                    <Badge variant="primary">{vac.esquemaVersion}</Badge>
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-divider)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Dosis Oficiales ({vac.dosis.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {vac.dosis.map((d) => (
                        <div
                          key={d.dosisId}
                          style={{
                            fontSize: '12px',
                            backgroundColor: 'var(--color-selection)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Syringe size={13} color="var(--color-primary)" />
                          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{d.etiquetaDosis}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            ({d.edadRecomendadaMeses === 0 ? 'Al nacer' : `${d.edadRecomendadaMeses} meses`})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      ) : (
        /* Pestaña CIE-10 Nosológico Común */
        <Panel>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Catálogo Nosológico Internacional CIE-10
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Catálogo de referencia común utilizado transversalmente en consultas, hospitalizaciones y registros clínicos.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Código CIE-10</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Diagnóstico Nosológico</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Categoría Clínica</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Institución / Uso</th>
                </tr>
              </thead>
              <tbody>
                {CATALOGO_CIE10
                  .filter((c: CatalogoCIE10Item) =>
                    busqueda ? c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.codigo.toLowerCase().includes(busqueda.toLowerCase()) : true
                  )
                  .map((cie: CatalogoCIE10Item) => (
                    <tr key={cie.codigo} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {cie.codigo}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-strong)' }}>{cie.nombre}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="neutral">{cie.categoria || 'Clínico General'}</Badge>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        Núcleo Clínico Común
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Modal para alta de médico (H08) */}
      {showModalMedico && (
        <RegistrarMedicoModal
          isOpen={showModalMedico}
          onClose={() => setShowModalMedico(false)}
          onMedicoCreado={handleMedicoCreado}
        />
      )}
    </div>
  );
};
