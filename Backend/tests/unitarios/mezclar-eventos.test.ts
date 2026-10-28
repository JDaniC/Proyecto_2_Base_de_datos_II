import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mezclarEventos, type FuenteHistorial } from '../../src/aplicacion/casos-uso/historiales/mezclar-eventos.js';

const pacienteId = '00000000-0000-4000-8000-000000000001';
const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const evento = (n: number, fechaHora = '2026-01-01T00:00:00Z') => ({ id: id(n), fechaHora });
const fuente = (filas: readonly ReturnType<typeof evento>[]): FuenteHistorial<ReturnType<typeof evento>> => ({
  async leer({ cantidad }) { return filas.slice(0, cantidad); },
});

describe('mezcla acotada de historial', () => {
  it('combina fuentes y desempata por UUID en ambas direcciones', async () => {
    const asc = await mezclarEventos({ pacienteId, orden: 'ASC', limite: 2, fuentes: [fuente([evento(1), evento(3)]), fuente([evento(2), evento(4)])] });
    assert.deepEqual(asc.elementos.map((e) => e.id), [id(1), id(2)]);
    assert.equal(asc.hayMas, true);
    const desc = await mezclarEventos({ pacienteId, orden: 'DESC', limite: 3, fuentes: [fuente([evento(4), evento(2)]), fuente([evento(3), evento(1)])] });
    assert.deepEqual(desc.elementos.map((e) => e.id), [id(4), id(3), id(2)]);
  });
  it('pagina un conjunto estable sin omitir ni duplicar empates', async () => {
    const fuentes = [[evento(1), evento(3), evento(5)], [evento(2), evento(4), evento(6)]].map((filas): FuenteHistorial<ReturnType<typeof evento>> => ({
      async leer({ despues, cantidad }) { return filas.filter((e) => !despues || e.id > despues.id).slice(0, cantidad); },
    }));
    const ids: string[] = [];
    let despues: ReturnType<typeof evento> | undefined;
    let hayMas = true;
    while (hayMas) {
      const pagina = await mezclarEventos({ pacienteId, orden: 'ASC', limite: 2, fuentes, ...(despues ? { despues } : {}) });
      ids.push(...pagina.elementos.map((e) => e.id));
      despues = pagina.elementos.at(-1);
      hayMas = pagina.hayMas;
    }
    assert.deepEqual(ids, [1, 2, 3, 4, 5, 6].map(id));
  });
  it('compara fracciones de segundo sin perder precisión', async () => {
    const r = await mezclarEventos({ pacienteId, orden: 'ASC', limite: 5, fuentes: [fuente([evento(2, '2026-01-01T00:00:00.000000002Z')]), fuente([evento(1, '2026-01-01T00:00:00.000000001Z')])] });
    assert.deepEqual(r.elementos.map((e) => e.id), [id(1), id(2)]);
    assert.equal(r.hayMas, false);
  });
  it('rechaza límites y rangos inválidos antes de leer', async () => {
    let lecturas = 0;
    const f: FuenteHistorial<ReturnType<typeof evento>> = { async leer() { lecturas++; return []; } };
    for (const limite of [0, 101, 1.5]) await assert.rejects(mezclarEventos({ pacienteId, orden: 'ASC', limite, fuentes: [f] }));
    await assert.rejects(mezclarEventos({ pacienteId, orden: 'ASC', limite: 1, desde: '2026-01-01T00:00:00Z', hasta: '2026-01-01T00:00:00.0Z', fuentes: [f] }));
    assert.equal(lecturas, 0);
  });
  it('falla cerrado ante desorden, duplicados y errores de fuente', async () => {
    await assert.rejects(mezclarEventos({ pacienteId, orden: 'ASC', limite: 3, fuentes: [fuente([evento(2), evento(1)])] }));
    await assert.rejects(mezclarEventos({ pacienteId, orden: 'ASC', limite: 3, fuentes: [fuente([evento(1)]), fuente([evento(1)])] }));
    await assert.rejects(mezclarEventos({ pacienteId, orden: 'ASC', limite: 3, fuentes: [{ async leer() { throw new Error('sin conexión'); } }] }));
  });
});
