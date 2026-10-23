import React, { useState } from 'react';
import { X, PlusCircle, Trash2, Syringe, AlertCircle } from 'lucide-react';
import { useServices } from '../../app/ServiceContext';
import { useAuthSession } from '../../app/AuthSessionContext';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { VacunaCatalogo } from '../../services/types';

interface DosisFormItem {
  dosisId: string;
  numeroDosis: number;
  etiquetaDosis: string;
  edadRecomendadaMeses: number;
  intervaloMinimoSemanas?: number;
}

interface RegistrarVacunaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVacunaGuardada: (vacuna: VacunaCatalogo) => void;
}

export const RegistrarVacunaModal: React.FC<RegistrarVacunaModalProps> = ({
  isOpen,
  onClose,
  onVacunaGuardada
}) => {
  const { catalogRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'CENTRO_PEDIATRICO';

  const [nombreVacuna, setNombreVacuna] = useState('');
  const [enfermedadPrevenida, setEnfermedadPrevenida] = useState('');
  const [viaAdministracion, setViaAdministracion] = useState<'INTRAMUSCULAR' | 'SUBCUTANEA' | 'INTRADERMICA' | 'ORAL'>('INTRAMUSCULAR');
  const [esquemaVersion, setEsquemaVersion] = useState('Esquema Nacional MSPAS v2.2');
  const [dosisList, setDosisList] = useState<DosisFormItem[]>([
    {
      dosisId: `dos-${Date.now()}-1`,
      numeroDosis: 1,
      etiquetaDosis: 'Primera dosis',
      edadRecomendadaMeses: 2
    }
  ]);

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const agregarDosis = () => {
    const num = dosisList.length + 1;
    setDosisList([
      ...dosisList,
      {
        dosisId: `dos-${Date.now()}-${num}`,
        numeroDosis: num,
        etiquetaDosis: `Dosis ${num}`,
        edadRecomendadaMeses: (num - 1) * 2 + 2
      }
    ]);
  };

  const eliminarDosis = (index: number) => {
    if (dosisList.length <= 1) {
      setErrorMsg('El esquema de vacunación debe contener al menos una dosis oficial.');
      return;
    }
    const filtered = dosisList.filter((_, idx) => idx !== index);
    // Renumerar
    const renumbered = filtered.map((d, idx) => ({
      ...d,
      numeroDosis: idx + 1
    }));
    setDosisList(renumbered);
  };

  const actualizarDosis = (index: number, campo: keyof DosisFormItem, valor: any) => {
    const updated = [...dosisList];
    updated[index] = { ...updated[index], [campo]: valor };
    setDosisList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreVacuna.trim()) {
      setErrorMsg('Debe indicar el nombre oficial de la vacuna o biológico.');
      return;
    }
    if (!enfermedadPrevenida.trim()) {
      setErrorMsg('Debe especificar la enfermedad o patología prevenida.');
      return;
    }
    if (dosisList.length === 0) {
      setErrorMsg('Debe configurar al menos una dosis para el esquema.');
      return;
    }

    try {
      setGuardando(true);
      setErrorMsg(null);

      const nuevaVacunaPayload: Omit<VacunaCatalogo, 'id'> = {
        nombreVacuna: nombreVacuna.trim(),
        enfermedadPrevenida: enfermedadPrevenida.trim(),
        viaAdministracion,
        esquemaVersion: esquemaVersion.trim(),
        estado: 'ACTIVO',
        dosis: dosisList.map((d) => ({
          dosisId: d.dosisId,
          numeroDosis: d.numeroDosis,
          etiquetaDosis: d.etiquetaDosis.trim() || `Dosis ${d.numeroDosis}`,
          edadRecomendadaMeses: Number(d.edadRecomendadaMeses),
          intervaloMinimoSemanas: d.intervaloMinimoSemanas ? Number(d.intervaloMinimoSemanas) : undefined
        }))
      };

      let guardada: VacunaCatalogo;
      if (catalogRepository.crearVacuna) {
        guardada = await catalogRepository.crearVacuna(institucionId, nuevaVacunaPayload);
      } else {
        guardada = {
          ...nuevaVacunaPayload,
          id: `vac-${Date.now()}`
        };
      }

      onVacunaGuardada(guardada);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la vacuna en catálogo.';
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Syringe className="text-[#20666B]" size={20} />
            <h3 className="font-semibold text-slate-800 text-sm">
              Registrar Nueva Vacuna / Esquema Pediátrico (P04)
            </h3>
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre de la Vacuna / Biológico *"
              placeholder="ej. Vacuna contra Varicela (Cepa Oka)"
              value={nombreVacuna}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombreVacuna(e.target.value)}
              required
            />

            <Input
              label="Enfermedad Prevenida *"
              placeholder="ej. Varicela e infecciones secundarias"
              value={enfermedadPrevenida}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnfermedadPrevenida(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Vía de Administración *"
              value={viaAdministracion}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setViaAdministracion(e.target.value as any)
              }
              options={[
                { value: 'INTRAMUSCULAR', label: 'Intramuscular (IM)' },
                { value: 'SUBCUTANEA', label: 'Subcutánea (SC)' },
                { value: 'INTRADERMICA', label: 'Intradérmica (ID)' },
                { value: 'ORAL', label: 'Oral (VO)' }
              ]}
            />

            <Input
              label="Versión del Esquema *"
              placeholder="ej. Esquema Nacional MSPAS v2.2"
              value={esquemaVersion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEsquemaVersion(e.target.value)}
              required
            />
          </div>

          {/* Lista de Dosis */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800 text-xs">
                Dosis del Esquema ({dosisList.length})
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={agregarDosis}
                className="flex items-center gap-1 text-xs"
              >
                <PlusCircle size={14} />
                Agregar Dosis
              </Button>
            </div>

            <div className="space-y-2">
              {dosisList.map((dosis, idx) => (
                <div
                  key={dosis.dosisId}
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md"
                >
                  <span className="font-bold text-slate-500 w-6 text-center">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      label="Etiqueta"
                      value={dosis.etiquetaDosis}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        actualizarDosis(idx, 'etiquetaDosis', e.target.value)
                      }
                      placeholder="ej. Primera dosis"
                    />
                    <Input
                      label="Edad Rec. (meses)"
                      type="number"
                      min="0"
                      max="216"
                      value={dosis.edadRecomendadaMeses.toString()}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        actualizarDosis(idx, 'edadRecomendadaMeses', parseInt(e.target.value, 10) || 0)
                      }
                      placeholder="0 = al nacer"
                    />
                    <Input
                      label="Int. mín. (semanas)"
                      type="number"
                      min="0"
                      value={dosis.intervaloMinimoSemanas?.toString() || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        actualizarDosis(
                          idx,
                          'intervaloMinimoSemanas',
                          e.target.value ? parseInt(e.target.value, 10) : undefined
                        )
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarDosis(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors mt-4"
                    title="Eliminar dosis"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
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
              Guardar Vacuna en Catálogo (P04)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
