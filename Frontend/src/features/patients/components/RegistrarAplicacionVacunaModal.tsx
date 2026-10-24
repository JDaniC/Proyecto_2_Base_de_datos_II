import { toClinicDateTimeInput } from '../../../services/dates';
import { getErrorMessage } from '../../../services/errors';
import React, { useState } from 'react';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { Button } from '../../../design-system/components/Button';
import { Alert } from '../../../design-system/components/Alert';
import { Input } from '../../../design-system/components/Input';
import { Select } from '../../../design-system/components/Select';
import { Modal } from '../../../design-system/components/Modal';
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
    toClinicDateTimeInput().slice(0, 10)
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
  const [reaccionesInmediatas, setReaccionesInmediatas] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

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
      setErrorMsg('Ingresa el número de lote de la vacuna.');
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
      const msg = getErrorMessage(err, 'Error al registrar la aplicación de la vacuna.');
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar aplicación de vacuna"
      description={`Paciente: ${paciente.nombreCompleto} · ${paciente.codigoLegible}`}
      maxWidth="720px"
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" form="registro-aplicacion-vacuna" variant="primary" loading={guardando}>
            Registrar dosis
          </Button>
        </>
      )}
    >
        <form id="registro-aplicacion-vacuna" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <Alert variant="danger" title="No se pudo registrar la aplicación">
              {errorMsg}
            </Alert>
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

          <div>
            <Input
              label="Reacciones inmediatas (observación de 15 a 30 min)"
              value={reaccionesInmediatas}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReaccionesInmediatas(e.target.value)}
              placeholder="ej. Tolerancia adecuada, llanto breve sin fiebre ni erupción..."
            />
          </div>

          <div>
            <label htmlFor="vacuna-observaciones" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-strong)' }}>
              Observaciones o indicaciones al responsable
            </label>
            <textarea
              id="vacuna-observaciones"
              rows={2}
              style={{ width: '100%', minHeight: '96px', resize: 'vertical', backgroundColor: 'var(--color-control)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '12px 14px', fontSize: '14px', color: 'var(--color-text)' }}
              value={observaciones}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
              placeholder="ej. Se instruye a la madre sobre cuidados del sitio de punción..."
            />
          </div>
        </form>
    </Modal>
  );
};
