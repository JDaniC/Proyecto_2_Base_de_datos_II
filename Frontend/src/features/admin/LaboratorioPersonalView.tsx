import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  Search,
  CheckCircle2,
  Award
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';

interface PersonalLaboratorioItem {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  tipoVinculo: 'ANALISTA' | 'VALIDADOR' | 'MEDICO_SOLICITANTE_AUTORIZADO';
  colegiadoLicencia: string;
  seccionesAutorizadas: string[];
  habilitadoParaFirmaDigital: boolean;
  ultimoAcceso?: string;
}

export const LaboratorioPersonalView: React.FC = () => {
  const { sesion } = useAuthSession();
  const { userRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Datos mock de personal especializado vinculados a la institución
  const [personalLab, setPersonalLab] = useState<PersonalLaboratorioItem[]>([
    {
      usuarioId: 'usr-lab-01',
      nombreCompleto: 'Licda. Karen Marroquín',
      email: 'karen.marroquin@laboratorio-central.salud.gt',
      tipoVinculo: 'VALIDADOR',
      colegiadoLicencia: 'COL-QB-4592',
      seccionesAutorizadas: ['Hematología y Coagulación', 'Química Clínica', 'Inmunología y Serología'],
      habilitadoParaFirmaDigital: true,
      ultimoAcceso: '2026-10-19T10:15:00Z'
    },
    {
      usuarioId: 'usr-lab-02',
      nombreCompleto: 'Téc. Marco Vinicio Ramos',
      email: 'marco.ramos@laboratorio-central.salud.gt',
      tipoVinculo: 'ANALISTA',
      colegiadoLicencia: 'TEC-LAB-8812',
      seccionesAutorizadas: ['Hematología y Coagulación', 'Uroanálisis y Coprología'],
      habilitadoParaFirmaDigital: false,
      ultimoAcceso: '2026-10-18T16:40:00Z'
    },
    {
      usuarioId: 'usr-hosp-med-01',
      nombreCompleto: 'Dra. Elena Morales',
      email: 'elena.morales@hospital-general.salud.gt',
      tipoVinculo: 'MEDICO_SOLICITANTE_AUTORIZADO',
      colegiadoLicencia: 'CMG-10421',
      seccionesAutorizadas: ['Todas las secciones (Núcleo común)'],
      habilitadoParaFirmaDigital: true,
      ultimoAcceso: '2026-10-19T12:00:00Z'
    }
  ]);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        await userRepository.listarUsuarios(institucionId);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [institucionId, userRepository]);

  const handleToggleFirma = (usuarioId: string) => {
    setPersonalLab((prev) =>
      prev.map((item) => {
        if (item.usuarioId === usuarioId) {
          const nuevo = !item.habilitadoParaFirmaDigital;
          setNotificacion(`Facultad de firma digital de ${item.nombreCompleto} ${nuevo ? 'habilitada' : 'suspendida'}.`);
          setTimeout(() => setNotificacion(null), 4000);
          return { ...item, habilitadoParaFirmaDigital: nuevo };
        }
        return item;
      })
    );
  };

  const filtrados = personalLab.filter((item) => {
    if (busqueda.trim() === '') return true;
    const q = busqueda.toLowerCase();
    return (
      item.nombreCompleto.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.colegiadoLicencia.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <SkeletonLoader variant="rectangular" height="240px" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerta de notificación */}
      {notificacion && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Cabecera L14 */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(225, 29, 72, 0.1)',
                  color: '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FlaskConical size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Personal y Permisos de Laboratorio Clínico (L14)
              </h2>
              <Badge variant="info">Núcleo Común + Especialidad</Badge>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Vinculación de cuentas institucionales a perfiles analíticos de laboratorio (analista / validador clínico)
              y a solicitantes médicos autorizados para emisión de órdenes de exámenes dentro del núcleo común.
            </p>
          </div>
        </div>
      </Panel>

      {/* Buscador y Resumen */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50)',
                color: 'var(--color-text-secondary)'
              }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o colegiado/licencia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>
      </Panel>

      {/* Tabla de Personal de Laboratorio */}
      <Panel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Profesional / Usuario</th>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Vínculo y Función</th>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Licencia / Colegiado</th>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Secciones Autorizadas</th>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Firma Digital</th>
                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr
                  key={item.usuarioId}
                  style={{
                    borderBottom: '1px solid var(--color-divider)',
                    transition: 'background-color var(--transition-fast)'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{item.nombreCompleto}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.email}</div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    {item.tipoVinculo === 'VALIDADOR' ? (
                      <Badge variant="success">Validador Clínico</Badge>
                    ) : item.tipoVinculo === 'ANALISTA' ? (
                      <Badge variant="info">Analista de Muestras</Badge>
                    ) : (
                      <Badge variant="primary">Médico Solicitante</Badge>
                    )}
                  </td>

                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-strong)' }}>
                    {item.colegiadoLicencia}
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {item.seccionesAutorizadas.map((sec, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'var(--color-background-alt)',
                            border: '1px solid var(--color-border)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: 'var(--color-strong)'
                          }}
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    {item.habilitadoParaFirmaDigital ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontSize: '12px', fontWeight: 600 }}>
                        <Award size={14} /> Habilitada
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        Inhabilitada
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Button
                      variant={item.habilitadoParaFirmaDigital ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleFirma(item.usuarioId)}
                    >
                      {item.habilitadoParaFirmaDigital ? 'Suspender firma' : 'Autorizar firma'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};
