import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Syringe,
  History,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers
} from 'lucide-react';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { Panel } from '../../../design-system/components/Panel';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { Alert } from '../../../design-system/components/Alert';
import { SkeletonLoader } from '../../../design-system/components/SkeletonLoader';
import {
  Paciente,
  ItemEsquemaPaciente,
  AplicacionVacuna,
  VacunaCatalogo,
  EstadoDosisVacuna
} from '../../../services/types';
import { RegistrarAplicacionVacunaModal } from './RegistrarAplicacionVacunaModal';
import { CorregirAplicacionVacunaModal } from './CorregirAplicacionVacunaModal';

interface PediatricVaccinesScheduleViewProps {
  paciente: Paciente;
  onActualizado?: () => Promise<void>;
}

export const PediatricVaccinesScheduleView: React.FC<PediatricVaccinesScheduleViewProps> = ({
  paciente,
  onActualizado
}) => {
  const { vaccineRepository, catalogRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'CENTRO_PEDIATRICO';

  const [modoVista, setModoVista] = useState<'ESQUEMA' | 'HISTORIAL'>('ESQUEMA');
  const [cargando, setCargando] = useState(true);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const [esquemaItems, setEsquemaItems] = useState<ItemEsquemaPaciente[]>([]);
  const [aplicaciones, setAplicaciones] = useState<AplicacionVacuna[]>([]);
  const [catalogoVacunas, setCatalogoVacunas] = useState<VacunaCatalogo[]>([]);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | EstadoDosisVacuna>('TODAS');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalRegistrarAbierto, setModalRegistrarAbierto] = useState(false);
  const [itemSeleccionadoParaAplicar, setItemSeleccionadoParaAplicar] = useState<ItemEsquemaPaciente | null>(null);

  const [modalCorregirAbierto, setModalCorregirAbierto] = useState(false);
  const [aplicacionParaEditar, setAplicacionParaEditar] = useState<AplicacionVacuna | null>(null);
  const [esModoAnulacion, setEsModoAnulacion] = useState(false);

  // Calcular edad del menor en meses
  const edadMeses = useMemo(() => {
    const fn = new Date(paciente.fechaNacimiento);
    const ahora = new Date();
    const difAnios = ahora.getFullYear() - fn.getFullYear();
    const difMeses = ahora.getMonth() - fn.getMonth();
    return Math.max(0, difAnios * 12 + difMeses);
  }, [paciente.fechaNacimiento]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [items, apps, cats] = await Promise.all([
        vaccineRepository.obtenerEsquemaCompletoPaciente(institucionId, paciente.id, edadMeses),
        vaccineRepository.obtenerAplicaciones(institucionId, paciente.id),
        catalogRepository.obtenerVacunas(institucionId)
      ]);
      setEsquemaItems(items);
      setAplicaciones(apps);
      setCatalogoVacunas(cats);
    } catch (err) {
      console.error('Error cargando esquema de vacunación:', err);
    } finally {
      setCargando(false);
    }
  }, [institucionId, paciente.id, edadMeses, vaccineRepository, catalogRepository]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // KPIs
  const totalDosis = esquemaItems.length;
  const dosisAplicadas = esquemaItems.filter((i) => i.estado === 'APLICADA').length;
  const dosisPendientes = esquemaItems.filter((i) => i.estado === 'PENDIENTE').length;
  const dosisFuturas = esquemaItems.filter((i) => i.estado === 'FUTURA').length;
  const porcentajeCobertura = totalDosis > 0 ? Math.round((dosisAplicadas / totalDosis) * 100) : 0;

  // Filtrado de items del esquema
  const itemsFiltrados = useMemo(() => {
    return esquemaItems.filter((item) => {
      const coincideEstado = filtroEstado === 'TODAS' || item.estado === filtroEstado;
      const coincideBusqueda = busqueda
        ? item.vacuna.nombreVacuna.toLowerCase().includes(busqueda.toLowerCase()) ||
          item.vacuna.enfermedadPrevenida.toLowerCase().includes(busqueda.toLowerCase()) ||
          item.etiquetaDosis.toLowerCase().includes(busqueda.toLowerCase())
        : true;
      return coincideEstado && coincideBusqueda;
    });
  }, [esquemaItems, filtroEstado, busqueda]);

  const handleAbrirAplicarParaItem = (item: ItemEsquemaPaciente) => {
    setItemSeleccionadoParaAplicar(item);
    setModalRegistrarAbierto(true);
  };

  const handleAbrirAplicarGeneral = () => {
    setItemSeleccionadoParaAplicar(null);
    setModalRegistrarAbierto(true);
  };

  const handleAbrirCorregir = (app: AplicacionVacuna) => {
    setAplicacionParaEditar(app);
    setEsModoAnulacion(false);
    setModalCorregirAbierto(true);
  };

  const handleAbrirAnular = (app: AplicacionVacuna) => {
    setAplicacionParaEditar(app);
    setEsModoAnulacion(true);
    setModalCorregirAbierto(true);
  };

  const handleAplicacionCompletada = async () => {
    await cargarDatos();
    if (onActualizado) await onActualizado();
    setNotificacion('Aplicación de vacuna registrada exitosamente.');
    setTimeout(() => setNotificacion(null), 4000);
  };

  const handleRevisionCompletada = async () => {
    await cargarDatos();
    if (onActualizado) await onActualizado();
    setNotificacion('Revisión auditada de vacunación guardada con éxito.');
    setTimeout(() => setNotificacion(null), 4000);
  };

  if (cargando) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="rectangular" height="120px" />
        <SkeletonLoader variant="card" height="300px" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notificación de éxito */}
      {notificacion && (
        <Alert variant="success" title="Operación exitosa">
          {notificacion}
        </Alert>
      )}

      {/* Banner de regla CA11 y KPIs de Cobertura */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Syringe className="text-[#20666B]" size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Control de Inmunizaciones y Esquema Oficial (P05, Regla CA11)
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Esquema Nacional MSPAS con cálculo dinámico de dosis pendientes según la edad del menor ({edadMeses} meses / {paciente.edadAnios} años).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAbrirAplicarGeneral}
              className="bg-[#20666B] text-white flex items-center gap-1.5"
            >
              <Plus size={15} />
              Aplicar / Registrar Vacuna (P06)
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI de Cobertura */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)'
          }}
        >
          {/* Total Dosis */}
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Total Esquema</span>
            <strong style={{ fontSize: '18px', color: 'var(--color-strong)' }}>{totalDosis}</strong>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>dosis</span>
          </div>

          {/* Dosis Aplicadas */}
          <div style={{ padding: '10px 14px', backgroundColor: '#EDF5F1', borderRadius: '6px', border: '1px solid #A3C2B8' }}>
            <span style={{ fontSize: '11px', color: '#134E48', display: 'block', fontWeight: 500 }}>Aplicadas (Vigentes)</span>
            <strong style={{ fontSize: '18px', color: '#20666B' }}>{dosisAplicadas}</strong>
            <span style={{ fontSize: '11px', color: '#134E48', marginLeft: '4px' }}>cumplidas</span>
          </div>

          {/* Dosis Pendientes */}
          <div style={{ padding: '10px 14px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: '11px', color: '#92400E', display: 'block', fontWeight: 500 }}>Dosis Pendientes</span>
            <strong style={{ fontSize: '18px', color: '#B45309' }}>{dosisPendientes}</strong>
            <span style={{ fontSize: '11px', color: '#92400E', marginLeft: '4px' }}>debidas por edad</span>
          </div>

          {/* Dosis Futuras */}
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Dosis Futuras</span>
            <strong style={{ fontSize: '18px', color: 'var(--color-strong)' }}>{dosisFuturas}</strong>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>programadas</span>
          </div>

          {/* Cobertura % */}
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Cobertura Total</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <strong style={{ fontSize: '18px', color: 'var(--color-primary)' }}>{porcentajeCobertura}%</strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>del esquema</span>
            </div>
            {/* Barra de progreso visual */}
            <div style={{ width: '100%', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${porcentajeCobertura}%`, height: '100%', backgroundColor: '#20666B' }} />
            </div>
          </div>
        </div>
      </Panel>

      {/* Selector de subvista: Esquema (P05) vs Historial Cronológico (P07) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setModoVista('ESQUEMA')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: modoVista === 'ESQUEMA' ? 700 : 500,
            color: modoVista === 'ESQUEMA' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: modoVista === 'ESQUEMA' ? 'var(--color-selection)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Layers size={16} />
          <span>Esquema y Dosis Pendientes (P05)</span>
        </button>

        <button
          type="button"
          onClick={() => setModoVista('HISTORIAL')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: modoVista === 'HISTORIAL' ? 700 : 500,
            color: modoVista === 'HISTORIAL' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: modoVista === 'HISTORIAL' ? 'var(--color-selection)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <History size={16} />
          <span>Historial Cronológico e Inmutabilidad (P07) ({aplicaciones.length})</span>
        </button>
      </div>

      {/* SUBVISTA 1: ESQUEMA Y DOSIS PENDIENTES (P05) */}
      {modoVista === 'ESQUEMA' && (
        <Panel>
          {/* Barra de Filtros y Búsqueda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {/* Filtros por Estado */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['TODAS', 'PENDIENTE', 'APLICADA', 'FUTURA'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstado(est as any)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: filtroEstado === est ? 600 : 500,
                    borderRadius: '16px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: filtroEstado === est ? 'var(--color-primary)' : '#FFFFFF',
                    color: filtroEstado === est ? '#FFFFFF' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {est === 'TODAS'
                    ? `Todas (${esquemaItems.length})`
                    : est === 'PENDIENTE'
                    ? `Pendientes (${dosisPendientes})`
                    : est === 'APLICADA'
                    ? `Aplicadas (${dosisAplicadas})`
                    : `Futuras (${dosisFuturas})`}
                </button>
              ))}
            </div>

            {/* Input de Búsqueda */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Buscar vacuna o patología..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Tabla del Esquema */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Biológico / Vacuna</th>
                  <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Dosis Programada</th>
                  <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Edad Recomendada</th>
                  <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Detalle de Aplicación</th>
                  <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {itemsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No se encontraron dosis en el esquema con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  itemsFiltrados.map((item, idx) => (
                    <tr
                      key={`${item.vacuna.id}-${item.dosisId}`}
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor:
                          item.estado === 'PENDIENTE'
                            ? '#FFFBEB'
                            : idx % 2 === 0
                            ? '#FFFFFF'
                            : 'var(--color-bg-subtle)'
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <strong style={{ color: 'var(--color-strong)', display: 'block' }}>
                          {item.vacuna.nombreVacuna}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {item.vacuna.enfermedadPrevenida} ({item.vacuna.viaAdministracion})
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-strong)' }}>
                        {item.etiquetaDosis}
                      </td>

                      <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>
                        {item.edadRecomendadaMeses === 0
                          ? 'Al nacer'
                          : item.edadRecomendadaMeses < 12
                          ? `${item.edadRecomendadaMeses} meses`
                          : `${item.edadRecomendadaMeses / 12} años (${item.edadRecomendadaMeses} m)`}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <Badge
                          variant={
                            item.estado === 'APLICADA'
                              ? 'success'
                              : item.estado === 'PENDIENTE'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {item.estado === 'APLICADA'
                            ? 'APLICADA'
                            : item.estado === 'PENDIENTE'
                            ? 'PENDIENTE / DEBIDA'
                            : 'FUTURA'}
                        </Badge>
                      </td>

                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                        {item.estado === 'APLICADA' && item.aplicacionVigente ? (
                          <div>
                            <span style={{ color: 'var(--color-strong)', fontWeight: 600, display: 'block' }}>
                              Fecha: {item.aplicacionVigente.fechaAplicacion}
                            </span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                              Lote: <strong style={{ color: 'var(--color-strong)' }}>{item.aplicacionVigente.lote}</strong> • {item.aplicacionVigente.sitioAnatomico}
                            </span>
                          </div>
                        ) : item.estado === 'PENDIENTE' ? (
                          <div style={{ color: '#92400E' }}>
                            <span style={{ fontWeight: 600, display: 'block' }}>Debida por edad</span>
                            <span style={{ fontSize: '11px' }}>
                              {item.diasRetraso ? `Atraso estimado: ~${Math.round(item.diasRetraso / 30)} meses` : 'Corresponde aplicar'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                            Programada según esquema
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {item.estado === 'PENDIENTE' || item.estado === 'FUTURA' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAbrirAplicarParaItem(item)}
                            className="bg-[#20666B] text-white"
                          >
                            <Syringe size={14} style={{ marginRight: '4px' }} />
                            Aplicar (P06)
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModoVista('HISTORIAL')}
                            title="Ver en historial cronológico"
                          >
                            <History size={14} style={{ marginRight: '4px' }} />
                            Ver Registro
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* SUBVISTA 2: HISTORIAL CRONOLÓGICO E INMUTABILIDAD (P07) */}
      {modoVista === 'HISTORIAL' && (
        <Panel
          title={`Historial Cronológico de Aplicaciones (${aplicaciones.length})`}
          subtitle="Registro inmutable de biológicos aplicados con trazabilidad de enmiendas y auditoría regulatoria"
        >
          {aplicaciones.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No se registran aplicaciones de vacunas en el historial de este menor.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Fecha / Hora</th>
                    <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Biológico y Dosis</th>
                    <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Lote / Vía / Sitio</th>
                    <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Profesional Aplicador</th>
                    <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Estado / Versión</th>
                    <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {aplicaciones.map((app, idx) => (
                    <tr
                      key={app.id}
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor:
                          app.estadoRegistro === 'ANULADO'
                            ? '#FEF2F2'
                            : idx % 2 === 0
                            ? '#FFFFFF'
                            : 'var(--color-bg-subtle)'
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-strong)' }}>
                        {app.fechaAplicacion}
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                          {app.horaAplicacion || '10:00'}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <strong style={{ color: 'var(--color-strong)', display: 'block' }}>
                          {app.nombreVacuna}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {app.etiquetaDosis}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'block', color: 'var(--color-strong)', fontFamily: 'monospace' }}>
                          Lote: {app.lote}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {app.viaAdministracion} • {app.sitioAnatomico}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>
                        {app.profesionalAplicador}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge
                            variant={
                              app.estadoRegistro === 'VIGENTE'
                                ? 'success'
                                : app.estadoRegistro === 'CORREGIDO'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {app.estadoRegistro}
                          </Badge>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            v{app.versionRegistro}
                          </span>
                        </div>
                        {app.motivoCorreccion && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                            Motivo: {app.motivoCorreccion}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {app.estadoRegistro !== 'ANULADO' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAbrirCorregir(app)}
                              title="Corregir lote o datos auditados"
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAbrirAnular(app)}
                              title="Anular aplicación con motivo formal"
                            >
                              <Trash2 size={14} color="#DC2626" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* MODAL REGISTRAR APLICACIÓN DE VACUNA (P06, Regla CA11) */}
      {modalRegistrarAbierto && (
        <RegistrarAplicacionVacunaModal
          isOpen={modalRegistrarAbierto}
          onClose={() => setModalRegistrarAbierto(false)}
          paciente={paciente}
          itemSeleccionado={itemSeleccionadoParaAplicar}
          catalogoVacunas={catalogoVacunas}
          onAplicacionRegistrada={handleAplicacionCompletada}
        />
      )}

      {/* MODAL CORREGIR / ANULAR APLICACIÓN (P07) */}
      {modalCorregirAbierto && aplicacionParaEditar && (
        <CorregirAplicacionVacunaModal
          isOpen={modalCorregirAbierto}
          onClose={() => setModalCorregirAbierto(false)}
          aplicacion={aplicacionParaEditar}
          esAnulacion={esModoAnulacion}
          onActualizado={handleRevisionCompletada}
        />
      )}
    </div>
  );
};
