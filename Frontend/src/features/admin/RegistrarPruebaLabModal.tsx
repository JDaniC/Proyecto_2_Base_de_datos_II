import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Trash2, FlaskConical, AlertCircle, History } from 'lucide-react';
import { useServices } from '../../app/ServiceContext';
import { useAuthSession } from '../../app/AuthSessionContext';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { PruebaLaboratorioCatalogo } from '../../services/types';

interface ParametroForm {
  nombre: string;
  unidadMedida: string;
  rangoReferencia: string;
}

interface RegistrarPruebaLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPruebaGuardada: (prueba: PruebaLaboratorioCatalogo) => void;
  pruebaExistenteParaVersionar?: PruebaLaboratorioCatalogo | null;
}

const SECCIONES_LAB = [
  'Hematología y Coagulación',
  'Química Clínica',
  'Inmunología Clínica',
  'Microbiología y Cultivos',
  'Coprología y Uroanálisis',
  'Endocrinología y Marcadores',
  'Genética y Biología Molecular'
];

export const RegistrarPruebaLabModal: React.FC<RegistrarPruebaLabModalProps> = ({
  isOpen,
  onClose,
  onPruebaGuardada,
  pruebaExistenteParaVersionar
}) => {
  const { catalogRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const esVersionado = Boolean(pruebaExistenteParaVersionar);

  const [codigoPrueba, setCodigoPrueba] = useState('');
  const [nombre, setNombre] = useState('');
  const [seccion, setSeccion] = useState(SECCIONES_LAB[0]);
  const [tipoMuestra, setTipoMuestra] = useState('Sangre total con EDTA (Tubo lila)');
  const [metodoAnalitico, setMetodoAnalitico] = useState('');
  const [tiempoEntregaHoras, setTiempoEntregaHoras] = useState('2');
  const [motivoVersion, setMotivoVersion] = useState('');
  const [parametros, setParametros] = useState<ParametroForm[]>([
    { nombre: '', unidadMedida: '', rangoReferencia: '' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (pruebaExistenteParaVersionar) {
      setCodigoPrueba(pruebaExistenteParaVersionar.codigoPrueba);
      setNombre(pruebaExistenteParaVersionar.nombre);
      setSeccion(pruebaExistenteParaVersionar.seccion);
      setTipoMuestra(pruebaExistenteParaVersionar.tipoMuestra);
      setMetodoAnalitico(pruebaExistenteParaVersionar.metodoAnalitico);
      setTiempoEntregaHoras(pruebaExistenteParaVersionar.tiempoEntregaHoras.toString());
      setMotivoVersion(`Actualización técnica y ajuste de intervalos de referencia v${pruebaExistenteParaVersionar.version + 1}`);
      setParametros(
        pruebaExistenteParaVersionar.parametros.map((p) => ({
          nombre: p.nombre,
          unidadMedida: p.unidadMedida,
          rangoReferencia: p.rangoReferencia
        }))
      );
    } else {
      setCodigoPrueba('');
      setNombre('');
      setSeccion(SECCIONES_LAB[0]);
      setTipoMuestra('Sangre total con EDTA (Tubo lila)');
      setMetodoAnalitico('');
      setTiempoEntregaHoras('2');
      setMotivoVersion('');
      setParametros([{ nombre: '', unidadMedida: '', rangoReferencia: '' }]);
    }
    setError(null);
  }, [pruebaExistenteParaVersionar, isOpen]);

  if (!isOpen) return null;

  const handleAgregarParametro = () => {
    setParametros([...parametros, { nombre: '', unidadMedida: '', rangoReferencia: '' }]);
  };

  const handleQuitarParametro = (index: number) => {
    if (parametros.length <= 1) {
      setError('La prueba debe contener al menos un parámetro analítico evaluable.');
      return;
    }
    setParametros(parametros.filter((_, i) => i !== index));
  };

  const handleParametroChange = (index: number, campo: keyof ParametroForm, valor: string) => {
    const actualizados = [...parametros];
    actualizados[index][campo] = valor;
    setParametros(actualizados);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!codigoPrueba.trim()) {
      setError('El código de la prueba es obligatorio (ej. HEM-003, QUI-050).');
      return;
    }

    if (!nombre.trim()) {
      setError('El nombre de la prueba analítica es obligatorio.');
      return;
    }

    if (!metodoAnalitico.trim()) {
      setError('El método analítico o principio de medición es obligatorio.');
      return;
    }

    const horas = parseInt(tiempoEntregaHoras, 10);
    if (isNaN(horas) || horas <= 0) {
      setError('El tiempo estimado de entrega debe ser un número entero de horas mayor a 0.');
      return;
    }

    if (esVersionado && !motivoVersion.trim()) {
      setError('Debe especificar el motivo clínico/técnico de la nueva versión (Regla CA16).');
      return;
    }

    const parametrosValidos = parametros.filter((p) => p.nombre.trim());
    if (parametrosValidos.length === 0) {
      setError('Debe definir al menos un parámetro analítico con su nombre.');
      return;
    }

    setGuardando(true);
    try {
      if (esVersionado && pruebaExistenteParaVersionar) {
        const versionada = await catalogRepository.crearNuevaVersionPruebaLaboratorio(
          institucionId,
          pruebaExistenteParaVersionar.id,
          {
            nombre: nombre.trim(),
            seccion,
            tipoMuestra: tipoMuestra.trim(),
            metodoAnalitico: metodoAnalitico.trim(),
            tiempoEntregaHoras: horas,
            parametros: parametrosValidos.map((p, idx) => ({
              parametroId: `p-${codigoPrueba.toLowerCase()}-${idx + 1}`,
              nombre: p.nombre.trim(),
              unidadMedida: p.unidadMedida.trim() || 'N/A',
              rangoReferencia: p.rangoReferencia.trim() || 'Normal'
            }))
          },
          motivoVersion.trim()
        );
        onPruebaGuardada(versionada);
      } else {
        const nueva = await catalogRepository.crearPruebaLaboratorio(institucionId, {
          codigoPrueba: codigoPrueba.trim().toUpperCase(),
          nombre: nombre.trim(),
          seccion,
          tipoMuestra: tipoMuestra.trim(),
          metodoAnalitico: metodoAnalitico.trim(),
          tiempoEntregaHoras: horas,
          estado: 'ACTIVO',
          parametros: parametrosValidos.map((p, idx) => ({
            parametroId: `p-${codigoPrueba.toLowerCase()}-${idx + 1}`,
            nombre: p.nombre.trim(),
            unidadMedida: p.unidadMedida.trim() || 'N/A',
            rangoReferencia: p.rangoReferencia.trim() || 'Normal'
          }))
        });
        onPruebaGuardada(nueva);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la prueba en el catálogo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-prueba-lab-titulo"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-modal)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: esVersionado ? 'var(--color-selection)' : 'transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {esVersionado ? <History size={20} /> : <FlaskConical size={20} />}
            </div>
            <div>
              <h3
                id="modal-prueba-lab-titulo"
                style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-strong)' }}
              >
                {esVersionado
                  ? `Nueva Versión de Determinación: v${pruebaExistenteParaVersionar!.version + 1}.0`
                  : 'Registrar Nueva Determinación de Laboratorio (L10)'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {esVersionado
                  ? 'Regla CA16: Preserva historial de órdenes anteriores e incrementa versión inmutable'
                  : 'Catálogo de pruebas analíticas, tipos de muestra y parámetros de referencia'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-input)',
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)',
                color: 'var(--color-error-text)',
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

          {esVersionado && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-input)',
                backgroundColor: 'var(--color-selection)',
                border: '1px solid var(--color-primary-light, #A0C4C7)',
                fontSize: '12px',
                color: 'var(--color-strong)'
              }}
            >
              <strong>Atención de Trazabilidad (CA16):</strong> Esta acción creará la versión{' '}
              <code>v{pruebaExistenteParaVersionar!.version + 1}.0</code>. Las órdenes de análisis emitidas
              previamente continuarán referenciando la versión inmutable{' '}
              <code>v{pruebaExistenteParaVersionar!.version}.0</code>.
            </div>
          )}

          {/* Código y Nombre */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="input-codigo-prueba"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Código Oficial *
              </label>
              <Input
                id="input-codigo-prueba"
                value={codigoPrueba}
                onChange={(e) => setCodigoPrueba(e.target.value)}
                placeholder="ej. HEM-003"
                disabled={esVersionado || guardando}
                required
              />
            </div>
            <div>
              <label
                htmlFor="input-nombre-prueba"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Nombre de la Determinación / Prueba *
              </label>
              <Input
                id="input-nombre-prueba"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. Ferritina Sérica Automatizada"
                disabled={guardando}
                required
              />
            </div>
          </div>

          {/* Sección y Método */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="select-seccion-lab"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Sección del Laboratorio *
              </label>
              <select
                id="select-seccion-lab"
                value={seccion}
                onChange={(e) => setSeccion(e.target.value)}
                disabled={guardando}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-strong)',
                  fontSize: '13px'
                }}
              >
                {SECCIONES_LAB.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="input-tiempo-entrega"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Tiempo de Entrega (Horas) *
              </label>
              <Input
                id="input-tiempo-entrega"
                type="number"
                min="1"
                value={tiempoEntregaHoras}
                onChange={(e) => setTiempoEntregaHoras(e.target.value)}
                disabled={guardando}
                required
              />
            </div>
          </div>

          {/* Tipo de Muestra y Método Analítico */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="input-tipo-muestra"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Tipo de Muestra Requerida *
              </label>
              <Input
                id="input-tipo-muestra"
                value={tipoMuestra}
                onChange={(e) => setTipoMuestra(e.target.value)}
                placeholder="ej. Suero en tubo rojo / plasma EDTA"
                disabled={guardando}
                required
              />
            </div>
            <div>
              <label
                htmlFor="input-metodo-analitico"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Método Analítico / Principio *
              </label>
              <Input
                id="input-metodo-analitico"
                value={metodoAnalitico}
                onChange={(e) => setMetodoAnalitico(e.target.value)}
                placeholder="ej. Quimioluminiscencia (CLIA)"
                disabled={guardando}
                required
              />
            </div>
          </div>

          {/* Si es versionado, motivo del cambio */}
          {esVersionado && (
            <div>
              <label
                htmlFor="input-motivo-version"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Motivo Clínico de la Nueva Versión (Regla CA16) *
              </label>
              <Input
                id="input-motivo-version"
                value={motivoVersion}
                onChange={(e) => setMotivoVersion(e.target.value)}
                placeholder="ej. Actualización de límites de referencia según nueva guía internacional 2026"
                disabled={guardando}
                required
              />
            </div>
          )}

          {/* Lista Dinámica de Parámetros */}
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '14px',
              backgroundColor: 'var(--color-background-alt)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  Parámetros Analíticos y Rangos de Referencia
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                  ({parametros.length} definidos)
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAgregarParametro}
                leftIcon={<PlusCircle size={14} />}
                disabled={guardando}
              >
                Agregar Parámetro
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parametros.map((par, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 2fr 36px',
                    gap: '8px',
                    alignItems: 'center',
                    backgroundColor: 'var(--color-background)',
                    padding: '8px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <input
                    aria-label={`Nombre de parámetro ${index + 1}`}
                    type="text"
                    value={par.nombre}
                    onChange={(e) => handleParametroChange(index, 'nombre', e.target.value)}
                    placeholder="Parámetro (ej. Hematocrito)"
                    disabled={guardando}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <input
                    aria-label={`Unidad de parámetro ${index + 1}`}
                    type="text"
                    value={par.unidadMedida}
                    onChange={(e) => handleParametroChange(index, 'unidadMedida', e.target.value)}
                    placeholder="Unidad (ej. %)"
                    disabled={guardando}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <input
                    aria-label={`Rango de referencia de parámetro ${index + 1}`}
                    type="text"
                    value={par.rangoReferencia}
                    onChange={(e) => handleParametroChange(index, 'rangoReferencia', e.target.value)}
                    placeholder="Rango (ej. 36.0 - 48.0)"
                    disabled={guardando}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'transparent',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar parámetro ${index + 1}`}
                    onClick={() => handleQuitarParametro(index)}
                    disabled={guardando || parametros.length <= 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: parametros.length <= 1 ? 'var(--color-text-secondary)' : '#DC2626',
                      cursor: parametros.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '12px',
              borderTop: '1px solid var(--color-divider)',
              paddingTop: '16px'
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={guardando}>
              {esVersionado ? 'Guardar Nueva Versión (CA16)' : 'Registrar Determinación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
