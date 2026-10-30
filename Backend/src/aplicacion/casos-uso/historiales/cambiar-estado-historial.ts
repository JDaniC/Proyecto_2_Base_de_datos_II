import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import type { Paciente, CausaArchivoPaciente } from '../../../dominio/clinica/paciente.js';
import { validarArchivoHistorial, validarReactivacionHistorial, validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import { contextoVigente, exigirVersion, siguienteVersion, type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import { mapearPacienteDto, type PacienteDto } from '../pacientes/dtos-pacientes.js';
import type { ResultadoDurable } from '../../puertos/nucleo.js';

export class CambiarEstadoHistorial {
  constructor(private readonly deps: DependenciasClinicas) {}
  async ejecutar(accion: 'archivar' | 'reactivar', p: ParametrosClinicos): Promise<ResultadoDurable<PacienteDto>> {
    if (p.contexto.cuenta.institucion !== p.bundle.institucion) throw new ErrorDominio('SIN_PERMISO', 'Ámbito incompatible.');
    validarPermiso(p.contexto.cuenta, 'historial.archivar');
    if (accion === 'reactivar' && p.bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') throw new ErrorDominio('SIN_PERMISO', 'Reactivación solo disponible en pediatría.');
    const entrada = objetoCerrado(p.entrada, accion === 'archivar' ? ['version_esperada', 'causa', 'motivo'] : ['version_esperada', 'motivo', 'correccion_fallecimiento']);
    versionPositiva(entrada.version_esperada);
    const motivo = textoClinico(entrada.motivo, 'motivo', 1000).trim();
    if (accion === 'archivar' && !['TRASLADO', 'FALLECIMIENTO', 'OTRA_ADMINISTRATIVA'].includes(entrada.causa as string)) throw solicitudInvalida('Causa no admitida.', 'causa');
    if (entrada.correccion_fallecimiento !== undefined && typeof entrada.correccion_fallecimiento !== 'boolean') throw solicitudInvalida('La corrección debe ser booleana.');
    const id = uuidPublico(p.id);
    const comando = await prepararComandoEstable(p.claveIdempotencia, `historial.${accion}`, {id, entrada}, ['revision', 'auditoria', 'evento'], this.deps);
    if (!p.bundle.uow) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Persistencia no disponible.');
    return p.bundle.uow.ejecutar<PacienteDto, unknown, Paciente>(p.contexto, comando, async lector => {
      const contexto = await contextoVigente(lector, p.contexto);
      validarPermiso(contexto.cuenta, 'historial.archivar');
      const previa = await lector.operaciones.porClave<PacienteDto>(contexto.cuenta.id, comando.caso, comando.claveIdempotencia);
      if (previa) {
        if (previa.hashEntrada !== comando.hashEntrada) throw new ErrorDominio('CLAVE_REUTILIZADA', 'Clave utilizada con otra intención.');
        return {tipo: 'REPETIR', operacion: previa};
      }
      const anterior = await lector.pacientes.porId(id) as Paciente | null;
      if (!anterior || anterior.institucion !== p.bundle.institucion) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
      exigirVersion(anterior.version, entrada.version_esperada);
      if (accion === 'archivar') validarArchivoHistorial(anterior.estado, true, entrada.causa as CausaArchivoPaciente, motivo);
      else {
        if (!anterior.baja) throw new ErrorDominio('ESTADO_INVALIDO', 'La baja requiere reconciliación.');
        validarReactivacionHistorial(anterior.estado, anterior.institucion, true, motivo, anterior.baja.causa, entrada.correccion_fallecimiento === true);
      }
      const actual: Paciente = {...anterior, estado: accion === 'archivar' ? 'ARCHIVADO' : 'ACTIVO', version: siguienteVersion(anterior.version),
        ...(accion === 'archivar' ? {baja: {causa: entrada.causa as CausaArchivoPaciente, motivo, fecha: comando.instante, actorId: contexto.cuenta.id}} : {})};
      return {tipo: 'CONFIRMAR', cambios: [{agregado: 'estadoHistorial', tipo: accion, recursoId: id, versionAnterior: anterior.version, nuevoEstado: actual},
          {agregado: 'eventosHistorial', tipo: 'CREAR', recursoId: comando.ids.evento!, versionAnterior: null, nuevoEstado: {
            id: comando.ids.evento!, pacienteId: id, recursoId: id, tipo: accion === 'archivar' ? 'ARCHIVO' : 'REACTIVACION',
            fechaHora: comando.instante, titulo: accion === 'archivar' ? 'Historial archivado' : 'Historial reactivado'}}],
        revisiones: [{id: comando.ids.revision!, motivo, agregado: 'pacientes', recursoId: id, versionAnterior: anterior.version, snapshotAnterior: anterior}],
        auditoria: [{id: comando.ids.auditoria!, actorId: contexto.cuenta.id, caso: comando.caso, recursoId: id, fechaHora: comando.instante, correlacion: contexto.correlacion, motivo}],
        resultado: {httpStatus: 200, respuesta: mapearPacienteDto(actual), correlacionOriginal: contexto.correlacion}};
    });
  }
}
