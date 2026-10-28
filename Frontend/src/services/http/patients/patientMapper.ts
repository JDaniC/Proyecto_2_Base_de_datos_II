import { fromCanonicalInstitutionId } from '../../../app/productScope';
import { toClinicDateTimeInput } from '../../dates';
import type { ActualizarPacienteDTO, CrearPacienteDTO, Paciente, EventoHistorial } from '../../types';
import { HttpError } from '../errors';
import type { AltaPacienteHttp, ContactoDto, EventoDto, IdentificacionDto, PacienteDto } from './patientDtos';

function invalido(mensaje: string): never {
  throw new HttpError({ status: 400, codigo: '400 SOLICITUD_INVALIDA', mensaje });
}
function identificacion(tipo: string | undefined, numero: string): IdentificacionDto {
  if (tipo !== 'CUI' && tipo !== 'PASAPORTE') return invalido('Selecciona el tipo de documento CUI o pasaporte.');
  return { tipo, numero: numero.trim() };
}
function contacto(c: NonNullable<CrearPacienteDTO['contactoEmergencia']>): ContactoDto {
  if (!c.nombres?.trim() || !c.apellidos?.trim()) return invalido('Captura nombres y apellidos del contacto por separado.');
  return { nombres: c.nombres.trim(), apellidos: c.apellidos.trim(), parentesco: c.parentesco.trim(), telefono: c.telefono.trim() };
}
export function mapearAlta(dto: CrearPacienteDTO): AltaPacienteHttp {
  return {
    nombres: dto.nombres.trim(), apellidos: dto.apellidos.trim(), fecha_nacimiento: dto.fechaNacimiento, sexo: dto.sexo,
    ...(dto.numeroIdentificacion.trim() ? { identificacion: identificacion(dto.tipoIdentificacion, dto.numeroIdentificacion) } : {}),
    ...(dto.telefono.trim() ? { telefono: dto.telefono.trim() } : {}),
    ...(dto.correo.trim() ? { correo: dto.correo.trim() } : {}),
    ...(dto.direccion.trim() ? { direccion: dto.direccion.trim() } : {}),
    ...(dto.grupoSanguineo?.trim() ? { grupo_sanguineo: dto.grupoSanguineo.trim() } : {}),
    ...(dto.contactoEmergencia ? { contacto_emergencia: contacto(dto.contactoEmergencia) } : {}),
    ...(dto.responsables ? { responsables: dto.responsables.map((r) => {
      if (!r.nombres?.trim() || !r.apellidos?.trim() || !r.documento?.trim()) return invalido('Captura nombres, apellidos y documento del responsable.');
      return { nombres: r.nombres.trim(), apellidos: r.apellidos.trim(), documento: identificacion(r.tipoDocumento || 'CUI', r.documento), telefono: r.telefono.trim(), parentesco: r.parentesco, es_principal: r.esPrincipal, autoriza_atencion: r.autorizaAtencion };
    }) } : {}),
  };
}
/** Solo los campos editados; vacío explícito retira opcionales, omisión conserva. */
export function mapearCambio(dto: ActualizarPacienteDTO): Record<string, unknown> {
  if (!Number.isInteger(dto.versionEsperada) || !dto.versionEsperada || dto.versionEsperada < 1) return invalido('Recarga el perfil para obtener su versión antes de editar.');
  if (dto.responsables !== undefined) return invalido('Los vínculos de responsables se conservan al editar el perfil.');
  const body: Record<string, unknown> = { version_esperada: dto.versionEsperada };
  for (const [ui, api] of [['nombres', 'nombres'], ['apellidos', 'apellidos'], ['fechaNacimiento', 'fecha_nacimiento'], ['sexo', 'sexo']] as const) {
    if (dto[ui] !== undefined) body[api] = dto[ui];
  }
  for (const [ui, api] of [['telefono', 'telefono'], ['correo', 'correo'], ['direccion', 'direccion'], ['grupoSanguineo', 'grupo_sanguineo']] as const) {
    if (dto[ui] !== undefined) body[api] = dto[ui]?.trim() || null;
  }
  if (dto.numeroIdentificacion !== undefined) body.identificacion = dto.numeroIdentificacion.trim() ? identificacion(dto.tipoIdentificacion, dto.numeroIdentificacion) : null;
  if (dto.contactoEmergencia !== undefined) body.contacto_emergencia = dto.contactoEmergencia.nombre.trim() ? contacto(dto.contactoEmergencia) : null;
  if (Object.keys(body).length === 1) return invalido('No hay cambios para guardar.');
  return body;
}
export function mapearPaciente(dto: PacienteDto, hoy = toClinicDateTimeInput().slice(0, 10)): Paciente {
  if (!dto || typeof dto !== 'object' || typeof dto.id !== 'string' || typeof dto.codigo_legible !== 'string' ||
      typeof dto.nombres !== 'string' || typeof dto.apellidos !== 'string' ||
      !Number.isInteger(dto.version) || dto.version < 1 ||
      (dto.fecha_nacimiento !== null && typeof dto.fecha_nacimiento !== 'string') ||
      (dto.sexo !== null && typeof dto.sexo !== 'string') ||
      !['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'LABORATORIO_CLINICO', 'CENTRO_MEDICO_PEDIATRICO'].includes(dto.institucion) ||
      !['ACTIVO', 'ARCHIVADO'].includes(dto.estado) || typeof dto.fecha_registro !== 'string') {
    throw new HttpError({ status: 503, codigo: '503 PERSISTENCIA_NO_DISPONIBLE', mensaje: 'No se pudo confirmar la respuesta del servidor. Reintenta la misma solicitud.' });
  }
  let edadAnios: number | null = null;
  if (dto.fecha_nacimiento) {
    const [anio, mes, dia] = dto.fecha_nacimiento.split('-').map(Number);
    const [a, m, d] = hoy.split('-').map(Number);
    edadAnios = a - anio - (m < mes || (m === mes && d < dia) ? 1 : 0);
  }
  const sexo = dto.sexo === 'MASCULINO' || dto.sexo === 'FEMENINO' || dto.sexo === 'OTRO' ? dto.sexo : '';
  return {
    id: dto.id, codigoLegible: dto.codigo_legible, institucionId: fromCanonicalInstitutionId(dto.institucion),
    nombres: dto.nombres, apellidos: dto.apellidos, nombreCompleto: `${dto.nombres} ${dto.apellidos}`,
    fechaNacimiento: dto.fecha_nacimiento ?? '', edadAnios, sexo, ...(sexo === '' && dto.sexo ? { sexoLegado: dto.sexo } : {}),
    tipoIdentificacion: !dto.identificacion ? 'SIN_DOCUMENTO' : dto.identificacion.tipo === 'CUI' || dto.identificacion.tipo === 'PASAPORTE' ? dto.identificacion.tipo : 'LEGADO',
    ...(dto.identificacion && dto.identificacion.tipo !== 'CUI' && dto.identificacion.tipo !== 'PASAPORTE' ? { tipoIdentificacionLegado: dto.identificacion.tipo } : {}),
    numeroIdentificacion: dto.identificacion?.numero ?? '',
    telefono: dto.telefono ?? '', correo: dto.correo ?? '', direccion: dto.direccion ?? '',
    grupoSanguineo: dto.grupo_sanguineo,
    contactoEmergencia: dto.contacto_emergencia ? { ...dto.contacto_emergencia, nombre: `${dto.contacto_emergencia.nombres} ${dto.contacto_emergencia.apellidos}` } : undefined,
    responsables: dto.responsables?.map(({ responsable: r, vinculo: v, version_vinculo }) => ({
      id: r.id, nombre: r.nombre, nombres: r.nombres, apellidos: r.apellidos, telefono: r.telefono, documento: r.documento?.numero,
      tipoDocumento: r.documento?.tipo, version: r.version, versionVinculo: version_vinculo,
      parentesco: v.parentesco, esPrincipal: v.es_principal, autorizaAtencion: v.autoriza_atencion,
    })),
    estado: dto.estado, version: dto.version, fechaRegistro: dto.fecha_registro,
    estadoAlergias: 'SIN_VERIFICAR', historialConsultasCount: 0,
    causaArchivo: dto.baja?.causa, motivoArchivo: dto.baja?.motivo,
  };
}
export function mapearEvento(dto: EventoDto): EventoHistorial {
  return { id: dto.id, fechaHora: dto.fecha_hora, tipoEvento: dto.tipo, titulo: dto.titulo, descripcion: '',
    profesional: dto.profesional?.nombre ?? '', rolProfesional: dto.profesional?.rol ?? '',
    recursoId: dto.recurso_id, consultaId: dto.consulta_id, versionConsulta: dto.version_consulta };
}
