import { describe, expect, it, vi } from 'vitest';
import { createHttpLaboratoryRepository } from '../../services/http/laboratory/httpLaboratoryRepository';
import { createHttpCatalogRepository } from '../../services/http/catalogs/httpCatalogRepository';
import { HttpClient } from '../../services/http/httpClient';
import { HttpError } from '../../services/http/errors';

const institucion = 'LABORATORIO_CLINICO' as const;
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const client = () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }) as unknown as HttpClient;
const orden = {
  id: id(1), pacienteId: id(2), solicitanteId: id(3), instante: '2026-11-07T12:00:00.000Z',
  prioridad: 'RUTINA', indicaciones: 'Control', estado: 'CREADA', version: 2,
  items: [{ id: id(4), prueba: { id: id(5), codigo: 'GLU', nombre: 'Glucosa', version: 1, metodoId: id(6), tiposMuestraIds: [id(7)], parametros: [{ id: id(8), codigo: 'GLU', nombre: 'Glucosa', tipo: 'NUMERICO', unidad: 'mg/dL' }] }, precio: { centavos: 2500, moneda: 'GTQ' }, estado: 'SOLICITADO' }],
  total: { centavos: 2500, moneda: 'GTQ' },
};
const muestra = { id: id(9), ordenId: id(1), codigo: 'M-1', itemIds: [id(4)], fechaToma: '2026-11-07T12:10:00.000Z', tomadaPorId: id(10), estado: 'ACEPTADA', version: 3, eventos: [], tipoMuestraId: id(7), recipiente: 'Tubo' };
const resultado = { id: id(11), revision: 1, serieId: id(12), version: 1, ordenId: id(1), itemId: id(4), pruebaId: id(5), pacienteId: id(2), analistaId: id(13), fechaAnalisis: '2026-11-07T12:20:00.000Z', estado: 'BORRADOR', componentes: [{ parametroId: id(8), valorNumerico: 90, unidadAplicada: 'mg/dL', indicador: 'NORMAL' }], procedencia: [{ muestraId: id(9), codigoHistorico: 'M-1' }] };
const trabajo = { ordenId: orden.id, pacienteId: orden.pacienteId, prioridad: orden.prioridad, estado: orden.estado, version: orden.version,
  items: orden.items.map(({ precio: _precio, ...item }) => item), muestras: [{ id: muestra.id, codigo: muestra.codigo, itemIds: muestra.itemIds, estado: muestra.estado, version: muestra.version, tipoMuestraId: muestra.tipoMuestraId, recipiente: muestra.recipiente }] };

describe('Laboratorio HTTP E05-P2-03', () => {
  it('distingue bandeja vacía confirmada de caída del servicio', async () => {
    const http = client();
    vi.mocked(http.get).mockResolvedValueOnce({ data: { items: [] }, meta: { correlacion: id(20) } }).mockRejectedValueOnce(new HttpError({ status: 503, codigo: 'PERSISTENCIA_NO_DISPONIBLE', mensaje: 'Caída' }));
    const repo = createHttpLaboratoryRepository(http);
    await expect(repo.obtenerBandeja(institucion)).resolves.toEqual([]);
    await expect(repo.obtenerBandeja(institucion)).rejects.toMatchObject({ status: 503 });
  });

  it('usa la proyección mínima cuando un rol analítico no puede leer órdenes administrativas', async () => {
    const http = client();
    vi.mocked(http.get).mockRejectedValueOnce(new HttpError({ status: 403, codigo: 'SIN_PERMISO', mensaje: 'Sin permiso' }))
      .mockResolvedValueOnce({ data: [trabajo], meta: { correlacion: id(20) } });
    const data = await createHttpLaboratoryRepository(http).obtenerBandeja(institucion);
    expect(data).toMatchObject([{ id: orden.id, pacienteId: orden.pacienteId, medicoSolicitante: '', totalArancelGTQ: 0 }]);
    expect(vi.mocked(http.get).mock.calls[1][0]).toBe('/laboratorio/trabajo-analitico');
  });

  it('captura resultado con componentes y muestras sin enviar actor ni institución', async () => {
    const http = client();
    vi.mocked(http.get).mockResolvedValueOnce({ data: { items: [] }, meta: { correlacion: id(20) } })
      .mockResolvedValueOnce({ data: [trabajo], meta: { correlacion: id(20) } });
    vi.mocked(http.post).mockResolvedValue({ data: resultado, meta: { correlacion: id(20) } });
    await createHttpLaboratoryRepository(http).guardarResultadoBorrador(institucion, {
      ordenId: id(1), itemOrdenId: id(4), muestraId: id(9), equipoAnalitico: 'UI', metodoAnalitico: 'UI',
      parametros: [{ parametroId: id(8), codigoParametro: 'GLU', nombre: 'Glucosa', valor: '90', unidad: 'mg/dL', rangoTexto: '70-100', alerta: 'NORMAL' }],
      analistaId: 'suplantado', analistaNombre: 'suplantado',
    });
    expect(vi.mocked(http.post).mock.calls[0][0]).toBe('/laboratorio/resultados');
    expect(vi.mocked(http.post).mock.calls[0][1]).toEqual({ ordenId: id(1), itemId: id(4), muestraIds: [id(9)], componentes: [{ parametroId: id(8), valorNumerico: 90, unidadAplicada: 'mg/dL', referenciaTexto: '70-100', indicador: 'NORMAL' }] });
    expect(vi.mocked(http.post).mock.calls[0][2]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/i);
  });

  it('valida solo con revisión optimista y deriva validador de la sesión', async () => {
    const http = client();
    vi.mocked(http.get).mockResolvedValueOnce({ data: resultado, meta: { correlacion: id(20) } })
      .mockResolvedValueOnce({ data: [trabajo], meta: { correlacion: id(20) } });
    vi.mocked(http.post).mockResolvedValue({ data: { ...resultado, revision: 2, estado: 'VALIDADO', validadorId: id(14) }, meta: { correlacion: id(20) } });
    await createHttpLaboratoryRepository(http).validarResultado(institucion, id(11), 'suplantado', 'suplantado');
    expect(vi.mocked(http.post).mock.calls[0][1]).toEqual({ versionEsperada: 1 });
  });

  it('mapea pruebas y referencias desde catálogos de laboratorio', async () => {
    const http = client();
    vi.mocked(http.get).mockResolvedValueOnce({ data: { items: [orden.items[0].prueba] }, meta: { correlacion: id(20) } })
      .mockResolvedValueOnce({ data: { items: [{ id: id(3), nombre: 'Dra. Solicitante', activo: true, revision: 2 }] }, meta: { correlacion: id(20) } });
    const repo = createHttpCatalogRepository(http);
    await expect(repo.obtenerPruebasLaboratorio(institucion)).resolves.toMatchObject([{ id: id(5), codigoPrueba: 'GLU', estado: 'ACTIVO' }]);
    await expect(repo.obtenerReferenciasLaboratorio(institucion, 'solicitantes')).resolves.toMatchObject([{ id: id(3), nombre: 'Dra. Solicitante', version: 2 }]);
  });
});
