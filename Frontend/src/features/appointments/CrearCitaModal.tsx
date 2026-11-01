import { getErrorMessage } from '../../services/errors';
import React, { useState, useEffect, useRef } from 'react';
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
  const { appointmentRepository, patientRepository, catalogRepository, mode } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';
  const [profesionalesApi, setProfesionalesApi] = useState<Array<{ id: string; nombre: string; especialidad: string }>>([]);
  const profesionales = mode === 'api' ? profesionalesApi : PROFESIONALES_DISPONIBLES[institucionId] || [];

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [profesionalId, setProfesionalId] = useState(profesionales[0]?.id || '');
  const [fecha, setFecha] = useState(fechaInicial || '2026-10-19');
  const [horaInicio, setHoraInicio] = useState(horaInicial || '08:00');
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [consultorio, setConsultorio] = useState(
    institucionId === 'CLINICA_ODONTOLOGICA'
      ? 'Sillón 1 — Operatoria y Estética Dental'
      : 'Consultorio 104 - Planta Baja'
  );
  const [motivo, setMotivo] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const claveIntencionRef = useRef<{ huella: string; clave: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      claveIntencionRef.current = null;
      return;
    }
    if (fechaInicial) setFecha(fechaInicial);
    if (horaInicial) setHoraInicio(horaInicial);
  }, [isOpen, fechaInicial, horaInicial]);

  useEffect(() => {
    if (!isOpen || mode !== 'api') return;
    let cancelado = false;
    catalogRepository
      .obtenerMedicos(institucionId)
      .then((medicos) => {
        if (cancelado || !Array.isArray(medicos)) return;
        const activos = medicos
          .filter((m) => m.estado === 'ACTIVO')
          .map((m) => ({
            id: m.id,
            nombre: m.nombreCompleto ?? m.nombre,
            especialidad: m.especialidad ?? m.especialidadPrincipal,
          }));
        setProfesionalesApi(activos);
        if (activos.length > 0 && !activos.some((a) => a.id === profesionalId)) {
          setProfesionalId(activos[0]!.id);
        }
      })
      .catch(() => {
        // Ignorar si no hay catálogo disponible
      });
    return () => {
      cancelado = true;
    };
  }, [isOpen, mode, institucionId, catalogRepository, profesionalId]);

  // Cargar lista de pacientes con expediente activo
  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    const termino = mode === 'api' ? busquedaPaciente.trim() || 'a' : busquedaPaciente.trim();
    patientRepository
      .buscar(institucionId, {
        ...(termino ? { q: termino } : {}),
        estado: 'ACTIVO',
        limite: 50,
      })
      .then((res) => {
        if (cancelado) return;
        setPacientes(res.items);
        if (res.items.length > 0) {
          if (!pacienteId || !res.items.some((p) => p.id === pacienteId)) {
            setPacienteId(res.items[0]!.id);
          }
        } else {
          setPacienteId('');
        }
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error cargando pacientes:', err);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [isOpen, mode, institucionId, patientRepository, busquedaPaciente, pacienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!pacienteId || !pacientes.some((p) => p.id === pacienteId)) {
      setErrorValidacion('Debe seleccionar un paciente con expediente activo de los resultados mostrados.');
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
      const pacienteSeleccionado = pacientes.find((p) => p.id === pacienteId);
      const motivoLimpio = motivo.trim();
      const huella = JSON.stringify([
        pacienteId,
        profesionalId,
        fecha,
        horaInicio,
        duracionMinutos,
        consultorio,
        motivoLimpio,
      ]);
      let claveIdempotente: string;
      if (claveIntencionRef.current && claveIntencionRef.current.huella === huella) {
        claveIdempotente = claveIntencionRef.current.clave;
      } else {
        claveIdempotente =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `cita-${Date.now()}`;
        claveIntencionRef.current = { huella, clave: claveIdempotente };
      }

      const dto: CrearCitaDTO = {
        pacienteId,
        ...(pacienteSeleccionado?.version !== undefined
          ? { versionPaciente: pacienteSeleccionado.version }
          : {}),
        profesionalId,
        fecha,
        horaInicio,
        duracionMinutos,
        consultorio,
        motivo: motivoLimpio,
        secretariaGestora: sesion?.nombre,
        idempotencyKey: claveIdempotente,
      };

      const nuevaCita = await appointmentRepository.crear(institucionId, dto);
      claveIntencionRef.current = null;
      setGuardando(false);
      onCitaCreada(nuevaCita.id);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(getErrorMessage(err, 'Error al programar la cita médica.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        institucionId === 'CLINICA_ODONTOLOGICA'
          ? 'Programar Cita Odontológica'
          : 'Programar Nueva Cita Médica'
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {institucionId === 'CLINICA_ODONTOLOGICA' && (
          <div
            style={{
              backgroundColor: 'var(--color-selection)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--color-strong)'
            }}
          >
            <strong>Registrada por:</strong> {sesion?.nombre || 'Personal de atención'}
          </div>
        )}

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
          {mode === 'api' && (
            <input
              type="search"
              value={busquedaPaciente}
              onChange={(e) => setBusquedaPaciente(e.target.value)}
              placeholder="Filtrar paciente por nombre, apellido o documento..."
              aria-label="Buscar paciente para cita"
              style={{
                width: '100%',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '8px 12px',
                fontSize: '13px',
                color: 'var(--color-text)',
                marginBottom: '6px'
              }}
            />
          )}
          <select
            id="cita-paciente-select"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--color-control)',
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
                {p.nombres} {p.apellidos} — Expediente: {p.codigoLegible}
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
              backgroundColor: 'var(--color-control)',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end', gap: '12px' }}>
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
                backgroundColor: 'var(--color-control)',
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
              Hora (24 h) <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <select
              id="cita-hora-select"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-control)',
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
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
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
              backgroundColor: 'var(--color-control)',
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
              backgroundColor: 'var(--color-control)',
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
