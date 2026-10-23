import React, { useState } from 'react';
import { X, Syringe, AlertCircle, ShieldCheck } from 'lucide-react';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { Button } from '../../../design-system/components/Button';
import { Input } from '../../../design-system/components/Input';
import { Select } from '../../../design-system/components/Select';
import { Paciente, VacunaCatalogo, ItemEsquemaPaciente } from '../../../services/types';

interface RegistrarAplicacionVacunaModalProps {
  isOpen: boolean;
  onClose: () => void;
  paciente: Paciente;
  itemSeleccionado?: ItemEsquemaPaciente | null;
  catalogoVacunas: VacunaCatalogo[];
  onAplicacionRegistrada: () => Promise<void>;
}

export const RegistrarAplicacionVacunaModal: React.FC<RegistrarAplicacionVacunaModalProps> = ({
  isOpen,
  onClose,
  paciente,
  itemSeleccionado,
  catalogoVacunas,
  onAplicacionRegistrada
}) => {
  const { vaccineRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'CENTRO_PEDIATRICO';

  // Vacuna y dosis preseleccionadas o seleccionables
  const [vacunaId, setVacunaId] = useState<string>(
    itemSeleccionado?.vacuna.id || catalogoVacunas[0]?.id || ''
  );
  const vacunaActual = catalogoVacunas.find((v) => v.id === vacunaId) || catalogoVacunas[0];

  const [dosisId, setDosisId] = useState<string>(
    itemSeleccionado?.dosisId || vacunaActual?.dosis[0]?.dosisId || ''
  );

  const [fechaAplicacion, setFechaAplicacion] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [horaAplicacion, setHoraAplicacion] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [lote, setLote] = useState<string>('');
  const [sitioAnatomico, setSitioAnatomico] = useState<string>(
    vacunaActual?.viaAdministracion === 'ORAL'
      ? 'Vía oral (gotas sublinguales)'
      : 'Cara anterolateral muslo izquierdo'
  );
  const [reaccionesInmediatas, setReaccionesInmediatas] = useState<string>('Sin reacciones adversas inmediatas.');
  const [observaciones, setObservaciones] = useState<string>('Aplicación conforme a la norma técnica del esquema nacional.');

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const profesionalNombre = sesion?.nombre
    ? `${sesion.nombre} (${sesion.rolEtiqueta})`
    : 'Personal de Inmunizaciones Pediátricas';

  const handleVacunaChange = (nuevaVacunaId: string) => {
    setVacunaId(nuevaVacunaId);
    const v = catalogoVacunas.find((item) => item.id === nuevaVacunaId);
    if (v && v.dosis.length > 0) {
      setDosisId(v.dosis[0].dosisId);
      if (v.viaAdministracion === 'ORAL') {
        setSitioAnatomico('Vía oral (gotas sublinguales)');
      } else {
        setSitioAnatomico('Cara anterolateral muslo izquierdo');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote.trim()) {
      setErrorMsg('El número de lote del biológico es un requisito obligatorio para la trazabilidad farmacológica.');
      return;
    }
    if (!vacunaId || !dosisId) {
      setErrorMsg('Debe seleccionar la vacuna y la dosis a administrar.');
      return;
    }

    try {
      setGuardando(true);
      setErrorMsg(null);

      await vaccineRepository.registrarAplicacion(
        institucionId,
        paciente.id,
        {
          vacunaId,
          dosisId,
          fechaAplicacion,
          horaAplicacion,
          lote: lote.trim().toUpperCase(),
          sitioAnatomico,
          reaccionesInmediatas: reaccionesInmediatas.trim() || undefined,
          observaciones: observaciones.trim() || undefined
        },
        profesionalNombre
      );

      await onAplicacionRegistrada();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la aplicación de la vacuna.';
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Syringe className="text-[#20666B]" size={20} />
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Registrar Aplicación de Vacuna (P06, Regla CA11)
              </h3>
              <p className="text-[11px] text-slate-500">
                Menor: <strong className="text-slate-700">{paciente.nombreCompleto}</strong> ({paciente.codigoLegible})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Vacuna / Biológico *"
              value={vacunaId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleVacunaChange(e.target.value)}
              options={catalogoVacunas.map((v) => ({
                value: v.id,
                label: `${v.nombreVacuna} (${v.viaAdministracion})`
              }))}
            />

            <Select
              label="Dosis a Administrar *"
              value={dosisId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDosisId(e.target.value)}
              options={
                vacunaActual?.dosis.map((d) => ({
                  value: d.dosisId,
                  label: `${d.etiquetaDosis} (${d.edadRecomendadaMeses === 0 ? 'Al nacer' : `${d.edadRecomendadaMeses} meses`})`
                })) || []
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de Aplicación *"
              type="date"
              value={fechaAplicacion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaAplicacion(e.target.value)}
              required
            />

            <Input
              label="Hora de Aplicación *"
              type="time"
              value={horaAplicacion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraAplicacion(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Número de Lote del Fabricante *"
              placeholder="ej. VAC-GT-2026-09A"
              value={lote}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLote(e.target.value)}
              required
            />

            <Select
              label="Sitio Anatómico de Punción *"
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
              Reacciones Inmediatas Post-Vacunales (observación 15-30 min)
            </label>
            <Input
              value={reaccionesInmediatas}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReaccionesInmediatas(e.target.value)}
              placeholder="ej. Tolerancia adecuada, llanto breve sin fiebre ni erupción..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Observaciones Clínicas o Indicaciones al Tutor
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-[#20666B] focus:border-[#20666B] outline-none"
              value={observaciones}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
              placeholder="ej. Se instruye a la madre sobre cuidados del sitio de punción..."
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={16} className="text-[#20666B]" />
              Clave Determinista CA11:
            </span>
            <code className="text-[11px] font-mono text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded">
              {paciente.id}_{vacunaId}_{dosisId}
            </code>
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
              variant="primary"
              loading={guardando}
              className="bg-[#20666B] text-white"
            >
              Registrar Dosis Aplicada (CA11)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
