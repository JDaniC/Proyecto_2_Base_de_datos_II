import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import { versionPositiva, type Version } from '../../../dominio/compartido/version.js';
import { objetoCerrado, textoClinico, listaClinica, validarDiagnostico, validarTratamiento,
  validarPrincipal, validarReceta, validarSignos, validarTamanoClinico,
  type Consulta, type ProfesionalHistorico, type RecetaEntrada, type RecetaEmitida } from '../../../dominio/clinica/consulta.js';
import { validarPermiso, validarPrescriptorClinico, exigirCitaOdontologica,
  validarAutorizacionPediatrica, validarOperacionHistorial } from '../../../dominio/clinica/politicas-institucionales.js';
import type { Permiso } from '../../../dominio/compartido/autorizacion.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import { crearContextoAutenticado, type ContextoAutenticado, type CuentaAutorizada } from '../../puertos/contexto-autenticado.js';
import type { CambioPlanificado, GeneradorIds, HashIntencion, LectorTransaccional, Reloj, ResultadoDurable } from '../../puertos/nucleo.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';

export type AccionConsulta = 'abrir' | 'completa' | 'diagnostico' | 'tratamiento' | 'receta' | 'finalizar';
export interface DependenciasClinicas { readonly reloj: Reloj; readonly ids: GeneradorIds; readonly hash: HashIntencion; }
export interface ParametrosClinicos {
  readonly contexto: ContextoAutenticado; readonly bundle: BundleInstitucional;
  readonly claveIdempotencia: UUID; readonly entrada: unknown; readonly id?: UUID;
}
export function exigirClinica(bundle: Pick<BundleInstitucional, 'clinica'>) {
  if (!bundle.clinica) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La persistencia clínica no está habilitada.');
  return bundle.clinica;
}
export function siguienteVersion(v: Version): Version {
  if (v === Number.MAX_SAFE_INTEGER) throw new ErrorDominio('ESTADO_INVALIDO', 'La versión alcanzó el límite seguro.');
  return versionPositiva(v + 1);
}
export function exigirVersion(actual: Version, enviada: unknown): void {
  if (versionPositiva(enviada) !== actual) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión no coincide.');
}
export async function contextoVigente(lector: LectorTransaccional, contexto: ContextoAutenticado): Promise<ContextoAutenticado> {
  const cuenta = await lector.cuentas.porUid(contexto.identidad.uid) as CuentaAutorizada | null;
  if (!cuenta) throw new ErrorDominio('CUENTA_NO_HABILITADA', 'La cuenta no está habilitada.');
  if (cuenta.id !== contexto.cuenta.id) throw new ErrorDominio('SIN_PERMISO', 'La cuenta cambió.');
  return crearContextoAutenticado(contexto.identidad, cuenta, contexto.correlacion);
}
const permisos: Record<AccionConsulta, readonly Permiso[]> = {
  abrir: ['consultas.registrar'], completa: ['consultas.registrar', 'diagnosticos.registrar', 'tratamientos.registrar'],
  diagnostico: ['diagnosticos.registrar'], tratamiento: ['tratamientos.registrar'], receta: ['recetas.emitir'], finalizar: ['consultas.registrar'],
};
const camposApertura = ['paciente_id', 'version_paciente', 'cita_id', 'version_cita', 'responsable_id', 'version_vinculo', 'motivo', 'sintomas', 'signos_vitales'];
const camposAccion: Record<AccionConsulta, readonly string[]> = {
  abrir: camposApertura,
  completa: [...camposApertura, 'observaciones', 'diagnosticos', 'tratamientos', 'receta'],
  diagnostico: ['version_esperada', 'diagnostico'], tratamiento: ['version_esperada', 'tratamiento'],
  receta: ['version_esperada', 'receta'], finalizar: ['version_esperada'],
};

/** Resumen de presentación; el contenido clínico completo permanece en su snapshot. */
function tituloHistorial(texto: string): string {
  if (texto.length <= 200) return texto;
  let resumen = '';
  for (const caracter of texto) {
    if (resumen.length + caracter.length > 199) break;
    resumen += caracter;
  }
  return `${resumen}…`;
}

/** Un solo plan/UoW para apertura, atención compuesta o incorporación de un componente. */
export class AtencionClinica {
  constructor(private readonly deps: DependenciasClinicas) {}

