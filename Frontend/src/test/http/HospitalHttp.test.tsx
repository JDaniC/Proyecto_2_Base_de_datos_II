import { describe, it, expect, vi } from 'vitest';
import { createHttpHospitalizationRepository } from '../../services/http/hospital/httpHospitalizationRepository';
import { HttpClient } from '../../services/http/httpClient';

describe('Hospital HTTP (E04-P1-02)', () => {
  it('gestiona flujo completo de hospitalización: listar camas, ingreso, notas, asignación y egreso', async () => {
    const mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;

    const repo = createHttpHospitalizationRepository(mockClient);

    // 1. Listar camas
    vi.mocked(mockClient.get).mockResolvedValueOnce({
      data: {
        camas: [
          {
            id: 'cama-01',
            habitacionId: 'hab-01',
            numeroHabitacion: '101',
            piso: 1,
            salaServicio: 'Medicina Interna',
            codigoCama: '101-A',
            estado: 'DISPONIBLE',
            version: 1,
          },
        ],
      },
      meta: { correlacion: '00000000-0000-0000-0000-000000000001' },
    });

    const camas = await repo.listarCamas('HOSPITAL_GENERAL');
    expect(camas).toHaveLength(1);
    expect(camas[0]?.codigoCama).toBe('101-A');
    expect(camas[0]?.estado).toBe('DISPONIBLE');

    // 2. Crear ingreso
    vi.mocked(mockClient.post).mockResolvedValueOnce({
      data: {
        id: 'hosp-01',
        codigoIngreso: 'ING-000001',
        pacienteId: 'pac-01',
        pacienteNombre: 'Juan Perez',
        pacienteExpediente: 'EXP-001',
        medicoTratanteId: 'med-01',
        medicoTratanteNombre: 'Dra. Morales',
        medicoTratanteColegiado: 'CMG-100',
        fechaIngreso: '2026-10-31T20:00:00Z',
        estado: 'ACTIVA',
        diagnosticoIngresoCIE: 'I10',
        diagnosticoIngresoNombre: 'Hipertensión esencial',
        motivoIngreso: 'Crisis hipertensiva',
        camaActual: {
          camaId: 'cama-01',
          codigoCama: '101-A',
          habitacion: 'Habitación 101',
          servicio: 'Medicina Interna',
        },
        asignacionesCama: [],
        consultasEnlazadasIds: [],
        notasEvolucion: [],
        procedimientos: [],
        version: 1,
      },
      meta: { correlacion: '00000000-0000-0000-0000-000000000002' },
    });

    const ingreso = await repo.crearIngreso('HOSPITAL_GENERAL', {
      pacienteId: 'pac-01',
      camaId: 'cama-01',
      medicoTratanteId: 'med-01',
      fechaIngreso: '2026-10-31T20:00:00Z',
      motivoIngreso: 'Crisis hipertensiva',
      diagnosticoIngresoCIE: 'I10',
      diagnosticoIngresoNombre: 'Hipertensión esencial',
    });

    expect(ingreso.id).toBe('hosp-01');
    expect(ingreso.estado).toBe('ACTIVA');
    expect(ingreso.camaActual?.camaId).toBe('cama-01');

    // 3. Agregar nota de evolución
    vi.mocked(mockClient.post).mockResolvedValueOnce({
      data: {
        ...ingreso,
        notasEvolucion: [
          {
            id: 'nota-01',
            fechaHora: '2026-10-31T21:00:00Z',
            medicoNombre: 'Dra. Morales',
            medicoColegiado: 'CMG-100',
            notaClinica: 'Presión controlada',
          },
        ],
        version: 2,
      },
      meta: { correlacion: '00000000-0000-0000-0000-000000000003' },
    });

    const conNota = await repo.agregarNotaEvolucion('HOSPITAL_GENERAL', 'hosp-01', {
      fechaHora: '2026-10-31T21:00:00Z',
      medicoNombre: 'Dra. Morales',
      medicoColegiado: 'CMG-100',
      notaClinica: 'Presión controlada',
    });
    expect(conNota.notasEvolucion).toHaveLength(1);
    expect(conNota.notasEvolucion?.[0]?.notaClinica).toBe('Presión controlada');

    // 4. Traslado de cama
    vi.mocked(mockClient.post).mockResolvedValueOnce({
      data: {
        ...ingreso,
        camaActual: {
          camaId: 'cama-02',
          codigoCama: '102-A',
          habitacion: 'Habitación 102',
          servicio: 'Medicina Interna',
        },
        version: 3,
      },
      meta: { correlacion: '00000000-0000-0000-0000-000000000004' },
    });

    const trasladado = await repo.asignarCama('HOSPITAL_GENERAL', 'hosp-01', 'cama-02', '2026-10-31T22:00:00Z', 'Traslado por comodidad');
    expect(trasladado.camaActual?.camaId).toBe('cama-02');

    // 5. Egreso hospitalario
    vi.mocked(mockClient.post).mockResolvedValueOnce({
      data: {
        ...ingreso,
        estado: 'FINALIZADA',
        fechaEgreso: '2026-11-01T08:00:00Z',
        diagnosticoEgresoCIE: 'I10',
        diagnosticoEgresoNombre: 'Hipertensión esencial compensada',
        resumenEgreso: 'Paciente dado de alta',
        camaActual: undefined,
        version: 4,
      },
      meta: { correlacion: '00000000-0000-0000-0000-000000000005' },
    });

    const egresado = await repo.registrarEgreso('HOSPITAL_GENERAL', 'hosp-01', {
      fechaEgreso: '2026-11-01T08:00:00Z',
      tipoEgreso: 'ALTA_MEDICA',
      diagnosticoEgresoCIE: 'I10',
      diagnosticoEgresoNombre: 'Hipertensión esencial compensada',
      resumenClinico: 'Paciente dado de alta',
    });
    expect(egresado.estado).toBe('EGRESADA');
    expect(egresado.camaActual).toBeUndefined();
  });
});


describe('Reintento hospitalario', () => {
  it('conserva la clave tras pérdida de respuesta y renueva la clave al cambiar la versión', async () => {
    const client = { post: vi.fn().mockRejectedValueOnce(new Error('respuesta perdida'))
      .mockResolvedValue({ data: { id: 'hosp', estado: 'ACTIVA' } }) } as unknown as HttpClient;
    const repo = createHttpHospitalizationRepository(client);
    const nota = { fechaHora: '2026-11-01T12:00:00Z', medicoNombre: 'Sintético', medicoColegiado: '1', notaClinica: 'Control' };
    await expect(repo.agregarNotaEvolucion('HOSPITAL_GENERAL', 'hosp', nota, 1)).rejects.toThrow('respuesta perdida');
    await repo.agregarNotaEvolucion('HOSPITAL_GENERAL', 'hosp', nota, 1);
    expect(vi.mocked(client.post).mock.calls[0]?.[2]?.idempotencyKey).toBe(vi.mocked(client.post).mock.calls[1]?.[2]?.idempotencyKey);
    await repo.agregarNotaEvolucion('HOSPITAL_GENERAL', 'hosp', nota, 2);
    expect(vi.mocked(client.post).mock.calls[1]?.[2]?.idempotencyKey).not.toBe(vi.mocked(client.post).mock.calls[2]?.[2]?.idempotencyKey);
  });
});
