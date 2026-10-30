import {render, screen, waitFor, cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ServiceProvider} from '../../app/ServiceContext';
import {AppointmentsCalendarPage} from '../../features/appointments/AppointmentsCalendarPage';
vi.mock('../../app/AuthSessionContext', () => ({useAuthSession: () => ({sesion:{cuentaId:'sintetico',institucionId:'CLINICA_ODONTOLOGICA',permisos:['consultas.registrar','citas.administrar'],rolId:'ODONTOLOGO'}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const vista=()=>render(<MemoryRouter initialEntries={['/agenda']}><ServiceProvider mode="api"><AppointmentsCalendarPage /></ServiceProvider></MemoryRouter>);
describe('Agenda HTTP de lectura',()=>{
 it('no ofrece IDs simulados ni operaciones de gestión pendientes',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[]}),{status:200}));vi.stubGlobal('fetch',fetch);vista();
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
  const filtro=screen.getByLabelText('Filtrar por profesional') as HTMLSelectElement;
  expect(filtro.disabled).toBe(true);expect(filtro.options.length).toBe(1);
  expect(fetch.mock.calls[0][0]).not.toContain('profesional_id=');
  expect((screen.getByRole('button',{name:'Crear nueva cita odontológica'}) as HTMLButtonElement).disabled).toBe(true);
 });
 it('una caída del transporte muestra el error en lugar de una agenda vacía confirmada',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('offline')));vista();
  await screen.findByRole('alert');expect(screen.getByText('No se pudo cargar la agenda')).toBeTruthy();
 });
});
