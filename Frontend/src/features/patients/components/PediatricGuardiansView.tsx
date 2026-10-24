import { Modal } from '../../../design-system/components/Modal';
import { getErrorMessage } from '../../../services/errors';
import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Phone,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  Star
} from 'lucide-react';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { useServices } from '../../../app/ServiceContext';
import { Panel } from '../../../design-system/components/Panel';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { Input } from '../../../design-system/components/Input';
import { Select } from '../../../design-system/components/Select';
import { Alert } from '../../../design-system/components/Alert';
import { Paciente, ResponsablePediatrico } from '../../../services/types';

interface PediatricGuardiansViewProps {
  paciente: Paciente;
  onActualizado: () => Promise<void>;
}

export const PediatricGuardiansView: React.FC<PediatricGuardiansViewProps> = ({
  paciente,
  onActualizado
}) => {
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();
  const institucionId = sesion?.institucionId || 'CENTRO_PEDIATRICO';

  const [responsables, setResponsables] = useState<ResponsablePediatrico[]>(
    paciente.responsables || []
  );

  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [responsableAEditar, setResponsableAEditar] = useState<ResponsablePediatrico | null>(null);

  // Formulario nuevo / edición
  const [nombre, setNombre] = useState('');
  const [parentesco, setParentesco] = useState('Madre');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [autorizaAtencion, setAutorizaAtencion] = useState(true);

  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [responsableParaEliminar, setResponsableParaEliminar] = useState<ResponsablePediatrico | null>(null);

  // Sincronizar estado local si cambia el paciente prop
  React.useEffect(() => {
    setResponsables(paciente.responsables || []);
  }, [paciente.responsables]);

  const principalesCount = responsables.filter((r) => r.esPrincipal).length;
  const tieneAutorizacionActiva = responsables.some((r) => r.autorizaAtencion);

  const abrirModalNuevo = () => {
    setNombre('');
    setParentesco('Madre');
    setDocumento('');
    setTelefono('');
    setEsPrincipal(responsables.length === 0);
    setAutorizaAtencion(true);
    setErrorAccion(null);
    setModalNuevoAbierto(true);
  };

  const abrirModalEditar = (resp: ResponsablePediatrico) => {
    setResponsableAEditar(resp);
    setNombre(resp.nombre);
    setParentesco(resp.parentesco);
    setDocumento(resp.documento || '');
    setTelefono(resp.telefono);
    setEsPrincipal(resp.esPrincipal);
    setAutorizaAtencion(resp.autorizaAtencion);
    setErrorAccion(null);
    setModalEditarAbierto(true);
  };

  const handleCrearResponsable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setErrorAccion('El nombre y el teléfono son campos obligatorios.');
      return;
    }

    try {
      setGuardando(true);
      setErrorAccion(null);

      await patientRepository.agregarResponsable(institucionId, paciente.id, {
        nombre: nombre.trim(),
        parentesco,
        telefono: telefono.trim(),
        documento: documento.trim() || undefined,
        esPrincipal,
        autorizaAtencion
      });

      setMensajeExito(`Responsable «${nombre.trim()}» vinculado correctamente.`);
      setModalNuevoAbierto(false);
      await onActualizado();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Error al registrar responsable.');
      setErrorAccion(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarResponsable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsableAEditar) return;

    if (!nombre.trim() || !telefono.trim()) {
      setErrorAccion('El nombre y el teléfono son campos obligatorios.');
      return;
    }

    // Regla CA09: Prevenir desmarcar al único principal
    if (!esPrincipal && responsableAEditar.esPrincipal && principalesCount <= 1) {
      setErrorAccion('Este menor debe tener al menos un responsable principal. Asigna otro antes de cambiar este vínculo.');
      return;
    }

    try {
      setGuardando(true);
      setErrorAccion(null);

      await patientRepository.actualizarResponsable(institucionId, paciente.id, responsableAEditar.id, {
        nombre: nombre.trim(),
        parentesco,
        telefono: telefono.trim(),
        documento: documento.trim() || undefined,
        esPrincipal,
        autorizaAtencion
      });

      setMensajeExito(`Vínculo de «${nombre.trim()}» actualizado con éxito.`);
      setModalEditarAbierto(false);
      setResponsableAEditar(null);
      await onActualizado();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Error al actualizar responsable.');
      setErrorAccion(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarResponsable = async (resp: ResponsablePediatrico) => {
    // Regla CA09: Prevenir eliminar al último principal
    if (resp.esPrincipal && principalesCount <= 1) {
      setErrorAccion('Este menor debe conservar al menos un responsable principal. Asigna otro antes de retirar este vínculo.');
      return;
    }

    try {
      setErrorAccion(null);
      setGuardando(true);
      await patientRepository.eliminarResponsable(institucionId, paciente.id, resp.id);
      setMensajeExito(`Responsable «${resp.nombre}» desvinculado.`);
      setResponsableParaEliminar(null);
      await onActualizado();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Error al desvincular responsable.');
      setErrorAccion(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleHacerPrincipalDirecto = async (resp: ResponsablePediatrico) => {
    try {
      setErrorAccion(null);
      await patientRepository.actualizarResponsable(institucionId, paciente.id, resp.id, {
        esPrincipal: true
      });
      setMensajeExito(`«${resp.nombre}» ha sido designado como Responsable Principal.`);
      await onActualizado();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Error al actualizar principalidad.');
      setErrorAccion(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de notificación temporal */}
      {mensajeExito && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
      )}

      {errorAccion && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-900 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{errorAccion}</span>
          </div>
          <button
            onClick={() => setErrorAccion(null)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de Verificación de Consentimiento Clínico (CA09) */}
      {!tieneAutorizacionActiva && (
        <Alert
          variant="danger"
          title="Falta una persona autorizada para consentir la atención"
        >
          Asigna este permiso a una persona responsable antes de iniciar la atención.
        </Alert>
      )}

      {/* Panel Principal */}
      <Panel
        title={`Responsables y Tutores Legales (${responsables.length})`}
        subtitle="Personas responsables y permisos para autorizar la atención"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={abrirModalNuevo}
            className="flex items-center gap-1.5 bg-clinic-primary hover:bg-clinic-primary-dark text-white text-xs"
          >
            <Plus size={15} />
            Vincular Nuevo Responsable
          </Button>
        }
      >
        {responsables.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Sin responsables vinculados</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Todo menor debe tener al menos un responsable principal.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={abrirModalNuevo}
              className="mt-4 bg-clinic-primary text-white text-xs"
            >
              Registrar Primer Responsable
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {responsables.map((resp) => {
              const esUnicoPrincipal = resp.esPrincipal && principalesCount <= 1;

              return (
                <div
                  key={resp.id}
                  className={`p-4 rounded-xl border transition-all ${
                    resp.esPrincipal
                      ? 'bg-white border-clinic-primary-soft shadow-sm ring-1 ring-clinic-primary-soft'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg ${
                          resp.esPrincipal
                            ? 'bg-clinic-primary-soft text-clinic-primary'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{resp.nombre}</h4>
                        <p className="text-xs font-semibold text-clinic-primary">{resp.parentesco}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => abrirModalEditar(resp)}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 border-slate-200 text-xs"
                        title="Editar datos y facultades del tutor"
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={esUnicoPrincipal}
                        onClick={() => { setErrorAccion(null); setResponsableParaEliminar(resp); }}
                        className="px-2 py-1 text-xs"
                        title={
                          esUnicoPrincipal
                            ? 'El menor debe conservar al menos un responsable principal'
                            : 'Desvincular tutor'
                        }
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {/* Datos de contacto y documento */}
                  <div className="py-3 space-y-1.5 text-xs text-slate-600 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span className="text-slate-500">Teléfono:</span>
                      <strong className="text-slate-800">{resp.telefono}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard size={13} className="text-slate-400" />
                      <span className="text-slate-500">Documento DPI / CUI:</span>
                      <strong className="text-slate-800 font-mono">
                        {resp.documento || 'No especificado'}
                      </strong>
                    </div>
                  </div>

                  {/* Facultades y Estados (CA09) */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {resp.esPrincipal ? (
                        <Badge variant="primary">
                          <Star size={11} className="mr-1 fill-current" />
                          Responsable Principal
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Tutor Secundario</Badge>
                      )}

                      {resp.autorizaAtencion ? (
                        <Badge variant="success">
                          <ShieldCheck size={11} className="mr-1 inline" />
                          Autoriza Atención
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <ShieldAlert size={11} className="mr-1 inline" />
                          Sin Facultad de Autorización
                        </Badge>
                      )}
                    </div>

                    {!resp.esPrincipal && (
                      <button
                        type="button"
                        onClick={() => handleHacerPrincipalDirecto(resp)}
                        className="text-[11px] font-semibold text-clinic-primary hover:underline"
                      >
                        Hacer Principal
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Modal
        isOpen={Boolean(responsableParaEliminar)}
        onClose={() => { if (!guardando) setResponsableParaEliminar(null); }}
        title="Desvincular responsable"
        footer={<>
          <Button variant="secondary" disabled={guardando} onClick={() => setResponsableParaEliminar(null)}>Volver</Button>
          <Button variant="danger" loading={guardando} onClick={() => responsableParaEliminar && handleEliminarResponsable(responsableParaEliminar)}>Desvincular</Button>
        </>}
      >
        {errorAccion && <Alert variant="danger" style={{ marginBottom: '16px' }}>{errorAccion}</Alert>}
        <p>Se retirará el vínculo de <strong>{responsableParaEliminar?.nombre}</strong> con este expediente. Confirma que deseas continuar.</p>
      </Modal>

      {/* MODAL 1: Vincular Nuevo Responsable (CA09) */}
      {modalNuevoAbierto && (
      <Modal
        isOpen={modalNuevoAbierto}
        onClose={() => setModalNuevoAbierto(false)}
        title="Vincular responsable legal"
        maxWidth="520px"
      >
        <form onSubmit={handleCrearResponsable} className="space-y-4">
              {errorAccion && <Alert variant="danger">{errorAccion}</Alert>}
              <Input
                label="Nombre completo del responsable *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Carmen Eugenia Morales"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Parentesco con el menor *"
                  value={parentesco}
                  onChange={(e) => setParentesco(e.target.value)}
                  options={[
                    { value: 'Madre', label: 'Madre' },
                    { value: 'Padre', label: 'Padre' },
                    { value: 'Tutor Legal', label: 'Tutor Legal / Guardián' },
                    { value: 'Abuelo/a', label: 'Abuelo/a' },
                    { value: 'Tío/a', label: 'Tío/a' },
                    { value: 'Otro', label: 'Otro familiar acreditado' }
                  ]}
                />

                <Input
                  label="Teléfono de contacto *"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 5555-1234"
                  required
                />
              </div>

              <Input
                label="DPI / CUI del responsable"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ej. 2456 78901 0101"
              />

              {/* Checkboxes de facultades independientes (CA09) */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Facultades Legales y de Atención
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esPrincipal}
                    onChange={(e) => setEsPrincipal(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-clinic-primary focus:ring-clinic-primary"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Responsable principal
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Contacto preferente ante notificaciones oficiales y trámites administrativos.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-200 pt-2.5">
                  <input
                    type="checkbox"
                    checked={autorizaAtencion}
                    onChange={(e) => setAutorizaAtencion(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-clinic-primary focus:ring-clinic-primary"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Puede autorizar consultas y vacunas
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Facultad clínica independiente para consentir consultas, prescripción e inmunizaciones.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalNuevoAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={guardando}
                  className="bg-clinic-primary text-white"
                >
                  Guardar Responsable
                </Button>
              </div>
            </form>
      </Modal>
      )}

      {/* MODAL 2: Editar Vínculo de Responsable (CA09) */}
      {modalEditarAbierto && responsableAEditar && (
      <Modal
        isOpen={modalEditarAbierto}
        onClose={() => setModalEditarAbierto(false)}
        title="Editar responsable legal"
        maxWidth="520px"
      >
        <form onSubmit={handleActualizarResponsable} className="space-y-4">
              {errorAccion && <Alert variant="danger">{errorAccion}</Alert>}
              <Input
                label="Nombre completo del tutor/a *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Parentesco *"
                  value={parentesco}
                  onChange={(e) => setParentesco(e.target.value)}
                  options={[
                    { value: 'Madre', label: 'Madre' },
                    { value: 'Padre', label: 'Padre' },
                    { value: 'Tutor Legal', label: 'Tutor Legal / Guardián' },
                    { value: 'Abuelo/a', label: 'Abuelo/a' },
                    { value: 'Tío/a', label: 'Tío/a' },
                    { value: 'Otro', label: 'Otro familiar acreditado' }
                  ]}
                />

                <Input
                  label="Teléfono de contacto *"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  required
                />
              </div>

              <Input
                label="DPI / CUI del responsable"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />

              {/* Bloque de sincronización compartida */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800">
                <p className="font-semibold">Responsable Compartido entre Hermanos:</p>
                <p className="mt-0.5">
                  Actualizar el teléfono o nombre reflejará el cambio de contacto en los expedientes de todos los hermanos vinculados sin alterar sus permisos individuales.
                </p>
              </div>

              {/* Facultades */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Facultades Legales y de Atención
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esPrincipal}
                    onChange={(e) => setEsPrincipal(e.target.checked)}
                    disabled={responsableAEditar.esPrincipal && principalesCount <= 1}
                    className="mt-0.5 w-4 h-4 rounded text-clinic-primary focus:ring-clinic-primary"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Responsable principal
                    </span>
                    {responsableAEditar.esPrincipal && principalesCount <= 1 ? (
                      <span className="text-[11px] text-amber-700 font-medium block">
                        Protección: No puede desmarcarse al único responsable principal del menor.
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 block">
                        Designado como contacto principal de referencia.
                      </span>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-200 pt-2.5">
                  <input
                    type="checkbox"
                    checked={autorizaAtencion}
                    onChange={(e) => setAutorizaAtencion(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-clinic-primary focus:ring-clinic-primary"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Puede autorizar consultas y vacunas
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Facultad independiente para consentir actos médicos.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalEditarAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={guardando}
                  className="bg-clinic-primary text-white"
                >
                  Actualizar Responsable
                </Button>
              </div>
            </form>
      </Modal>
      )}
    </div>
  );
};

export default PediatricGuardiansView;
