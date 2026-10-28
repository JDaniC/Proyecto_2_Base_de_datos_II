import { createHash } from 'node:crypto';
import {
  FieldPath,
  type Firestore,
  type Transaction,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase-admin/firestore';
import type { Pagina } from '../../../../aplicacion/puertos/nucleo.js';
import type {
  CriteriosBusquedaPacientes,
  RepositorioPacienteLectura,
} from '../../../../aplicacion/puertos/repositorio-paciente.js';
import type { Paciente, ResponsableDetalle, ResponsablePaciente } from '../../../../dominio/clinica/paciente.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import type { Version } from '../../../../dominio/compartido/version.js';
import { ErrorDominio, solicitudInvalida } from '../../../../dominio/compartido/error-dominio.js';
import {
  derivarClaveIdentificacion,
  normalizarIdentificacion,
  normalizarTextoBusqueda,
} from '../../../../dominio/compartido/normalizacion.js';
import { claveUnica } from '../validador-firestore.js';
import {
  mapearPacienteFirestore,
  mapearResponsableDetalleFirestore,
  mapearVinculoResponsableFirestore,
  type DocumentoPacienteFirestore,
  type DocumentoResponsableFirestore,
  type DocumentoVinculoResponsableFirestore,
} from './mapear-paciente-firestore.js';

const scopeCursor = (c: CriteriosBusquedaPacientes) =>
  createHash('sha256')
    .update(JSON.stringify(['CENTRO_MEDICO_PEDIATRICO', c.q, c.orden, c.estado ?? 'TODOS']))
    .digest('hex');

const indisponible = (msg = 'No fue posible consultar la persistencia de pediatría.') =>
  new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', msg);

export class RepositorioPacientesFirestore implements RepositorioPacienteLectura {
  private readonly esTransaccion: boolean;

  constructor(
    private readonly ejecutor: Firestore | Transaction,
    private readonly firestore: Firestore,
  ) {
    this.esTransaccion =
      'get' in ejecutor &&
      typeof (ejecutor as Transaction).get === 'function' &&
      'set' in ejecutor &&
      'create' in ejecutor;
  }

  private async obtenerDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
    if (this.esTransaccion) {
      return (this.ejecutor as Transaction).get(ref);
    }
    return ref.get();
  }

  private async obtenerQuery(query: Query): Promise<QuerySnapshot> {
    if (this.esTransaccion) {
      return (this.ejecutor as Transaction).get(query);
    }
    return query.get();
  }

  async porId(id: UUID): Promise<Paciente | null> {
    try {
      const idPublico = uuidPublico(id);
      const docRef = this.firestore.doc(`pacientes/${idPublico}`);
      const snap = await this.obtenerDoc(docRef);
      if (!snap.exists) return null;

      const datosPaciente = snap.data() as DocumentoPacienteFirestore;

      // Cargar vínculos de responsables en subcolección pacientes/{id}/responsables
      const snapVinculos = await this.obtenerQuery(
        this.firestore.collection(`pacientes/${idPublico}/responsables`),
      );

      const listaResponsables: ResponsablePaciente[] = [];
      for (const docVinculo of snapVinculos.docs) {
        const datosVinculo = docVinculo.data() as DocumentoVinculoResponsableFirestore;
        if (datosVinculo.estado !== 'INACTIVO') {
          const respId = uuidPublico(datosVinculo.responsable_id);
          const snapResp = await this.obtenerDoc(this.firestore.doc(`responsables/${respId}`));
          if (snapResp.exists) {
            const datosResp = snapResp.data() as DocumentoResponsableFirestore;
            const detalle = mapearResponsableDetalleFirestore(respId, datosResp);
            listaResponsables.push(mapearVinculoResponsableFirestore(datosVinculo, detalle));
          }
        }
      }

      return mapearPacienteFirestore(idPublico, datosPaciente, listaResponsables);
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async porVersion(id: UUID, version: Version): Promise<Paciente | null> {
    try {
      const actual = await this.porId(id);
      if (!actual) return null;
      if (actual.version === version) return actual;
      if (version > actual.version) return null;

      const snapVersiones = await this.obtenerQuery(
        this.firestore
          .collection(`pacientes/${id}/versiones`)
          .where('version', '==', Number(version))
          .limit(1),
      );

      if (snapVersiones.empty || !snapVersiones.docs[0]) return null;
      const datosVersion = snapVersiones.docs[0].data();
      if (!datosVersion || !datosVersion.contenido_anterior) return null;

      return datosVersion.contenido_anterior as Paciente;
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async titularIdentidad(identificacion: { tipo: string; numero: string }): Promise<UUID | null> {
    try {
      let clave = '';
      try {
        const norm = derivarClaveIdentificacion(identificacion.tipo, identificacion.numero);
        const idx = norm.indexOf(':');
        const tipoNorm = idx > 0 ? norm.slice(0, idx) : identificacion.tipo.trim().toUpperCase();
        const numNorm = idx > 0 ? norm.slice(idx + 1) : identificacion.numero.trim();
        clave = claveUnica(tipoNorm, numNorm);
      } catch {
        return null;
      }

      // 1. Buscar en identidades_paciente
      const snapP = await this.obtenerDoc(this.firestore.doc(`identidades_paciente/${clave}`));
      if (snapP.exists) {
        const data = snapP.data();
        if (data && data.recurso_id) return uuidPublico(data.recurso_id);
      }

      // 2. Buscar en identidades_responsable
      const snapR = await this.obtenerDoc(this.firestore.doc(`identidades_responsable/${clave}`));
      if (snapR.exists) {
        const data = snapR.data();
        if (data && data.recurso_id) return uuidPublico(data.recurso_id);
      }

      return null;
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async porIdResponsable(id: UUID): Promise<ResponsableDetalle | null> {
    try {
      const idPublico = uuidPublico(id);
      const snap = await this.obtenerDoc(this.firestore.doc(`responsables/${idPublico}`));
      if (!snap.exists) return null;
      return mapearResponsableDetalleFirestore(
        idPublico,
        snap.data() as DocumentoResponsableFirestore,
      );
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async porPacienteResponsables(
    pacienteId: UUID,
  ): Promise<Pagina<ResponsableDetalle>> {
    try {
      const idPublico = uuidPublico(pacienteId);
      const snapVinculos = await this.obtenerQuery(
        this.firestore.collection(`pacientes/${idPublico}/responsables`),
      );
      const elementos: ResponsableDetalle[] = [];
      for (const docVinculo of snapVinculos.docs) {
        const datosVinculo = docVinculo.data() as DocumentoVinculoResponsableFirestore;
        if (datosVinculo.estado !== 'INACTIVO') {
          const respId = uuidPublico(datosVinculo.responsable_id);
          const snapResp = await this.obtenerDoc(this.firestore.doc(`responsables/${respId}`));
          if (snapResp.exists) {
            elementos.push(
              mapearResponsableDetalleFirestore(
                respId,
                snapResp.data() as DocumentoResponsableFirestore,
              ),
            );
          }
        }
      }
      return Object.freeze({
        elementos: Object.freeze(elementos),
      });
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async buscar(criterios: CriteriosBusquedaPacientes): Promise<Pagina<Paciente>> {
    if (
      typeof criterios.q !== 'string' ||
      !criterios.q.trim() ||
      [...criterios.q].length > 120 ||
      !Number.isInteger(criterios.limite) ||
      criterios.limite < 1 ||
      criterios.limite > 100 ||
      !['ASC', 'DESC'].includes(criterios.orden) ||
      (criterios.estado !== undefined && !['ACTIVO', 'ARCHIVADO', 'TODOS'].includes(criterios.estado))
    ) {
      throw solicitudInvalida('Los parámetros de búsqueda no son válidos.');
    }

    const qRaw = criterios.q.trim();
    const qNorm = normalizarTextoBusqueda(qRaw);
    if (!qNorm) {
      throw solicitudInvalida('El término de búsqueda no contiene caracteres válidos.', 'q');
    }

    try {
      // 1. Si el término parece documento exacto (CUI o PASAPORTE), verificar en reservas de identidad
      const candidatosId = new Set<UUID>();

      try {
        const cuiNorm = normalizarIdentificacion('CUI', qRaw);
        const titularCui = await this.titularIdentidad({
          tipo: 'CUI',
          numero: cuiNorm.slice('CUI:'.length),
        });
        if (titularCui) candidatosId.add(titularCui);
      } catch { /* no es CUI */ }

      try {
        const pasNorm = normalizarIdentificacion('PASAPORTE', qRaw);
        const titularPas = await this.titularIdentidad({
          tipo: 'PASAPORTE',
          numero: pasNorm.slice('PASAPORTE:'.length),
        });
        if (titularPas) candidatosId.add(titularPas);
      } catch { /* no es PASAPORTE */ }

      if (candidatosId.size > 0) {
        const pacientesDocs: Paciente[] = [];
        for (const candId of candidatosId) {
          const pac = await this.porId(candId);
          if (pac) {
            const coincideEstado =
              !criterios.estado ||
              criterios.estado === 'TODOS' ||
              pac.estado === criterios.estado;
            if (coincideEstado) {
              pacientesDocs.push(pac);
            }
          }
        }
        if (pacientesDocs.length > 0) {
          return Object.freeze({
            elementos: Object.freeze(pacientesDocs),
          });
        }
      }

      // 2. Búsqueda por prefijo de nombre sobre claves_nombre en límites de palabra
      let query: Query = this.firestore.collection('pacientes');
      if (criterios.estado && criterios.estado !== 'TODOS') {
        query = query.where('estado', '==', criterios.estado);
      }

      const direccion = criterios.orden === 'ASC' ? 'asc' : 'desc';
      query = query
        .where('claves_nombre', 'array-contains', qNorm)
        .orderBy('nombre_busqueda', direccion)
        .orderBy(FieldPath.documentId(), direccion);

      // Descodificar cursor si está presente
      if (criterios.cursor !== undefined) {
        try {
          if (criterios.cursor.length > 2048 || !/^[\w-]+$/.test(criterios.cursor)) {
            throw new Error();
          }
          const data = JSON.parse(
            Buffer.from(criterios.cursor, 'base64url').toString('utf8'),
          ) as { v: number; scope: string; nombreBusqueda: string; id: string };

          if (
            data.v !== 1 ||
            data.scope !== scopeCursor(criterios) ||
            uuidPublico(data.id) !== data.id ||
            typeof data.nombreBusqueda !== 'string'
          ) {
            throw new Error();
          }

          query = query.startAfter(data.nombreBusqueda, data.id);
        } catch {
          throw solicitudInvalida('El cursor no corresponde a esta búsqueda.', 'cursor');
        }
      }

      const snapDocs = await this.obtenerQuery(query.limit(criterios.limite + 1));
      const haySiguiente = snapDocs.docs.length > criterios.limite;
      const docsPagina = haySiguiente
        ? snapDocs.docs.slice(0, criterios.limite)
        : snapDocs.docs;

      const elementos: Paciente[] = [];
      for (const docSnap of docsPagina) {
        const id = uuidPublico(docSnap.id);
        const pac = await this.porId(id);
        if (pac) elementos.push(pac);
      }

      let siguienteCursor: string | undefined;
      if (haySiguiente && docsPagina.length > 0) {
        const ultimoDoc = docsPagina[docsPagina.length - 1]!;
        const datosUltimo = ultimoDoc.data() as DocumentoPacienteFirestore;
        siguienteCursor = Buffer.from(
          JSON.stringify({
            v: 1,
            scope: scopeCursor(criterios),
            nombreBusqueda: datosUltimo.nombre_busqueda,
            id: ultimoDoc.id,
          }),
        ).toString('base64url');
      }

      return Object.freeze({
        elementos: Object.freeze(elementos),
        ...(siguienteCursor ? { siguienteCursor } : {}),
      });
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }
}
