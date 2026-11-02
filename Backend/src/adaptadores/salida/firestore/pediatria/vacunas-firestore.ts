import { validarDocumento } from '../validador-firestore.js';
import type { Firestore, Transaction, DocumentReference } from 'firebase-admin/firestore';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { fechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import type {
  PuertoVacunasCatalogo,
  PuertoEsquemaPaciente,
  PuertoAplicacionesVacuna,
} from '../../../../aplicacion/puertos/vacunas.js';
import type {
  VacunaCatalogo,
  VersionEsquemaVacuna,
  EsquemaPaciente,
  AplicacionVacuna,
  DosisVacuna,
} from '../../../../dominio/pediatria/vacunas.js';

function mapearDosis(raw: unknown): DosisVacuna {
  const d = raw as Record<string, unknown>;
  if(!Number.isSafeInteger(d.numero)||Number(d.numero)<1||!Number.isSafeInteger(d.edad_recomendada_meses)||Number(d.edad_recomendada_meses)<0)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Dosis persistida incompatible.');
  return {
    dosisId: uuidPublico(String(d.dosis_id ?? d.dosisId)),
    numero: Number(d.numero ?? d.numeroDosis ?? 1),
    edadMesesRecomendada: Number(d.edad_recomendada_meses ?? d.edadMesesRecomendada ?? 0),
    ...(d.limite_inferior_dias !== undefined ? {limiteInferiorDias:Number(d.limite_inferior_dias)} : {}),
    ...(d.limite_superior_dias !== undefined ? {limiteSuperiorDias:Number(d.limite_superior_dias)} : {}),
    obligatoria: d.obligatoria !== undefined ? Boolean(d.obligatoria) : true,
    ...(typeof d.etiquetaDosis === 'string' ? {etiquetaDosis:d.etiquetaDosis} : {}),
  };
}

function mapearAplicacionDoc(id: string, data: Record<string, unknown>): AplicacionVacuna {
  const fechaAplicacion = data.fecha_aplicacion instanceof Date
    ? data.fecha_aplicacion.toISOString().slice(0, 10)
    : typeof data.fecha_aplicacion === 'string'
    ? fechaCivil(data.fecha_aplicacion, 'fecha_aplicacion')
    : typeof (data.fecha_aplicacion as { toDate?: () => Date })?.toDate === 'function'
    ? (data.fecha_aplicacion as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
    : fechaCivil(null, 'fecha_aplicacion');

  return {
    id,
    claveLogica: id,
    pacienteId: uuidPublico(String(data.paciente_id)),
    vacunaId: uuidPublico(String(data.vacuna_id)),
    dosisId: uuidPublico(String(data.dosis_id)),
    versionEsquemaId: uuidPublico(String(data.version_esquema_id)),
    pediatraId: uuidPublico(String(data.pediatra_id)),
    fechaAplicacion,
    lote: String(data.lote || '').trim().toUpperCase(),
    sitioAplicacion: String(data.sitio_aplicacion || '').trim(),
    ...(typeof data.observaciones === 'string' ? {observaciones:data.observaciones} : {}),
    estado: data.estado === 'ANULADA' ? 'ANULADA' : 'APLICADA',
    ...(typeof data.motivo_anulacion === 'string' ? {motivoAnulacion:data.motivo_anulacion} : {}),
    version: Number(data.revision ?? 1),
  };
}

export function crearVacunasFirestore(
  db: Firestore,
  t?: Transaction
): PuertoVacunasCatalogo & PuertoEsquemaPaciente & PuertoAplicacionesVacuna {
  const get = (ref: DocumentReference) => (t ? t.get(ref) : ref.get());

  return {
    async obtenerCatalogo(): Promise<readonly VacunaCatalogo[]> {
      try {
        const snapVacunas = await (t ? t.get(db.collection('vacunas')) : db.collection('vacunas').get());
        if (snapVacunas.empty) return [];

        const catalogo: VacunaCatalogo[] = [];
        for (const doc of snapVacunas.docs) {
          const vData = doc.data();
          const versionVigenteId = String(vData.version_vigente || '');
          let dosis: DosisVacuna[] = [];

          if (versionVigenteId) {
            const snapVersion = await get(doc.ref.collection('versiones').doc(versionVigenteId));
            if (snapVersion.exists) {
              const verData = snapVersion.data()!;
              const listaDosis = Array.isArray(verData.dosis) ? verData.dosis : [];
              dosis = listaDosis.map(mapearDosis);
            }
          }

          catalogo.push({
            id: uuidPublico(doc.id),
            nombre: String(vData.nombre || ''),
            enfermedadObjetivo: String(vData.enfermedad_objetivo || ''),
            fabricante: String(vData.fabricante || ''),
            versionVigente: versionVigenteId ? uuidPublico(versionVigenteId) : uuidPublico(doc.id),
            dosis,
          });
        }
        return catalogo;
      } catch (error) {
        if (t) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo consultar el catálogo de vacunas.');
      }
    },

    async obtenerVersionEsquema(vacunaId: UUID, versionId: UUID): Promise<VersionEsquemaVacuna | null> {
      try {
        const ref = db.doc(`vacunas/${uuidPublico(vacunaId)}/versiones/${uuidPublico(versionId)}`);
        const snap = await get(ref);
        if (!snap.exists) return null;
        const d = validarDocumento<Record<string,unknown>>(ref.path,snap.data()!);
        const listaDosis = Array.isArray(d.dosis) ? d.dosis : [];
        if(listaDosis.length<1)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Esquema persistido vacío.');
        return {
          versionId: uuidPublico(snap.id),
          version: Number(d.version ?? 1),
          nombre: String(d.nombre || ''),
          enfermedadObjetivo: String(d.enfermedad_objetivo || ''),
          fabricante: String(d.fabricante || ''),
          fechaCreacion: d.fecha_creacion instanceof Date
            ? d.fecha_creacion.toISOString()
            : typeof d.fecha_creacion === 'string'
            ? d.fecha_creacion
            : new Date().toISOString(),
          dosis: listaDosis.map(mapearDosis),
        };
      } catch (error) {
        if (t) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo consultar la versión de esquema.');
      }
    },

    async obtenerEsquemas(pacienteId: UUID): Promise<readonly EsquemaPaciente[]> {
      try {
        const snap = await (t ? t.get(db.collection(`pacientes/${uuidPublico(pacienteId)}/esquemas`)) : db.collection(`pacientes/${uuidPublico(pacienteId)}/esquemas`).get());
        if (snap.empty) return [];
        return snap.docs.map((doc) => {
          const d = doc.data();
          return {
            vacunaId: uuidPublico(String(d.vacuna_id || doc.id)),
            versionId: uuidPublico(String(d.version_id)),
            actorId: uuidPublico(String(d.actor_id)),
            fechaAsignacion: d.fecha_asignacion instanceof Date
              ? d.fecha_asignacion.toISOString()
              : String(d.fecha_asignacion || ''),
            estado: d.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
          };
        });
      } catch (error) {
        if (t) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudieron consultar los esquemas del paciente.');
      }
    },

    async obtenerAplicaciones(pacienteId: UUID): Promise<readonly AplicacionVacuna[]> {
      try {
        const pid = uuidPublico(pacienteId);
        const snap = await (t ? t.get(db.collection('aplicaciones_vacuna').where('paciente_id', '==', pid)) : db.collection('aplicaciones_vacuna').where('paciente_id', '==', pid).get());
        if (snap.empty) return [];
        return snap.docs
          .map((doc) => mapearAplicacionDoc(doc.id, doc.data()))
          .sort((a, b) => (b.fechaAplicacion > a.fechaAplicacion ? 1 : -1));
      } catch (error) {
        if (t) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudieron consultar las aplicaciones de vacuna.');
      }
    },

    async obtenerPorId(aplicacionId: string): Promise<AplicacionVacuna | null> {
      try {
        const ref = db.doc(`aplicaciones_vacuna/${aplicacionId}`);
        const snap = await get(ref);
        if (!snap.exists) return null;
        return mapearAplicacionDoc(snap.id, snap.data()!);
      } catch (error) {
        if (t) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo consultar la aplicación de vacuna.');
      }
    },

  };
}
