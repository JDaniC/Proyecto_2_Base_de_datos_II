import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { intervaloCita, type Cita } from '../../../dominio/clinica/cita.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import { validarPermiso, validarOperacionHistorial } from '../../../dominio/clinica/politicas-institucionales.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import { contextoVigente, exigirClinica, exigirVersion, siguienteVersion,
  type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';

export type AccionCita = 'crear' | 'reprogramar' | 'cancelar';
export function exigirAgenda(institucion: string): void {
  if (institucion === 'LABORATORIO_CLINICO') throw new ErrorDominio('SIN_PERMISO', 'La institución no tiene agenda pública.');
}
export class GestionarCitas {
  constructor(private readonly deps: DependenciasClinicas) {}
  async ejecutar(accion: AccionCita, p: ParametrosClinicos) {
    exigirAgenda(p.contexto.cuenta.institucion);
    if (p.bundle.institucion !== p.contexto.cuenta.institucion) throw new ErrorDominio('SIN_PERMISO', 'Ámbito incompatible.');
    validarPermiso(p.contexto.cuenta, 'citas.administrar');
    const campos = accion === 'crear' ? ['paciente_id', 'version_paciente', 'profesional_id', 'fecha', 'hora_inicio', 'duracion_minutos', 'motivo', 'consultorio'] :
      accion === 'reprogramar' ? ['version_esperada', 'fecha', 'hora_inicio', 'duracion_minutos', 'motivo'] : ['version_esperada', 'motivo'];
    const e = objetoCerrado(p.entrada, campos);
    const id = accion === 'crear' ? undefined : uuidPublico(p.id);
    const pacienteId = accion === 'crear' ? uuidPublico(e.paciente_id) : undefined;
    const profesionalId = accion === 'crear' ? uuidPublico(e.profesional_id) : undefined;
    versionPositiva(accion === 'crear' ? e.version_paciente : e.version_esperada);
    const motivo = textoClinico(e.motivo, 'motivo', 1000);
    const consultorio = e.consultorio === undefined ? undefined : textoClinico(e.consultorio, 'consultorio', 100);
    const comando = await prepararComandoEstable(p.claveIdempotencia, `cita.${accion}`, { ...(id ? { id } : {}), entrada: e }, ['cita', 'revision', 'auditoria'], this.deps);
    if (!p.bundle.uow) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Unidad de trabajo no disponible.');
    return p.bundle.uow.ejecutar<Cita>(p.contexto, comando, async lector => {
      const contexto = await contextoVigente(lector, p.contexto);
      validarPermiso(contexto.cuenta, 'citas.administrar');
      const clinica = exigirClinica(lector);
      const previa = await lector.operaciones.porClave<Cita>(contexto.cuenta.id, comando.caso, comando.claveIdempotencia);
      if (previa) {
        if (previa.hashEntrada !== comando.hashEntrada) throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave ya se usó con otra intención.');
        return { tipo: 'REPETIR', operacion: previa };
      }
      const anterior = id ? await clinica.citas.porId(id) : null;
      if (id && !anterior) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cita no encontrada.');
      if (anterior) {
        exigirVersion(anterior.version, e.version_esperada);
        if (anterior.estado !== 'PROGRAMADA' || await clinica.consultas.porCita(anterior.id)) throw new ErrorDominio('ESTADO_INVALIDO', 'La cita ya no puede modificarse.');
      }
      const paciente = await clinica.pacientes.porId(pacienteId ?? anterior!.paciente_id);
      if (!paciente || paciente.institucion !== p.bundle.institucion) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
      if (accion !== 'cancelar') validarOperacionHistorial(paciente.estado, 'NUEVA_ATENCION');
      if (accion === 'crear') exigirVersion(paciente.version, e.version_paciente);
      const profesionalAsignadoId = profesionalId ?? anterior!.profesional_id;
      if (accion !== 'cancelar') {
        const profesional = await clinica.profesionales.porId(profesionalAsignadoId);
        if (!profesional || !profesional.activo) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Profesional no disponible.');
        const rol = { HOSPITAL_GENERAL: 'MEDICO', CLINICA_ODONTOLOGICA: 'ODONTOLOGO', CENTRO_MEDICO_PEDIATRICO: 'PEDIATRA', LABORATORIO_CLINICO: '' }[p.bundle.institucion];
        if (profesional.rol !== rol) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Profesional incompatible.');
      }
      const duracion = e.duracion_minutos ?? anterior?.duracion_minutos;
      if (accion === 'reprogramar' && duracion == null) throw new ErrorDominio('ESTADO_INVALIDO', 'Capturar duración de la cita legada.');
      const intervalo = accion === 'cancelar' ? {} : intervaloCita(e.fecha, e.hora_inicio, duracion);
      if (accion !== 'cancelar') {
        const horario = intervalo as ReturnType<typeof intervaloCita>;
        const solapadas = await clinica.citas.solapamientos(profesionalAsignadoId, horario.fecha, horario.hora_inicio, horario.hora_fin);
        if (solapadas.some(c => c.id !== anterior?.id && c.estado !== 'CANCELADA')) throw new ErrorDominio('CITA_SOLAPADA', 'El intervalo no está disponible.');
      }
      const cita: Cita = { ...(anterior ?? { id: comando.ids.cita!, paciente_id: paciente.id, profesional_id: profesionalAsignadoId,
        fecha: '', hora_inicio: '', hora_fin: null, duracion_minutos: null, motivo, fecha_creacion: comando.instante,
        ...(consultorio ? { consultorio } : {}) }), ...intervalo,
        version: anterior ? siguienteVersion(anterior.version) : versionPositiva(1),
        estado: accion === 'cancelar' ? 'CANCELADA' : 'PROGRAMADA', ...(accion === 'cancelar' ? { motivo_cancelacion: motivo } : {}) };
      return { tipo: 'CONFIRMAR', cambios: [
        { agregado: 'citas', tipo: 'GUARDAR', recursoId: cita.id, versionAnterior: anterior?.version ?? null, nuevoEstado: cita },
        { agregado: 'pacientes', tipo: 'AVANZAR_REVISION', recursoId: paciente.id, versionAnterior: paciente.version,
          nuevoEstado: { ...paciente, version: siguienteVersion(paciente.version) } },
      ], revisiones: anterior ? [{ id: comando.ids.revision!, agregado: 'citas', recursoId: cita.id,
        versionAnterior: anterior.version, snapshotAnterior: { anterior, actual: cita, motivo_cambio: motivo, actor_id: contexto.cuenta.id, fecha_hora: comando.instante } }] : [],
      auditoria: [{ id: comando.ids.auditoria!, actorId: contexto.cuenta.id, caso: comando.caso, recursoId: cita.id,
        fechaHora: comando.instante, correlacion: contexto.correlacion }],
      resultado: { httpStatus: accion === 'crear' ? 201 : 200, respuesta: cita, correlacionOriginal: contexto.correlacion } };
    });
  }
}
