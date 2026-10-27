import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { institucionAdmiteCapacidad } from '../../../dominio/compartido/autorizacion.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import { versionPositiva, type Version } from '../../../dominio/compartido/version.js';
import {
  validarTextoNoVacio,
  validarSexo,
  validarFechaNacimiento,
  validarIdentificacion,
  validarGrupoSanguineo,
  validarContactoEmergencia,
  type Paciente,
  type Identificacion,
  type ContactoEmergencia,
} from '../../../dominio/clinica/paciente.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { CambioPlanificado, GeneradorIds, HashIntencion, Reloj, ResultadoDurable } from '../../puertos/nucleo.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import {
  type CambioPacienteEntrada,
  type PacienteDto,
  mapearPacienteDto,
} from './dtos-pacientes.js';

export interface DependenciasActualizarPaciente {
  readonly reloj: Reloj;
  readonly ids: GeneradorIds;
  readonly hash: HashIntencion;
}

export class ActualizarPaciente {
  constructor(private readonly dependencias: DependenciasActualizarPaciente) {}

  async ejecutar(parametros: {
    readonly contexto: ContextoAutenticado;
    readonly bundle: BundleInstitucional;
    readonly id: UUID;
    readonly claveIdempotencia: UUID;
    readonly cambios: CambioPacienteEntrada;
  }): Promise<ResultadoDurable<PacienteDto>> {
    const { contexto, bundle, cambios } = parametros;
    const pacienteId = uuidPublico(parametros.id, 'id');
    const claveIdempotencia = uuidPublico(parametros.claveIdempotencia, 'Idempotency-Key');

    validarPermiso(contexto.cuenta, 'pacientes.administrar');
    if (!institucionAdmiteCapacidad(contexto.cuenta.institucion, 'PACIENTES')) {
      throw new ErrorDominio('SIN_PERMISO', 'La institución no admite gestión de pacientes.');
    }

    if (typeof cambios !== 'object' || cambios === null) {
      throw solicitudInvalida('El cuerpo de actualización es requerido.');
    }

    const versionEsperada = versionPositiva(cambios.version_esperada, 'version_esperada');

    if (cambios.nombres === null) throw solicitudInvalida('El nombre no admite null.', 'nombres');
    if (cambios.apellidos === null) throw solicitudInvalida('Los apellidos no admiten null.', 'apellidos');
    if (cambios.fecha_nacimiento === null) throw solicitudInvalida('La fecha de nacimiento no admite null.', 'fecha_nacimiento');
    if (cambios.sexo === null) throw solicitudInvalida('El sexo no admite null.', 'sexo');

    const nombres = cambios.nombres !== undefined ? validarTextoNoVacio(cambios.nombres, 'nombres', 80) : undefined;
    const apellidos = cambios.apellidos !== undefined ? validarTextoNoVacio(cambios.apellidos, 'apellidos', 80) : undefined;
    const sexo = cambios.sexo !== undefined ? validarSexo(cambios.sexo, 'sexo') : undefined;

    const ahoraUtc = instanteUtc(this.dependencias.reloj.ahora());
    const fechaLimiteCivil = ahoraUtc.slice(0, 10);
    const fechaNacimiento = cambios.fecha_nacimiento !== undefined
      ? validarFechaNacimiento(cambios.fecha_nacimiento, fechaLimiteCivil, 'fecha_nacimiento')
      : undefined;

    let nuevaIdentificacion: Identificacion | null | undefined = undefined;
    if (cambios.identificacion === null) {
      nuevaIdentificacion = null;
    } else if (cambios.identificacion !== undefined) {
      nuevaIdentificacion = validarIdentificacion(cambios.identificacion, 'identificacion');
    }

    if (contexto.cuenta.institucion !== 'HOSPITAL_GENERAL') {
      if (cambios.grupo_sanguineo !== undefined) {
        throw solicitudInvalida('El campo grupo_sanguineo solo aplica a HOSPITAL_GENERAL.', 'grupo_sanguineo');
      }
      if (cambios.contacto_emergencia !== undefined) {
        throw solicitudInvalida('El campo contacto_emergencia solo aplica a HOSPITAL_GENERAL.', 'contacto_emergencia');
      }
    }

    let grupoSanguineo: string | null | undefined = undefined;
    if (cambios.grupo_sanguineo === null) {
      grupoSanguineo = null;
    } else if (cambios.grupo_sanguineo !== undefined) {
      grupoSanguineo = validarGrupoSanguineo(contexto.cuenta.institucion, cambios.grupo_sanguineo, 'grupo_sanguineo');
    }

    let contactoEmergencia: ContactoEmergencia | null | undefined = undefined;
    if (cambios.contacto_emergencia === null) {
      contactoEmergencia = null;
    } else if (cambios.contacto_emergencia !== undefined) {
      contactoEmergencia = validarContactoEmergencia(contexto.cuenta.institucion, cambios.contacto_emergencia, 'contacto_emergencia');
    }

    let nuevoTelefono: string | null | undefined = undefined;
    if (cambios.telefono === null) {
      nuevoTelefono = null;
    } else if (cambios.telefono !== undefined) {
      if (typeof cambios.telefono !== 'string' || cambios.telefono.trim().length === 0) {
        throw solicitudInvalida('El teléfono no puede estar vacío ni contener solo espacios.', 'telefono');
      }
      if (cambios.telefono.trim().length > 30) {
        throw solicitudInvalida('El teléfono excede 30 caracteres.', 'telefono');
      }
      nuevoTelefono = cambios.telefono.trim();
    }

    let nuevaDireccion: string | null | undefined = undefined;
    if (cambios.direccion === null) {
      nuevaDireccion = null;
    } else if (cambios.direccion !== undefined) {
      if (typeof cambios.direccion !== 'string' || cambios.direccion.trim().length === 0) {
        throw solicitudInvalida('La dirección no puede estar vacía ni contener solo espacios.', 'direccion');
      }
      if (cambios.direccion.trim().length > 500) {
        throw solicitudInvalida('La dirección excede 500 caracteres.', 'direccion');
      }
      nuevaDireccion = cambios.direccion.trim();
    }

    let nuevoCorreo: string | null | undefined = undefined;
    if (cambios.correo === null) {
      nuevoCorreo = null;
    } else if (cambios.correo !== undefined) {
      if (typeof cambios.correo !== 'string' || cambios.correo.trim().length === 0) {
        throw solicitudInvalida('El correo no puede estar vacío ni contener solo espacios.', 'correo');
      }
      if (cambios.correo.trim().length > 254) {
        throw solicitudInvalida('El correo excede 254 caracteres.', 'correo');
      }
      nuevoCorreo = cambios.correo.trim().toLowerCase();
    }

    const comando = await prepararComandoEstable(
      claveIdempotencia,
      'paciente.actualizar',
      { id: pacienteId, cambios },
      ['revision_id'],
      this.dependencias,
    );

    if (!bundle.uow) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El bundle no tiene unidad de trabajo configurada.');
    }

