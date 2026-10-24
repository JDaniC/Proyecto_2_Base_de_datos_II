import { getErrorMessage } from '../../services/errors';
import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { CATALOGO_CIE10 } from '../../services/clinicalCatalogs';
import { DetalleConsultaCompleta, DiagnosticoItemDTO, MedicamentoRecetaDTO } from '../../services/types';

interface ModificarConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: DetalleConsultaCompleta | null;
  onConsultaActualizada: (actualizada: DetalleConsultaCompleta) => void;
}

export const ModificarConsultaModal: React.FC<ModificarConsultaModalProps> = ({
  isOpen,
  onClose,
  consulta,
  onConsultaActualizada
}) => {
  const { sesion } = useAuthSession();
  const { consultationRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [motivo, setMotivo] = useState(consulta?.motivo || '');
  const [sintomas, setSintomas] = useState(consulta?.sintomas || '');
  const [observaciones, setObservaciones] = useState(consulta?.observaciones || '');
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItemDTO[]>(consulta?.diagnosticos || []);
  const [tratamientos, setTratamientos] = useState(consulta?.tratamientos || []);
  const [medicamentos, setMedicamentos] = useState<MedicamentoRecetaDTO[]>((consulta?.receta?.medicamentos || []).map(m => ({ ...m, concentracion: m.concentracion || '', unidad: '' })));
  const [signos, setSignos] = useState(consulta?.signosVitales || { pesoKg: null, tallaCm: null, temperaturaC: null, presionSistolica: null, presionDiastolica: null, frecuenciaCardiacaLpm: null });


  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!consulta) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!motivo.trim() || motivo.trim().length < 4) {
      setErrorValidacion('El motivo de la consulta es obligatorio (mínimo 4 caracteres).');
      return;
    }

    if (!motivoCorreccion.trim() || motivoCorreccion.trim().length < 5) {
      setErrorValidacion(
        'El motivo obligatorio de rectificación es indispensable para generar la nueva versión (mínimo 5 caracteres).'
      );
      return;
    }

    if (diagnosticos.length && diagnosticos.filter(d => d.esPrincipal).length !== 1) { setErrorValidacion('Selecciona un diagnóstico principal.'); return; }
    setGuardando(true);

    try {
      const autor = `${sesion?.nombre || 'Dra. Elena Morales'} (${sesion?.rolEtiqueta || 'Médico Especialista'})`;
      const actualizada = await consultationRepository.actualizarConsultaFinalizada(
        institucionId,
        consulta.pacienteId,
        consulta.id,
        {
          motivo: motivo.trim(),
          sintomas: sintomas.trim(),
          observaciones: observaciones.trim(),
          diagnosticos, tratamientos, signosVitales: signos,
          receta: medicamentos.length ? { medicamentos } : undefined
        },
        motivoCorreccion.trim(),
        autor
      );

      setGuardando(false);
      onConsultaActualizada(actualizada);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(getErrorMessage(err, 'Error al actualizar la consulta clínica.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rectificar consulta · nueva versión v${(consulta.revision || 1) + 1}`}
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

        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>La corrección conservará la revisión anterior y registrará su motivo.</p>

        {/* Motivo rectificado */}
        <div>
          <label
            htmlFor="rect-motivo-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Motivo de consulta <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <input
            id="rect-motivo-input"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
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

        {/* Síntomas rectificados */}
        <div>
          <label
            htmlFor="rect-sintomas-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Síntomas y evaluación clínica
          </label>
          <textarea
            id="rect-sintomas-input"
            rows={3}
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
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

        {/* Observaciones rectificadas */}
        <div>
          <label
            htmlFor="rect-obs-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Observaciones clínicas del examen físico
          </label>
          <textarea
            id="rect-obs-input"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
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


        <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16 }}>
          <legend>Diagnósticos</legend>
          {diagnosticos.map((d, index) => <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <label>Diagnóstico CIE-10<select value={d.codigoCIE} onChange={e => { const item = CATALOGO_CIE10.find(c => c.codigo === e.target.value); if (item) setDiagnosticos(prev => prev.map((v, i) => i === index ? { ...v, codigoCIE: item.codigo, nombre: item.nombre } : v)); }} style={{ width: '100%', padding: 10 }}>
              {!CATALOGO_CIE10.some(c => c.codigo === d.codigoCIE) && <option value={d.codigoCIE}>{d.codigoCIE} · {d.nombre}</option>}
              {CATALOGO_CIE10.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
            </select></label>
            <label><input type="radio" name="principal-corregido" checked={d.esPrincipal} onChange={() => setDiagnosticos(prev => prev.map((v, i) => ({ ...v, esPrincipal: i === index })))} /> Principal</label>
          </div>)}
          <Button size="sm" variant="secondary" onClick={() => { const first = CATALOGO_CIE10[0]; setDiagnosticos(prev => [...prev, { codigoCIE: first.codigo, nombre: first.nombre, esPrincipal: prev.length === 0 }]); }}>Agregar diagnóstico</Button>
        </fieldset>
        <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16 }}><legend>Tratamientos</legend>
          {tratamientos.map((t, index) => <div key={index} style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
            <Input label={`Tratamiento ${index + 1}`} value={t.descripcion} onChange={e => setTratamientos(prev => prev.map((v, i) => i === index ? { ...v, descripcion: e.target.value } : v))} required />
            <Input label="Indicaciones del tratamiento" value={t.indicaciones} onChange={e => setTratamientos(prev => prev.map((v, i) => i === index ? { ...v, indicaciones: e.target.value } : v))} />
          </div>)}
          <Button size="sm" variant="secondary" onClick={() => setTratamientos(prev => [...prev, { descripcion: '', indicaciones: '' }])}>Agregar tratamiento</Button>
        </fieldset>
        <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16 }}><legend>Medicamentos de la receta</legend>
          {medicamentos.map((m, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--color-divider)' }}>
            {([['nombre', 'Medicamento'], ['presentacion', 'Presentación'], ['concentracion', 'Concentración'], ['dosis', 'Dosis'], ['frecuencia', 'Frecuencia'], ['duracion', 'Duración'], ['via', 'Vía'], ['indicaciones', 'Indicaciones']] as const).map(([field, label]) => <Input key={field} label={label} value={m[field]} onChange={e => setMedicamentos(prev => prev.map((v, i) => i === index ? { ...v, [field]: e.target.value } : v))} required={field !== 'indicaciones'} />)}
          </div>)}
          <Button size="sm" variant="secondary" onClick={() => setMedicamentos(prev => [...prev, { nombre: '', presentacion: '', concentracion: '', dosis: '', unidad: '', frecuencia: '', duracion: '', via: '', indicaciones: '' }])}>Agregar medicamento</Button>
        </fieldset>
        {institucionId === 'CENTRO_PEDIATRICO' && <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16 }}><legend>Medición de crecimiento de esta consulta</legend>
          {([['pesoKg', 'Peso (kg)'], ['tallaCm', 'Talla (cm)'], ['perimetroCefalicoCm', 'Perímetro cefálico (cm)']] as const).map(([field, label]) => <Input key={field} label={label} type="number" step="0.01" min="0.01" value={signos[field] ?? ''} onChange={e => setSignos(prev => ({ ...prev, [field]: e.target.value ? Number(e.target.value) : null }))} />)}
        </fieldset>}

        {/* Justificación / Motivo obligatorio de la rectificación */}
        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '14px' }}>
          <label
            htmlFor="rect-justificacion-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-danger-text)', marginBottom: '6px' }}
          >
            Motivo obligatorio de la rectificación <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <textarea
            id="rect-justificacion-input"
            rows={3}
            value={motivoCorreccion}
            onChange={(e) => setMotivoCorreccion(e.target.value)}
            placeholder="Describa la justificación médica o administrativa que motiva esta enmienda en la consulta finalizada..."
            style={{
              width: '100%',
              backgroundColor: 'var(--color-control)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando} leftIcon={<RefreshCw size={15} />}>
            Guardar nueva revisión (v{(consulta.revision || 1) + 1})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
