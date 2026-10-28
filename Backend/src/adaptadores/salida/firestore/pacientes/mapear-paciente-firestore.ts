import type { Timestamp } from 'firebase-admin/firestore';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import type { FechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import { fechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import type { InstanteUTC } from '../../../../dominio/compartido/instante-utc.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { normalizarTextoBusqueda } from '../../../../dominio/compartido/normalizacion.js';
import type {
  ArchivoRegistrado,
  Identificacion,
  Paciente,
  ResponsableDetalle,
  ResponsablePaciente,
  VinculoResponsable,
} from '../../../../dominio/clinica/paciente.js';
import { generarCodigoLegible } from '../../../../dominio/clinica/paciente.js';

export interface DocumentoBajaFirestore {
  readonly causa: 'TRASLADO' | 'FALLECIMIENTO' | 'OTRA_ADMINISTRATIVA';
  readonly motivo: string;
  readonly fecha: Date | Timestamp | string;
  readonly actor_id: string;
}

export interface DocumentoPacienteFirestore {
  readonly revision: number;
  readonly nombres: string;
  readonly apellidos: string;
  readonly nombre_busqueda: string;
  readonly fecha_nacimiento: string;
  readonly sexo?: string;
  readonly grupo_sanguineo?: string;
  readonly direccion?: string;
  readonly telefono?: string;
  readonly correo?: string;
  readonly tipo_documento?: string;
  readonly numero_documento?: string;
  readonly estado: 'ACTIVO' | 'ARCHIVADO';
  readonly fecha_apertura: Date | Timestamp | string;
  readonly baja?: DocumentoBajaFirestore;
}

export interface DocumentoResponsableFirestore {
  readonly revision: number;
  readonly identificacion: string;
  readonly tipo_documento: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly telefono: string;
  readonly correo?: string;
  readonly fecha_registro: Date | Timestamp | string;
}

export interface DocumentoVinculoResponsableFirestore {
  readonly revision: number;
  readonly responsable_id: string;
  readonly parentesco: string;
  readonly es_principal: boolean;
  readonly autoriza_atencion: boolean;
  readonly estado: 'ACTIVO' | 'INACTIVO';
  readonly fecha_registro: Date | Timestamp | string;
  readonly actor_id: string;
}

export function aInstanteUTC(valor: unknown): InstanteUTC {
  if (valor instanceof Date) {
    return instanteUtc(valor.toISOString());
  }
  if (
    typeof valor === 'object' &&
    valor !== null &&
    'toDate' in valor &&
    typeof (valor as { toDate: () => Date }).toDate === 'function'
  ) {
    return instanteUtc((valor as { toDate: () => Date }).toDate().toISOString());
  }
  if (typeof valor === 'string') {
    return instanteUtc(new Date(valor).toISOString());
  }
  return instanteUtc(new Date().toISOString());
}

export function aFechaCivil(valor: unknown): FechaCivil | null {
  if (typeof valor === 'string') {
    const match = /^\d{4}-\d{2}-\d{2}/.exec(valor);
    if (match) {
      try {
        return fechaCivil(match[0]);
      } catch {
        return null;
      }
    }
  }
  if (valor instanceof Date) {
    return fechaCivil(valor.toISOString().slice(0, 10));
  }
  return null;
}

export function mapearResponsableDetalleFirestore(
  id: UUID,
  doc: DocumentoResponsableFirestore,
): ResponsableDetalle {
  const idPublico = uuidPublico(id);
  const nombres = doc.nombres;
  const apellidos = doc.apellidos;
  const nombre = `${nombres} ${apellidos}`.trim();
  const documento: Identificacion | undefined =
    doc.tipo_documento && doc.identificacion
      ? {
          tipo: doc.tipo_documento,
          numero: doc.identificacion.includes(':')
            ? doc.identificacion.slice(doc.identificacion.indexOf(':') + 1)
            : doc.identificacion,
        }
      : undefined;

  return Object.freeze({
    id: idPublico,
    nombres,
    apellidos,
    nombre,
    telefono: doc.telefono,
    ...(documento ? { documento } : {}),
    version: versionPositiva(doc.revision),
  });
}

export function mapearVinculoResponsableFirestore(
  doc: DocumentoVinculoResponsableFirestore,
  responsable: ResponsableDetalle,
): ResponsablePaciente {
  const vinculo: VinculoResponsable = Object.freeze({
    responsableId: uuidPublico(doc.responsable_id),
    versionResponsable: responsable.version,
    parentesco: doc.parentesco,
    esPrincipal: Boolean(doc.es_principal),
    autorizaAtencion: Boolean(doc.autoriza_atencion),
  });

  return Object.freeze({
    responsable,
    vinculo,
    versionVinculo: versionPositiva(doc.revision),
  });
}

export function mapearPacienteFirestore(
  id: UUID,
  doc: DocumentoPacienteFirestore,
  responsables?: readonly ResponsablePaciente[],
): Paciente {
  const idPublico = uuidPublico(id);
  const codigoLegible = generarCodigoLegible('CENTRO_MEDICO_PEDIATRICO', idPublico);
  const fechaRegistro = aInstanteUTC(doc.fecha_apertura);
  const fechaNacimiento = aFechaCivil(doc.fecha_nacimiento);

  const identificacion: Identificacion | undefined =
    doc.tipo_documento && doc.numero_documento
      ? {
          tipo: doc.tipo_documento,
          numero: doc.numero_documento,
        }
      : undefined;

  let baja: ArchivoRegistrado | undefined;
  if (doc.baja) {
    baja = Object.freeze({
      causa: doc.baja.causa,
      motivo: doc.baja.motivo,
      fecha: aInstanteUTC(doc.baja.fecha),
      actorId: uuidPublico(doc.baja.actor_id),
    });
  }

  return Object.freeze({
    id: idPublico,
    codigoLegible,
    institucion: 'CENTRO_MEDICO_PEDIATRICO',
    nombres: doc.nombres,
    apellidos: doc.apellidos,
    fechaNacimiento,
    sexo: doc.sexo ?? null,
    ...(identificacion ? { identificacion } : {}),
    ...(doc.direccion ? { direccion: doc.direccion } : {}),
    ...(doc.telefono ? { telefono: doc.telefono } : {}),
    ...(doc.correo ? { correo: doc.correo } : {}),
    ...(doc.grupo_sanguineo ? { grupoSanguineo: doc.grupo_sanguineo } : {}),
    estado: doc.estado,
    version: versionPositiva(doc.revision),
    fechaRegistro,
    ...(responsables && responsables.length > 0 ? { responsables: Object.freeze(responsables) } : {}),
    ...(baja ? { baja } : {}),
  });
}

export function mapearADocumentoPacienteFirestore(
  paciente: Paciente,
): DocumentoPacienteFirestore {
  const nombreBusqueda = normalizarTextoBusqueda(
    `${paciente.nombres} ${paciente.apellidos}`,
  );
  const fechaApertura = new Date(paciente.fechaRegistro);

  return {
    revision: Number(paciente.version),
    nombres: paciente.nombres,
    apellidos: paciente.apellidos,
    nombre_busqueda: nombreBusqueda,
    fecha_nacimiento: paciente.fechaNacimiento
      ? paciente.fechaNacimiento.toString()
      : '2000-01-01',
    ...(paciente.sexo ? { sexo: paciente.sexo } : {}),
    ...(paciente.grupoSanguineo ? { grupo_sanguineo: paciente.grupoSanguineo } : {}),
    ...(paciente.direccion ? { direccion: paciente.direccion } : {}),
    ...(paciente.telefono ? { telefono: paciente.telefono } : {}),
    ...(paciente.correo ? { correo: paciente.correo } : {}),
    ...(paciente.identificacion
      ? {
          tipo_documento: paciente.identificacion.tipo,
          numero_documento: paciente.identificacion.numero,
        }
      : {}),
    estado: paciente.estado,
    fecha_apertura: fechaApertura,
    ...(paciente.baja
      ? {
          baja: {
            causa: paciente.baja.causa,
            motivo: paciente.baja.motivo,
            fecha: new Date(paciente.baja.fecha),
            actor_id: paciente.baja.actorId,
          },
        }
      : {}),
  };
}
