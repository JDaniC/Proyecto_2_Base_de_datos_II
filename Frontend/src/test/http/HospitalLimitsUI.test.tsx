import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HospitalizationsListPage } from '../../features/hospital/HospitalizationsListPage';
import { HospitalizationAdmissionPage } from '../../features/hospital/HospitalizationAdmissionPage';

const services = vi.hoisted(() => ({
  hospitalizationRepository: { listarHospitalizaciones: vi.fn(), listarCamas: vi.fn() },
  patientRepository: { buscar: vi.fn() }, catalogRepository: { obtenerMedicos: vi.fn() },
}));
vi.mock('../../app/ServiceContext', () => ({ useServices: () => ({ mode: 'api', ...services }) }));
vi.mock('../../app/AuthSessionContext', () => ({ useAuthSession: () => ({ sesion: { institucionId: 'HOSPITAL_GENERAL', nombre: 'Médica sintética' } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  services.hospitalizationRepository.listarCamas.mockResolvedValue([{ id: 'cama', habitacionId: 'hab', estado: 'DISPONIBLE', codigoCama: '101-A', salaServicio: 'General', piso: 1, numeroHabitacion: '101', version: 1 }]);
  services.catalogRepository.obtenerMedicos.mockResolvedValue([]);
});
describe('Límites y paginación hospitalaria en UI', () => {
  it('deshabilita Siguiente en una página completa cuando el servidor informa hayMas=false', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `h-${i}`, pacienteNombre: 'Paciente', pacienteExpediente: 'EXP', codigoIngreso: `ING-${i}`, medicoTratanteNombre: 'Médica', medicoTratanteColegiado: 'COL', fechaIngreso: '2026-11-01T12:00:00Z', estado: 'ACTIVA' }));
    services.hospitalizationRepository.listarHospitalizaciones.mockResolvedValue({ items, pagina: 1, hayMas: false });
    render(<MemoryRouter><HospitalizationsListPage /></MemoryRouter>);
    await screen.findAllByRole('button', { name: 'Ver Detalle' });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
  it('abre ingreso sin paciente precargado y espera un término antes de buscar', async () => {
    services.patientRepository.buscar.mockImplementation(async (_institucion, q) => {
      if (!q.q) throw new Error('No se admite búsqueda vacía');
      return { items: [] };
    });
    render(<MemoryRouter><HospitalizationAdmissionPage /></MemoryRouter>);
    await screen.findByLabelText('Cama Hospitalaria Disponible *');
    expect(services.patientRepository.buscar).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar paciente para ingreso' }), 'Paciente');
    await waitFor(() => expect(services.patientRepository.buscar).toHaveBeenCalledWith('HOSPITAL_GENERAL', { q: 'Paciente' }));
  });
});
