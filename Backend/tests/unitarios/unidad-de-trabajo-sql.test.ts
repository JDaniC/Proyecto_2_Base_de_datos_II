import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { ComandoEstable, LectorTransaccional, PlanConfirmacion } from '../../src/aplicacion/puertos/nucleo.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { crearUnidadDeTrabajoSql } from '../../src/adaptadores/salida/sql/unidad-de-trabajo-sql.js';
import type { ConexionSql, PoolSql, ResultadoConsultaSql } from '../../src/adaptadores/salida/sql/tipos-sql.js';

test('UoW SQL: libera la conexión antes de reconciliar un COMMIT con acuse perdido', async () => {
  const estado = crearPoolSimulado('acuse_perdido');
  const resultado = await crearUnidadDeTrabajoSql({
    dialecto: 'postgresql', pool: estado.pool,
    crearLector: () => ({}) as LectorTransaccional,
    aplicarCambios: async () => undefined,
  }).ejecutar(contexto, comando, async () => plan);

  assert.deepEqual(resultado, plan.resultado);
  assert.equal(estado.consultasPoolDespuesDeLiberar, 2);
  assert.equal(estado.liberaciones, 1);
});

test('UoW SQL: conserva el error de constraint definitivo devuelto por COMMIT', async () => {
  const estado = crearPoolSimulado('constraint_commit');
  await assert.rejects(
    crearUnidadDeTrabajoSql({
      dialecto: 'postgresql', pool: estado.pool,
      crearLector: () => ({}) as LectorTransaccional,
      aplicarCambios: async () => undefined,
    }).ejecutar(contexto, comando, async () => plan),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'ESTADO_INVALIDO',
  );
  assert.equal(estado.consultasPoolDespuesDeLiberar, 0);
  assert.equal(estado.liberaciones, 1);
});

test('UoW SQL: traduce SIGNAL de MySQL a conflicto de estado sin reconciliar como 503', async () => {
  const estado = crearPoolSimulado('ok');
  await assert.rejects(
    crearUnidadDeTrabajoSql({
      dialecto: 'mysql', pool: estado.pool,
      crearLector: () => ({}) as LectorTransaccional,
      aplicarCambios: async () => {
        throw Object.assign(new Error('mensaje SQL interno'), {
          code: 'ER_SIGNAL_EXCEPTION', sqlState: '45000', errno: 1644,
        });
      },
    }).ejecutar(contexto, comando, async () => plan),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'ESTADO_INVALIDO',
  );
  assert.equal(estado.consultasPoolDespuesDeLiberar, 0);
  assert.equal(estado.liberaciones, 1);
});

const contexto = crearContextoAutenticado(
  { uid: 'uid-sintetico', institucion: 'HOSPITAL_GENERAL', emitidoEn: instanteUtc('2026-10-25T18:00:00Z') },
  {
    id: uuidPublico('10000000-0000-4000-8000-000000000001'), uid: 'uid-sintetico',
    institucion: 'HOSPITAL_GENERAL', estado: 'ACTIVA', roles: [], permisos: [], version: versionPositiva(1),
  },
  uuidPublico('10000000-0000-4000-8000-000000000002'),
);
const comando: ComandoEstable = {
  id: uuidPublico('10000000-0000-4000-8000-000000000003'),
  claveIdempotencia: uuidPublico('10000000-0000-4000-8000-000000000004'),
  caso: 'TEST_UOW_COMMIT', hashEntrada: 'a'.repeat(64),
  instante: instanteUtc('2026-10-25T18:00:00Z'), ids: Object.freeze({}),
};
const plan: PlanConfirmacion<{ ok: boolean }> = {
  tipo: 'CONFIRMAR', cambios: [], revisiones: [], auditoria: [],
  resultado: { httpStatus: 200, respuesta: { ok: true }, correlacionOriginal: contexto.correlacion },
};

function crearPoolSimulado(modo: 'acuse_perdido' | 'constraint_commit' | 'ok') {
  let adquirida = false;
  let liberaciones = 0;
  let consultasPoolDespuesDeLiberar = 0;
  let operacionDurable: Record<string, unknown> | undefined;

  const pool: PoolSql = {
    async consultar<TRow extends Record<string, unknown>>(sentencia: string): Promise<ResultadoConsultaSql<TRow>> {
      assert.equal(adquirida, false, 'la reconciliación no puede usar el pool mientras retiene la conexión transaccional');
      consultasPoolDespuesDeLiberar += 1;
      const filas = sentencia.includes('FROM usuario')
        ? [{ actor_id: 7 }]
        : operacionDurable === undefined ? [] : [operacionDurable];
      return { filas: filas as TRow[] };
    },
    async adquirir(): Promise<ConexionSql> {
      assert.equal(adquirida, false);
      adquirida = true;
      return {
        async consultar<TRow extends Record<string, unknown>>(sentencia: string, parametros: readonly unknown[] = []): Promise<ResultadoConsultaSql<TRow>> {
          if (sentencia.includes('SELECT id_usuario AS actor_id')) return { filas: [{ actor_id: 7 } as unknown as TRow] };
          if (sentencia.includes('SELECT hash_entrada')) return { filas: [] };
          if (sentencia.includes('INSERT INTO operaciones')) {
            operacionDurable = {
              hash_entrada: parametros[4], codigo_respuesta: parametros[5],
              respuesta: JSON.parse(String(parametros[6])) as unknown,
            };
          }
          return { filas: [] };
        },
        iniciar: async () => undefined,
        confirmar: async () => {
          if (modo === 'acuse_perdido') throw Object.assign(new Error('socket cerrado'), { code: 'ECONNRESET' });
          if (modo === 'constraint_commit') throw Object.assign(new Error('check constraint'), { code: '23514' });
        },
        revertir: async () => undefined,
        liberar: () => { liberaciones += 1; adquirida = false; },
      };
    },
    cerrar: async () => undefined,
  };
  return { pool, get liberaciones() { return liberaciones; }, get consultasPoolDespuesDeLiberar() { return consultasPoolDespuesDeLiberar; } };
}
