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
    crearLector: () => estado.lector,
    aplicarCambios: async () => undefined,
  }).ejecutar(contexto, comando, async () => plan);

  assert.deepEqual(resultado, plan.resultado);
  assert.equal(estado.adquisiciones, 2);
  assert.equal(estado.liberaciones, 2);
});

test('UoW SQL: también reconcilia EPIPE como pérdida del acuse de COMMIT', async () => {
  const estado = crearPoolSimulado('ack_epipe');
  const resultado = await crearUnidadDeTrabajoSql({
    dialecto: 'postgresql', pool: estado.pool,
    crearLector: () => estado.lector,
    aplicarCambios: async () => undefined,
  }).ejecutar(contexto, comando, async () => plan);
  assert.deepEqual(resultado, plan.resultado);
  assert.equal(estado.adquisiciones, 2);
  assert.equal(estado.liberaciones, 2);
});

test('UoW SQL: conserva el error de constraint definitivo devuelto por COMMIT', async () => {
  const estado = crearPoolSimulado('constraint_commit');
  await assert.rejects(
    crearUnidadDeTrabajoSql({
      dialecto: 'postgresql', pool: estado.pool,
      crearLector: () => estado.lector,
      aplicarCambios: async () => undefined,
    }).ejecutar(contexto, comando, async () => plan),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'ESTADO_INVALIDO',
  );
  assert.equal(estado.adquisiciones, 1);
  assert.equal(estado.liberaciones, 1);
});

test('UoW SQL: traduce SIGNAL de MySQL a conflicto de estado sin reconciliar como 503', async () => {
  const estado = crearPoolSimulado('ok');
  await assert.rejects(
    crearUnidadDeTrabajoSql({
      dialecto: 'mysql', pool: estado.pool,
    crearLector: () => estado.lector,
      aplicarCambios: async () => {
        throw Object.assign(new Error('mensaje SQL interno'), {
          code: 'ER_SIGNAL_EXCEPTION', sqlState: '45000', errno: 1644,
        });
      },
    }).ejecutar(contexto, comando, async () => plan),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'ESTADO_INVALIDO',
  );
  assert.equal(estado.adquisiciones, 1);
  assert.equal(estado.liberaciones, 1);
});

test('UoW SQL: bloquea el replay cuando la cuenta perdió permisos desde el contexto verificado', async () => {
  const contextoConPermiso = crearContextoAutenticado(
    { uid: contexto.identidad.uid, institucion: contexto.identidad.institucion, emitidoEn: contexto.identidad.emitidoEn },
    { ...contexto.cuenta, permisos: ['consultas.registrar'] },
    contexto.correlacion,
  );
  const estado = crearPoolSimulado('replay_permission_revoked');
  await assert.rejects(
    crearUnidadDeTrabajoSql({
      dialecto: 'postgresql', pool: estado.pool,
      crearLector: () => estado.lector,
      aplicarCambios: async () => undefined,
    }).ejecutar(contextoConPermiso, comando, async () => plan),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SIN_PERMISO',
  );
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

function crearPoolSimulado(modo: 'acuse_perdido' | 'ack_epipe' | 'constraint_commit' | 'replay_permission_revoked' | 'ok') {
  let adquirida = false;
  let liberaciones = 0;
  let adquisiciones = 0;
  let commits = 0;
  let operacionDurable: Record<string, unknown> | undefined = modo === 'replay_permission_revoked'
    ? { hash_entrada: comando.hashEntrada, codigo_respuesta: 200, respuesta: { respuesta: plan.resultado.respuesta, correlacionOriginal: contexto.correlacion } }
    : undefined;
  const cuentaActual = modo === 'replay_permission_revoked'
    ? { ...contexto.cuenta, permisos: [] }
    : contexto.cuenta;
  const lector = {
    cuentas: { porUid: async () => cuentaActual },
  } as unknown as LectorTransaccional;

  const pool: PoolSql = {
    async consultar<TRow extends Record<string, unknown>>(): Promise<ResultadoConsultaSql<TRow>> { return { filas: [] }; },
    async adquirir(): Promise<ConexionSql> {
      assert.equal(adquirida, false);
      adquirida = true;
      adquisiciones += 1;
      return {
        async consultar<TRow extends Record<string, unknown>>(sentencia: string, parametros: readonly unknown[] = []): Promise<ResultadoConsultaSql<TRow>> {
          if (sentencia.includes('SELECT id_usuario AS actor_id')) return { filas: [{ actor_id: 7 } as unknown as TRow] };
          if (sentencia.includes('SELECT hash_entrada')) return { filas: (operacionDurable === undefined ? [] : [operacionDurable]) as TRow[] };
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
          commits += 1;
          if (commits === 1 && modo === 'acuse_perdido') throw Object.assign(new Error('socket cerrado'), { code: 'ECONNRESET' });
          if (commits === 1 && modo === 'ack_epipe') throw Object.assign(new Error('pipe cerrado'), { code: 'EPIPE' });
          if (commits === 1 && modo === 'constraint_commit') throw Object.assign(new Error('check constraint'), { code: '23514', severity: 'ERROR' });
        },
        revertir: async () => undefined,
        liberar: () => { liberaciones += 1; adquirida = false; },
      };
    },
    cerrar: async () => undefined,
  };
  return { pool, lector, get adquisiciones() { return adquisiciones; }, get liberaciones() { return liberaciones; } };
}