    const resultadoDurable = await bundle.uow.ejecutar<PacienteDto>(
      contexto,
      comando,
      async (lector) => {
        const opPrevia = await lector.operaciones.porClave<PacienteDto>(
          contexto.cuenta.id,
          'paciente.actualizar',
          comando.claveIdempotencia,
        );
        if (opPrevia !== null) {
          if (opPrevia.hashEntrada !== comando.hashEntrada) {
            throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave de idempotencia ya se usó con otra solicitud.');
          }
          return { tipo: 'REPETIR', operacion: opPrevia };
        }

        const pacienteActual = await lector.pacientes.porId(pacienteId) as Paciente | null;
        if (!pacienteActual || pacienteActual.institucion !== contexto.cuenta.institucion) {
          throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'No se encontró el paciente.');
        }

        if (pacienteActual.estado === 'ARCHIVADO') {
          throw new ErrorDominio('ESTADO_INVALIDO', 'No se puede modificar la demografía de un paciente archivado.');
        }

        if (pacienteActual.version !== versionEsperada) {
          throw new ErrorDominio(
            'VERSION_DESACTUALIZADA',
            'El paciente fue modificado por otra transacción.',
            ['version_esperada'],
          );
        }

        const cambiosIdentidad: CambioPlanificado[] = [];
        let identFinal = pacienteActual.identificacion;

        if (nuevaIdentificacion === null) {
          if (pacienteActual.identificacion) {
            cambiosIdentidad.push({
              agregado: 'identidades',
              tipo: 'LIBERAR',
              recursoId: pacienteActual.id,
              versionAnterior: null,
              nuevoEstado: { identificacion: pacienteActual.identificacion },
            });
            identFinal = undefined;
          }
        } else if (nuevaIdentificacion !== undefined) {
          const cambioDocumento = !pacienteActual.identificacion ||
            pacienteActual.identificacion.tipo !== nuevaIdentificacion.tipo ||
            pacienteActual.identificacion.numero !== nuevaIdentificacion.numero;

          if (cambioDocumento) {
            const titular = await lector.identidades.titular(nuevaIdentificacion);
            if (titular !== null && titular !== pacienteActual.id) {
              throw new ErrorDominio(
                'PACIENTE_DUPLICADO',
                'La nueva identificación ya está registrada para otro paciente.',
                ['identificacion'],
              );
            }
            if (pacienteActual.identificacion) {
              cambiosIdentidad.push({
                agregado: 'identidades',
                tipo: 'LIBERAR',
                recursoId: pacienteActual.id,
                versionAnterior: null,
                nuevoEstado: { identificacion: pacienteActual.identificacion },
              });
            }
            cambiosIdentidad.push({
              agregado: 'identidades',
              tipo: 'RESERVAR',
              recursoId: pacienteActual.id,
              versionAnterior: null,
              nuevoEstado: { identificacion: nuevaIdentificacion, titularId: pacienteActual.id },
            });
            identFinal = nuevaIdentificacion;
          }
        }

        const telefonoFinal = nuevoTelefono === null
          ? undefined
          : nuevoTelefono !== undefined
            ? nuevoTelefono
            : pacienteActual.telefono;

        const correoFinal = nuevoCorreo === null
          ? undefined
          : nuevoCorreo !== undefined
            ? nuevoCorreo
            : pacienteActual.correo;

        const direccionFinal = nuevaDireccion === null
          ? undefined
          : nuevaDireccion !== undefined
            ? nuevaDireccion
            : pacienteActual.direccion;

        const grupoSanguineoFinal = grupoSanguineo === null
          ? undefined
          : grupoSanguineo !== undefined
            ? grupoSanguineo
            : pacienteActual.grupoSanguineo;

        const contactoEmergenciaFinal = contactoEmergencia === null
          ? undefined
          : contactoEmergencia !== undefined
            ? contactoEmergencia
            : pacienteActual.contactoEmergencia;

        const nuevaVersion = (pacienteActual.version + 1) as Version;

        const pacienteActualizado: Paciente = Object.freeze({
          id: pacienteActual.id,
          codigoLegible: pacienteActual.codigoLegible,
          institucion: pacienteActual.institucion,
          nombres: nombres ?? pacienteActual.nombres,
          apellidos: apellidos ?? pacienteActual.apellidos,
          fechaNacimiento: fechaNacimiento ?? pacienteActual.fechaNacimiento,
          sexo: sexo ?? pacienteActual.sexo,
          estado: pacienteActual.estado,
          version: nuevaVersion,
          fechaRegistro: pacienteActual.fechaRegistro,
          ...(identFinal ? { identificacion: identFinal } : {}),
          ...(telefonoFinal !== undefined ? { telefono: telefonoFinal } : {}),
          ...(correoFinal !== undefined ? { correo: correoFinal } : {}),
          ...(direccionFinal !== undefined ? { direccion: direccionFinal } : {}),
          ...(grupoSanguineoFinal !== undefined ? { grupoSanguineo: grupoSanguineoFinal } : {}),
          ...(contactoEmergenciaFinal ? { contactoEmergencia: contactoEmergenciaFinal } : {}),
          ...(pacienteActual.responsables ? { responsables: pacienteActual.responsables } : {}),
          ...(pacienteActual.baja ? { baja: pacienteActual.baja } : {}),
        });

        const dto = mapearPacienteDto(pacienteActualizado);

        return {
          tipo: 'CONFIRMAR',
          cambios: [
            {
              agregado: 'pacientes',
              tipo: 'ACTUALIZAR',
              recursoId: pacienteActual.id,
              versionAnterior: pacienteActual.version,
              nuevoEstado: pacienteActualizado,
            },
            ...cambiosIdentidad,
          ],
          revisiones: [
            {
              id: comando.ids.revision_id!,
              agregado: 'pacientes',
              recursoId: pacienteActual.id,
              versionAnterior: pacienteActual.version,
              snapshotAnterior: pacienteActual,
            },
          ],
          auditoria: [
            {
              id: this.dependencias.ids.nuevo(),
              actorId: contexto.cuenta.id,
              caso: 'paciente.actualizar',
              recursoId: pacienteActual.id,
              fechaHora: comando.instante,
              correlacion: contexto.correlacion,
            },
          ],
          resultado: {
            httpStatus: 200,
            respuesta: dto,
            correlacionOriginal: contexto.correlacion,
          },
        };
      },
    );

    return resultadoDurable;
  }
}
