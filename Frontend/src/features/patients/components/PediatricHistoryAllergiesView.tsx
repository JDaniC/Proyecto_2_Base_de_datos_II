import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Baby,
  Plus,
  Trash2,
  Edit2,
  HeartPulse,
  Activity,
  Pill,
  Sparkles
} from 'lucide-react';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { useServices } from '../../../app/ServiceContext';
import { Panel } from '../../../design-system/components/Panel';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { Input } from '../../../design-system/components/Input';
import { Select } from '../../../design-system/components/Select';
import { Alert } from '../../../design-system/components/Alert';
import {
  Paciente,
  AntecedentesClinicos,
  AntecedentesPerinatales,
  InstitucionId,
  TipoParto
} from '../../../services/types';

interface PediatricHistoryAllergiesViewProps {
  paciente: Paciente;
  antecedentes: AntecedentesClinicos;
  institucionId: InstitucionId;
  onActualizar: () => Promise<void>;
}

export const PediatricHistoryAllergiesView: React.FC<PediatricHistoryAllergiesViewProps> = ({
  paciente,
  antecedentes,
  institucionId,
  onActualizar
}) => {
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();

  const [modalAlergiaAbierto, setModalAlergiaAbierto] = useState(false);
  const [modalPerinatalesAbierto, setModalPerinatalesAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  // Formulario de nueva alergia
  const [sustancia, setSustancia] = useState('');
  const [severidad, setSeveridad] = useState<'LEVE' | 'MODERADA' | 'SEVERA'>('MODERADA');
  const [reaccion, setReaccion] = useState('');

  // Formulario de antecedentes perinatales
  const perinatalesActuales = antecedentes.perinatales || {};
  const [edadGestacional, setEdadGestacional] = useState<string>(
    perinatalesActuales.edadGestacionalSemanas?.toString() || ''
  );
  const [pesoNacimiento, setPesoNacimiento] = useState<string>(
    perinatalesActuales.pesoNacimientoGramos?.toString() || ''
  );
  const [tallaNacimiento, setTallaNacimiento] = useState<string>(
    perinatalesActuales.tallaNacimientoCm?.toString() || ''
  );
  const [apgar1, setApgar1] = useState<string>(
    perinatalesActuales.apgar1Minuto?.toString() || ''
  );
  const [apgar5, setApgar5] = useState<string>(
    perinatalesActuales.apgar5Minutos?.toString() || ''
  );
  const [tipoParto, setTipoParto] = useState<TipoParto>(
    perinatalesActuales.tipoParto || 'PARTO_VAGINAL'
  );
  const [lactanciaMeses, setLactanciaMeses] = useState<string>(
    perinatalesActuales.lactanciaMaternaExclusivaMeses?.toString() || ''
  );
  const [complicaciones, setComplicaciones] = useState<string>(
    perinatalesActuales.complicacionesPerinatales || ''
  );

  const nombreProfesional = sesion?.nombre
    ? `${sesion.nombre} (${sesion.rolEtiqueta})`
    : 'Personal Pediátrico Autorizado';

  // Manejador: Confirmar Sin Alergias Conocidas
  const handleConfirmarSinAlergias = async () => {
    try {
      setProcesando(true);
      setErrorAccion(null);
      if (patientRepository.confirmarSinAlergias) {
        await patientRepository.confirmarSinAlergias(institucionId, paciente.id, nombreProfesional);
      }
      await onActualizar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar ausencia de alergias.';
      setErrorAccion(msg);
    } finally {
      setProcesando(false);
    }
  };

  // Manejador: Registrar Nueva Alergia
  const handleGuardarAlergia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sustancia.trim()) {
      setErrorAccion('Debe ingresar la sustancia o principio activo alérgeno.');
      return;
    }
    if (!reaccion.trim()) {
      setErrorAccion('Debe documentar la reacción clínica observada o descrita.');
      return;
    }

    try {
      setProcesando(true);
      setErrorAccion(null);
      if (patientRepository.registrarAlergia) {
        await patientRepository.registrarAlergia(
          institucionId,
          paciente.id,
          {
            sustancia: sustancia.trim(),
            severidad,
            reaccion: reaccion.trim()
          },
          nombreProfesional
        );
      }
      setSustancia('');
      setSeveridad('MODERADA');
      setReaccion('');
      setModalAlergiaAbierto(false);
      await onActualizar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la alergia.';
      setErrorAccion(msg);
    } finally {
      setProcesando(false);
    }
  };

  // Manejador: Eliminar Alergia
  const handleEliminarAlergia = async (sustanciaEliminar: string) => {
    if (!window.confirm(`¿Confirma eliminar el registro de alergia a "${sustanciaEliminar}"?`)) {
      return;
    }
    try {
      setProcesando(true);
      setErrorAccion(null);
      if (patientRepository.eliminarAlergia) {
        await patientRepository.eliminarAlergia(institucionId, paciente.id, sustanciaEliminar);
      }
      await onActualizar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la alergia.';
      setErrorAccion(msg);
    } finally {
      setProcesando(false);
    }
  };

  // Manejador: Guardar Antecedentes Perinatales
  const handleGuardarPerinatales = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcesando(true);
      setErrorAccion(null);
      const dto: AntecedentesPerinatales = {
        edadGestacionalSemanas: edadGestacional ? parseInt(edadGestacional, 10) : undefined,
        pesoNacimientoGramos: pesoNacimiento ? parseInt(pesoNacimiento, 10) : undefined,
        tallaNacimientoCm: tallaNacimiento ? parseFloat(tallaNacimiento) : undefined,
        apgar1Minuto: apgar1 ? parseInt(apgar1, 10) : undefined,
        apgar5Minutos: apgar5 ? parseInt(apgar5, 10) : undefined,
        tipoParto,
        lactanciaMaternaExclusivaMeses: lactanciaMeses ? parseInt(lactanciaMeses, 10) : undefined,
        complicacionesPerinatales: complicaciones.trim() || undefined
      };

      if (patientRepository.actualizarPerinatales) {
        await patientRepository.actualizarPerinatales(institucionId, paciente.id, dto);
      }
      setModalPerinatalesAbierto(false);
      await onActualizar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar antecedentes perinatales.';
      setErrorAccion(msg);
    } finally {
      setProcesando(false);
    }
  };

  const perinatales = antecedentes.perinatales;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Alerta transversal de error */}
      {errorAccion && (
        <Alert variant="danger" title="Atención">
          {errorAccion}
        </Alert>
      )}

      {/* SECCIÓN 1: ESTADO DE ALERGIAS Y ADVERTENCIA PRIORITARIA */}
      <Panel
        title="Estado Clínico de Alergias y Reacciones Adversas"
        subtitle="Evaluación prioritaria para seguridad farmacológica pediátrica"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Banner según estado */}
          {paciente.estadoAlergias === 'SIN_VERIFICAR' && (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ color: '#92400E', fontSize: '15px' }}>
                    ALERTA CLÍNICA PRIORITARIA: Alergias sin verificar clínicamente
                  </strong>
                  <Badge variant="warning">SIN_VERIFICAR</Badge>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#78350F', lineHeight: '1.4' }}>
                  El menor no cuenta con anamnesis de hipersensibilidad documentada por el pediatra tratante.
                  Antes de prescribir, administrar medicamentos o inmunizaciones, valide el estado clínico.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmarSinAlergias}
                    loading={procesando}
                  >
                    <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                    Confirmar Sin Alergias Conocidas
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSustancia('');
                      setSeveridad('MODERADA');
                      setReaccion('');
                      setModalAlergiaAbierto(true);
                    }}
                    disabled={procesando}
                  >
                    <Plus size={16} style={{ marginRight: '6px' }} />
                    Registrar Alergia Documentada
                  </Button>
                </div>
              </div>
            </div>
          )}

          {paciente.estadoAlergias === 'SIN_ALERGIAS_CONOCIDAS' && (
            <div
              style={{
                backgroundColor: '#EDF5F1',
                border: '1px solid #A3C2B8',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <CheckCircle2 size={24} color="#20666B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ color: '#20666B', fontSize: '15px' }}>
                    Verificado: Sin alergias conocidas documentadas
                  </strong>
                  <Badge variant="success">SIN_ALERGIAS_CONOCIDAS</Badge>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#134E48', lineHeight: '1.4' }}>
                  Anamnesis farmacológica y alimentaria negativa para hipersensibilidad o anafilaxia.
                  {antecedentes.verificacionAlergias && (
                    <span style={{ display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
                      Verificado por {antecedentes.verificacionAlergias.verificadoPor} el{' '}
                      {antecedentes.verificacionAlergias.fechaVerificacion}.
                    </span>
                  )}
                </p>
                <div style={{ marginTop: '12px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSustancia('');
                      setSeveridad('MODERADA');
                      setReaccion('');
                      setModalAlergiaAbierto(true);
                    }}
                    disabled={procesando}
                  >
                    <Plus size={16} style={{ marginRight: '6px' }} />
                    Registrar Nueva Alergia
                  </Button>
                </div>
              </div>
            </div>
          )}

          {paciente.estadoAlergias === 'CON_ALERGIAS' && (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <ShieldAlert size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ color: '#991B1B', fontSize: '15px' }}>
                    ALERTA CLÍNICA: Menor con alergias y reacciones documentadas
                  </strong>
                  <Badge variant="danger">CON_ALERGIAS</Badge>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D', lineHeight: '1.4' }}>
                  Se registran sustancias con reactividad inmune. Verifique contraindicaciones cruzadas
                  antes de prescribir medicamentos, administrar vacunas o autorizar dietas.
                </p>
                <div style={{ marginTop: '12px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSustancia('');
                      setSeveridad('MODERADA');
                      setReaccion('');
                      setModalAlergiaAbierto(true);
                    }}
                    disabled={procesando}
                  >
                    <Plus size={16} style={{ marginRight: '6px' }} />
                    Registrar Nueva Alergia
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla / Listado de Alergias */}
          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                margin: '12px 0 8px'
              }}
            >
              Catálogo de Alergias Activas ({antecedentes.alergias.length})
            </h4>

            {antecedentes.alergias.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-bg-subtle)',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px'
                }}
              >
                No se registran alérgenos activos para este paciente.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Sustancia / Alérgeno</th>
                      <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Severidad</th>
                      <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>Reacción Manifestada</th>
                      <th style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {antecedentes.alergias.map((al, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderTop: '1px solid var(--color-border)',
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : 'var(--color-bg-subtle)'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-strong)' }}>
                          {al.sustancia}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge
                            variant={
                              al.severidad === 'SEVERA'
                                ? 'danger'
                                : al.severidad === 'MODERADA'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {al.severidad}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>
                          {al.reaccion}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleEliminarAlergia(al.sustancia)}
                            disabled={procesando}
                            title="Eliminar alergia"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={15} color="#DC2626" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* SECCIÓN 2: ANTECEDENTES PERINATALES */}
      <Panel
        title="Antecedentes Perinatales y del Nacimiento"
        subtitle="Variables neonatales fundamentales para el seguimiento del neurodesarrollo"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEdadGestacional(perinatales?.edadGestacionalSemanas?.toString() || '');
              setPesoNacimiento(perinatales?.pesoNacimientoGramos?.toString() || '');
              setTallaNacimiento(perinatales?.tallaNacimientoCm?.toString() || '');
              setApgar1(perinatales?.apgar1Minuto?.toString() || '');
              setApgar5(perinatales?.apgar5Minutos?.toString() || '');
              setTipoParto(perinatales?.tipoParto || 'PARTO_VAGINAL');
              setLactanciaMeses(perinatales?.lactanciaMaternaExclusivaMeses?.toString() || '');
              setComplicaciones(perinatales?.complicacionesPerinatales || '');
              setModalPerinatalesAbierto(true);
            }}
          >
            <Edit2 size={15} style={{ marginRight: '6px' }} />
            Editar Antecedentes Perinatales
          </Button>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}
        >
          {/* Edad Gestacional */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
              Edad Gestacional al Nacer
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <strong style={{ fontSize: '18px', color: 'var(--color-strong)' }}>
                {perinatales?.edadGestacionalSemanas ? `${perinatales.edadGestacionalSemanas} sem` : 'No registrada'}
              </strong>
              {perinatales?.edadGestacionalSemanas && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {perinatales.edadGestacionalSemanas >= 37 && perinatales.edadGestacionalSemanas <= 42
                    ? '(A término)'
                    : perinatales.edadGestacionalSemanas < 37
                    ? '(Pretérmino)'
                    : '(Postérmino)'}
                </span>
              )}
            </div>
          </div>

          {/* Somatometría neonatal */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
              Peso y Talla al Nacer
            </span>
            <div style={{ marginTop: '4px' }}>
              <strong style={{ fontSize: '16px', color: 'var(--color-strong)', display: 'block' }}>
                {perinatales?.pesoNacimientoGramos
                  ? `${perinatales.pesoNacimientoGramos.toLocaleString()} g (${(
                      perinatales.pesoNacimientoGramos / 1000
                    ).toFixed(2)} kg)`
                  : 'Peso no registrado'}
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {perinatales?.tallaNacimientoCm ? `Talla: ${perinatales.tallaNacimientoCm} cm` : 'Talla no registrada'}
              </span>
            </div>
          </div>

          {/* Test de Apgar */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
              Test de Apgar (1 min / 5 min)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <strong style={{ fontSize: '18px', color: 'var(--color-strong)' }}>
                {perinatales?.apgar1Minuto !== undefined && perinatales?.apgar5Minutos !== undefined
                  ? `${perinatales.apgar1Minuto} / ${perinatales.apgar5Minutos}`
                  : 'No documentado'}
              </strong>
              {perinatales?.apgar5Minutos !== undefined && perinatales.apgar5Minutos >= 7 && (
                <Badge variant="success">Normal</Badge>
              )}
            </div>
          </div>

          {/* Tipo de Parto y Lactancia */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
              Vía del Parto y Lactancia
            </span>
            <div style={{ marginTop: '4px' }}>
              <strong style={{ fontSize: '14px', color: 'var(--color-strong)', display: 'block' }}>
                {perinatales?.tipoParto === 'PARTO_VAGINAL'
                  ? 'Parto vaginal eutócico'
                  : perinatales?.tipoParto === 'CESAREA'
                  ? 'Cesárea abdominal'
                  : perinatales?.tipoParto === 'PARTO_INSTRUMENTADO'
                  ? 'Parto instrumentado'
                  : 'No registrada'}
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Lactancia materna:{' '}
                {perinatales?.lactanciaMaternaExclusivaMeses !== undefined
                  ? `${perinatales.lactanciaMaternaExclusivaMeses} meses exclusivos`
                  : 'No documentada'}
              </span>
            </div>
          </div>
        </div>

        {/* Complicaciones perinatales */}
        <div style={{ marginTop: '16px', fontSize: '13px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Complicaciones o eventos perinatales reportados:
          </span>{' '}
          <span style={{ color: 'var(--color-strong)' }}>
            {perinatales?.complicacionesPerinatales || 'Sin complicaciones perinatales ni estancias en UCIN.'}
          </span>
        </div>
      </Panel>

      {/* SECCIÓN 3: ANTECEDENTES PATOLÓGICOS, FAMILIARES Y MEDICACIÓN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Patológicos y Quirúrgicos */}
        <Panel
          title="Antecedentes Patológicos y Quirúrgicos"
          subtitle="Morbilidades pediátricas e intervenciones previas"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div>
              <strong style={{ color: 'var(--color-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} color="var(--color-primary)" />
                Patologías crónicas / previas:
              </strong>
              {antecedentes.patologicos.length > 0 ? (
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)' }}>
                  {antecedentes.patologicos.map((pat, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{pat}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Sin antecedentes patológicos crónicos reportados.
                </p>
              )}
            </div>

            <div>
              <strong style={{ color: 'var(--color-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HeartPulse size={16} color="var(--color-primary)" />
                Quirúrgicos y hospitalizaciones:
              </strong>
              {antecedentes.quirurgicos.length > 0 ? (
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)' }}>
                  {antecedentes.quirurgicos.map((quir, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{quir}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Sin intervenciones quirúrgicas documentadas.
                </p>
              )}
            </div>
          </div>
        </Panel>

        {/* Heredo-Familiares y Medicación Habitual */}
        <Panel
          title="Heredo-Familiares y Medicación Habitual"
          subtitle="Genopatías, atopia parental y tratamientos domiciliarios continuos"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div>
              <strong style={{ color: 'var(--color-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Baby size={16} color="var(--color-primary)" />
                Antecedentes Familiares (Padres / Hermanos):
              </strong>
              {antecedentes.familiares.length > 0 ? (
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)' }}>
                  {antecedentes.familiares.map((fam, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{fam}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  No se refieren antecedentes heredo-familiares de relevancia.
                </p>
              )}
            </div>

            <div>
              <strong style={{ color: 'var(--color-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Pill size={16} color="var(--color-primary)" />
                Medicación actual y profilaxis:
              </strong>
              {antecedentes.medicamentosActuales.length > 0 ? (
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)' }}>
                  {antecedentes.medicamentosActuales.map((med, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{med}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  No consume medicamentos de uso crónico o suplementos activos.
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* MODAL 1: REGISTRAR ALERGIA */}
      {modalAlergiaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-[#20666B]" size={20} />
                <h3 className="font-semibold text-slate-800 text-sm">
                  Registrar Alergia o Hipersensibilidad Pediátrica
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAlergiaAbierto(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarAlergia} className="p-6 space-y-4 text-xs">
              <Input
                label="Sustancia, Medicamento o Alimento *"
                placeholder="ej. Amoxicilina / Clavulanato, Proteína de vaca, Huevo"
                value={sustancia}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSustancia(e.target.value)}
                required
              />

              <Select
                label="Severidad de la Reacción *"
                value={severidad}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSeveridad(e.target.value as 'LEVE' | 'MODERADA' | 'SEVERA')
                }
                options={[
                  { value: 'LEVE', label: 'LEVE - Prurito leve, eritema circunscrito' },
                  { value: 'MODERADA', label: 'MODERADA - Urticaria extensa, reflujo, broncoespasmo leve' },
                  { value: 'SEVERA', label: 'SEVERA - Anafilaxia, angioedema laríngeo, broncoespasmo severo' }
                ]}
              />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Reacción Clínica Observada o Reportada *
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-[#20666B] focus:border-[#20666B] outline-none"
                  placeholder="Describa síntomas: tiempo transcurrido desde la exposición, manifestaciones dermatológicas, respiratorias o gastrointestinales..."
                  value={reaccion}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReaccion(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalAlergiaAbierto(false)}
                  disabled={procesando}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={procesando}
                  className="bg-[#20666B] text-white"
                >
                  Guardar Alergia
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ANTECEDENTES PERINATALES */}
      {modalPerinatalesAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[#20666B]" size={20} />
                <h3 className="font-semibold text-slate-800 text-sm">
                  Editar Antecedentes Perinatales y de Nacimiento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPerinatalesAbierto(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarPerinatales} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Edad Gestacional (semanas)"
                  type="number"
                  placeholder="ej. 38"
                  value={edadGestacional}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdadGestacional(e.target.value)}
                />
                <Input
                  label="Peso al Nacer (gramos)"
                  type="number"
                  placeholder="ej. 3200"
                  value={pesoNacimiento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPesoNacimiento(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Talla al Nacer (cm)"
                  type="number"
                  placeholder="ej. 50"
                  value={tallaNacimiento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTallaNacimiento(e.target.value)}
                />
                <Input
                  label="Apgar 1 min"
                  type="number"
                  placeholder="ej. 8"
                  value={apgar1}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApgar1(e.target.value)}
                />
                <Input
                  label="Apgar 5 min"
                  type="number"
                  placeholder="ej. 9"
                  value={apgar5}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApgar5(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Tipo de Parto"
                  value={tipoParto}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTipoParto(e.target.value as TipoParto)
                  }
                  options={[
                    { value: 'PARTO_VAGINAL', label: 'Vaginal Eutócico' },
                    { value: 'CESAREA', label: 'Cesárea' },
                    { value: 'PARTO_INSTRUMENTADO', label: 'Parto Instrumentado' }
                  ]}
                />
                <Input
                  label="Lactancia Materna Exclusiva (meses)"
                  type="number"
                  placeholder="ej. 6"
                  value={lactanciaMeses}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLactanciaMeses(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Complicaciones Perinatales o Neonatales
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-[#20666B] focus:border-[#20666B] outline-none"
                  placeholder="ej. Circular simple de cordón, ictericia fisiológica sin fototerapia, etc."
                  value={complicaciones}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComplicaciones(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalPerinatalesAbierto(false)}
                  disabled={procesando}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={procesando}
                  className="bg-[#20666B] text-white"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
