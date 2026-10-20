import React, { useState } from 'react';
import { Pill, PlusCircle, Printer } from 'lucide-react';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { ImprimirRecetaModal } from './ImprimirRecetaModal';
import { EmitirRecetaModal } from './EmitirRecetaModal';
import { RecetaHistorial, Paciente } from '../../services/types';
import { useAuthSession } from '../../app/AuthSessionContext';

interface RecetasPrescripcionesViewProps {
  paciente: Paciente;
  recetas: RecetaHistorial[];
  onRecetasActualizadas: (nuevas: RecetaHistorial[]) => void;
  esArchivado?: boolean;
}

export const RecetasPrescripcionesView: React.FC<RecetasPrescripcionesViewProps> = ({
  paciente,
  recetas,
  onRecetasActualizadas,
  esArchivado = false
}) => {
  const { sesion } = useAuthSession();
  const [showEmitirModal, setShowEmitirModal] = useState(false);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<RecetaHistorial | null>(null);

  const handleRecetaEmitida = (nueva: RecetaHistorial) => {
    onRecetasActualizadas([nueva, ...recetas.filter((r) => r.id !== nueva.id)]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabecera de la sección de prescripción médica */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderLeft: '4px solid var(--color-primary)',
          borderRadius: 'var(--radius-panel)',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Prescripción Farmacológica Certificada (V13)
            </span>
            <Badge variant="info">Total: {recetas.length}</Badge>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-strong)', fontWeight: 600 }}>
            Historial de recetas emitidas para {paciente.nombreCompleto} ({paciente.codigoLegible})
          </div>
        </div>

        {!esArchivado && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowEmitirModal(true)}
            leftIcon={<PlusCircle size={15} />}
          >
            Emitir Nueva Receta (V13)
          </Button>
        )}
      </div>

      {/* Listado de Recetas Emitidas */}
      {recetas.length === 0 ? (
        <Panel>
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-secondary)' }}>
            <Pill size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-strong)' }}>
              No hay recetas farmacológicas emitidas
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Este paciente no cuenta aún con prescripciones farmacológicas registradas en su expediente.
            </p>
          </div>
        </Panel>
      ) : (
        recetas.map((r) => (
          <Panel
            key={r.id}
            title={`Receta Oficial ${r.codigoReceta}`}
            subtitle={`Emitida por ${r.emitidaPor} (${r.rolEmisor}) · ${new Date(r.fechaEmision).toLocaleDateString('es-GT', { dateStyle: 'long' })}`}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRecetaParaImprimir(r)}
                leftIcon={<Printer size={14} />}
              >
                Imprimir Receta (V13)
              </Button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Estado:</span>
                <Badge variant={r.estado === 'DISPENSADA' ? 'success' : 'info'}>
                  {r.estado === 'DISPENSADA' ? 'Dispensada' : 'Emitida y Vigente'}
                </Badge>
                <span>·</span>
                <span>Fármacos prescritos: {r.medicamentos.length}</span>
              </div>

              {/* Tabla de medicamentos */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-panel)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Medicamento</th>
                      <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Presentación</th>
                      <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Dosis</th>
                      <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pauta / Vía</th>
                      <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Duración</th>
                      <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Indicaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.medicamentos.map((m, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx < r.medicamentos.length - 1 ? '1px solid var(--color-border)' : 'none',
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : 'var(--color-panel)'
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-strong)' }}>
                          {m.nombre}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {m.presentacion}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {m.dosis}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {m.frecuencia} ({m.via})
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {m.duracion}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>
                          {m.indicaciones || 'Según indicación'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        ))
      )}

      {/* Modal para emitir nueva receta */}
      {showEmitirModal && (
        <EmitirRecetaModal
          isOpen={showEmitirModal}
          onClose={() => setShowEmitirModal(false)}
          pacienteId={paciente.id}
          onRecetaEmitida={handleRecetaEmitida}
        />
      )}

      {/* Modal para imprimir receta seleccionada */}
      {recetaParaImprimir && (
        <ImprimirRecetaModal
          isOpen={!!recetaParaImprimir}
          onClose={() => setRecetaParaImprimir(null)}
          receta={recetaParaImprimir}
          paciente={paciente}
          institucionNombre={sesion?.institucionNombre || 'Hospital General San Juan'}
        />
      )}
    </div>
  );
};
