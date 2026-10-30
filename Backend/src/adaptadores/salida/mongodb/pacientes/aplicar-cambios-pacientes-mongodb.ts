import { validarEventoHistorial } from '../../historial/proyeccion-historial.js';
import { normalizarInstante } from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import type { ClientSession, Db, UpdateFilter } from 'mongodb';
import { Long } from 'mongodb';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { Paciente } from '../../../../dominio/clinica/paciente.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { normalizarTextoBusqueda } from '../../../../dominio/compartido/normalizacion.js';
import { clavesNombre, identidadMongo, idContacto, idReservaMongo, mapearPacienteMongodb, type DocumentoPacienteMongo } from './mapear-paciente-mongodb.js';

const invalido = () => new ErrorDominio('ESTADO_INVALIDO', 'El plan de pacientes no es compatible con esta operación.');

export async function aplicarCambiosPacientesMongodb(
  db: Db, session: ClientSession, contexto: ContextoAutenticado, comando: ComandoEstable,
  cambios: readonly CambioPlanificado[], originales: ReadonlyMap<string, DocumentoPacienteMongo>,
): Promise<void> {
  if (comando.caso === 'historial.archivar' && contexto.cuenta.institucion === 'LABORATORIO_CLINICO') {
    for (const cambio of cambios) {
      if (cambio.agregado === 'eventosHistorial') {
        const {pacienteId, ...entrada} = cambio.nuevoEstado as Record<string, unknown>;
        const evento = validarEventoHistorial(entrada, 'LABORATORIO_CLINICO');
        await db.collection<{_id: string} & Record<string, unknown>>('historial_eventos').insertOne({_id: evento.id,
          paciente_id: pacienteId, tipo: evento.tipo, fecha_hora: normalizarInstante(evento.fechaHora), contenido: evento}, {session});
        continue;
      }
      const actual = cambio.nuevoEstado as Paciente;
      const original = originales.get(cambio.recursoId);
      if (cambio.agregado !== 'estadoHistorial' || cambio.tipo !== 'archivar' || !actual.baja ||
          !original || Number(original.revision) !== cambio.versionAnterior || actual.version !== Number(cambio.versionAnterior) + 1) throw invalido();
      const r = await db.collection<DocumentoPacienteMongo>('pacientes').updateOne({_id: actual.id, revision: original.revision},
        {$set: {revision: actual.version, activo: false, 'historial.estado': 'ARCHIVADO',
          'historial.baja': {causa: actual.baja.causa, motivo: actual.baja.motivo, fecha: new Date(actual.baja.fecha), actor_id: actual.baja.actorId}}}, {session});
      if (r.matchedCount !== 1) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente cambió.');
    }
    return;
  }
  if (contexto.cuenta.institucion !== 'LABORATORIO_CLINICO' ||
      !['paciente.registrar', 'paciente.actualizar'].includes(comando.caso)) throw invalido();
  const aperturas = cambios.filter((c) => c.agregado === 'historiales' && c.tipo === 'APERTURA');
  for (const cambio of cambios) {
    if (cambio.agregado === 'pacientes') {
      const p = cambio.nuevoEstado as Paciente;
      if (p.id !== cambio.recursoId || p.institucion !== 'LABORATORIO_CLINICO' || !Number.isSafeInteger(p.version)) throw invalido();
      if (cambio.tipo === 'CREAR' && cambio.versionAnterior === null && p.version === 1) {
        const apertura = aperturas.find((a) => (a.nuevoEstado as {pacienteId: string}).pacienteId === p.id);
        if (!apertura || p.estado !== 'ACTIVO' || p.fechaNacimiento === null || p.sexo === null) throw invalido();
        const doc: DocumentoPacienteMongo = {
          _id: p.id, revision: 1, codigo_paciente: p.codigoLegible,
          primer_nombre: p.nombres, primer_apellido: p.apellidos,
          nombre_busqueda: normalizarTextoBusqueda(`${p.nombres} ${p.apellidos}`), claves_nombre: clavesNombre(p.nombres, p.apellidos),
          fecha_nacimiento: new Date(`${p.fechaNacimiento}T00:00:00.000Z`), sexo_referencia: p.sexo,
          ...(p.identificacion ? { tipo_documento: p.identificacion.tipo, numero_documento: p.identificacion.numero, numero_busqueda: identidadMongo(p.identificacion.tipo, p.identificacion.numero).numero_documento } : {}),
          ...(p.direccion !== undefined ? {direccion: p.direccion} : {}),
          contactos: [
            ...(p.telefono !== undefined ? [{contacto_id: idContacto(p.id, 'TELEFONO'), tipo: 'TELEFONO' as const, valor: p.telefono, es_principal: true}] : []),
            ...(p.correo !== undefined ? [{contacto_id: idContacto(p.id, 'CORREO'), tipo: 'CORREO' as const, valor: p.correo, es_principal: true}] : []),
          ],
          fecha_registro: new Date(p.fechaRegistro), activo: true,
          historial: { id_historial: apertura.recursoId, numero_historial: `H-${apertura.recursoId}`, fecha_apertura: new Date(comando.instante), estado: 'ACTIVO' },
        };
        await db.collection<DocumentoPacienteMongo>('pacientes').insertOne(doc, {session});
      } else if (cambio.tipo === 'ACTUALIZAR' && cambio.versionAnterior !== null) {
        const original = originales.get(p.id);
        if (!original || original.revision !== cambio.versionAnterior || p.version !== cambio.versionAnterior + 1) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente fue modificado por otra transacción.');
        }
        const anterior = mapearPacienteMongodb(original);
        if (p.codigoLegible !== anterior.codigoLegible || p.fechaRegistro !== anterior.fechaRegistro ||
            p.estado !== anterior.estado || p.estado !== 'ACTIVO') throw invalido();
        const set: Record<string, unknown> = {revision: p.version > 2_147_483_647 ? Long.fromNumber(p.version) : p.version};
        const unset: Record<string, ''> = {};
        const opcional = (campo: string, valor: unknown) => { if (valor === undefined || valor === null) unset[campo] = ''; else set[campo] = valor; };
        if (p.nombres !== anterior.nombres) { set.primer_nombre = p.nombres; unset.segundo_nombre = ''; }
        if (p.apellidos !== anterior.apellidos) { set.primer_apellido = p.apellidos; unset.segundo_apellido = ''; }
        if (p.nombres !== anterior.nombres || p.apellidos !== anterior.apellidos) {
          set.nombre_busqueda = normalizarTextoBusqueda(`${p.nombres} ${p.apellidos}`);
          set.claves_nombre = clavesNombre(p.nombres, p.apellidos);
        }
        if (p.fechaNacimiento !== anterior.fechaNacimiento) opcional('fecha_nacimiento', p.fechaNacimiento ? new Date(`${p.fechaNacimiento}T00:00:00.000Z`) : undefined);
        if (p.sexo !== anterior.sexo) opcional('sexo_referencia', p.sexo);
        if (p.direccion !== anterior.direccion) opcional('direccion', p.direccion);
        if (JSON.stringify(p.identificacion) !== JSON.stringify(anterior.identificacion)) {
          const id = p.identificacion ? identidadMongo(p.identificacion.tipo, p.identificacion.numero) : undefined;
          opcional('tipo_documento', p.identificacion?.tipo); opcional('numero_documento', p.identificacion?.numero); opcional('numero_busqueda', id?.numero_documento);
        }
        let contactos = original.contactos.map((c) => ({...c}));
        for (const [tipo, valor, previo] of [['TELEFONO', p.telefono, anterior.telefono], ['CORREO', p.correo, anterior.correo]] as const) {
          if (valor === previo) continue;
          let elegido = false;
          contactos = contactos.flatMap((c) => {
            if (c.tipo !== tipo || !c.es_principal) return [c];
            if (!elegido) { elegido = true; return valor === undefined ? [] : [{...c, valor}]; }
            return [{...c, es_principal: false}];
          });
          if (!elegido && valor !== undefined) contactos.push({contacto_id: idContacto(p.id, `${tipo}:${comando.id}`), tipo, valor, es_principal: true});
          set.contactos = contactos;
        }
        const update = { $set: set, ...(Object.keys(unset).length ? {$unset: unset} : {}) } as UpdateFilter<DocumentoPacienteMongo>;
        const result = await db.collection<DocumentoPacienteMongo>('pacientes').updateOne({_id: p.id, revision: cambio.versionAnterior, activo: true}, update, {session});
        if (result.matchedCount !== 1) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente fue modificado por otra transacción.');
      } else throw invalido();
    } else if (cambio.agregado === 'identidades') {
      const estado = cambio.nuevoEstado as {identificacion: {tipo: string; numero: string}; titularId?: string};
      if (estado.titularId !== undefined && estado.titularId !== cambio.recursoId) throw invalido();
      const identificacion = identidadMongo(estado.identificacion.tipo, estado.identificacion.numero);
      const filtro = {...identificacion, paciente_id: cambio.recursoId};
      if (cambio.tipo === 'RESERVAR') {
        await db.collection<{_id: string}>('identidades_paciente').updateOne(filtro, {$setOnInsert: {
          _id: idReservaMongo(identificacion.tipo_documento, identificacion.numero_documento), revision: 1,
          ...filtro, fecha_registro: new Date(comando.instante),
        }}, {session, upsert: true});
      } else if (cambio.tipo === 'LIBERAR') {
        const mismaReserva = cambios.some((c) => {
          if (c.agregado !== 'identidades' || c.tipo !== 'RESERVAR' || c.recursoId !== cambio.recursoId) return false;
          const siguiente = (c.nuevoEstado as {identificacion: {tipo: string; numero: string}}).identificacion;
          return JSON.stringify(identidadMongo(siguiente.tipo, siguiente.numero)) === JSON.stringify(identificacion);
        });
        if (mismaReserva) continue;
        const result = await db.collection('identidades_paciente').deleteOne(filtro, {session});
        if (result.deletedCount !== 1) throw new ErrorDominio('ESTADO_INVALIDO', 'La reserva de identidad no corresponde al paciente.');
      } else throw invalido();
    } else if (cambio.agregado === 'historiales' && cambio.tipo === 'APERTURA') {
      if (!cambios.some((c) => c.agregado === 'pacientes' && c.tipo === 'CREAR' && c.recursoId === (cambio.nuevoEstado as {pacienteId: string}).pacienteId)) throw invalido();
    } else throw invalido();
  }
}
