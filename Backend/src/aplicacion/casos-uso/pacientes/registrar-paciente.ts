import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { normalizarIdentificacion } from '../../../dominio/compartido/normalizacion.js';
import { institucionAdmiteCapacidad } from '../../../dominio/compartido/autorizacion.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import type { Version } from '../../../dominio/compartido/version.js';
import {
  validarTextoNoVacio,
  validarSexo,
  validarFechaNacimiento,
  validarIdentificacion,
  validarGrupoSanguineo,
  validarContactoEmergencia,
  generarCodigoLegible,
  type Paciente,
  type Identificacion,
  type ContactoEmergencia,
  type ResponsablePaciente,
  type ResponsableDetalle,
  type VinculoResponsable,
} from '../../../dominio/clinica/paciente.js';
import {
  validarPermiso,
  validarResponsablePrincipalPediatrico,
} from '../../../dominio/clinica/politicas-institucionales.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { CambioPlanificado, GeneradorIds, HashIntencion, Reloj, ResultadoDurable } from '../../puertos/nucleo.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import {
  type AltaPacienteEntrada,
  type PacienteDto,
  mapearPacienteDto,
} from './dtos-pacientes.js';

export interface DependenciasRegistrarPaciente {
  readonly reloj: Reloj;
  readonly ids: GeneradorIds;
  readonly hash: HashIntencion;
}

export class RegistrarPaciente {
  constructor(private readonly dependencias: DependenciasRegistrarPaciente) {}

