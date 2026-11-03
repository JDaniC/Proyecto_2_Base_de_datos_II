import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {RegistrarAplicacionVacunaModal} from '../../features/patients/components/RegistrarAplicacionVacunaModal';
import type {Paciente,VacunaCatalogo} from '../../services/types';
const registrar=vi.hoisted(()=>vi.fn());
vi.mock('../../app/ServiceContext',()=>({useServices:()=>({mode:'api',vaccineRepository:{registrarAplicacion:registrar}})}));
vi.mock('../../app/AuthSessionContext',()=>({useAuthSession:()=>({sesion:{institucionId:'CENTRO_PEDIATRICO'}})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const vacuna={id:'v',nombreVacuna:'Vacuna sintética',viaAdministracion:'SIN_DATO',dosis:[{dosisId:'d',numeroDosis:1,etiquetaDosis:'Dosis 1',edadRecomendadaMeses:2}]} as VacunaCatalogo;
const props={isOpen:true,onClose:vi.fn(),paciente:{id:'p',nombreCompleto:'Menor sintético'} as Paciente,catalogoVacunas:[vacuna],onAplicacionRegistrada:vi.fn()};
it('cancelar formulario no escribe y la vía sin dato exige selección anatómica explícita',async()=>{
 const user=userEvent.setup();render(<RegistrarAplicacionVacunaModal {...props}/>);
 expect(screen.getByLabelText(/Sitio Anatómico/)).toHaveValue('');
 await user.type(screen.getByLabelText(/Número de Lote/),'LOTE');
 await user.click(screen.getByRole('button',{name:'Registrar dosis'}));expect(registrar).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(props.onClose).toHaveBeenCalled();expect(registrar).not.toHaveBeenCalled();
});
it('la aplicación envía el sitio seleccionado y fecha civil sin hora inventada',async()=>{
 registrar.mockResolvedValue({});const user=userEvent.setup();render(<RegistrarAplicacionVacunaModal {...props}/>);
 await user.type(screen.getByLabelText(/Número de Lote/),'LOTE');await user.selectOptions(screen.getByLabelText(/Sitio Anatómico/),'Deltoides brazo izquierdo');
 await user.click(screen.getByRole('button',{name:'Registrar dosis'}));
 expect(registrar).toHaveBeenCalledWith('CENTRO_PEDIATRICO','p',expect.objectContaining({sitioAnatomico:'Deltoides brazo izquierdo',lote:'LOTE',fechaAplicacion:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)}),expect.any(String));
 expect(registrar.mock.calls[0][2]).not.toHaveProperty('horaAplicacion');
});
