import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { prepararComandoEstable } from '../../src/aplicacion/servicios/preparar-comando-estable.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';

const UUIDS = [
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440012',
].map((valor) => uuidPublico(valor));
const INSTANTE = instanteUtc('2026-10-25T12:00:00Z');

describe('preparación de comando estable', () => {
  it('canoniza y hashea el DTO validado y fija ID/instante antes de la UoW', async () => {
    const recibidos: string[] = [];
    let indice = 0;
    const comando = await prepararComandoEstable(
      uuidPublico('550e8400-e29b-41d4-a716-446655440099'),
      'registrar-paciente',
      { nombre: 'Ana', paciente: { version: 1, id: 'abc' } },
      ['paciente', 'evento'],
      {
        ids: { nuevo: () => UUIDS[indice++] ?? UUIDS[0]! },
        reloj: { ahora: () => INSTANTE },
        hash: { sha256: async (texto) => { recibidos.push(texto); return 'a'.repeat(64); } },
      },
    );
    assert.deepEqual(recibidos, ['{"nombre":"Ana","paciente":{"id":"abc","version":1}}']);
    assert.equal(comando.hashEntrada, 'a'.repeat(64));
    assert.equal(comando.id, UUIDS[0]);
    assert.equal(comando.ids.paciente, UUIDS[1]);
    assert.equal(comando.ids.evento, UUIDS[2]);
    assert.equal(comando.instante, INSTANTE);
    assert.equal(Object.isFrozen(comando), true);
    assert.equal(Object.isFrozen(comando.ids), true);
  });

  it('rechaza caso vacío, IDs duplicados, claves inválidas y SHA mal formado', async () => {
    const dependencias = {
      ids: { nuevo: () => UUIDS[0]! },
      reloj: { ahora: () => INSTANTE },
      hash: { sha256: async () => 'bad' },
    };
    const clave = uuidPublico('550e8400-e29b-41d4-a716-446655440099');
    await assert.rejects(() => prepararComandoEstable(clave, ' ', {}, [], dependencias), ErrorDominio);
    await assert.rejects(() => prepararComandoEstable(clave, 'alta', {}, ['id', ' id '], dependencias), ErrorDominio);
    await assert.rejects(() => prepararComandoEstable(clave, 'alta', {}, [], dependencias), ErrorDominio);
    await assert.rejects(() => prepararComandoEstable('mal-clave' as never, 'alta', {}, [], {
      ...dependencias,
      ids: { nuevo: (() => { let n = 0; return () => UUIDS[n++]!; })() },
      hash: { sha256: async () => 'a'.repeat(64) },
    }), ErrorDominio);
  });
});