  async ejecutar(parametros: {
    readonly contexto: ContextoAutenticado;
    readonly bundle: BundleInstitucional;
    readonly claveIdempotencia: UUID;
    readonly entrada: AltaPacienteEntrada;
  }): Promise<ResultadoDurable<PacienteDto>> {
    const { contexto, bundle, entrada } = parametros;
    const claveIdempotencia = uuidPublico(parametros.claveIdempotencia, 'Idempotency-Key');

    validarPermiso(contexto.cuenta, 'pacientes.administrar');
    if (!institucionAdmiteCapacidad(contexto.cuenta.institucion, 'PACIENTES')) {
      throw new ErrorDominio('SIN_PERMISO', 'La institución no admite gestión de pacientes.');
    }

    if (typeof entrada !== 'object' || entrada === null) {
      throw solicitudInvalida('El cuerpo de alta de paciente es requerido.');
    }

    const nombres = validarTextoNoVacio(entrada.nombres, 'nombres', 80);
    const apellidos = validarTextoNoVacio(entrada.apellidos, 'apellidos', 80);
    const sexo = validarSexo(entrada.sexo, 'sexo');

    const ahoraUtc = instanteUtc(this.dependencias.reloj.ahora());
    const fechaLimiteCivil = ahoraUtc.slice(0, 10);
    const fechaNacimiento = validarFechaNacimiento(entrada.fecha_nacimiento, fechaLimiteCivil, 'fecha_nacimiento');

    let identificacion: Identificacion | undefined;
    if (entrada.identificacion !== undefined && entrada.identificacion !== null) {
      identificacion = validarIdentificacion(entrada.identificacion, 'identificacion');
    }

    let telefono: string | undefined;
    if (entrada.telefono !== undefined) {
      if (typeof entrada.telefono !== 'string' || entrada.telefono.trim().length === 0) {
        throw solicitudInvalida('El teléfono no puede estar vacío ni contener solo espacios.', 'telefono');
      }
      if (entrada.telefono.trim().length > 30) {
        throw solicitudInvalida('El teléfono excede 30 caracteres.', 'telefono');
      }
      telefono = entrada.telefono.trim();
    }

    let correo: string | undefined;
    if (entrada.correo !== undefined) {
      if (typeof entrada.correo !== 'string' || entrada.correo.trim().length === 0) {
        throw solicitudInvalida('El correo no puede estar vacío ni contener solo espacios.', 'correo');
      }
      if (entrada.correo.trim().length > 254) {
        throw solicitudInvalida('El correo excede 254 caracteres.', 'correo');
      }
      correo = entrada.correo.trim().toLowerCase();
    }

    let direccion: string | undefined;
    if (entrada.direccion !== undefined) {
      if (typeof entrada.direccion !== 'string' || entrada.direccion.trim().length === 0) {
        throw solicitudInvalida('La dirección no puede estar vacía ni contener solo espacios.', 'direccion');
      }
      if (entrada.direccion.trim().length > 500) {
        throw solicitudInvalida('La dirección excede 500 caracteres.', 'direccion');
      }
      direccion = entrada.direccion.trim();
    }

    if (contexto.cuenta.institucion === 'CENTRO_MEDICO_PEDIATRICO') {
      if (!entrada.responsables || entrada.responsables.length === 0) {
        throw solicitudInvalida('El alta pediátrica requiere al menos un responsable.', 'responsables');
      }
      if (entrada.responsables.length > 100) {
        throw new ErrorDominio('LIMITE_AGREGADO', 'El número de responsables excede el límite de 100.', ['responsables']);
      }
      validarResponsablePrincipalPediatrico(
        contexto.cuenta.institucion,
        entrada.responsables.map((r) => ({ esPrincipal: r.es_principal })),
      );
      const idsResponsablesExistentes = new Set<string>();
      for (const r of entrada.responsables) {
        if (r.responsable_id !== undefined && r.responsable_id !== null && r.responsable_id !== '') {
          if (r.nombres !== undefined || r.apellidos !== undefined || r.telefono !== undefined || r.documento !== undefined) {
            throw solicitudInvalida('Un responsable existente por ID no debe enviar nombres, apellidos, teléfono ni documento.', 'responsables');
          }
          const idResp = uuidPublico(r.responsable_id, 'responsables.responsable_id');
          if (idsResponsablesExistentes.has(idResp)) {
            throw solicitudInvalida('El responsable existente está duplicado en la misma solicitud.', 'responsables.responsable_id');
          }
          idsResponsablesExistentes.add(idResp);
          if (typeof r.parentesco !== 'string' || r.parentesco.trim().length === 0 || r.parentesco.trim().length > 80) {
            throw solicitudInvalida('El parentesco es obligatorio (1-80 caracteres).', 'responsables.parentesco');
          }
          if (typeof r.es_principal !== 'boolean') {
            throw solicitudInvalida('El campo es_principal debe ser booleano.', 'responsables.es_principal');
          }
          if (typeof r.autoriza_atencion !== 'boolean') {
            throw solicitudInvalida('El campo autoriza_atencion debe ser booleano.', 'responsables.autoriza_atencion');
          }
          if (r.version_responsable === undefined || !Number.isInteger(r.version_responsable) || r.version_responsable < 1) {
            throw solicitudInvalida('La versión del responsable existente es obligatoria.', 'responsables.version_responsable');
          }
        } else {
          if (typeof r.nombres !== 'string' || r.nombres.trim().length === 0 || r.nombres.trim().length > 200) {
            throw solicitudInvalida('Los nombres del responsable son obligatorios (1-200 caracteres).', 'responsables.nombres');
          }
          if (typeof r.apellidos !== 'string' || r.apellidos.trim().length === 0 || r.apellidos.trim().length > 200) {
            throw solicitudInvalida('Los apellidos del responsable son obligatorios (1-200 caracteres).', 'responsables.apellidos');
          }
          if (typeof r.telefono !== 'string' || r.telefono.trim().length === 0 || r.telefono.trim().length > 30) {
            throw solicitudInvalida('El teléfono del responsable es obligatorio (1-30 caracteres).', 'responsables.telefono');
          }
          if (typeof r.parentesco !== 'string' || r.parentesco.trim().length === 0 || r.parentesco.trim().length > 80) {
            throw solicitudInvalida('El parentesco del responsable es obligatorio (1-80 caracteres).', 'responsables.parentesco');
          }
          if (typeof r.es_principal !== 'boolean') {
            throw solicitudInvalida('El campo es_principal debe ser booleano.', 'responsables.es_principal');
          }
          if (typeof r.autoriza_atencion !== 'boolean') {
            throw solicitudInvalida('El campo autoriza_atencion debe ser booleano.', 'responsables.autoriza_atencion');
          }
          if (r.documento === undefined || r.documento === null) {
            throw solicitudInvalida('El documento del responsable es obligatorio.', 'responsables.documento');
          }
          validarIdentificacion(r.documento, 'responsables.documento');
        }
      }
    } else {
      if (entrada.responsables !== undefined) {
        throw solicitudInvalida('El campo responsables solo aplica a CENTRO_MEDICO_PEDIATRICO.', 'responsables');
      }
    }

    let grupoSanguineo: string | undefined;
    let contactoEmergencia: ContactoEmergencia | undefined;
    if (contexto.cuenta.institucion === 'HOSPITAL_GENERAL') {
      grupoSanguineo = validarGrupoSanguineo(contexto.cuenta.institucion, entrada.grupo_sanguineo, 'grupo_sanguineo');
      contactoEmergencia = validarContactoEmergencia(contexto.cuenta.institucion, entrada.contacto_emergencia, 'contacto_emergencia');
    } else {
      if (entrada.grupo_sanguineo !== undefined) {
        throw solicitudInvalida('El campo grupo_sanguineo solo aplica a HOSPITAL_GENERAL.', 'grupo_sanguineo');
      }
      if (entrada.contacto_emergencia !== undefined) {
        throw solicitudInvalida('El campo contacto_emergencia solo aplica a HOSPITAL_GENERAL.', 'contacto_emergencia');
      }
    }

    const nombresIds = ['paciente_id', 'historial_id', 'evento_auditoria_id'];
    if (contexto.cuenta.institucion === 'CENTRO_MEDICO_PEDIATRICO' && entrada.responsables) {
      entrada.responsables.forEach((r, idx) => {
        if (!r.responsable_id) {
          nombresIds.push(`responsable_id_${idx}`);
        }
      });
    }

    const comando = await prepararComandoEstable(
      claveIdempotencia,
      'paciente.registrar',
      entrada,
      nombresIds,
      this.dependencias,
    );

    if (!bundle.uow) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El bundle no tiene unidad de trabajo configurada.');
    }

