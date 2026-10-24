import { getErrorMessage } from '../../services/errors';
import React, { useState } from 'react';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { RolId, EstadoCuenta, UsuarioInstitucional } from '../../services/types';

interface CrearUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsuarioCreado: (usuario: UsuarioInstitucional) => void;
}

export const CrearUsuarioModal: React.FC<CrearUsuarioModalProps> = ({
  isOpen,
  onClose,
  onUsuarioCreado
}) => {
  const { sesion } = useAuthSession();
  const { userRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [rolId, setRolId] = useState<RolId>(institucionId === 'LABORATORIO_CLINICO' ? 'ANALISTA_LABORATORIO' : 'MEDICO');
  const [estado, setEstado] = useState<EstadoCuenta>('ACTIVO');
  const [profesionalVinculado, setProfesionalVinculado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opciones de roles según la institución activa
  const rolesPorInstitucion: Record<string, { id: RolId; label: string }[]> = {
    HOSPITAL_GENERAL: [
      { id: 'MEDICO', label: 'Médico Especialista' },
      { id: 'SECRETARIA', label: 'Secretaría de Admisión' },
      { id: 'ADMIN_INSTITUCIONAL', label: 'Administrador Institucional' }
    ],
    CLINICA_ODONTOLOGICA: [
      { id: 'ODONTOLOGO', label: 'Odontólogo Especialista' },
      { id: 'SECRETARIA', label: 'Secretaría Gestora de Citas' },
      { id: 'ADMIN_INSTITUCIONAL', label: 'Administrador Odontológico' }
    ],
    LABORATORIO_CLINICO: [
      { id: 'ANALISTA_LABORATORIO', label: 'Analista de Laboratorio' },
      { id: 'VALIDADOR_LABORATORIO', label: 'Validador Clínico' },
      { id: 'MEDICO_LABORATORIO', label: 'Médico Director Técnico' },
      { id: 'ADMIN_INSTITUCIONAL', label: 'Administrador de Laboratorio' }
    ],
    CENTRO_PEDIATRICO: [
      { id: 'PEDIATRA', label: 'Pediatra Especialista' },
      { id: 'SECRETARIA', label: 'Secretaría de Admisión Pediátrica' },
      { id: 'ADMIN_INSTITUCIONAL', label: 'Administrador Pediátrico' }
    ]
  };

  const opcionesRoles = rolesPorInstitucion[institucionId] || rolesPorInstitucion.HOSPITAL_GENERAL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreCompleto.trim() || nombreCompleto.trim().length < 4) {
      setError('El nombre completo es obligatorio (mínimo 4 caracteres).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Ingrese una dirección de correo electrónico válida.');
      return;
    }

    setGuardando(true);
    try {
      const nuevo = await userRepository.crearUsuario(institucionId, {
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim().toLowerCase(),
        rolId,
        estado,
        profesionalVinculado: profesionalVinculado.trim() || undefined
      });

      setGuardando(false);
      onUsuarioCreado(nuevo);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setError(getErrorMessage(err, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear usuario"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              border: '1px solid var(--color-danger-border)'
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Se creará una cuenta para <strong>{sesion?.institucionNombre || 'la institución'}</strong>{' '}
          y podrá acceder con el perfil y los permisos asignados.
        </div>

        <div>
          <label
            htmlFor="user-fullname-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Nombre completo <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <input
            id="user-fullname-input"
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            placeholder="ej. Dra. Claudia Patricia Méndez"
            style={{
              width: '100%',
              padding: '9px 12px',
              backgroundColor: 'var(--color-control)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label
            htmlFor="user-email-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Correo institucional <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <input
            id="user-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@institucion.salud.gt"
            style={{
              width: '100%',
              padding: '9px 12px',
              backgroundColor: 'var(--color-control)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label
              htmlFor="user-role-select"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Rol institucional asignado *
            </label>
            <select
              id="user-role-select"
              value={rolId}
              onChange={(e) => setRolId(e.target.value as RolId)}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '14px',
                color: 'var(--color-text)'
              }}
            >
              {opcionesRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="user-status-select"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Estado inicial de la cuenta *
            </label>
            <select
              id="user-status-select"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoCuenta)}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '14px',
                color: 'var(--color-text)'
              }}
            >
              <option value="ACTIVO">Activo (Habilitado de inmediato)</option>
              <option value="PENDIENTE">Pendiente (Requiere verificación)</option>
              <option value="INACTIVO">Inactivo (Deshabilitado)</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="user-pro-link-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Vínculo a Profesional / Colegiado (Opcional)
          </label>
          <input
            id="user-pro-link-input"
            type="text"
            value={profesionalVinculado}
            onChange={(e) => setProfesionalVinculado(e.target.value)}
            placeholder="ej. Dra. Claudia Patricia Méndez (Col. 14502)"
            style={{
              width: '100%',
              padding: '9px 12px',
              backgroundColor: 'var(--color-control)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando} leftIcon={<UserCheck size={16} />}>
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  );
};
