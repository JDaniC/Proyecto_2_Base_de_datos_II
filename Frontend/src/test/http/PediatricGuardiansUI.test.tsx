import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {PediatricGuardiansHttpView} from '../../features/patients/components/PediatricGuardiansHttpView';
import {PediatricGrowthHttpView} from '../../features/patients/components/PediatricGrowthHttpView';
import type {Paciente} from '../../services/types';
const {gestionar,crecimiento,repository}=vi.hoisted(()=>{const gestionar=vi.fn(),crecimiento=vi.fn();return {gestionar,crecimiento,repository:{gestionarResponsablePediatrico:gestionar,obtenerCrecimientoPediatrico:crecimiento}};});
vi.mock('../../app/ServiceContext',()=>({useServices:()=>({patientRepository:repository})}));
afterEach(()=>{cleanup();gestionar.mockReset();crecimiento.mockReset();});
const paciente={id:'menor',version:4,estado:'ACTIVO',responsables:[{id:'madre',nombre:'Ana Sintética',nombres:'Ana',apellidos:'Sintética',telefono:'55555555',version:2,versionVinculo:3,esPrincipal:true,autorizaAtencion:false,parentesco:'MADRE'}]} as Paciente;
it('contacto captura versiones y ante respuesta perdida reintenta intención intacta',async()=>{
 gestionar.mockRejectedValueOnce({status:503,mensaje:'Respuesta perdida'}).mockResolvedValueOnce(undefined);
 const user=userEvent.setup(),actualizar=vi.fn().mockResolvedValue(undefined);
 render(<PediatricGuardiansHttpView paciente={paciente} puedeEditar onActualizar={actualizar}/>);
 await user.click(screen.getByRole('button',{name:'Editar contacto de Ana Sintética'}));await user.clear(screen.getByLabelText('Teléfono del responsable'));await user.type(screen.getByLabelText('Teléfono del responsable'),'55550001');
 await user.click(screen.getByRole('button',{name:'Guardar responsable'}));await screen.findByText(/Resultado pendiente/);expect(actualizar).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Reintentar misma solicitud'}));await waitFor(()=>expect(actualizar).toHaveBeenCalledTimes(1));expect(gestionar.mock.calls[0]).toEqual(gestionar.mock.calls[1]);
 expect(gestionar.mock.calls[0]).toEqual(['menor','contacto',{version_paciente:4,version_responsable:2,nombres:'Ana',apellidos:'Sintética',telefono:'55550001'},'madre']);
});
it('sin permiso no publica controles y cancelar no escribe',async()=>{
 const user=userEvent.setup(),actualizar=vi.fn();const vista=render(<PediatricGuardiansHttpView paciente={paciente} puedeEditar={false} onActualizar={actualizar}/>);
 expect(screen.queryByRole('button',{name:'Nuevo responsable'})).toBeNull();vista.rerender(<PediatricGuardiansHttpView paciente={paciente} puedeEditar onActualizar={actualizar}/>);
 await user.click(screen.getByRole('button',{name:'Nuevo responsable'}));await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(gestionar).not.toHaveBeenCalled();
});
it('error de crecimiento no se representa como ausencia de mediciones',async()=>{
 crecimiento.mockRejectedValueOnce(new Error('Servicio caído')).mockResolvedValueOnce({elementos:[]});
 const user=userEvent.setup();render(<MemoryRouter><PediatricGrowthHttpView pacienteId="menor"/></MemoryRouter>);
 await screen.findByText(/Servicio caído/);expect(screen.queryByText('No hay consultas en este intervalo.')).toBeNull();await user.click(screen.getByRole('button',{name:'Reintentar'}));await screen.findByText('No hay consultas en este intervalo.');
});
