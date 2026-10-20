import React, { useState } from 'react';
import { X, UserPlus, Stethoscope, AlertCircle } from 'lucide-react';
import { useServices } from '../../app/ServiceContext';
import { useAuthSession } from '../../app/AuthSessionContext';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { MedicoCatalogo } from '../../services/types';

interface RegistrarMedicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicoCreado: (medico: MedicoCatalogo) => void;
}

const ESPECIALIDADES_DISPONIBLES = [
  'Medicina Interna',
  'Cirugía General',
  'Cardiología Clínica',
  'Pediatría',
  'Gineco-Obstetricia',
  'Neurología',
  'Traumatología y Ortopedia',
  'Anestesiología',
  'Dermatología',
  'Medicina General / Urgencias'
];

export const RegistrarMedicoModal: React.FC<RegistrarMedicoModalProps> = ({
  isOpen,
  onClose,
  onMedicoCreado
}) => {
  const { catalogRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [nombre, setNombre] = useState('');
  const [colegiado, setColegiado] = useState('');
  const [especialidadPrincipal, setEspecialidadPrincipal] = useState(ESPECIALIDADES_DISPONIBLES[0]);
  const [subespecialidad, setSubespecialidad] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre completo del profesional es obligatorio.');
      return;
    }

    if (!colegiado.trim()) {
      setError('El número de colegiado médico es obligatorio.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Ingrese un correo institucional válido.');
      return;
    }

    setGuardando(true);
    try {
      const nuevo = await catalogRepository.crearMedico(institucionId, {
        nombre: nombre.trim(),
        colegiado: colegiado.trim().toUpperCase(),
        especialidadPrincipal,
        especialidadesSecundarias: subespecialidad.trim() ? [subespecialidad.trim()] : [],
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || '+502 2345-0000',
        estado: 'ACTIVO'
      });

      onMedicoCreado(nuevo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el profesional médico.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-medico-titulo"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '560px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-background-alt)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 id="modal-medico-titulo" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                Alta de Médico Especialista (H08)
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Directorio médico y especialidades colegiadas
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
              Nombre completo con título *
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Dr. Mario Fernando Carrillo"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Número de colegiado único *
              </label>
              <Input
                value={colegiado}
                onChange={(e) => setColegiado(e.target.value)}
                placeholder="CMG-XXXXX"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Especialidad principal *
              </label>
              <select
                value={especialidadPrincipal}
                onChange={(e) => setEspecialidadPrincipal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px',
                  color: 'var(--color-text)'
                }}
              >
                {ESPECIALIDADES_DISPONIBLES.map((esp) => (
                  <option key={esp} value={esp}>
                    {esp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
              Subespecialidad o área complementaria (opcional)
            </label>
            <Input
              value={subespecialidad}
              onChange={(e) => setSubespecialidad(e.target.value)}
              placeholder="Ej. Ecocardiografía, Cirugía Laparoscópica..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Correo institucional *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medico@hospital-general.salud.gt"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Teléfono de contacto
              </label>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+502 2345-XXXX"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-divider)'
            }}
          >
            <Button type="button" variant="ghost" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando}
              leftIcon={<UserPlus size={16} />}
            >
              {guardando ? 'Registrando...' : 'Registrar Profesional'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
