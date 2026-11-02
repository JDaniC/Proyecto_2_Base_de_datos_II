import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {NuevaOrdenExamenModal} from '../../features/hospital/components/NuevaOrdenExamenModal';
import {PatientInsurancesView} from '../../features/patients/components/PatientInsurancesView';
import {DetalleOrdenResultadosModal} from '../../features/hospital/components/DetalleOrdenResultadosModal';
import type {OrdenExamenHospital} from '../../services/types';
const services=vi.hoisted(()=>({examRepository:{obtenerResultadosPorOrden:vi.fn()},patientRepository:{buscar:vi.fn(),obtenerPorId:vi.fn(),obtenerHistorial:vi.fn(),obtenerPolizasSeguro:vi.fn()},catalogRepository:{obtenerPruebasLaboratorio:vi.fn(),obtenerAseguradoras:vi.fn()}}));
vi.mock('../../app/ServiceContext',()=>({useServices:()=>({mode:'api',...services})}));
vi.mock('../../app/AuthSessionContext',()=>({useAuthSession:()=>({sesion:{institucionId:'HOSPITAL_GENERAL',permisos:['historial.leer','consultas.registrar','pacientes.administrar']}})}));
afterEach(cleanup);
beforeEach(()=>{vi.resetAllMocks();services.catalogRepository.obtenerPruebasLaboratorio.mockResolvedValue([]);services.catalogRepository.obtenerAseguradoras.mockResolvedValue([]);services.patientRepository.obtenerPorId.mockResolvedValue({version:1});services.patientRepository.obtenerHistorial.mockResolvedValue({eventos:[]});});
it('búsqueda con un único paciente permite seleccionarlo expresamente y limpia resultados al vaciar término',async()=>{
 services.patientRepository.buscar.mockResolvedValue({items:[{id:'paciente',nombres:'Paciente',apellidos:'Único',estado:'ACTIVO',codigoLegible:'EXP'}]});
 const user=userEvent.setup();render(<NuevaOrdenExamenModal isOpen onClose={()=>{}} onOrdenCreada={()=>{}}/>);
 await user.type(screen.getByLabelText('Buscar paciente para examen'),'Único');await screen.findByRole('option',{name:'Paciente Único (EXP)'});
 const select=document.querySelector('#select-paciente-orden') as HTMLSelectElement;expect(select.value).toBe('');await user.selectOptions(select,'paciente');expect(select.value).toBe('paciente');
 await user.clear(screen.getByLabelText('Buscar paciente para examen'));await waitFor(()=>expect(screen.queryByRole('option',{name:'Paciente Único (EXP)'})).not.toBeInTheDocument());
});
it('un fallo de pólizas se muestra como error con reintento, sin afirmar ausencia de cobertura',async()=>{
 services.patientRepository.obtenerPolizasSeguro.mockRejectedValue(new Error('No disponible'));
 render(<PatientInsurancesView pacienteId="paciente" pacienteNombre="Paciente" pacienteDpi="" pacienteTelefono=""/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar');expect(screen.queryByText('Sin seguros médicos afiliados')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Reintentar consulta'})).toBeInTheDocument();
});
const orden=(id:string)=>({id,items:[],codigoLegible:id,pacienteNombre:'Paciente',estado:'SOLICITADA',fechaSolicitud:'2026-11-01T00:00:00Z',prioridad:'RUTINA'} as unknown as OrdenExamenHospital);
it('detalle conserva el diálogo al fallar y vuelve a página uno al cambiar de orden',async()=>{
 services.examRepository.obtenerResultadosPorOrden.mockResolvedValue({items:[],pagina:1,hayMas:true});const user=userEvent.setup();const onClose=vi.fn();
 const vista=render(<DetalleOrdenResultadosModal isOpen orden={orden('a')} onClose={onClose}/>);
 await user.click(await screen.findByRole('button',{name:'Siguiente'}));await waitFor(()=>expect(services.examRepository.obtenerResultadosPorOrden).toHaveBeenLastCalledWith('HOSPITAL_GENERAL','a',{pagina:2,limite:25}));
 services.examRepository.obtenerResultadosPorOrden.mockRejectedValue(new Error('No disponible'));vista.rerender(<DetalleOrdenResultadosModal isOpen orden={orden('b')} onClose={onClose}/>);
 await screen.findByRole('alert');expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('alert'));await waitFor(()=>expect(services.examRepository.obtenerResultadosPorOrden).toHaveBeenLastCalledWith('HOSPITAL_GENERAL','b',{pagina:1,limite:25}));
 vista.rerender(<DetalleOrdenResultadosModal isOpen={false} orden={orden('b')} onClose={onClose}/>);expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