  async ejecutar(accion: AccionConsulta, p: ParametrosClinicos): Promise<ResultadoDurable<Consulta>> {
    if (p.contexto.cuenta.institucion !== p.bundle.institucion) throw new ErrorDominio('SIN_PERMISO', 'Ámbito incompatible.');
    const entrada = objetoCerrado(p.entrada, camposAccion[accion]);
    const nueva = accion === 'abrir' || accion === 'completa';
    const institucion = p.bundle.institucion;
    permisos[accion].forEach(permiso => validarPermiso(p.contexto.cuenta, permiso));
    const id = nueva ? undefined : uuidPublico(p.id, 'id');
    const pacienteId = nueva ? uuidPublico(entrada.paciente_id, 'paciente_id') : undefined;
    if (nueva) versionPositiva(entrada.version_paciente, 'version_paciente');
    else versionPositiva(entrada.version_esperada, 'version_esperada');
    const citaId = entrada.cita_id === undefined ? undefined : uuidPublico(entrada.cita_id, 'cita_id');
    const responsableId = entrada.responsable_id === undefined ? undefined : uuidPublico(entrada.responsable_id, 'responsable_id');
    if (nueva) {
      for (const [ref, version] of [[entrada.cita_id, entrada.version_cita], [entrada.responsable_id, entrada.version_vinculo]]) {
        if ((ref === undefined) !== (version === undefined)) throw solicitudInvalida('La referencia y su versión deben enviarse juntas.');
        if (version !== undefined) versionPositiva(version);
      }
      exigirCitaOdontologica(institucion, citaId);
      if (institucion === 'LABORATORIO_CLINICO' && citaId) throw new ErrorDominio('SIN_PERMISO', 'Laboratorio no admite cita en la atención.');
      if (institucion !== 'CENTRO_MEDICO_PEDIATRICO' && responsableId) throw solicitudInvalida('Responsable solo aplica a pediatría.');
      if (institucion === 'CENTRO_MEDICO_PEDIATRICO' && !responsableId) throw solicitudInvalida('Se requiere responsable autorizante.');
    }
    const motivo = nueva ? textoClinico(entrada.motivo, 'motivo', 2000) : undefined;
    const sintomas = nueva ? textoClinico(entrada.sintomas, 'sintomas', 4000, true) : undefined;
    const signos = nueva ? validarSignos(entrada.signos_vitales, institucion) : undefined;
    const observaciones = entrada.observaciones === undefined ? undefined : textoClinico(entrada.observaciones, 'observaciones', 4000, true);
    const diagnosticos = accion === 'completa' ? listaClinica(entrada.diagnosticos, 'diagnosticos').map(d => validarDiagnostico(d, institucion)) :
      accion === 'diagnostico' ? [validarDiagnostico(entrada.diagnostico, institucion)] : [];
    const tratamientos = accion === 'completa' ? listaClinica(entrada.tratamientos, 'tratamientos').map(t => validarTratamiento(t, institucion)) :
      accion === 'tratamiento' ? [validarTratamiento(entrada.tratamiento, institucion)] : [];
    if (accion === 'completa') validarPrincipal(diagnosticos);
    const receta = entrada.receta === undefined ? undefined : validarReceta(entrada.receta);
    if (accion === 'receta' && !receta) throw solicitudInvalida('La receta es obligatoria.');
    if (receta) validarPermiso(p.contexto.cuenta, 'recetas.emitir');
    validarTamanoClinico(entrada);
    const nombres = ['consulta', 'auditoria', 'revision', 'evento_consulta', 'receta', 'evento_receta'];
    diagnosticos.forEach((_, i) => nombres.push(`diagnostico_${i}`, `evento_diagnostico_${i}`));
    tratamientos.forEach((_, i) => nombres.push(`tratamiento_${i}`, `evento_tratamiento_${i}`));
    receta?.medicamentos.forEach((_, i) => nombres.push(`medicamento_${i}`));
    const comando = await prepararComandoEstable(p.claveIdempotencia, `consulta.${accion}`,
      { ...(id ? { id } : {}), entrada }, nombres, this.deps);
    if (!p.bundle.uow) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La unidad de trabajo no está habilitada.');

    return p.bundle.uow.ejecutar(p.contexto, comando, async lector => {
      const contexto = await contextoVigente(lector, p.contexto);
      permisos[accion].forEach(permiso => validarPermiso(contexto.cuenta, permiso));
      if (receta) validarPermiso(contexto.cuenta, 'recetas.emitir');
      const clinica = exigirClinica(lector);
      const profesionalId = contexto.cuenta.profesional?.id;
      const profesional = profesionalId ? await clinica.profesionales.porId(profesionalId) : null;
      if (!profesional) throw new ErrorDominio('SIN_PERMISO', 'Se requiere profesional vigente.');
      const rolInstitucional = { HOSPITAL_GENERAL: 'MEDICO', CLINICA_ODONTOLOGICA: 'ODONTOLOGO',
        LABORATORIO_CLINICO: 'MEDICO_LABORATORIO', CENTRO_MEDICO_PEDIATRICO: 'PEDIATRA' }[institucion];
      if (profesional.rol !== rolInstitucional) throw new ErrorDominio('SIN_PERMISO', 'Profesional incompatible con la institución.');
      textoClinico(profesional.nombre, 'profesional.nombre', 200);
      textoClinico(profesional.colegiado, 'profesional.colegiado', 60);
      textoClinico(profesional.entidad_colegiacion, 'profesional.entidad_colegiacion', 200);
      validarPrescriptorClinico({ institucion, roles: contexto.cuenta.roles,
        ...(contexto.cuenta.profesional ? { profesionalVinculado: contexto.cuenta.profesional } : {}) }, profesional);
      if (institucion === 'LABORATORIO_CLINICO' && profesional.tipo !== 'INDIVIDUAL') throw new ErrorDominio('SIN_PERMISO', 'Se requiere médico individual.');
      const historico: ProfesionalHistorico = { id: profesional.id, nombre: profesional.nombre, rol: profesional.rol,
        colegiado: profesional.colegiado, entidad_colegiacion: profesional.entidad_colegiacion };
      const previa = await lector.operaciones.porClave<Consulta>(contexto.cuenta.id, comando.caso, comando.claveIdempotencia);
      if (previa) {
        if (previa.hashEntrada !== comando.hashEntrada) throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave ya se usó con otra intención.');
        return { tipo: 'REPETIR', operacion: previa };
      }
      const anterior = id ? await clinica.consultas.porId(id) : null;
      if (!nueva && !anterior) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Consulta no encontrada.');
      if (anterior) {
        if (anterior.profesional.id !== profesional.id) throw new ErrorDominio('SIN_PERMISO', 'La consulta corresponde a otro profesional.');
        exigirVersion(anterior.version, entrada.version_esperada);
        if (anterior.estado !== 'ABIERTA') throw new ErrorDominio('ESTADO_INVALIDO', 'La consulta debe estar abierta.');
      }
      const paciente = await clinica.pacientes.porId(pacienteId ?? anterior!.paciente_id);
      if (!paciente || paciente.institucion !== institucion) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
      if (nueva) {
        exigirVersion(paciente.version, entrada.version_paciente);
        validarOperacionHistorial(paciente.estado, 'NUEVA_ATENCION');
      }
      const cambios: CambioPlanificado[] = [];
      const citaConsulta = citaId ?? anterior?.cita_id;
      if (citaConsulta) {
        const cita = await clinica.citas.porId(citaConsulta);
        if (!cita || cita.paciente_id !== paciente.id) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cita no encontrada.');
        if (cita.profesional_id !== profesional.id || (nueva ? cita.estado !== 'PROGRAMADA' : cita.estado !== 'EN_CURSO')) {
          throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La cita no es elegible para esta atención.');
        }
        if (nueva) {
          exigirVersion(cita.version, entrada.version_cita);
          if (await clinica.consultas.porCita(cita.id)) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La cita ya tiene una consulta.');
        }
        if (nueva || accion === 'finalizar') cambios.push({ agregado: 'citas', tipo: 'GUARDAR', recursoId: cita.id,
          versionAnterior: cita.version, nuevoEstado: { ...cita, estado: accion === 'abrir' ? 'EN_CURSO' : 'ATENDIDA', version: siguienteVersion(cita.version) } });
      }
      let autorizacion: Consulta['autorizacion'];
      if (nueva && responsableId) {
        const vinculo = await clinica.responsables.autorizacion(paciente.id, responsableId);
        validarAutorizacionPediatrica(institucion, vinculo);
        if (!vinculo) throw new ErrorDominio('SIN_PERMISO', 'Autorización no disponible.');
        exigirVersion(vinculo.version, entrada.version_vinculo);
        autorizacion = { responsable_id: responsableId, version_vinculo: vinculo.version, autorizaba: true,
          identificacion_historica: { ...vinculo.documento }, nombre_historico: vinculo.nombre, fecha_hora: comando.instante };
      }
      const consultaId = anterior?.id ?? comando.ids.consulta!;
      const nuevosDiagnosticos = diagnosticos.map((d, i) => ({ ...d, id: comando.ids[`diagnostico_${i}`]!, fecha_registro: comando.instante, registrado_por: historico }));
      const nuevosTratamientos = tratamientos.map((t, i) => ({ ...t, id: comando.ids[`tratamiento_${i}`]!, fecha_registro: comando.instante, registrado_por: historico }));
      if (receta && anterior?.receta) throw new ErrorDominio('RECETA_EXISTENTE', 'La consulta ya tiene una receta ordinaria.');
      const emitir = (r: RecetaEntrada): RecetaEmitida => ({ ...r, id: comando.ids.receta!, codigo_legible: `REC-${comando.ids.receta!}`,
        version: versionPositiva(1), estado: 'EMITIDA', fecha_emision: comando.instante, prescriptor: historico,
        medicamentos: r.medicamentos.map((m, i) => ({ ...m, id: comando.ids[`medicamento_${i}`]! })) });
      const consulta: Consulta = { ...(anterior ?? { id: consultaId, paciente_id: paciente.id, fecha_hora: comando.instante,
        profesional: historico, motivo: motivo!, sintomas: sintomas!, signos_vitales: signos!,
        ...(citaId ? { cita_id: citaId } : {}), ...(observaciones === undefined ? {} : { observaciones }),
        ...(autorizacion ? { autorizacion, responsable_id: responsableId! } : {}) }),
        estado: accion === 'completa' || accion === 'finalizar' ? 'FINALIZADA' : 'ABIERTA',
        version: anterior ? siguienteVersion(anterior.version) : versionPositiva(1),
        diagnosticos: [...(anterior?.diagnosticos ?? []), ...nuevosDiagnosticos],
        tratamientos: [...(anterior?.tratamientos ?? []), ...nuevosTratamientos],
        ...(receta ? { receta: emitir(receta) } : {}) };
      validarPrincipal(consulta.diagnosticos);
      listaClinica(consulta.diagnosticos, 'diagnosticos'); listaClinica(consulta.tratamientos, 'tratamientos');
      if (institucion === 'CLINICA_ODONTOLOGICA') {
        const nombres = consulta.tratamientos.map(t => t.descripcion.trim().toLocaleLowerCase());
        if (new Set(nombres).size !== nombres.length) {
          if (nueva) throw solicitudInvalida('Tratamiento dental repetido.');
          throw new ErrorDominio('ESTADO_INVALIDO', 'El tratamiento ya está registrado.');
        }
      }
      validarTamanoClinico(consulta);
      cambios.push({ agregado: 'consultas', tipo: 'GUARDAR', recursoId: consulta.id, versionAnterior: anterior?.version ?? null, nuevoEstado: consulta });
      // Serializa archivo, citas y cambios de autorización sobre la revisión del paciente.
      cambios.push({ agregado: 'pacientes', tipo: 'AVANZAR_REVISION', recursoId: paciente.id,
        versionAnterior: paciente.version, nuevoEstado: { ...paciente, version: siguienteVersion(paciente.version) } });
      const eventos = [
        ...(nueva || accion === 'finalizar' ? [{ id: comando.ids.evento_consulta!, tipo: 'CONSULTA', recursoId: consulta.id, titulo: consulta.motivo }] : []),
        ...nuevosDiagnosticos.map((d, i) => ({ id: comando.ids[`evento_diagnostico_${i}`]!, tipo: 'DIAGNOSTICO', recursoId: d.id, titulo: d.nombre })),
        ...nuevosTratamientos.map((t, i) => ({ id: comando.ids[`evento_tratamiento_${i}`]!, tipo: 'TRATAMIENTO', recursoId: t.id, titulo: t.descripcion })),
        ...(receta ? [{ id: comando.ids.evento_receta!, tipo: 'RECETA', recursoId: consulta.receta!.id, titulo: 'Receta emitida' }] : []),
      ];
      cambios.push(...eventos.map(e => ({ agregado: 'eventosHistorial', tipo: 'CREAR', recursoId: e.id, versionAnterior: null,
        nuevoEstado: { ...e, titulo: tituloHistorial(e.titulo), pacienteId: paciente.id, consultaId: consulta.id, versionConsulta: consulta.version, fechaHora: comando.instante } })));
      return { tipo: 'CONFIRMAR', cambios,
        revisiones: anterior ? [{ id: comando.ids.revision!, agregado: 'consultas', recursoId: consulta.id,
          versionAnterior: anterior.version, snapshotAnterior: anterior }] : [],
        auditoria: [{ id: comando.ids.auditoria!, actorId: contexto.cuenta.id, caso: comando.caso, recursoId: consulta.id,
          fechaHora: comando.instante, correlacion: contexto.correlacion }],
        resultado: { httpStatus: nueva ? 201 : 200, respuesta: consulta, correlacionOriginal: contexto.correlacion } };
    });
  }
}
