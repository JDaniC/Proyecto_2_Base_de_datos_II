import { getDisplayLabel } from '../../../services/displayLabels';
import React, { useState } from 'react';
import {
  FileText,
  Pill,
  Stethoscope,
  Archive,
  RefreshCw,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import { EventoHistorial, TipoEventoHistorial } from '../../../services/types';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { EmptyState } from '../../../design-system/components/EmptyState';

export interface ClinicalTimelineProps {
  eventos: EventoHistorial[];
}

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({ eventos }) => {
  const [orden, setOrden] = useState<'DESC' | 'ASC'>('DESC');
  const [filtroTipo, setFiltroTipo] = useState<TipoEventoHistorial | 'TODOS'>('TODOS');

  // Filtrado
  const eventosFiltrados = eventos.filter((ev) => {
    if (filtroTipo === 'TODOS') return true;
    return ev.tipoEvento === filtroTipo;
  });

  // Ordenamiento (DEC-03: selector explícito entre descendente clínico y ascendente canónico)
  const eventosOrdenados = [...eventosFiltrados].sort((a, b) => {
    const timeA = new Date(a.fechaHora).getTime();
    const timeB = new Date(b.fechaHora).getTime();
    return orden === 'DESC' ? timeB - timeA : timeA - timeB;
  });

  const getIconoEvento = (tipo: TipoEventoHistorial) => {
    switch (tipo) {
      case 'CONSULTA':
        return <Stethoscope size={16} color="var(--color-primary)" />;
      case 'RECETA':
        return <Pill size={16} color="var(--color-info-text)" />;
      case 'DIAGNOSTICO':
        return <Activity size={16} color="var(--color-success-text)" />;
      case 'ARCHIVO':
        return <Archive size={16} color="var(--color-neutral-text)" />;
      case 'REACTIVACION':
        return <RefreshCw size={16} color="var(--color-primary)" />;
      default:
        return <FileText size={16} color="var(--color-text-secondary)" />;
    }
  };

  const getBadgeVariante = (tipo: TipoEventoHistorial): 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary' => {
    switch (tipo) {
      case 'CONSULTA':
        return 'primary';
      case 'RECETA':
        return 'info';
      case 'DIAGNOSTICO':
        return 'success';
      case 'ARCHIVO':
        return 'neutral';
      case 'REACTIVACION':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div>
      {/* Barra de Controles: Filtro por Tipo y Selector de Orden (DEC-03) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--color-panel)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--color-border-panel)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
            Filtrar evento:
          </span>
          {(['TODOS', 'CONSULTA', 'RECETA', 'DIAGNOSTICO'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipo(tipo)}
              style={{
                background: filtroTipo === tipo ? 'var(--color-primary)' : 'var(--color-background)',
                color: filtroTipo === tipo ? 'var(--color-text-inverse)' : 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tipo === 'TODOS'
                ? 'Todos'
                : tipo === 'CONSULTA'
                ? 'Consultas'
                : tipo === 'RECETA'
                ? 'Recetas'
                : 'Diagnósticos'}
            </button>
          ))}
        </div>

        {/* Conmutador de Orden (DEC-03) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowUpDown size={14} />}
            onClick={() => setOrden(orden === 'DESC' ? 'ASC' : 'DESC')}
            aria-label="Alternar orden cronológico"
          >
            {orden === 'DESC' ? 'Más recientes primero' : 'Cronológico desde apertura (ASC)'}
          </Button>
        </div>
      </div>

      {/* Lista del Timeline */}
      {eventosOrdenados.length === 0 ? (
        <EmptyState
          title="Sin eventos en esta cronología"
          description="No se registran eventos clínicos para el filtro seleccionado."
        />
      ) : (
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {/* Línea vertical conectora */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '15px',
              width: '2px',
              backgroundColor: 'var(--color-divider)',
              zIndex: 1
            }}
            aria-hidden="true"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {eventosOrdenados.map((evento) => {
              const fecha = new Date(evento.fechaHora);
              const fechaFormateada = fecha.toLocaleDateString('es-GT', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              const horaFormateada = fecha.toLocaleTimeString('es-GT', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

              return (
                <div
                  key={evento.id}
                  style={{
                    position: 'relative',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-panel)',
                    padding: '16px 20px',
                    boxShadow: 'var(--shadow-sm)',
                    zIndex: 2
                  }}
                >
                  {/* Nodo circular del timeline */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '18px',
                      left: '-25px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-background)',
                      border: '2px solid var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 0 3px var(--color-background)'
                    }}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary)'
                      }}
                    />
                  </div>

                  {/* Cabecera del evento */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ display: 'inline-flex' }}>{getIconoEvento(evento.tipoEvento)}</span>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-strong)' }}>
                        {evento.titulo}
                      </span>
                      <Badge variant={getBadgeVariante(evento.tipoEvento)}>
                        {getDisplayLabel(evento.tipoEvento)}
                      </Badge>
                      {evento.recursoCodigo && (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-panel)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {evento.recursoCodigo}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {fechaFormateada} · {horaFormateada} h
                    </div>
                  </div>

                  {/* Descripción */}
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      margin: '0 0 10px 0',
                      lineHeight: 1.5
                    }}
                  >
                    {evento.descripcion}
                  </p>

                  {/* Firmante / Autor */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <span>Registrado por:</span>
                    <strong style={{ color: 'var(--color-strong)' }}>{evento.profesional}</strong>
                    <span>({evento.rolProfesional})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
