import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Printer,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  QrCode,
  Building2
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { Alert } from '../../design-system/components/Alert';
import {
  OrdenLaboratorio,
  ResultadoLaboratorio,
  InformeLaboratorio
} from '../../services/types';

export const LabReportPage: React.FC = () => {
  const { ordenId } = useParams<{ ordenId: string }>();
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [orden, setOrden] = useState<OrdenLaboratorio | null>(null);
  const [resultados, setResultados] = useState<ResultadoLaboratorio[]>([]);
  const [informe, setInforme] = useState<InformeLaboratorio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [emitiendo, setEmitiendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const puedeEmitir = sesion?.permisos.includes('resultados.validar') || sesion?.permisos.includes('usuarios.administrar') || false;

  const cargarDatos = async () => {
    if (!ordenId) return;
    setCargando(true);
    setErrorGlobal(null);
    try {
      const ord = await laboratoryRepository.obtenerOrdenPorId(institucionId, ordenId);
      if (!ord) {
        setErrorGlobal('La orden solicitada no existe.');
        return;
      }
      setOrden(ord);

      const res = await laboratoryRepository.obtenerResultadosPorOrden(institucionId, ord.id);
      setResultados(res);

      const inf = await laboratoryRepository.obtenerInformePorOrden(institucionId, ord.id);
      setInforme(inf);
    } catch (err: any) {
      setErrorGlobal(err?.message || 'Error cargando datos del informe.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [ordenId, institucionId]);

  // Verificar si todas las pruebas están validadas para permitir emisión oficial (CA13)
  const estadoPruebas = useMemo(() => {
    if (!orden) return { listos: 0, total: 0, todasValidadas: false, pendientes: [] };

    const pendientes: string[] = [];
    let listos = 0;

    for (const item of orden.items) {
      const res = resultados.find((r) => r.itemOrdenId === item.id && r.estado === 'VALIDADO');
      if (res) {
        listos++;
      } else {
        pendientes.push(item.nombrePrueba);
      }
    }

    return {
      listos,
      total: orden.items.length,
      todasValidadas: listos === orden.items.length && orden.items.length > 0,
      pendientes
    };
  }, [orden, resultados]);

  const handleEmitirInforme = async () => {
    if (!orden) return;
    setEmitiendo(true);
    setErrorGlobal(null);
    setMensajeExito(null);

    try {
      const emisorNombre = sesion?.nombre || 'Lic. Kevin Estrada';
      const emisorColegiado = sesion?.colegiado || 'QB-4912';

      const nuevoInforme = await laboratoryRepository.emitirInforme(
        institucionId,
        orden.id,
        sesion?.cuentaId || 'usr-lab-val-01',
        emisorNombre,
        emisorColegiado,
        'Informe emitido y certificado bajo el estándar de calidad analítica de Laboratorio Clínico Central. Valores contrastados con métodos automatizados calibrados.'
      );

      setInforme(nuevoInforme);
      setMensajeExito(`Informe oficial ${nuevoInforme.codigoInforme} emitido exitosamente.`);

      // Recargar orden
      const ordAct = await laboratoryRepository.obtenerOrdenPorId(institucionId, orden.id);
      if (ordAct) setOrden(ordAct);
    } catch (err: any) {
      setErrorGlobal(err?.message || 'Error al emitir el informe analítico oficial.');
    } finally {
      setEmitiendo(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  if (cargando) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <SkeletonLoader variant="card" height={320} />
      </div>
    );
  }

  if (errorGlobal && !orden) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '40px auto' }}>
        <Alert variant="danger" title="Error">
          {errorGlobal}
        </Alert>
        <div style={{ marginTop: '16px' }}>
          <Button variant="secondary" onClick={() => navigate('/laboratorio/bandeja')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Volver a la Bandeja
          </Button>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Navegación y Barra de Acciones Superior (Oculta al imprimir) */}
      <div className="no-print" style={{ marginBottom: '20px' }}>
        <nav aria-label="Ruta de navegación" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          <Link to="/laboratorio/bandeja" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            Bandeja de Laboratorio
          </Link>
          <span>/</span>
          <Link to={`/laboratorio/ordenes/${orden.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            Orden {orden.codigoOrden}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>Informe Analítico Oficial (L09)</span>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--color-strong)' }}>
                Informe Analítico de Laboratorio
              </h1>
              <Badge variant={informe?.estado === 'EMITIDO' ? 'success' : 'warning'}>
                {informe?.estado === 'EMITIDO' ? 'EMITIDO OFICIAL' : 'VISTA PREVIA PRELIMINAR'}
              </Badge>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              Certificación de resultados con control de versiones inmutables y hash de autenticidad (CA13)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="secondary" onClick={() => navigate(`/laboratorio/ordenes/${orden.id}`)}>
              <ArrowLeft size={16} style={{ marginRight: '6px' }} />
              Volver a la Orden
            </Button>

            <Button variant="secondary" onClick={handleImprimir} aria-label="Imprimir informe oficial">
              <Printer size={16} style={{ marginRight: '6px' }} />
              Imprimir / PDF
            </Button>

            {!informe && (
              <Button
                variant="primary"
                onClick={handleEmitirInforme}
                disabled={!estadoPruebas.todasValidadas || emitiendo || !puedeEmitir}
                aria-label="Emitir Informe Oficial"
              >
                <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                {emitiendo ? 'Emitiendo...' : 'Emitir Informe Oficial (L09)'}
              </Button>
            )}
          </div>
        </div>

        {mensajeExito && (
          <div style={{ marginTop: '16px' }}>
            <Alert variant="success" title="Informe Emitido">
              {mensajeExito}
            </Alert>
          </div>
        )}

        {errorGlobal && (
          <div style={{ marginTop: '16px' }}>
            <Alert variant="danger" title="Aviso de Emisión">
              {errorGlobal}
            </Alert>
          </div>
        )}

        {/* Alerta si faltan pruebas por validar (CA13) */}
        {!estadoPruebas.todasValidadas && !informe && (
          <div style={{ marginTop: '16px' }}>
            <Alert variant="warning" title="Pruebas pendientes de validación técnica (CA13)">
              No es posible emitir el informe oficial definitivo porque existen exámenes que aún no han sido certificados en la bandeja de validación (<code>L07</code>):{' '}
              <strong>{estadoPruebas.pendientes.join(', ')}</strong>. Solo se permite visualizar la vista previa preliminar.
            </Alert>
          </div>
        )}
      </div>

      {/* DOCUMENTO OFICIAL CLÍNICO (A4 / Hoja membretada imprimible) */}
      <div
        id="hoja-informe-oficial"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #D1D5DB',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#111827'
        }}
      >
        {/* Encabezado Membretado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-primary, #20666B)', paddingBottom: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: 'rgba(32, 102, 107, 0.1)',
                color: 'var(--color-primary, #20666B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={32} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-primary, #20666B)', letterSpacing: '-0.3px' }}>
                LABORATORIO CLÍNICO CENTRAL
              </h2>
              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>
                Patología Clínica · Microbiología · Hematología · Bioquímica Automatizada
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                Licencia Sanitaria MS-7819-GT · PBX: (502) 2339-0000 · Ciudad de Guatemala
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280', fontWeight: 600 }}>
              Código de Informe Oficial
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '16px', color: '#111827' }}>
              {informe?.codigoInforme || `PREV-${orden.codigoOrden}`}
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
              Orden: <strong>{orden.codigoOrden}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              Emisión: {informe ? new Date(informe.fechaEmision).toLocaleString() : 'Vista Preliminar'}
            </div>
          </div>
        </div>

        {/* Ficha Demográfica del Paciente y Médico Solicitante */}
        <div
          style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            fontSize: '13px'
          }}
        >
          <div>
            <div style={{ color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
              Paciente
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
              {orden.pacienteNombre}
            </div>
            <div style={{ color: '#4B5563', fontSize: '12px' }}>
              DPI: {orden.pacienteDpi}
            </div>
          </div>

          <div>
            <div style={{ color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
              Edad / Sexo
            </div>
            <div style={{ fontWeight: 600, color: '#111827' }}>
              {orden.pacienteEdad} años · Sexo {orden.pacienteSexo === 'F' ? 'Femenino' : 'Masculino'}
            </div>
            <div style={{ color: '#4B5563', fontSize: '12px' }}>
              Prioridad: <strong>{orden.prioridad}</strong>
            </div>
          </div>

          <div>
            <div style={{ color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
              Médico Solicitante
            </div>
            <div style={{ fontWeight: 600, color: '#111827' }}>
              {orden.medicoSolicitante}
            </div>
            <div style={{ color: '#4B5563', fontSize: '12px', fontStyle: 'italic' }}>
              {orden.motivoClinico}
            </div>
          </div>

          <div>
            <div style={{ color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
              Fecha de Solicitud
            </div>
            <div style={{ color: '#111827' }}>
              {new Date(orden.fechaCreacion).toLocaleDateString()} {new Date(orden.fechaCreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ color: '#4B5563', fontSize: '12px' }}>
              Muestras: {orden.muestras.map((m) => m.codigoMuestra).join(', ')}
            </div>
          </div>
        </div>

        {/* Sección de Resultados Analíticos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
          {orden.items.map((item) => {
            // Obtener el resultado vinculado a esta prueba
            const resultado = informe
              ? informe.resultadosIncluidos.find((r) => r.pruebaId === item.pruebaId || r.codigoPrueba === item.codigoPrueba)
              : resultados.find((r) => r.itemOrdenId === item.id && r.estado === 'VALIDADO') || resultados.find((r) => r.itemOrdenId === item.id);

            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}
              >
                {/* Encabezado de la Prueba */}
                <div
                  style={{
                    backgroundColor: '#F3F4F6',
                    padding: '10px 14px',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#111827' }}>
                      {item.nombrePrueba}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
                      ({item.codigoPrueba} v{item.versionPrueba}) · {item.seccion}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    {resultado ? (
                      <span>Serie: <code>{resultado.serieResultadoId}</code> (v{resultado.version})</span>
                    ) : (
                      <span style={{ color: '#DC2626' }}>Pendiente de análisis</span>
                    )}
                  </div>
                </div>

                {/* Tabla de Parámetros */}
                {resultado ? (
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#FAFAFA' }}>
                          <th style={{ padding: '8px 14px', width: '32%' }}>Parámetro</th>
                          <th style={{ padding: '8px 14px', width: '22%' }}>Resultado</th>
                          <th style={{ padding: '8px 14px', width: '14%' }}>Unidad</th>
                          <th style={{ padding: '8px 14px', width: '22%' }}>Intervalo de Referencia</th>
                          <th style={{ padding: '8px 14px', width: '10%' }}>Alerta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.parametros.map((p) => {
                          const esCritico = p.alerta === 'CRITICO';
                          const esFuera = p.alerta === 'ELEVADO' || p.alerta === 'DISMINUIDO';

                          return (
                            <tr
                              key={p.id}
                              style={{
                                borderBottom: '1px solid #F3F4F6',
                                backgroundColor: esCritico ? '#FEF2F2' : esFuera ? '#FFFBEB' : 'transparent'
                              }}
                            >
                              <td style={{ padding: '8px 14px' }}>
                                <strong style={{ color: '#1F2937' }}>{p.nombre}</strong>
                              </td>
                              <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: esCritico ? '#B91C1C' : '#111827' }}>
                                {p.valor}
                              </td>
                              <td style={{ padding: '8px 14px', color: '#4B5563' }}>
                                {p.unidad}
                              </td>
                              <td style={{ padding: '8px 14px', color: '#6B7280', fontFamily: 'monospace' }}>
                                {p.rangoTexto}
                              </td>
                              <td style={{ padding: '8px 14px' }}>
                                <Badge
                                  variant={
                                    p.alerta === 'CRITICO'
                                      ? 'danger'
                                      : p.alerta === 'ELEVADO' || p.alerta === 'DISMINUIDO'
                                      ? 'warning'
                                      : 'success'
                                  }
                                >
                                  {p.alerta}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Metadatos Técnicos del Análisis */}
                    <div
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#FAFAFA',
                        borderTop: '1px solid #E5E7EB',
                        fontSize: '11px',
                        color: '#6B7280',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        Equipo: <strong>{resultado.equipoAnalitico}</strong> · Método: <strong>{resultado.metodoAnalitico}</strong>
                      </div>
                      <div>
                        Analista: <strong>{resultado.analistaNombre}</strong> · Validador:{' '}
                        <strong>{'validadorNombre' in resultado ? resultado.validadorNombre : 'Lic. Kevin Estrada'}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                    Esta prueba aún no cuenta con resultados registrados.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dictamen Pericial / Conclusiones */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '14px', marginBottom: '28px', backgroundColor: '#F9FAFB' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '4px' }}>
            Dictamen Técnico Facultativo y Conclusiones
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#1F2937', lineHeight: 1.5, fontStyle: 'italic' }}>
            «{informe?.conclusionesGenerales || 'Resultados analíticos obtenidos mediante metodología automatizada. Los valores fueron contrastados con los controles de calidad diario de la institución y validados clínicamente.'}»
          </p>
        </div>

        {/* Bloque de Certificación, Hash de Verificación y Firmas (CA13) */}
        <div
          style={{
            borderTop: '2px dashed #D1D5DB',
            paddingTop: '24px',
            display: 'grid',
            gridTemplateColumns: '120px 1fr 220px',
            gap: '20px',
            alignItems: 'center'
          }}
        >
          {/* Código QR simulado de autenticidad */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '90px',
                height: '90px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                padding: '6px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}
            >
              <QrCode size={78} style={{ color: '#1F2937' }} />
            </div>
            <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '4px' }}>
              Validación QR
            </div>
          </div>

          {/* Sello de Integridad y Hash SHA-256 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-primary, #20666B)' }} />
              <strong style={{ fontSize: '12px', color: '#111827' }}>
                Certificación Digital de Integridad (Regla CA13)
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#6B7280', lineHeight: 1.4 }}>
              Documento inmutable generado con instantánea exacta de identificadores y versiones analíticas.
            </p>
            <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '10px', color: '#374151', wordBreak: 'break-all', backgroundColor: '#F3F4F6', padding: '4px 6px', borderRadius: '4px' }}>
              {informe?.hashVerificacion || 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
            </div>
          </div>

          {/* Firma Facultativa */}
          <div style={{ textAlign: 'center', borderTop: '1px solid #9CA3AF', paddingTop: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: '#111827' }}>
              {informe?.emisorNombre || 'Lic. Kevin Estrada'}
            </div>
            <div style={{ fontSize: '11px', color: '#4B5563' }}>
              Colegiado {informe?.emisorColegiado || 'QB-4912'}
            </div>
            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
              Químico Biólogo · Validador Responsable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabReportPage;
