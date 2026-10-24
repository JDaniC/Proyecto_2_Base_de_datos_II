import { Modal } from '../../design-system/components/Modal';
import { getErrorMessage } from '../../services/errors';
import React, { useState } from 'react';
import { PlusCircle, Trash2, AlertCircle } from 'lucide-react';
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
  vacunaExistente?: VacunaCatalogo | null;
}

export const RegistrarVacunaModal: React.FC<RegistrarVacunaModalProps> = ({
  isOpen,
  onClose,
  onVacunaGuardada,
  vacunaExistente
}) => {
  const { catalogRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'CENTRO_PEDIATRICO';

  const [nombreVacuna, setNombreVacuna] = useState(vacunaExistente?.nombreVacuna || '');
  const [enfermedadPrevenida, setEnfermedadPrevenida] = useState(vacunaExistente?.enfermedadPrevenida || '');
  const [viaAdministracion, setViaAdministracion] = useState<'INTRAMUSCULAR' | 'SUBCUTANEA' | 'INTRADERMICA' | 'ORAL'>(vacunaExistente?.viaAdministracion || 'INTRAMUSCULAR');
  const [esquemaVersion, setEsquemaVersion] = useState(vacunaExistente ? `${vacunaExistente.esquemaVersion} · revisión` : '');
  const [dosisList, setDosisList] = useState<DosisFormItem[]>(vacunaExistente?.dosis.map(d => ({ ...d })) || [
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
      if (vacunaExistente && catalogRepository.crearVersionEsquemaVacuna) {
        guardada = await catalogRepository.crearVersionEsquemaVacuna(institucionId, vacunaExistente.id, esquemaVersion, nuevaVacunaPayload.dosis);
      } else if (catalogRepository.crearVacuna) {
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
      const msg = getErrorMessage(err, 'Error al guardar la vacuna en catálogo.');
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={vacunaExistente ? "Actualizar dosis y edades" : "Registrar vacuna y dosis"}  maxWidth="680px">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre de la Vacuna / Biológico *"
              disabled={!!vacunaExistente}
              placeholder="ej. Vacuna contra Varicela (Cepa Oka)"
              value={nombreVacuna}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombreVacuna(e.target.value)}
              required
            />

            <Input
              label="Enfermedad Prevenida *"
              disabled={!!vacunaExistente}
              placeholder="ej. Varicela e infecciones secundarias"
              value={enfermedadPrevenida}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnfermedadPrevenida(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Vía de Administración *"
              disabled={!!vacunaExistente}
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
              className="bg-clinic-primary text-white"
            >
              Guardar Vacuna en Catálogo
            </Button>
          </div>
        </form>
    </Modal>
  );
};
