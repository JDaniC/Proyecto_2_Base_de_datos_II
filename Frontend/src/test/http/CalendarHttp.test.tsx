import {render, screen, waitFor, cleanup, fireEvent} from '@testing-library/react';
import {NewConsultationWizardPage} from '../../features/consultations/NewConsultationWizardPage';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ServiceProvider} from '../../app/ServiceContext';
import {AppointmentsCalendarPage} from '../../features/appointments/AppointmentsCalendarPage';
let permisosActivos = ['consultas.registrar', 'citas.administrar', 'citas.leer'];
vi.mock('../../app/AuthSessionContext', () => ({
  useAuthSession: () => ({
    sesion: {
      cuentaId: 'sintetico',
      institucionId: 'CLINICA_ODONTOLOGICA',
      permisos: permisosActivos,
      rolId: 'ODONTOLOGO'
    }
  })
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  permisosActivos = ['consultas.registrar', 'citas.administrar', 'citas.leer'];
});
const vista = () => render(<MemoryRouter initialEntries={['/agenda']}><ServiceProvider mode="api"><AppointmentsCalendarPage /></ServiceProvider></MemoryRouter>);
describe('Agenda HTTP odontológica (E04-P1-01)', () => {
  it('carga profesionales desde el catálogo HTTP sin IDs simulados y habilita gestión cuando posee citas.administrar', async () => {
    const fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/catalogos/medicos')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: [{ id: '12000000-0000-4000-8000-000000000001', nombreCompleto: 'Dr. Odontólogo Real', rol: 'ODONTOLOGO', especialidad: 'Odontología General' }]
        }), { status: 200 }));
      }
      if (url.includes('/pacientes/11000000-0000-4000-8000-000000000001')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            id: '11000000-0000-4000-8000-000000000001',
            codigo_legible: 'PAC-ODO-001',
            institucion: 'CLINICA_ODONTOLOGICA',
            nombres: 'Paciente',
            apellidos: 'Odontológico',
            fecha_nacimiento: '1995-03-10',
            sexo: 'FEMENINO',
            estado: 'ACTIVO',
            version: 1,
            fecha_registro: '2026-10-19T08:00:00Z'
          }
        }), { status: 200 }));
      }
      if (url.includes('/revisiones')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: [{
            id: '19000000-0000-4000-8000-000000000001',
            version: 2,
            fecha_hora: '2026-10-31T10:00:00Z',
            actor_id: '13000000-0000-4000-8000-000000000001',
            motivo_cambio: 'Ajuste de horario solicitado por paciente',
            anterior: {
              id: '15000000-0000-4000-8000-000000000001',
              version: 1,
              paciente_id: '11000000-0000-4000-8000-000000000001',
              profesional_id: '12000000-0000-4000-8000-000000000001',
              fecha: '2026-10-19',
              hora_inicio: '08:00',
              hora_fin: '08:30',
              duracion_minutos: 30,
              motivo: 'Control de caries',
              estado: 'PROGRAMADA',
              fecha_creacion: '2026-10-19T08:00:00Z'
            },
            actual: {
              id: '15000000-0000-4000-8000-000000000001',
              version: 2,
              paciente_id: '11000000-0000-4000-8000-000000000001',
              profesional_id: '12000000-0000-4000-8000-000000000001',
              fecha: '2026-10-19',
              hora_inicio: '09:00',
              hora_fin: '09:30',
              duracion_minutos: 30,
              motivo: 'Control de caries',
              secretaria_gestora: 'Secretaria Clínica Dental',
              estado: 'PROGRAMADA',
              fecha_creacion: '2026-10-19T08:00:00Z'
            }
          }],
          meta: { correlacion: '19000000-0000-4000-8000-000000000002' }
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        data: [{
          id: '15000000-0000-4000-8000-000000000001',
          version: 2,
          paciente_id: '11000000-0000-4000-8000-000000000001',
          profesional_id: '12000000-0000-4000-8000-000000000001',
          secretaria_gestora: 'Secretaria Clínica Dental',
          fecha: '2026-10-19',
          hora_inicio: '09:00',
          hora_fin: '09:30',
          duracion_minutos: 30,
          motivo: 'Control de caries',
          estado: 'PROGRAMADA',
          fecha_creacion: '2026-10-19T08:00:00Z'
        }]
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetch);
    vista();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const filtro = screen.getByLabelText('Filtrar por profesional') as HTMLSelectElement;
    await waitFor(() => expect(filtro.options.length).toBe(2));
    expect(filtro.disabled).toBe(false);
    expect(fetch.mock.calls[0][0]).not.toContain('profesional_id=prof-');
    expect((screen.getByRole('button', { name: 'Crear nueva cita odontológica' }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(await screen.findByText('Paciente Odontológico'));
    expect((await screen.findAllByText('Secretaria Clínica Dental')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Ajuste de horario solicitado por paciente/)).toBeTruthy();
  });

  it('deshabilita crear cita cuando el actor no posee citas.administrar', async () => {
    permisosActivos = ['citas.leer', 'consultas.registrar'];
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    vista();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect((screen.getByRole('button', { name: 'Crear nueva cita odontológica' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('un fallo inicial de carga clínica conserva su causa y no afirma que falte el paciente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    render(<MemoryRouter initialEntries={['/pacientes/sintetico/consultas/nueva']}><ServiceProvider mode="api"><Routes><Route path="/pacientes/:pacienteId/consultas/nueva" element={<NewConsultationWizardPage />} /></Routes></ServiceProvider></MemoryRouter>);
    await screen.findByRole('alert');
    expect(screen.queryByText('Paciente no encontrado')).toBeNull();
  });

  it('una caída del transporte muestra el error en lugar de una agenda vacía confirmada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    vista();
    await screen.findByRole('alert');
    expect(screen.getByText('No se pudo cargar la agenda')).toBeTruthy();
  });
});
