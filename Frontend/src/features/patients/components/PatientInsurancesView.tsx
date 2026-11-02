import {useConfirmedCommand} from '../../hospital/components/useConfirmedCommand';
import {Modal} from '../../../design-system/components/Modal';
import { HospitalPageControls } from '../../hospital/components/HospitalPageControls';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Calendar,
  CheckCircle2,
  User
} from 'lucide-react';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { useServices } from '../../../app/ServiceContext';
import { Panel } from '../../../design-system/components/Panel';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { SkeletonLoader } from '../../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../../design-system/components/EmptyState';
import { AfiliarPolizaModal } from './AfiliarPolizaModal';
import {
  PolizaSeguroPaciente,
  AseguradoraCatalogo,
  AfiliarPolizaDTO
} from '../../../services/types';

interface PatientInsurancesViewProps {
  pacienteId: string;
  pacienteNombres?: string;
  pacienteApellidos?: string;
  onActualizado?: ()=>void;
  pacienteNombre: string;
  pacienteDpi: string;
  pacienteTelefono: string;
  esArchivado?: boolean;
}

export const PatientInsurancesView: React.FC<PatientInsurancesViewProps> = ({
  pacienteId,
  pacienteNombres,
  pacienteApellidos,
  onActualizado,
  pacienteNombre,
  pacienteDpi,
  pacienteTelefono,
  esArchivado = false
}) => {
  const { sesion } = useAuthSession();
  const { patientRepository, catalogRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [errorLectura,setErrorLectura]=useState('');
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cambioEstado,setCambioEstado]=useState<{id:string;estado:'ACTIVA'|'VENCIDA'|'SUSPENDIDA';version?:number}|null>(null);
  const [motivoEstado,setMotivoEstado]=useState('');
  const comandoEstado=useConfirmedCommand<{id:string;estado:'ACTIVA'|'VENCIDA'|'SUSPENDIDA';version?:number;motivo:string}>();
  const [cambiando,setCambiando]=useState(false);
  const [errorEstado,setErrorEstado]=useState('');
  const [loading, setLoading] = useState(true);
  const [polizas, setPolizas] = useState<PolizaSeguroPaciente[]>([]);
  const [aseguradoras, setAseguradoras] = useState<AseguradoraCatalogo[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setErrorLectura('');
    try {
      const [polRes, asegRes] = await Promise.all([
        patientRepository.obtenerPolizasSeguro(institucionId, pacienteId, { pagina, limite: 25 }),
        catalogRepository.obtenerAseguradoras(institucionId)
      ]);
      setPolizas(polRes.items);
      setHayMas(polRes.hayMas);
      setAseguradoras(asegRes);
    } catch {
      setErrorLectura('No se pudo consultar la información. Reintente la carga.');
    } finally {
      setLoading(false);
    }
  }, [institucionId, pacienteId, patientRepository, catalogRepository, pagina]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleAfiliarPoliza = async (dto: AfiliarPolizaDTO) => {
    await patientRepository.afiliarPolizaSeguro(institucionId, pacienteId, dto);
    setNotificacion('Póliza de seguro afiliada exitosamente.');
    await cargarDatos();
    onActualizado?.();
    setTimeout(() => setNotificacion(null), 3500);
  };

  const handleCambiarEstado = async (polizaId: string, nuevoEstado: 'ACTIVA' | 'VENCIDA' | 'SUSPENDIDA') => {
    setCambioEstado({id:polizaId,estado:nuevoEstado,version:polizas.find(p=>p.id===polizaId)?.version});setMotivoEstado('');setErrorEstado('');
  };

  const activas = polizas.filter((p) => p.estadoVigencia === 'ACTIVA' && p.vigente !== false).length;
  const mejorCobertura = polizas.reduce((max, p) => (p.estadoVigencia === 'ACTIVA' && p.vigente !== false && p.porcentajeCobertura > max ? p.porcentajeCobertura : max), 0);

  if(errorLectura)return <div role="alert">{errorLectura}<Button onClick={()=>void cargarDatos()}>Reintentar consulta</Button></div>;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonLoader height={90} />
        <SkeletonLoader height={200} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner de notificación */}
      {notificacion && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-panel)',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Cabecera de la subvista H05 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Seguros Médicos y Pólizas de Cobertura
            </h2>
            <Badge variant="primary">{polizas.length} {polizas.length === 1 ? 'Póliza' : 'Pólizas'}</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Convenios de aseguradoras activas, planes hospitalarios y porcentajes de cobertura del paciente.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalAbierto(true)}
          leftIcon={<Plus size={16} />}
          disabled={esArchivado||!sesion?.permisos.includes('pacientes.administrar')}
          title={esArchivado ? 'Expediente archivado: no se pueden afiliar nuevas pólizas' : undefined}
        >
          Afiliar Póliza
        </Button>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Pólizas Vigentes
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {activas}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Cobertura Máxima
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
            {mejorCobertura > 0 ? `${mejorCobertura}%` : 'Sin cobertura activa'}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Aseguradoras en Convenio
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)', marginTop: '4px' }}>
            {aseguradoras.length}
          </div>
        </Panel>
      </div>

      {/* Lista de Pólizas */}
      {polizas.length === 0 ? (
        <Panel>
          <EmptyState
            title="Sin seguros médicos afiliados"
            description="El paciente no tiene pólizas de seguro registradas en este hospital. Puede afiliar una póliza de las compañías en convenio."
            actionText="Afiliar Póliza Ahora"
            onAction={() => setModalAbierto(true)}
          />
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {polizas.map((pol) => {
            const esActiva = pol.estadoVigencia === 'ACTIVA' && pol.vigente !== false;
            return (
              <Panel key={pol.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Encabezado de la póliza */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid var(--color-divider)',
                      paddingBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                          {pol.aseguradoraNombre}
                        </span>
                        <Badge variant={esActiva ? 'success' : pol.estadoVigencia === 'VENCIDA' ? 'neutral' : 'danger'}>
                          {pol.estadoVigencia==='ACTIVA'&&pol.vigente===false?'Fuera de vigencia':pol.estadoVigencia}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>
                        {pol.planNombre}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {sesion?.permisos.includes('pacientes.administrar') && (esActiva ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCambiarEstado(pol.id, 'SUSPENDIDA')}
                        >
                          Suspender Cobertura
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleCambiarEstado(pol.id, 'ACTIVA')}
                        >
                          Reactivar Póliza
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Datos de póliza y cobertura */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Número de Póliza y Carné</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-strong)', fontFamily: 'monospace' }}>
                        {pol.numeroPoliza}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Certificado: <strong>{pol.numeroCertificado}</strong>
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Vigencia de Cobertura</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-strong)' }}>
                        <Calendar size={14} color="var(--color-primary)" />
                        <span>
                          {pol.vigenciaDesde} al {pol.vigenciaHasta}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Cobertura y Copago</div>
                      <div>
                        Porcentaje: <strong style={{ color: '#059669' }}>{pol.porcentajeCobertura}%</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Copago consulta: <strong>Q {pol.copagoConsultaGTQ.toFixed(2)}</strong> {pol.deducibleBaseGTQ ? `• Deducible: Q ${pol.deducibleBaseGTQ}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Ficha del Titular (Titular_Seguro) */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '12px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="var(--color-primary)" />
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Titular de la Póliza: </span>
                        <strong style={{ color: 'var(--color-strong)' }}>{pol.titular.nombreCompleto}</strong>{' '}
                        <Badge variant="neutral">{pol.titular.parentesco}</Badge>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', color: 'var(--color-text-secondary)' }}>
                      <span>DPI: <strong style={{ color: 'var(--color-strong)' }}>{pol.titular.numeroIdentificacion}</strong></span>
                      {pol.titular.telefonoContacto && (
                        <span>Tel: <strong style={{ color: 'var(--color-strong)' }}>{pol.titular.telefonoContacto}</strong></span>
                      )}
                    </div>
                  </div>

                  {pol.observaciones && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      Nota: {pol.observaciones}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Modal de Afiliación H05 */}
      {modalAbierto && (
        <AfiliarPolizaModal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          pacienteId={pacienteId}
          pacienteNombres={pacienteNombres}
          pacienteApellidos={pacienteApellidos}
          pacienteNombre={pacienteNombre}
          pacienteDpi={pacienteDpi}
          pacienteTelefono={pacienteTelefono}
          aseguradoras={aseguradoras}
          onConfirm={handleAfiliarPoliza}
        />
      )}
      {cambioEstado&&<Modal isOpen onClose={()=>{if(!cambiando&&!comandoEstado.incierto)setCambioEstado(null);}} title="Cambiar estado de cobertura">
        <form onSubmit={async e=>{e.preventDefault();setCambiando(true);try{const dto=comandoEstado.preparar({...cambioEstado,motivo:motivoEstado});await patientRepository.cambiarEstadoPoliza(institucionId,pacienteId,dto.id,dto.estado,dto.version,dto.motivo);comandoEstado.limpiar();setCambioEstado(null);await cargarDatos();onActualizado?.();}catch(err){comandoEstado.error(err);setErrorEstado('No se pudo cambiar el estado. Reintente la misma solicitud o vuelva a cargar la póliza.');}finally{setCambiando(false);}}}>
          {errorEstado&&<div role="alert">{errorEstado}</div>}
          <label>Motivo del cambio<textarea disabled={cambiando||comandoEstado.incierto} aria-label="Motivo del cambio de cobertura" value={motivoEstado} onChange={e=>setMotivoEstado(e.target.value)} required maxLength={1000}/></label>
          <Button type="submit" disabled={cambiando}>Confirmar estado de cobertura</Button>
        </form>
      </Modal>}
      <HospitalPageControls etiqueta="Pólizas" pagina={pagina} hayMas={hayMas} pendiente={loading} onPagina={setPagina} />
    </div>
  );
};
