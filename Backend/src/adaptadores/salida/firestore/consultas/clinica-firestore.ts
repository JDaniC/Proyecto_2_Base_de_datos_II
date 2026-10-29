import { CursorHistorialCifrado } from '../../historial/cursor-historial.js';
import { validarDocumento } from '../validador-firestore.js';
import { FieldPath, type Firestore, type Transaction, type Query, type DocumentReference } from 'firebase-admin/firestore';
import type { PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { Consulta, ProfesionalClinico } from '../../../../dominio/clinica/consulta.js';
import type { Cita } from '../../../../dominio/clinica/cita.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { normalizarInstante } from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import { validarEventoHistorial, verificarManifiestoHistorial } from '../../historial/proyeccion-historial.js';
import { RepositorioPacientesFirestore } from '../pacientes/repositorio-pacientes-firestore.js';
import { documentoConsultaFirestore, mapearConsultaFirestore } from './mapear-consulta-firestore.js';

export const HUELLA_CLINICA_FIRESTORE = 'a39fdac43acefecf82145f3dfde06c89a3adbfe96240f637cf79c0a1a6073e08';
export const VERSION_CLINICA_FIRESTORE = 'clinica-pediatrica-v1-snapshot-2026-10-29';
const incompatible = () => new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La clínica requiere migraciones 004/006 y documentos reconciliados.');

/** Solo lecturas: cada referencia queda en el conjunto transaccional de conflictos. */
export function crearClinicaFirestore(db: Firestore, transaction?: Transaction): PuertosClinicos {
  const get = async (ref: DocumentReference) => {
    try { return await (transaction ? transaction.get(ref) : ref.get()); } catch (error) { if (transaction) throw error; throw incompatible(); }
  };
  const query = async (q: Query) => {
    try { return await (transaction ? transaction.get(q) : q.get()); } catch (error) { if (transaction) throw error; throw incompatible(); }
  };
  const preparar = async () => {
    const [clinica, historial, modelo] = await Promise.all([get(db.doc('clinica_configuracion/modelo')),get(db.doc('historial_configuracion/modelo')),get(db.doc('configuracion/modelo'))]);
    if (modelo.get('version_esquema') !== 2 || modelo.get('hash_modelo') !== HUELLA_CLINICA_FIRESTORE) throw incompatible();
    if (clinica.get('version') !== 1 || clinica.get('estado') !== 'LISTO' || clinica.get('contrato') !== VERSION_CLINICA_FIRESTORE || clinica.get('huella') !== HUELLA_CLINICA_FIRESTORE) throw incompatible();
    verificarManifiestoHistorial(historial.data());
  };
  const porId: PuertosClinicos['consultas']['porId'] = async id => {
    await preparar(); const s = await get(db.doc(`consultas/${id}`));
    return s.exists ? mapearConsultaFirestore(id,s.data()!) : null;
  };
  const citaPorId: PuertosClinicos['citas']['porId'] = async id => {
    await preparar(); const s = await get(db.doc(`citas/${id}`));
    if (!s.exists) return null;
    const d = s.data()!;
    // Las citas legadas conservan duración desconocida; no se inventa.
    const f = d.fecha_hora.toDate().toISOString();
    const civil = new Date(new Date(f).getTime()-6*3600000).toISOString();
    const abiertas = await query(db.collection('consultas').where('cita_id','==',id).where('estado','==','ABIERTA').limit(1));
    return {id, paciente_id: uuidPublico(d.paciente_id), profesional_id: uuidPublico(d.pediatra_id), version: versionPositiva(d.revision),
      fecha: d.fecha ?? civil.slice(0,10), hora_inicio: d.hora_inicio ?? civil.slice(11,16), hora_fin: d.hora_fin ?? null,
      duracion_minutos: d.duracion_minutos ?? null, motivo: d.motivo,
      estado: !abiertas.empty && d.estado === 'PROGRAMADA' ? 'EN_CURSO' : d.estado,
      ...(d.motivo_cancelacion ? {motivo_cancelacion: d.motivo_cancelacion} : {}), ...(d.consultorio ? {consultorio:d.consultorio} : {}),
      fecha_creacion: instanteUtc(d.fecha_creacion.toDate().toISOString())} as Cita;
  };
  const listar: PuertosClinicos['citas']['listar'] = async (f,p,ambito = '') => {
    await preparar();
    const scope = JSON.stringify(['agenda-pediatrica-v1',ambito,f,p.orden]); const codec = new CursorHistorialCifrado();
    const cursor = p.cursor ? codec.decodificar(p.cursor,scope) : undefined;
    const dir = p.orden === 'DESC' ? 'desc' : 'asc';
    let q: Query = db.collection('citas').where('fecha_hora','>=',new Date(`${f.fecha_desde}T00:00:00-06:00`))
      .where('fecha_hora','<',new Date(`${f.fecha_hasta}T00:00:00-06:00`));
    if (f.profesional_id) q = q.where('pediatra_id','==',f.profesional_id);
    q = q.orderBy('fecha_hora',dir).orderBy(FieldPath.documentId(),dir);
    if (cursor) q = q.startAfter(new Date(cursor.fechaHora),cursor.id);
    const elementos: Cita[] = [];
    // Filtrar antes de seleccionar página; leer en bloques acotados, sin truncar resultados.
    while (elementos.length <= p.limite) {
      const bloque = await query(q.limit(100));
      for (const doc of bloque.docs) {
        const c = await citaPorId(uuidPublico(doc.id)); if (!c) continue;
        if (f.estado && c.estado !== f.estado) continue;
        if (f.q && !c.motivo.toLocaleLowerCase().includes(f.q.toLocaleLowerCase())) continue;
        elementos.push(c); if (elementos.length > p.limite) break;
      }
      if (elementos.length > p.limite || bloque.size < 100) break;
      const ultimo = bloque.docs.at(-1)!; q = q.startAfter(ultimo.get('fecha_hora'),ultimo.id);
    }
    const pagina = elementos.slice(0,p.limite), ultimo = pagina.at(-1);
    const instanteUltimo = ultimo ? (await get(db.doc(`citas/${ultimo.id}`))).get('fecha_hora').toDate().toISOString() as string : '';
    return {elementos:pagina,...(elementos.length > p.limite && ultimo ? {siguienteCursor:codec.codificar(scope,{id:ultimo.id,fechaHora:instanteUltimo})} : {})};
  };
  return {
    pacientes: new RepositorioPacientesFirestore(transaction ?? db,db),
    profesionales: { async porId(id) {
      await preparar(); const s = await get(db.doc(`pediatras/${id}`)); if (!s.exists) return null;
      const d = s.data()!;
      return {id, nombre: `${d.nombres} ${d.apellidos}`,rol: 'PEDIATRA', activo: d.estado === 'ACTIVO', colegiado: d.colegiado,entidad_colegiacion: d.entidad_colegiacion} as ProfesionalClinico;
    }},
    consultas: {porId, async porVersion(id,version) {
      const actual = await porId(id); if (!actual || actual.version === version) return actual;
      const s = await get(db.doc(`consultas/${id}/snapshots_v1/${version}`)); if (!s.exists) return null;
      const c = mapearConsultaFirestore(id,s.data()!);
      if (c.version !== version || c.paciente_id !== actual.paciente_id) throw incompatible(); return c;
    }, async porCita(id) {
      await preparar(); const s = await query(db.collection('consultas').where('cita_id','==',id).limit(2));
      if (s.size > 1) throw incompatible(); const d = s.docs[0]; return d ? mapearConsultaFirestore(d.id,d.data()) : null;
    }},
    citas: {porId: citaPorId, listar, async solapamientos(profesional,fecha,inicio,fin) {
      await preparar();
      await get(db.doc(`agenda_revisiones/${profesional}`));
      const s = await query(db.collection('citas').where('pediatra_id','==',profesional)
        .where('fecha_hora','>=',new Date(`${fecha}T00:00:00-06:00`)).where('fecha_hora','<',new Date(`${fecha}T23:59:59.999-06:00`)).limit(101));
      if (s.size > 100) throw new ErrorDominio('LIMITE_AGREGADO','La agenda diaria excede el límite de reserva.');
      const citas: Cita[] = []; for (const d of s.docs) {const c = await citaPorId(uuidPublico(d.id)); if (c && c.estado !== 'CANCELADA' && (c.hora_fin === null || c.hora_inicio < fin && c.hora_fin > inicio)) citas.push(c);}
      return citas;
    }},
    responsables: {async autorizacion(pacienteId,responsableId) {
      await preparar();
      const [v,r] = await Promise.all([get(db.doc(`pacientes/${pacienteId}/responsables/${responsableId}`)),get(db.doc(`responsables/${responsableId}`))]);
      if (!v.exists || !r.exists) return null;
      const d = r.data()!; const prefijo = `${d.tipo_documento}:`;
      const numero = d.identificacion.startsWith(prefijo) ? d.identificacion.slice(prefijo.length) : d.identificacion;
      return {activo: v.get('estado') === 'ACTIVO',autorizaAtencion: v.get('autoriza_atencion') === true,version: versionPositiva(v.get('revision')),
        documento: {tipo: d.tipo_documento,numero},nombre: `${d.nombres} ${d.apellidos}`};
    }},
  };
}

/** No realiza lecturas: Firestore exige resolverlas antes de la primera escritura. */
export async function aplicarCambiosClinicosFirestore(t: Transaction, db: Firestore, contexto: ContextoAutenticado,
  comando: ComandoEstable, cambios: readonly CambioPlanificado[]): Promise<void> {
  const cambioConsulta = cambios.find(c => c.agregado === 'consultas');
  const c = cambioConsulta?.nuevoEstado as Consulta | undefined;
  if (!c || cambios.filter(x=>x.agregado === 'consultas').length !== 1 || c.profesional.id !== contexto.cuenta.profesional?.id || !comando.caso.startsWith('consulta.')) throw incompatible();
  if (c.version !== (cambioConsulta!.versionAnterior ?? 0)+1) throw new ErrorDominio('VERSION_DESACTUALIZADA','Versión incompatible.');
  for (const cambio of cambios) {
    if (cambio.agregado === 'consultas' && cambio.tipo === 'GUARDAR') {
      const doc = documentoConsultaFirestore(c); const ref = db.doc(`consultas/${c.id}`);
      if (cambio.versionAnterior === null) t.create(ref,doc); else t.set(ref,doc);
      // Índice determinista por versión exacta; también la actual tiene snapshot inmutable.
      t.create(db.doc(`consultas/${c.id}/snapshots_v1/${c.version}`),doc);
    } else if (cambio.agregado === 'pacientes' && cambio.tipo === 'AVANZAR_REVISION') {
      if (cambio.recursoId !== c.paciente_id) throw incompatible();
      t.update(db.doc(`pacientes/${c.paciente_id}`),{revision: Number(cambio.versionAnterior)+1});
    } else if (cambio.agregado === 'citas' && cambio.tipo === 'GUARDAR') {
      const cita = cambio.nuevoEstado as Cita;
      if (cita.id !== c.cita_id || cita.paciente_id !== c.paciente_id || cita.profesional_id !== c.profesional.id) throw incompatible();
      t.update(db.doc(`citas/${cita.id}`),{revision: cita.version,estado: cita.estado === 'EN_CURSO' ? 'PROGRAMADA' : cita.estado});
    } else if (cambio.agregado === 'eventosHistorial' && cambio.tipo === 'CREAR') {
      const {pacienteId,...entrada} = cambio.nuevoEstado as Record<string,unknown>;
      const e = validarEventoHistorial(entrada,'CENTRO_MEDICO_PEDIATRICO');
      if (pacienteId !== c.paciente_id || e.consultaId !== c.id || e.versionConsulta !== c.version) throw incompatible();
      t.create(db.doc(`historial_eventos/${e.id}`),{id: e.id,paciente_id: pacienteId,tipo: e.tipo,fecha_hora: normalizarInstante(e.fechaHora),contenido: e});
    } else throw incompatible();
  }
}

export async function aplicarCambiosAgendaFirestore(t: Transaction, db: Firestore, _contexto: ContextoAutenticado,
  comando: ComandoEstable, cambios: readonly CambioPlanificado[]): Promise<void> {
  if (!comando.caso.startsWith('cita.')) throw incompatible();
  for (const cambio of cambios) {
    if (cambio.agregado === 'citas' && cambio.tipo === 'GUARDAR') {
      const c = cambio.nuevoEstado as Cita;
      const doc = validarDocumento<Record<string,unknown>>(`citas/${c.id}`, {revision:c.version,paciente_id:c.paciente_id,pediatra_id:c.profesional_id,
        fecha_hora:new Date(`${c.fecha}T${c.hora_inicio}:00-06:00`),motivo:c.motivo,estado:c.estado,fecha_creacion:new Date(c.fecha_creacion),
        ...(c.duracion_minutos === null ? {} : {fecha:c.fecha,hora_inicio:c.hora_inicio,hora_fin:c.hora_fin,duracion_minutos:c.duracion_minutos}),
        ...(c.consultorio ? {consultorio:c.consultorio} : {}),...(c.motivo_cancelacion ? {motivo_cancelacion:c.motivo_cancelacion} : {})});
      if (cambio.versionAnterior === null) t.create(db.doc(`citas/${c.id}`),doc); else t.set(db.doc(`citas/${c.id}`),doc);
      // Serializa también dos reservas de distintos pacientes para un pediatra.
      t.set(db.doc(`agenda_revisiones/${c.profesional_id}`),{ultima_intencion:comando.id});
    } else if (cambio.agregado === 'pacientes' && cambio.tipo === 'AVANZAR_REVISION') {
      t.update(db.doc(`pacientes/${cambio.recursoId}`),{revision:Number(cambio.versionAnterior)+1});
    } else throw incompatible();
  }
}
