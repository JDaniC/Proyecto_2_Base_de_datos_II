import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, History, Syringe } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Tabs } from '../../design-system/components/Tabs';
import { Alert } from '../../design-system/components/Alert';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { getErrorMessage } from '../../services/errors';
import { PruebaLaboratorioCatalogo, VacunaCatalogo } from '../../services/types';
import { RegistrarPruebaLabModal } from './RegistrarPruebaLabModal';
import { RegistrarVacunaModal } from './RegistrarVacunaModal';
import { LaboratoryReferencesView } from './LaboratoryReferencesView';

export const CatalogosManagementPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { catalogRepository } = useServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const institucionId = sesion!.institucionId;
  const esLaboratorio = institucionId === 'LABORATORIO_CLINICO';
  const referenceTabs = [
    { id: 'solicitantes', label: 'Solicitantes' }, { id: 'tipos-muestra', label: 'Tipos de muestra' },
    { id: 'metodos', label: 'Métodos' }, { id: 'proveedores', label: 'Proveedores' }, { id: 'reactivos', label: 'Reactivos' }
  ];
  const tabs = esLaboratorio ? [{ id: 'laboratorio', label: 'Pruebas y parámetros' }, ...referenceTabs] : [{ id: 'vacunas', label: 'Vacunas y dosis' }];
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some(t => t.id === requestedTab) ? requestedTab! : tabs[0].id;
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [pruebasLab, setPruebasLab] = useState<PruebaLaboratorioCatalogo[]>([]);
  const [vacunas, setVacunas] = useState<VacunaCatalogo[]>([]);
  const [showModalLab, setShowModalLab] = useState(false);
  const [vacunaExistente, setVacunaExistente] = useState<VacunaCatalogo | null>(null);
  const [showModalVacuna, setShowModalVacuna] = useState(false);
  const [pruebaParaVersionar, setPruebaParaVersionar] = useState<PruebaLaboratorioCatalogo | null>(null);
  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (esLaboratorio) setPruebasLab(await catalogRepository.obtenerPruebasLaboratorio(institucionId));
        else setVacunas(await catalogRepository.obtenerVacunas(institucionId));
      } catch (error) { setErrorAccion(getErrorMessage(error, 'No se pudo cargar el catálogo.')); }
      finally { setLoading(false); }
    };
    void load();
  }, [institucionId, esLaboratorio, catalogRepository]);
  const handlePruebaLabGuardada = (prueba: PruebaLaboratorioCatalogo) => {
    setPruebasLab(prev => prev.some(p => p.id === prueba.id) ? prev.map(p => p.id === prueba.id ? prueba : p) : [...prev, prueba]);
    setNotificacion('Prueba guardada.');
  };
  const handleVacunaCreada = (vacuna: VacunaCatalogo) => { setVacunas(prev => prev.some(v => v.id === vacuna.id) ? prev.map(v => v.id === vacuna.id ? vacuna : v) : [...prev, vacuna]); setNotificacion('Vacuna guardada.'); };
  const handleToggleEstadoPrueba = async (prueba: PruebaLaboratorioCatalogo) => {
    try {
      const actualizada = await catalogRepository.cambiarEstadoPruebaLaboratorio(institucionId, prueba.id, prueba.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
      setPruebasLab(prev => prev.map(p => p.id === actualizada.id ? actualizada : p));
      setNotificacion('Estado de la prueba actualizado.');
    } catch (error) { setErrorAccion(getErrorMessage(error, 'No se pudo actualizar la prueba.')); }
  };
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <h1>{esLaboratorio ? 'Catálogos de laboratorio' : 'Catálogo de vacunas'}</h1>
      {activeTab === 'laboratorio' && <Button onClick={() => { setPruebaParaVersionar(null); setShowModalLab(true); }} leftIcon={<Plus size={16} />}>Nueva prueba</Button>}
    </div>
    {errorAccion && <Alert variant="danger" onClose={() => setErrorAccion(null)}>{errorAccion}</Alert>}
    {notificacion && <Alert variant="success" onClose={() => setNotificacion(null)}>{notificacion}</Alert>}
    {esLaboratorio && <Tabs tabs={tabs} activeTab={activeTab} onChange={tab => { setSearchParams({ tab }); setBusqueda(''); }} />}
    {(activeTab === 'laboratorio' || activeTab === 'vacunas') && <Input label="Buscar en el catálogo" value={busqueda} onChange={e => setBusqueda(e.target.value)} />}
    {loading ? <SkeletonLoader height="180px" /> : activeTab === 'laboratorio' ? (
        /* Pestaña L10: Pruebas de Laboratorio Versionadas (CA16) */
        <Panel>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Pruebas de laboratorio
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Mantenimiento de determinaciones bioquímicas. La edición de pruebas con órdenes previas crea una nueva versión
              para conservar las pruebas utilizadas en órdenes anteriores.
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Entrega: <strong>{prueba.tiempoEntregaHoras} h</strong>
                      </span>
                      {prueba.estado === 'ACTIVO' ? (
                        <Badge variant="success">ACTIVA</Badge>
                      ) : (
                        <Badge variant="neutral">INACTIVA</Badge>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPruebaParaVersionar(prueba);
                          setShowModalLab(true);
                        }}
                        leftIcon={<History size={14} />}
                      >
                        Nueva Versión
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleEstadoPrueba(prueba)}
                      >
                        {prueba.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
                      </Button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Vacunas y dosis
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Dosis y edades recomendadas del esquema registrado.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setVacunaExistente(null); setShowModalVacuna(true); }}
            >
              <Plus size={15} style={{ marginRight: '6px' }} />
              Nueva vacuna
            </Button>
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
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Badge variant="primary">{vac.esquemaVersion}</Badge><Button size="sm" variant="secondary" onClick={() => { setVacunaExistente(vac); setShowModalVacuna(true); }}>Actualizar dosis y edades</Button></div>
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-divider)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Dosis ({vac.dosis.length})
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

      ) : <LaboratoryReferencesView key={activeTab} category={activeTab} />}
      {showModalLab && <RegistrarPruebaLabModal isOpen onClose={() => setShowModalLab(false)} onPruebaGuardada={handlePruebaLabGuardada} pruebaExistenteParaVersionar={pruebaParaVersionar} />}
      {showModalVacuna && <RegistrarVacunaModal vacunaExistente={vacunaExistente} isOpen onClose={() => setShowModalVacuna(false)} onVacunaGuardada={handleVacunaCreada} />}
  </div>;
};
