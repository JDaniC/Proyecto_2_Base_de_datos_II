import React, { useState, useEffect } from 'react';
import { CalendarPlus, AlertCircle } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { PROFESIONALES_DISPONIBLES } from '../../mocks/mockAppointmentsData';
import { Paciente, CrearCitaDTO } from '../../services/types';

interface CrearCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicial?: string;
  horaInicial?: string;
  onCitaCreada: (citaId: string) => void;
}

// Generador de intervalos de 15 minutos en formato 24 horas (07:00 a 20:00)
export const INTERVALOS_HORA_24H: string[] = [];
for (let h = 7; h <= 20; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 20 && m > 0) break;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    INTERVALOS_HORA_24H.push(`${hh}:${mm}`);
  }
}

export const CrearCitaModal: React.FC<CrearCitaModalProps> = ({
  isOpen,
  onClose,
  fechaInicial,
  horaInicial,
  onCitaCreada
}) => {
  const { sesion } = useAuthSession();
  const { appointmentRepository, patientRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';
  const profesionales = PROFESIONALES_DISPONIBLES[institucionId] || [];

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState('');
  const [profesionalId, setProfesionalId] = useState(profesionales[0]?.id || '');
  const [fecha, setFecha] = useState(fechaInicial || '2026-10-19');
  const [horaInicio, setHoraInicio] = useState(horaInicial || '08:00');
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [consultorio, setConsultorio] = useState('Consultorio 104 - Planta Baja');
  const [motivo, setMotivo] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Cargar lista de pacientes con expediente activo
  useEffect(() => {
    if (!isOpen) return;

    patientRepository
      .buscar(institucionId, { estado: 'ACTIVO', limite: 50 })
      .then((res) => {
        setPacientes(res.items);
        if (res.items.length > 0 && !pacienteId) {
          setPacienteId(res.items[0].id);
        }
      })
      .catch((err) => {
        console.error('Error cargando pacientes:', err);
      });
  }, [isOpen, institucionId, patientRepository, pacienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!pacienteId) {
      setErrorValidacion('Debe seleccionar un paciente con expediente activo.');
      return;
    }
    if (!profesionalId) {
      setErrorValidacion('Debe seleccionar un profesional médico asignado.');
      return;
    }
    if (!fecha) {
      setErrorValidacion('Debe indicar la fecha de la cita.');
      return;
    }
    if (!horaInicio) {
      setErrorValidacion('Debe indicar el horario de inicio.');
      return;
    }
    if (!motivo.trim() || motivo.trim().length < 4) {
      setErrorValidacion('El motivo de la cita es obligatorio (mínimo 4 caracteres).');
      return;
    }

    setGuardando(true);

    try {
      const dto: CrearCitaDTO = {
        pacienteId,
        profesionalId,
        fecha,
        horaInicio,
        duracionMinutos,
        consultorio,
        motivo: motivo.trim(),
        secretariaGestora: sesion?.nombre,
        idempotencyKey: `cita-${Date.now()}`
      };

      const nuevaCita = await appointmentRepository.crear(institucionId, dto);
      setGuardando(false);
      onCitaCreada(nuevaCita.id);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(err.message || 'Error al programar la cita médica.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Programar Nueva Cita Médica (V09)"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorValidacion && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              border: '1px solid var(--color-danger-border)'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorValidacion}</span>
          </div>
        )}

        {/* Selección de Paciente Activo */}
        <div>
          <label
            htmlFor="cita-paciente-select"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              marginBottom: '6px'
            }}
          >
            Paciente con expediente activo <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <select
            id="cita-paciente-select"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombres} {p.apellidos} — Expediente: {p.codigoLegible} ({p.tipoIdentificacion}: {p.numeroIdentificacion})
              </option>
            ))}
          </select>
        </div>

        {/* Selección de Profesional */}
        <div>
          <label
            htmlFor="cita-profesional-select"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              marginBottom: '6px'
            }}
          >
            Profesional de la salud <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <select
            id="cita-profesional-select"
            value={profesionalId}
            onChange={(e) => setProfesionalId(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            {profesionales.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.nombre} — {prof.especialidad}
              </option>
            ))}
          </select>
        </div>

        {/* Fila Fecha, Hora e Intervalos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="cita-fecha-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Fecha <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <input
              id="cita-fecha-input"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="cita-hora-select"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Hora (24 h, intervalos 15 min) <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <select
              id="cita-hora-select"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              {INTERVALOS_HORA_24H.map((hora) => (
                <option key={hora} value={hora}>
                  {hora} h
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cita-duracion-select"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Duración estimada
            </label>
            <select
              id="cita-duracion-select"
              value={duracionMinutos}
              onChange={(e) => setDuracionMinutos(Number(e.target.value))}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos (Estándar)</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos (Extensa)</option>
            </select>
          </div>
        </div>

        {/* Consultorio / Ubicación */}
        <div>
          <label
            htmlFor="cita-consultorio-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              marginBottom: '6px'
            }}
          >
            Consultorio o sala de atención
          </label>
          <input
            id="cita-consultorio-input"
            type="text"
            value={consultorio}
            onChange={(e) => setConsultorio(e.target.value)}
            placeholder="Ej. Consultorio 104 - Torre Médica A"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)'
            }}
          />
        </div>

        {/* Motivo de la atención */}
        <div>
          <label
            htmlFor="cita-motivo-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              marginBottom: '6px'
            }}
          >
            Motivo de consulta <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <textarea
            id="cita-motivo-input"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa el motivo clínico de la consulta programada..."
            style={{
              width: '100%',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Acciones */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '12px'
          }}
        >
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
            leftIcon={<CalendarPlus size={16} />}
          >
            Programar cita
          </Button>
        </div>
      </form>
    </Modal>
  );
};
