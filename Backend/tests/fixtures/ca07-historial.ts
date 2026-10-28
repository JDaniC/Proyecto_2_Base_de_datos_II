import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import { ConsultarHistorial, normalizarInstante } from '../../src/aplicacion/casos-uso/historiales/consultar-historial.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import { tiposInstitucion, type EventoHistorial, type FiltrosHistorial } from '../../src/aplicacion/puertos/historial.js';
import { CursorHistorialCifrado } from '../../src/adaptadores/salida/historial/cursor-historial.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
export const fallo = (codigo: string) => (e: unknown) => e instanceof ErrorDominio && e.codigo === codigo;
export function contextoCA07(bundle: BundleInstitucional, lectura = true) {
  const uid = `ca07-${randomUUID()}`;
  return crearContextoAutenticado({ uid, institucion: bundle.institucion, emitidoEn: instanteUtc('2026-10-28T12:00:00Z') },
    { id: uuidPublico(randomUUID()), uid, institucion: bundle.institucion, estado: 'ACTIVA', roles: lectura ? ['ADMIN_INSTITUCIONAL'] : ['SECRETARIA'], permisos: lectura ? ['historial.leer'] : ['pacientes.administrar'], version: versionPositiva(1) }, uuidPublico(randomUUID()));
}
export function eventosCA07(bundle: BundleInstitucional): EventoHistorial[] {
  return tiposInstitucion(bundle.institucion).flatMap((tipo, i) => [0, 1].map((n) => ({
    id: `00000000-0000-4000-8000-${String(i * 2 + n + 1).padStart(12, '0')}`,
    tipo, fechaHora: normalizarInstante(n ? '2026-01-02T12:00:00Z' : '2026-01-01T12:00:00Z'),
    recursoId: randomUUID(), titulo: `Evento ${tipo}`,
    ...(['CONSULTA', 'DIAGNOSTICO', 'TRATAMIENTO', 'RECETA'].includes(tipo) ? { versionConsulta: 1, ...(tipo === 'CONSULTA' ? {} : { consultaId: randomUUID() }) } : {}),
    profesional: { id: randomUUID(), nombre: 'Profesional sintético', rol: bundle.institucion === 'CLINICA_ODONTOLOGICA' ? 'ODONTOLOGO' : bundle.institucion === 'CENTRO_MEDICO_PEDIATRICO' ? 'PEDIATRA' : bundle.institucion === 'LABORATORIO_CLINICO' ? 'MEDICO_LABORATORIO' : 'MEDICO', activo: true as const },
  })));
}
export async function verificarCA07(t: TestContext, bundle: BundleInstitucional, pacienteId: string, eventos: EventoHistorial[], insertar?: (e: EventoHistorial) => Promise<void>) {
  const servicio = new ConsultarHistorial(new CursorHistorialCifrado(() => 'clave-sintetica-aislada-ca07-de-32-caracteres'));
  const contexto = contextoCA07(bundle);
  const leer = (entrada: FiltrosHistorial = {}, expediente = false) => servicio.ejecutar(contexto, bundle, pacienteId, entrada, expediente);
  const ordenar = (filas: readonly EventoHistorial[]) => [...filas].sort((a, b) => a.fechaHora < b.fechaHora ? -1 : a.fechaHora > b.fechaHora ? 1 : a.id < b.id ? -1 : 1).map((e) => e.id);
  async function paginas(entrada: FiltrosHistorial) {
    const ids: string[] = []; let cursor: string | undefined;
    do {
      const r = await leer({ ...entrada, ...(cursor === undefined ? {} : { cursor }) });
      const hist = 'eventos' in r.data ? r.data : r.data.historial;
      ids.push(...hist.eventos.map((e) => e.id));
      cursor = r.meta.siguiente_cursor;
      assert.ok(ids.length <= eventos.length + 1, 'la paginación debe terminar');
    } while (cursor);
    return ids;
  }
  await t.test('CA07 páginas ASC/DESC sin omisiones, tipos institucionales y fechas empatadas', async () => {
    for (const limite of [1, 3, 20, 100]) {
      assert.deepEqual(await paginas({ limite, orden: 'ASC' }), ordenar(eventos));
      assert.deepEqual(await paginas({ limite, orden: 'DESC' }), ordenar(eventos).reverse());
    }
    for (const tipo of tiposInstitucion(bundle.institucion)) {
      assert.deepEqual(await paginas({ limite: 1, tipo }), ordenar(eventos.filter((e) => e.tipo === tipo)));
    }
  });
  await t.test('CA07 rango semiabierto, vacío de resultados y expediente acotado', async () => {
    const desde = '2026-01-01T12:00:00Z', hasta = '2026-01-02T12:00:00Z';
    assert.deepEqual(await paginas({ desde, hasta, limite: 2 }), ordenar(eventos.filter((e) => e.fechaHora < normalizarInstante(hasta))));
    assert.deepEqual(await paginas({ desde: '2027-01-01T00:00:00Z' }), []);
    const r = await leer({ limite: 1 }, true);
    assert.ok('historial' in r.data); assert.equal(r.data.paciente.id, pacienteId); assert.equal(r.data.historial.eventos.length, 1);
    assert.ok(r.meta.siguiente_cursor);
    const h = r.data.historial.eventos[0]!;
    assert.ok(!('contenido' in h)); assert.ok(!('paciente_id' in h));
  });
  await t.test('CA07 entradas inválidas y cursor ligado a cuenta, permisos, paciente, filtros y recurso', async () => {
    for (const entrada of [{ limite: 0 }, { limite: 101 }, { limite: 1.1 }, { desde: 'invalida' }, { desde: '2026-01-01T00:00:00Z', hasta: '2026-01-01T00:00:00.0Z' }, { cursor: '' }, { cursor: 'a'.repeat(2049) }]) {
      await assert.rejects(leer(entrada), fallo('SOLICITUD_INVALIDA'));
    }
    const r = await leer({ limite: 1 }); const cursor = r.meta.siguiente_cursor!; assert.ok(cursor);
    await assert.rejects(leer({ limite: 1, cursor: cursor.slice(0, -2) + 'aa' }), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(leer({ limite: 1, orden: 'DESC', cursor }), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(leer({ limite: 1, tipo: 'ARCHIVO', cursor }), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(leer({ limite: 1, desde: '2026-01-01T00:00:00Z', cursor }), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(leer({ limite: 1, cursor }, true), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(servicio.ejecutar(contextoCA07(bundle), bundle, pacienteId, { limite: 1, cursor }), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(servicio.ejecutar({ ...contexto, cuenta: { ...contexto.cuenta, permisos: ['historial.leer', 'auditoria.leer'] } }, bundle, pacienteId, { limite: 1, cursor }), fallo('SOLICITUD_INVALIDA'));
    await assert.rejects(servicio.ejecutar(contexto, bundle, randomUUID(), { limite: 1, cursor }), fallo('SOLICITUD_INVALIDA'));
  });
  await t.test('CA07 recepción sin permiso clínico, inexistente, fallo operativo e índice ausente', async () => {
    await assert.rejects(servicio.ejecutar(contextoCA07(bundle, false), bundle, pacienteId, {}), fallo('SIN_PERMISO'));
    await assert.rejects(servicio.ejecutar(contexto, bundle, randomUUID(), {}), fallo('RECURSO_NO_ENCONTRADO'));
    const caido = { ...bundle, historial: { ...bundle.historial!, verificarPreparacion: async () => { throw new Error('índice o dependencia no disponible'); } } };
    await assert.rejects(servicio.ejecutar(contexto, caido, pacienteId, {}), fallo('PERSISTENCIA_NO_DISPONIBLE'));
    const consultaCaida = { ...bundle, historial: { ...bundle.historial!, fuentes: bundle.historial!.fuentes.map((f, i) => i ? f : { ...f, fuente: { leer: async () => { throw new Error('timeout'); } } }) } };
    await assert.rejects(servicio.ejecutar(contexto, consultaCaida, pacienteId, {}), fallo('PERSISTENCIA_NO_DISPONIBLE'));
  });
  if (insertar) await t.test('CA07 escritura entre páginas y recarga sin prometer snapshot', async () => {
    const primera = await leer({ limite: 1 });
    const anterior: EventoHistorial = { id: randomUUID(), fechaHora: normalizarInstante('2025-01-01T00:00:00Z'), tipo: 'ARCHIVO', recursoId: pacienteId, titulo: 'Anterior a cursor' };
    const posterior: EventoHistorial = { ...anterior, id: randomUUID(), fechaHora: normalizarInstante('2028-01-01T00:00:00Z'), titulo: 'Posterior a cursor' };
    await insertar(anterior); await insertar(posterior);
    const segunda = await leer({ limite: 1, cursor: primera.meta.siguiente_cursor! });
    const hist1 = 'eventos' in primera.data ? primera.data : primera.data.historial;
    const hist2 = 'eventos' in segunda.data ? segunda.data : segunda.data.historial;
    assert.notEqual(hist1.eventos[0]!.id, hist2.eventos[0]!.id);
    assert.notEqual(hist2.eventos[0]!.id, anterior.id);
    const recarga = await leer({ limite: 100 });
    const historial = 'eventos' in recarga.data ? recarga.data : recarga.data.historial;
    assert.equal(historial.eventos.length, eventos.length + 2);
    assert.equal(historial.eventos[0]!.id, anterior.id);
    assert.equal(historial.eventos.at(-1)!.id, posterior.id);
  });

}
