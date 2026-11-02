import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {PediatricVaccinesScheduleView} from '../../features/patients/components/PediatricVaccinesScheduleView';
import type {Paciente} from '../../services/types';
const mocks=vi.hoisted(()=>({esquema:vi.fn(),apps:vi.fn(),catalogo:vi.fn()}));
vi.mock('../../app/ServiceContext',()=>{const services={mode:'api',vaccineRepository:{obtenerEsquemaCompletoPaciente:mocks.esquema,obtenerAplicaciones:mocks.apps},catalogRepository:{obtenerVacunas:mocks.catalogo}};return {useServices:()=>services};});
vi.mock('../../app/AuthSessionContext',()=>({useAuthSession:()=>({sesion:{institucionId:'CENTRO_PEDIATRICO',permisos:['consultas.registrar']}})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const paciente={id:'menor',fechaNacimiento:'2025-01-01',estado:'ARCHIVADO'} as Paciente;
it('falla de lectura muestra error recuperable en lugar de esquema vacío',async()=>{
 mocks.esquema.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);mocks.apps.mockResolvedValue([]);mocks.catalogo.mockResolvedValue([]);
 render(<PediatricVaccinesScheduleView paciente={paciente}/>);
 await screen.findByText('Vacunación no disponible');expect(screen.queryByText('Registrar vacuna')).toBeNull();
 await userEvent.click(screen.getByRole('button',{name:'Reintentar'}));await screen.findByText('Registrar vacuna');expect(mocks.esquema.mock.calls.length).toBeGreaterThanOrEqual(2);
});
it('expediente archivado mantiene consulta pero bloquea nueva administración',async()=>{
 mocks.esquema.mockResolvedValue([]);mocks.apps.mockResolvedValue([]);mocks.catalogo.mockResolvedValue([]);
 render(<PediatricVaccinesScheduleView paciente={paciente}/>);expect(await screen.findByRole('button',{name:'Registrar vacuna'})).toBeDisabled();
});
