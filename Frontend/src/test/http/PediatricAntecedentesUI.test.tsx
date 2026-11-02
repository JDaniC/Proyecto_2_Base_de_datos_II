import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {PediatricHistoryAllergiesView} from '../../features/patients/components/PediatricHistoryAllergiesView';
import type {Paciente,AntecedentesClinicos} from '../../services/types';
const confirmar=vi.hoisted(()=>vi.fn());
const historia=vi.hoisted(()=>vi.fn());
const registrarAlergiaMock=vi.hoisted(()=>vi.fn());
vi.mock('../../app/ServiceContext',()=>({useServices:()=>({mode:'api',patientRepository:{confirmarSinAlergias:confirmar,actualizarHistoriaPediatrica:historia,registrarAlergia:registrarAlergiaMock}})}));
vi.mock('../../app/AuthSessionContext',()=>({useAuthSession:()=>({sesion:{nombre:'Pediatra',rolEtiqueta:'Pediatra'}})}));
afterEach(()=>{cleanup();confirmar.mockReset();historia.mockReset();registrarAlergiaMock.mockReset();});
const paciente={id:'menor',version:4,nombreCompleto:'Menor Sintético',estadoAlergias:'SIN_VERIFICAR',estado:'ACTIVO'} as Paciente;
const antecedentes:AntecedentesClinicos={versionAntecedentes:2,patologicos:[],quirurgicos:[],familiares:[],medicamentosActuales:[],alergias:[]};
it('resultado incierto bloquea edición y reintenta exactamente versiones y motivo capturados',async()=>{
 confirmar.mockRejectedValueOnce({status:503,mensaje:'Respuesta perdida'}).mockResolvedValueOnce({});
 const user=userEvent.setup(),actualizar=vi.fn().mockResolvedValue(undefined);
 render(<PediatricHistoryAllergiesView paciente={paciente} antecedentes={antecedentes} institucionId="CENTRO_PEDIATRICO" onActualizar={actualizar}/>);
 await user.type(screen.getByLabelText('Motivo del cambio clínico'),'Verificación sintética');
 await user.click(screen.getByRole('button',{name:'Confirmar Sin Alergias Conocidas'}));
 await screen.findByText('Resultado pendiente de confirmar');expect(screen.queryByLabelText('Motivo del cambio clínico')).toBeNull();expect(actualizar).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Reintentar misma solicitud'}));
 await waitFor(()=>expect(actualizar).toHaveBeenCalledTimes(1));expect(confirmar.mock.calls[0]).toEqual(confirmar.mock.calls[1]);
 expect(confirmar.mock.calls[0].slice(3)).toEqual([4,{versionAntecedentes:2,motivo:'Verificación sintética'}]);
});
it('sin motivo no envía ni anuncia éxito',async()=>{
 const user=userEvent.setup(),actualizar=vi.fn();render(<PediatricHistoryAllergiesView paciente={paciente} antecedentes={antecedentes} institucionId="CENTRO_PEDIATRICO" onActualizar={actualizar}/>);
 await user.click(screen.getByRole('button',{name:'Confirmar Sin Alergias Conocidas'}));await screen.findByText(/Completa el motivo/);expect(confirmar).not.toHaveBeenCalled();expect(actualizar).not.toHaveBeenCalled();
});

it('cancelar historia no escribe; guardar envía listas explícitas, versiones y motivo',async()=>{
 const user=userEvent.setup(),actualizar=vi.fn().mockResolvedValue(undefined);historia.mockResolvedValue({});
 render(<PediatricHistoryAllergiesView paciente={paciente} antecedentes={antecedentes} institucionId="CENTRO_PEDIATRICO" onActualizar={actualizar}/>);
 await user.click(screen.getByRole('button',{name:'Actualizar historia clínica'}));
 await user.type(screen.getByLabelText('Patológicos'),'Asma sintética');
 await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(historia).not.toHaveBeenCalled();
 await user.type(screen.getByLabelText('Motivo del cambio clínico'),'Registro sintético');
 await user.click(screen.getByRole('button',{name:'Actualizar historia clínica'}));
 await user.click(screen.getByRole('button',{name:'Guardar historia'}));
 await waitFor(()=>expect(actualizar).toHaveBeenCalledTimes(1));
 expect(historia).toHaveBeenCalledWith('CENTRO_PEDIATRICO','menor',{patologicos:['Asma sintética'],quirurgicos:[],familiares:[],medicamentosActuales:[]},4,{versionAntecedentes:2,motivo:'Registro sintético'});
});
it('rechazo definitivo después de respuesta incierta devuelve el formulario y conserva el motivo',async()=>{
 confirmar.mockRejectedValueOnce({status:503,mensaje:'Respuesta perdida'}).mockRejectedValueOnce({status:409,mensaje:'Recarga antecedentes'});
 const user=userEvent.setup();render(<PediatricHistoryAllergiesView paciente={paciente} antecedentes={antecedentes} institucionId="CENTRO_PEDIATRICO" onActualizar={vi.fn()}/>);
 await user.type(screen.getByLabelText('Motivo del cambio clínico'),'Verificación sintética');await user.click(screen.getByRole('button',{name:'Confirmar Sin Alergias Conocidas'}));await screen.findByText('Resultado pendiente de confirmar');
 await user.click(screen.getByRole('button',{name:'Reintentar misma solicitud'}));await screen.findByText('Recarga antecedentes');expect(screen.queryByText('Resultado pendiente de confirmar')).toBeNull();expect(screen.getByLabelText('Motivo del cambio clínico')).toHaveValue('Verificación sintética');
});
it('reintento exitoso tras respuesta incierta limpia modales y campos de alergia',async()=>{
 registrarAlergiaMock.mockRejectedValueOnce({status:503,mensaje:'Respuesta perdida'}).mockResolvedValueOnce({antecedentes});
 const user=userEvent.setup(),actualizar=vi.fn().mockResolvedValue(undefined);
 render(<PediatricHistoryAllergiesView paciente={paciente} antecedentes={antecedentes} institucionId="CENTRO_PEDIATRICO" onActualizar={actualizar}/>);
 await user.type(screen.getByLabelText('Motivo del cambio clínico'),'Verificación sintética');
 await user.click(screen.getByRole('button',{name:'Registrar Alergia Documentada'}));
 await user.type(screen.getByLabelText(/Sustancia, Medicamento o Alimento/i),'Penicilina sintética');
 await user.type(screen.getByLabelText('Reacción clínica de la alergia'),'Exantema máculo-papular');
 await user.click(screen.getByRole('button',{name:'Guardar Alergia'}));
 await screen.findByText('Resultado pendiente de confirmar');
 await user.click(screen.getByRole('button',{name:'Reintentar misma solicitud'}));
 await waitFor(()=>expect(actualizar).toHaveBeenCalledTimes(1));
 expect(screen.queryByText('Resultado pendiente de confirmar')).toBeNull();
 expect(screen.queryByRole('dialog')).toBeNull();
 await user.click(screen.getByRole('button',{name:'Registrar Alergia Documentada'}));
 expect(screen.getByLabelText(/Sustancia, Medicamento o Alimento/i)).toHaveValue('');
 expect(screen.getByLabelText('Reacción clínica de la alergia')).toHaveValue('');
});
