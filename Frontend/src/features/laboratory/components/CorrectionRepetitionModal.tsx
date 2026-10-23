import React, { useState } from 'react';
import {
  FileEdit,
  RotateCcw,
  History
} from 'lucide-react';
import { Modal } from '../../../design-system/components/Modal';
import { Button } from '../../../design-system/components/Button';
import { Badge } from '../../../design-system/components/Badge';
import { Alert } from '../../../design-system/components/Alert';
import {
  ResultadoLaboratorio,
  OrdenLaboratorio,
  ParametroResultadoLab
} from '../../../services/types';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { useServices } from '../../../app/ServiceContext';
import { calcularAlertaParametro } from '../../../mocks/mockLaboratoryRepository';

export interface CorrectionRepetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenLaboratorio;
  resultadoActual: ResultadoLaboratorio;
  todasLasVersiones: ResultadoLaboratorio[];
  onExito: (nuevoResultado: ResultadoLaboratorio) => void;
}

export const CorrectionRepetitionModal: React.FC<CorrectionRepetitionModalProps> = ({
  isOpen,
  onClose,
  orden,
  resultadoActual,
  todasLasVersiones,
  onExito
}) => {
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  // Modo de operación L08: 'CORRECCION_VERSION' vs 'REPETICION_SERIE' vs 'HISTORIAL_VERSIONES'
  const [modo, setModo] = useState<'CORRECCION_VERSION' | 'REPETICION_SERIE' | 'HISTORIAL_VERSIONES'>('CORRECCION_VERSION');

  // Campos de formulario
  const [motivo, setMotivo] = useState('');
  const [equipoAnalitico, setEquipoAnalitico] = useState(resultadoActual.equipoAnalitico);
  const [metodoAnalitico, setMetodoAnalitico] = useState(resultadoActual.metodoAnalitico);
  const [loteReactivo, setLoteReactivo] = useState(resultadoActual.loteReactivo || 'LOTE-R2026-X');
  const [observaciones, setObservaciones] = useState(resultadoActual.observaciones || '');
  const [parametrosEditados, setParametrosEditados] = useState<ParametroResultadoLab[]>(
    resultadoActual.parametros.map((p) => ({ ...p }))
  );

  // Muestra seleccionada para repetición
  const [muestraSeleccionadaId, setMuestraSeleccionadaId] = useState<string>(
    orden.muestras.find((m) => m.esRetoma)?.id || orden.muestras[0]?.id || ''
  );

  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleCambioParametro = (paramId: string, nuevoValor: string) => {
    setParametrosEditados((prev) =>
      prev.map((p) => {
        if (p.id !== paramId) return p;
        const alerta = calcularAlertaParametro(
          nuevoValor,
          p.rangoReferenciaMin,
          p.rangoReferenciaMax,
          p.valorPanicoMin,
          p.valorPanicoMax
        );
        return {
          ...p,
          valor: nuevoValor,
          alerta
        };
      })
    );
  };

  const handleEjecutar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || motivo.trim().length < 8) {
      setErrorLocal('El motivo o justificación técnica es obligatorio y debe contener al menos 8 caracteres explicativos.');
      return;
    }

    setProcesando(true);
    setErrorLocal(null);

    try {
      const analistaId = sesion?.cuentaId || 'usr-lab-ana-01';
      const analistaNombre = sesion?.nombre || 'Licda. Sofía Paniagua';

      let resultadoFinal: ResultadoLaboratorio;

      if (modo === 'CORRECCION_VERSION') {
        // CORRECCIÓN: Nueva versión dentro de la misma serie (serieResultadoId se conserva, version + 1)
        resultadoFinal = await laboratoryRepository.corregirResultado(
          institucionId,
          resultadoActual.id,
          {
            ordenId: orden.id,
            itemOrdenId: resultadoActual.itemOrdenId,
            muestraId: resultadoActual.muestraId,
            equipoAnalitico,
            metodoAnalitico,
            loteReactivo,
            parametros: parametrosEditados.map((p) => ({
              parametroId: p.id,
              codigoParametro: p.codigoParametro,
              nombre: p.nombre,
              valor: p.valor,
              unidad: p.unidad,
              rangoReferenciaMin: p.rangoReferenciaMin,
              rangoReferenciaMax: p.rangoReferenciaMax,
              rangoTexto: p.rangoTexto,
              alerta: p.alerta,
              valorPanicoMin: p.valorPanicoMin,
              valorPanicoMax: p.valorPanicoMax
            })),
            observaciones,
            analistaId,
            analistaNombre
          },
          motivo.trim()
        );
      } else {
        // REPETICIÓN: Nueva serie analítica (serieResultadoId diferente, version = 1)
        resultadoFinal = await laboratoryRepository.repetirAnalisis(
          institucionId,
          orden.id,
          resultadoActual.itemOrdenId,
          muestraSeleccionadaId,
          {
            ordenId: orden.id,
            itemOrdenId: resultadoActual.itemOrdenId,
            muestraId: muestraSeleccionadaId,
            equipoAnalitico,
            metodoAnalitico,
            loteReactivo,
            parametros: parametrosEditados.map((p) => ({
              parametroId: p.id,
              codigoParametro: p.codigoParametro,
              nombre: p.nombre,
              valor: p.valor,
              unidad: p.unidad,
              rangoReferenciaMin: p.rangoReferenciaMin,
              rangoReferenciaMax: p.rangoReferenciaMax,
              rangoTexto: p.rangoTexto,
              alerta: p.alerta,
              valorPanicoMin: p.valorPanicoMin,
              valorPanicoMax: p.valorPanicoMax
            })),
            observaciones,
            analistaId,
            analistaNombre
          }
        );
      }

      onExito(resultadoFinal);
      onClose();
    } catch (err: any) {
      setErrorLocal(err?.message || 'Error al procesar la operación analítica.');
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Corrección de Versiones vs Repetición de Series (L08)"
      maxWidth="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner explicativo de regla CA12 / CA13 */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-background-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5
          }}
        >
          <strong style={{ color: 'var(--color-strong)' }}>Regla de Negocio CA12 y CA13: </strong>
          La <strong>corrección de un resultado</strong> genera la versión <code>v{resultadoActual.version + 1}</code> en la misma serie (<code>{resultadoActual.serieResultadoId}</code>), archivando la versión previa como inmutable.
          La <strong>repetición de un análisis</strong> crea una nueva serie independiente para asociar retomas o reensayos analíticos.
        </div>

        {errorLocal && (
          <Alert variant="danger" title="Error en la operación">
            {errorLocal}
          </Alert>
        )}

        {/* Selector de Pestañas / Modos */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setModo('CORRECCION_VERSION')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: modo === 'CORRECCION_VERSION' ? '3px solid var(--color-primary)' : '3px solid transparent',
              fontWeight: modo === 'CORRECCION_VERSION' ? 700 : 500,
              color: modo === 'CORRECCION_VERSION' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <FileEdit size={16} />
            <span>Corregir Resultado (Nueva Versión v{resultadoActual.version + 1})</span>
          </button>

          <button
            type="button"
            onClick={() => setModo('REPETICION_SERIE')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: modo === 'REPETICION_SERIE' ? '3px solid var(--color-primary)' : '3px solid transparent',
              fontWeight: modo === 'REPETICION_SERIE' ? 700 : 500,
              color: modo === 'REPETICION_SERIE' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RotateCcw size={16} />
            <span>Repetición Técnica (Nueva Serie)</span>
          </button>

          <button
            type="button"
            onClick={() => setModo('HISTORIAL_VERSIONES')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: modo === 'HISTORIAL_VERSIONES' ? '3px solid var(--color-primary)' : '3px solid transparent',
              fontWeight: modo === 'HISTORIAL_VERSIONES' ? 700 : 500,
              color: modo === 'HISTORIAL_VERSIONES' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <History size={16} />
            <span>Historial de Versiones ({todasLasVersiones.length})</span>
          </button>
        </div>

        {/* Vista 1 & 2: Formulario de Corrección o Repetición */}
        {modo !== 'HISTORIAL_VERSIONES' && (
          <form onSubmit={handleEjecutar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Metadatos del Modo */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'var(--color-surface-hover, #F8FAFC)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  Prueba Analítica
                </label>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-strong)' }}>
                  {resultadoActual.nombrePrueba} ({resultadoActual.codigoPrueba})
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  {modo === 'CORRECCION_VERSION' ? 'Serie Analítica (Conserva)' : 'Nueva Serie Analítica'}
                </label>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>
                  {modo === 'CORRECCION_VERSION'
                    ? `${resultadoActual.serieResultadoId} (Versión ${resultadoActual.version + 1})`
                    : `SER-${orden.codigoOrden.replace('ORD-LAB-', '')}-REP (v1)`}
                </div>
              </div>

              {modo === 'REPETICION_SERIE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Muestra para Repetición
                  </label>
                  <select
                    value={muestraSeleccionadaId}
                    onChange={(e) => setMuestraSeleccionadaId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  >
                    {orden.muestras.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigoMuestra} — {m.tipoMuestra} ({m.estado}) {m.esRetoma ? '★ RETOMA' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  Equipo Analizador
                </label>
                <input
                  type="text"
                  value={equipoAnalitico}
                  onChange={(e) => setEquipoAnalitico(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  Método Analítico
                </label>
                <input
                  type="text"
                  value={metodoAnalitico}
                  onChange={(e) => setMetodoAnalitico(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  Lote de Reactivo
                </label>
                <input
                  type="text"
                  value={loteReactivo}
                  onChange={(e) => setLoteReactivo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  Observaciones Técnicas
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            {/* Motivo Obligatorio (CA12) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '4px' }}>
                {modo === 'CORRECCION_VERSION' ? 'Motivo de la Corrección (Obligatorio)' : 'Justificación de la Repetición (Obligatorio)'}
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  modo === 'CORRECCION_VERSION'
                    ? 'Ej. Corrección por recalibración de factor de dilución 1:2 no aplicada en borrador original...'
                    : 'Ej. Repetición por confirmación de valor de pánico e interferencia por ligera turbidez...'
                }
                rows={2}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Parámetros a Ajustar */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Parámetros Medidos para {modo === 'CORRECCION_VERSION' ? 'la Nueva Versión' : 'la Nueva Serie'}:
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-alt)' }}>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Parámetro</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', width: '160px' }}>Nuevo Valor</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Unidad</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Intervalo Ref.</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parametrosEditados.map((param) => (
                      <tr key={param.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                          {param.nombre} ({param.codigoParametro})
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            value={param.valor}
                            onChange={(e) => handleCambioParametro(param.id, e.target.value)}
                            aria-label={`Nuevo valor para ${param.nombre}`}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: param.alerta === 'CRITICO' ? '2px solid #EF4444' : '1px solid var(--color-border)',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>
                          {param.unidad}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                          {param.rangoTexto}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <Badge
                            variant={
                              param.alerta === 'CRITICO'
                                ? 'danger'
                                : param.alerta === 'ELEVADO' || param.alerta === 'DISMINUIDO'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {param.alerta}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={procesando}>
                {procesando
                  ? 'Guardando...'
                  : modo === 'CORRECCION_VERSION'
                  ? `Guardar Versión v${resultadoActual.version + 1}`
                  : 'Crear Nueva Serie de Análisis'}
              </Button>
            </div>
          </form>
        )}

        {/* Vista 3: Historial Comparativo de Versiones y Series */}
        {modo === 'HISTORIAL_VERSIONES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todasLasVersiones.map((v) => (
              <div
                key={v.id}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: v.id === resultadoActual.id ? '#F0F7F5' : 'var(--color-panel)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {v.serieResultadoId}
                    </span>
                    <Badge variant={v.estado === 'VALIDADO' ? 'success' : v.estado === 'CORREGIDO' ? 'neutral' : 'warning'}>
                      v{v.version} — {v.estado}
                    </Badge>
                    {v.id === resultadoActual.id && <Badge variant="primary">Activo</Badge>}
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {new Date(v.fechaAnalisis).toLocaleString()}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  Analista: <strong>{v.analistaNombre}</strong> · Muestra: <strong>{v.codigoMuestra}</strong> · Equipo: <strong>{v.equipoAnalitico}</strong>
                </div>

                {v.motivoModificacion && (
                  <div style={{ fontSize: '12px', padding: '6px 10px', backgroundColor: 'var(--color-background-alt)', borderRadius: '4px', marginBottom: '8px' }}>
                    <em>Motivo registrado: «{v.motivoModificacion}»</em>
                  </div>
                )}

                {/* Parámetros resumidos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {v.parametros.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface, #ffffff)',
                        fontSize: '11px'
                      }}
                    >
                      <span style={{ color: 'var(--color-text-secondary)' }}>{p.nombre}: </span>
                      <strong style={{ fontFamily: 'monospace', color: p.alerta === 'CRITICO' ? '#B91C1C' : 'var(--color-strong)' }}>
                        {p.valor} {p.unidad}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Button variant="secondary" onClick={onClose}>
                Cerrar Historial
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
export default CorrectionRepetitionModal;