    const resultadoDurable = await bundle.uow.ejecutar<PacienteDto>(
      contexto,
      comando,
      async (lector) => {
        const operacionPrevia = await lector.operaciones.porClave<PacienteDto>(
          contexto.cuenta.id,
          'paciente.registrar',
          comando.claveIdempotencia,
        );
        if (operacionPrevia !== null) {
          if (operacionPrevia.hashEntrada !== comando.hashEntrada) {
            throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave de idempotencia ya se usó con otra solicitud.');
          }
          return { tipo: 'REPETIR', operacion: operacionPrevia };
        }

        const identidadesEnEstaSolicitud = new Set<string>();

        if (identificacion !== undefined) {
          const titularExistente = await lector.identidades.titular(identificacion);
          if (titularExistente !== null) {
            throw new ErrorDominio(
              'PACIENTE_DUPLICADO',
              'La identificación ya está registrada para otro paciente.',
              ['identificacion'],
            );
          }
          identidadesEnEstaSolicitud.add(
            normalizarIdentificacion(identificacion.tipo, identificacion.numero),
          );
        }

        const pacienteId = comando.ids.paciente_id!;
        const codigoLegible = generarCodigoLegible(contexto.cuenta.institucion, pacienteId);

        const listaResponsables: ResponsablePaciente[] = [];
        const cambiosResponsables: CambioPlanificado[] = [];

        if (contexto.cuenta.institucion === 'CENTRO_MEDICO_PEDIATRICO' && entrada.responsables) {
          for (let idx = 0; idx < entrada.responsables.length; idx++) {
            const resp = entrada.responsables[idx]!;
            if (resp.responsable_id) {
              const respId = uuidPublico(resp.responsable_id, 'responsable_id');
              const existente = (await lector.responsables.porId(respId)) as ResponsableDetalle | null;
              if (!existente) {
                throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'El responsable especificado no existe.', ['responsables']);
              }
              if (resp.version_responsable !== undefined && existente.version !== resp.version_responsable) {
                throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión del responsable no coincide.', ['responsables']);
              }
              const vinculo: VinculoResponsable = Object.freeze({
                responsableId: existente.id,
                versionResponsable: existente.version,
                parentesco: resp.parentesco ?? 'TUTOR',
                esPrincipal: Boolean(resp.es_principal),
                autorizaAtencion: Boolean(resp.autoriza_atencion),
              });
              listaResponsables.push(Object.freeze({
                responsable: existente,
                vinculo,
                versionVinculo: 1 as Version,
              }));
            } else {
              const nuevoId = comando.ids[`responsable_id_${idx}`]!;
              const docResp = validarIdentificacion(resp.documento!, 'responsables.documento');
              const claveDoc = normalizarIdentificacion(docResp.tipo, docResp.numero);
              if (identidadesEnEstaSolicitud.has(claveDoc)) {
                throw new ErrorDominio('PACIENTE_DUPLICADO', 'La identificación del responsable está duplicada en la misma solicitud.', ['responsables']);
              }
              const titularResp = await lector.identidades.titular(docResp);
              if (titularResp !== null) {
                throw new ErrorDominio('PACIENTE_DUPLICADO', 'La identificación del responsable ya existe en el sistema.', ['responsables']);
              }
              identidadesEnEstaSolicitud.add(claveDoc);
              const nombresResp = (resp.nombres ?? '').trim();
              const apellidosResp = (resp.apellidos ?? '').trim();
              const telefonoResp = (resp.telefono ?? '').trim();
              const detalle: ResponsableDetalle = Object.freeze({
                id: nuevoId,
                nombres: nombresResp,
                apellidos: apellidosResp,
                nombre: `${nombresResp} ${apellidosResp}`.trim(),
                telefono: telefonoResp,
                documento: docResp,
                version: 1 as Version,
              });
              const vinculo: VinculoResponsable = Object.freeze({
                responsableId: nuevoId,
                versionResponsable: 1 as Version,
                parentesco: resp.parentesco ?? 'TUTOR',
                esPrincipal: Boolean(resp.es_principal),
                autorizaAtencion: Boolean(resp.autoriza_atencion),
              });
              listaResponsables.push(Object.freeze({
                responsable: detalle,
                vinculo,
                versionVinculo: 1 as Version,
              }));
              cambiosResponsables.push({
                agregado: 'responsables',
                tipo: 'CREAR',
                recursoId: nuevoId,
                versionAnterior: null,
                nuevoEstado: detalle,
              });
              if (docResp) {
                cambiosResponsables.push({
                  agregado: 'identidades',
                  tipo: 'RESERVAR',
                  recursoId: nuevoId,
                  versionAnterior: null,
                  nuevoEstado: { identificacion: docResp, titularId: nuevoId },
                });
              }
            }
          }
        }

        const nuevoPaciente: Paciente = Object.freeze({
          id: pacienteId,
          codigoLegible,
          institucion: contexto.cuenta.institucion,
          nombres,
          apellidos,
          fechaNacimiento,
          sexo,
          ...(identificacion ? { identificacion } : {}),
          ...(telefono ? { telefono } : {}),
          ...(correo ? { correo } : {}),
          ...(direccion ? { direccion } : {}),
          ...(grupoSanguineo ? { grupoSanguineo } : {}),
          ...(contactoEmergencia ? { contactoEmergencia } : {}),
          ...(listaResponsables.length > 0 ? { responsables: Object.freeze(listaResponsables) } : {}),
          estado: 'ACTIVO',
          version: 1 as Version,
          fechaRegistro: comando.instante,
        });

        const tamanoAgregado = new TextEncoder().encode(JSON.stringify(nuevoPaciente)).length;
        if (tamanoAgregado > 262144) {
          throw new ErrorDominio('LIMITE_AGREGADO', 'El tamaño del agregado de paciente excede el límite de 256 KiB.', ['pacientes']);
        }

        const dto = mapearPacienteDto(nuevoPaciente);

        return {
          tipo: 'CONFIRMAR',
          cambios: [
            {
              agregado: 'pacientes',
              tipo: 'CREAR',
              recursoId: nuevoPaciente.id,
              versionAnterior: null,
              nuevoEstado: nuevoPaciente,
            },
            ...(identificacion ? [{
              agregado: 'identidades',
              tipo: 'RESERVAR',
              recursoId: nuevoPaciente.id,
              versionAnterior: null,
              nuevoEstado: { identificacion, titularId: nuevoPaciente.id },
            }] : []),
            ...cambiosResponsables,
            {
              agregado: 'historiales',
              tipo: 'APERTURA',
              recursoId: comando.ids.historial_id!,
              versionAnterior: null,
              nuevoEstado: {
                pacienteId: nuevoPaciente.id,
                estado: 'ACTIVO',
                fechaApertura: comando.instante,
              },
            },
          ],
          revisiones: [],
          auditoria: [
            {
              id: comando.ids.evento_auditoria_id!,
              actorId: contexto.cuenta.id,
              caso: 'paciente.registrar',
              recursoId: nuevoPaciente.id,
              fechaHora: comando.instante,
              correlacion: contexto.correlacion,
            },
          ],
          resultado: {
            httpStatus: 201,
            respuesta: dto,
            correlacionOriginal: contexto.correlacion,
          },
        };
      },
    );

    return resultadoDurable;
  }
}
