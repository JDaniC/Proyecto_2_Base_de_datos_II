import { Modal } from '../../../design-system/components/Modal';
import { getErrorMessage } from '../../../services/errors';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { Button } from '../../../design-system/components/Button';
import { Input } from '../../../design-system/components/Input';
import { Select } from '../../../design-system/components/Select';
import { AplicacionVacuna } from '../../../services/types';

interface CorregirAplicacionVacunaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aplicacion: AplicacionVacuna;
  esAnulacion?: boolean;
  onActualizado: () => Promise<void>;
}

export const CorregirAplicacionVacunaModal: React.FC<CorregirAplicacionVacunaModalProps> = ({
  isOpen,
  onClose,
  aplicacion,
  esAnulacion = false,
  onActualizado
}) => {
  const { vaccineRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'CENTRO_PEDIATRICO';

  const [lote, setLote] = useState(aplicacion.lote);
  const [sitioAnatomico, setSitioAnatomico] = useState(aplicacion.sitioAnatomico);
  const [reaccionesInmediatas, setReaccionesInmediatas] = useState(aplicacion.reaccionesInmediatas || '');
  const [observaciones, setObservaciones] = useState(aplicacion.observaciones || '');
  const [motivo, setMotivo] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const profesionalNombre = sesion?.nombre
    ? `${sesion.nombre} (${sesion.rolEtiqueta})`
    : 'Personal Autorizado de Inmunizaciones';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setErrorMsg('Debe ingresar el motivo formal de la modificación o anulación auditada.');
      return;
    }

    try {
      setGuardando(true);
      setErrorMsg(null);

      if (esAnulacion) {
        await vaccineRepository.anularAplicacion(
          institucionId,
          aplicacion.id,
          motivo.trim(),
          profesionalNombre
        );
      } else {
        await vaccineRepository.corregirAplicacion(
          institucionId,
          aplicacion.id,
          {
            lote: lote.trim().toUpperCase(),
            sitioAnatomico,
            reaccionesInmediatas: reaccionesInmediatas.trim() || undefined,
            observaciones: observaciones.trim() || undefined,
            motivo: motivo.trim()
          },
          profesionalNombre
        );
      }

      await onActualizado();
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Error al guardar la revisión auditada.');
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={esAnulacion ? 'Anular registro de vacunación' : 'Corregir aplicación de vacuna'} description={`${aplicacion.nombreVacuna} · ${aplicacion.etiquetaDosis}`} maxWidth="520px">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {esAnulacion ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <p className="font-semibold mb-1">Aviso de Inmutabilidad Clínica:</p>
              <p>
                La anulación marcará el registro como ANULADO en el expediente y liberará la clave lógica
                para permitir una nueva aplicación si fue un error administrativo. Se conservará la versión
                previa para fines de auditoría regulatoria.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Número de Lote *"
                  value={lote}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLote(e.target.value)}
                  required
                />

                <Select
                  label="Sitio Anatómico *"
                  value={sitioAnatomico}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSitioAnatomico(e.target.value)}
                  options={[
                    { value: 'Cara anterolateral muslo izquierdo', label: 'Cara anterolateral muslo izquierdo' },
                    { value: 'Cara anterolateral muslo derecho', label: 'Cara anterolateral muslo derecho' },
                    { value: 'Deltoides brazo izquierdo', label: 'Deltoides brazo izquierdo' },
                    { value: 'Deltoides brazo derecho', label: 'Deltoides brazo derecho' },
                    { value: 'Vía oral (gotas sublinguales)', label: 'Vía oral (gotas sublinguales)' }
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Reacciones Inmediatas Post-Vacunales
                </label>
                <Input
                  value={reaccionesInmediatas}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReaccionesInmediatas(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Observaciones Clínicas
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-clinic-primary focus:border-clinic-primary outline-none"
                  value={observaciones}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Motivo Formal del Cambio / Corrección Auditada *
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-clinic-primary focus:border-clinic-primary outline-none"
              placeholder="ej. Enmienda de número de lote por error tipográfico de transcripción..."
              value={motivo}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMotivo(e.target.value)}
              required
            />
          </div>

          {/* Botones */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={esAnulacion ? 'danger' : 'primary'}
              loading={guardando}
              className={esAnulacion ? '' : 'bg-clinic-primary text-white'}
            >
              {esAnulacion ? 'Confirmar Anulación' : 'Guardar Revisión v' + (aplicacion.versionRegistro + 1)}
            </Button>
          </div>
        </form>
    </Modal>
  );
};
