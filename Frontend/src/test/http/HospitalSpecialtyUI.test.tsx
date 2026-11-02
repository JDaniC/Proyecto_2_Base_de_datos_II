import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {ServiceProvider} from '../../app/ServiceContext';
import {CrearCitaModal} from '../../features/appointments/CrearCitaModal';
vi.mock('../../app/AuthSessionContext',()=>({useAuthSession:()=>({sesion:{cuentaId:'sintetico',institucionId:'HOSPITAL_GENERAL',permisos:['citas.administrar']}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('especialidad hospitalaria filtra profesionales reales y actualiza una selección que deja de ser elegible',async()=>{
 const fetch=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({data:[{id:'medico-1',nombreCompleto:'Médico general',especialidad:'Medicina General',especialidadesSecundarias:['Cardiología'],estado:'ACTIVO'},{id:'medico-2',nombreCompleto:'Médico cirujano',especialidad:'Cirugía',especialidadesSecundarias:[],estado:'ACTIVO'}]}),{status:200}));vi.stubGlobal('fetch',fetch);
 render(<ServiceProvider mode="api"><CrearCitaModal isOpen onClose={()=>{}} onCitaCreada={()=>{}}/></ServiceProvider>);
 await screen.findByRole('option',{name:'Cirugía'});
 fireEvent.change(screen.getByLabelText('Especialidad del personal'),{target:{value:'Cirugía'}});
 const select=screen.getByLabelText(/Profesional de la salud/) as HTMLSelectElement;
 expect(select.value).toBe('medico-2');expect(select.options).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('Especialidad del personal'),{target:{value:'Cardiología'}});
 expect(select.value).toBe('medico-1');expect(select.options).toHaveLength(1);
 expect(fetch.mock.calls[0][0]).toContain('/catalogos/medicos');
});
