import { getDisplayLabel } from '../../../services/displayLabels';
import { getErrorMessage } from '../../../services/errors';
import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../../../design-system/components/Modal';
import { Button } from '../../../design-system/components/Button';
import { Badge } from '../../../design-system/components/Badge';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import {
  OrdenExamenHospital,
  PruebaLaboratorioCatalogo,
  RegistrarResultadoExamenDTO,
  AlertaParametro
} from '../../../services/types';

interface RegistrarResultadosModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenExamenHospital | null;
  onResultadoRegistrado: () => void;
}

export const RegistrarResultadosModal: React.FC<RegistrarResultadosModalProps> = ({
  isOpen,
  onClose,
  orden,
  onResultadoRegistrado
}) => {
  const { sesion } = useAuthSession();
  const { examRepository, catalogRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [catalogoPruebas, setCatalogoPruebas] = useState<PruebaLaboratorioCatalogo[]>([]);
  const [pruebaIdSeleccionada, setPruebaIdSeleccionada] = useState<string>('');
  const [valoresParametros, setValoresParametros] = useState<Record<string, { valor: string; alerta: AlertaParametro }>>({});
  const [interpretacion, setInterpretacion] = useState('');
  const [observacionesTecnicas, setObservacionesTecnicas] = useState('');
  const [responsableAnalisis, setResponsableAnalisis] = useState('Licda. Sofia Morales (Química Bióloga)');
  const [colegiado, setColegiado] = useState('QB-1940');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      catalogRepository.obtenerPruebasLaboratorio(institucionId).then(setCatalogoPruebas);
      setError(null);
      setInterpretacion('');
      setObservacionesTecnicas('');
    }
  }, [isOpen, catalogRepository, institucionId]);

  // Obtener items pendientes de la orden
  const itemsPendientes = orden?.items.filter((it) => it.estado === 'PENDIENTE') || [];

  useEffect(() => {
    if (itemsPendientes.length > 0 && !pruebaIdSeleccionada) {
      setPruebaIdSeleccionada(itemsPendientes[0].pruebaId);
    }
  }, [itemsPendientes, pruebaIdSeleccionada]);

  // Cuando cambia la prueba seleccionada, inicializar los valores de los parámetros
  const pruebaActual = catalogoPruebas.find((p) => p.id === pruebaIdSeleccionada);

  useEffect(() => {
    if (pruebaActual) {
      const initial: Record<string, { valor: string; alerta: AlertaParametro }> = {};
      pruebaActual.parametros.forEach((param) => {
        initial[param.parametroId] = {
          valor: '',
          alerta: 'NORMAL'
        };
      });
      setValoresParametros(initial);
    }
  }, [pruebaActual]);

  const handleParamValueChange = (paramId: string, val: string) => {
    setValoresParametros((prev) => ({
      ...prev,
      [paramId]: {
        ...(prev[paramId] || { alerta: 'NORMAL' }),
        valor: val
      }
    }));
  };

  const handleParamAlertaChange = (paramId: string, alerta: AlertaParametro) => {
    setValoresParametros((prev) => ({
      ...prev,
      [paramId]: {
        ...(prev[paramId] || { valor: '' }),
        alerta
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orden) return;
    setError(null);

    if (!pruebaIdSeleccionada) {
      setError('Debe seleccionar el examen al cual registrar resultados.');
      return;
    }

    if (!interpretacion.trim()) {
      setError('Debe ingresar la interpretación clínica del resultado analítico.');
      return;
    }

    // Validar que se hayan ingresado valores para los parámetros
    const paramEntries = Object.entries(valoresParametros);
    const algunoVacio = paramEntries.some(([_, p]) => !p.valor.trim());
    if (algunoVacio) {
      setError('Debe ingresar los valores medidos para todos los parámetros analíticos.');
      return;
    }

    setGuardando(true);
    try {
      const dto: RegistrarResultadoExamenDTO = {
        ordenId: orden.id,
        pruebaId: pruebaIdSeleccionada,
        responsableAnalisis: responsableAnalisis.trim(),
        colegiadoResponsable: colegiado.trim() || undefined,
        interpretacionClinica: interpretacion.trim(),
        observacionesTecnicas: observacionesTecnicas.trim() || undefined,
        parametros: paramEntries.map(([pId, val]) => ({
          parametroId: pId,
          valorMedido: val.valor.trim(),
          alerta: val.alerta
        }))
      };

      await (examRepository as any).registrarResultado(institucionId, dto, catalogoPruebas);
      onResultadoRegistrado();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error registrando resultados de laboratorio.'));
    } finally {
      setGuardando(false);
    }
  };

  if (!orden) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar Resultados de Laboratorio — Orden ${orden.codigoLegible}`}
      maxWidth="750px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: 'var(--radius-input)',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen de orden y selección de examen */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Paciente:</span>
              <strong style={{ color: 'var(--color-strong)' }}>{orden.pacienteNombre}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Prioridad:</span>
              <Badge variant={orden.prioridad === 'STAT' ? 'danger' : orden.prioridad === 'URGENTE' ? 'warning' : 'primary'}>
                {getDisplayLabel(orden.prioridad)}
              </Badge>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Médico Solicitante:</span>
              <span>{orden.medicoSolicitanteNombre}</span>
            </div>
          </div>
        </div>

        {/* Selección de prueba pendiente */}
        <div>
          <label
            htmlFor="select-prueba-resultado"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Examen a Validar y Reportar *
          </label>
          <select
            id="select-prueba-resultado"
            value={pruebaIdSeleccionada}
            onChange={(e) => setPruebaIdSeleccionada(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          >
            {itemsPendientes.length === 0 ? (
              <option value="">No hay exámenes pendientes en esta orden</option>
            ) : (
              itemsPendientes.map((it) => (
                <option key={it.pruebaId} value={it.pruebaId}>
                  {it.nombre} ({it.codigoPrueba}) — {it.seccion}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Tabla de Parámetros Analíticos con Rangos de Referencia */}
        {pruebaActual && pruebaActual.parametros.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '8px' }}>
              Parámetros Analíticos y Valores Medidos
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-panel)',
                overflow: 'hidden'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-panel)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Parámetro</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Rango de Referencia</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Unidad</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, width: '130px' }}>Valor Medido *</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, width: '130px' }}>Evaluación Clínica</th>
                  </tr>
                </thead>
                <tbody>
                  {pruebaActual.parametros.map((param) => {
                    const currentVal = valoresParametros[param.parametroId] || { valor: '', alerta: 'NORMAL' };
                    return (
                      <tr key={param.parametroId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-strong)' }}>
                          {param.nombre}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                          {param.rangoReferencia}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {param.unidadMedida}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text"
                            value={currentVal.valor}
                            onChange={(e) => handleParamValueChange(param.parametroId, e.target.value)}
                            placeholder="Ej. 120.5"
                            required
                            aria-label={`Valor para ${param.nombre}`}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-input)',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={currentVal.alerta}
                            onChange={(e) => handleParamAlertaChange(param.parametroId, e.target.value as AlertaParametro)}
                            aria-label={`Evaluación para ${param.nombre}`}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-input)',
                              fontSize: '12px'
                            }}
                          >
                            <option value="NORMAL">Normal</option>
                            <option value="ELEVADO">Elevado</option>
                            <option value="DISMINUIDO">Disminuido</option>
                            <option value="CRITICO">Crítico</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Interpretación Clínica y Observaciones */}
        <div>
          <label
            htmlFor="textarea-interpretacion-resultado"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Interpretación Clínica del Resultado *
          </label>
          <textarea
            id="textarea-interpretacion-resultado"
            rows={2}
            value={interpretacion}
            onChange={(e) => setInterpretacion(e.target.value)}
            placeholder="Conclusión diagnóstica de los valores analíticos obtenidos..."
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Responsable técnico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="input-responsable-resultado"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Responsable del Análisis *
            </label>
            <input
              id="input-responsable-resultado"
              type="text"
              value={responsableAnalisis}
              onChange={(e) => setResponsableAnalisis(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-colegiado-resultado"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Colegiado Profesional
            </label>
            <input
              id="input-colegiado-resultado"
              type="text"
              value={colegiado}
              onChange={(e) => setColegiado(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={guardando || itemsPendientes.length === 0}
            aria-label="Confirmar registro de resultados"
            leftIcon={<FileCheck2 size={16} />}
          >
            {guardando ? 'Validando y guardando...' : 'Guardar y Validar Resultado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
