import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {CorregirAplicacionVacunaModal} from '../../features/patients/components/CorregirAplicacionVacunaModal';
import type {AplicacionVacuna} from '../../services/types';
const corregir=vi.hoisted(()=>vi.fn());
vi.mock('../../app/ServiceContext',()=>({useServices:()=>({mode:'api',vaccineRepository:{corregirAplicacion:corregir}})}));
vi.mock('../../app/AuthSessionContext',()=>({useAuthSession:()=>({sesion:{institucionId:'CENTRO_PEDIATRICO',nombre:'Pediatra',rolEtiqueta:'Pediatra'}})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('corrección permite vaciar observaciones y envía revisión observada',async()=>{
 corregir.mockResolvedValue({});const user=userEvent.setup();render(<CorregirAplicacionVacunaModal isOpen onClose={vi.fn()} onActualizado={vi.fn()} aplicacion={{id:'p__v__d',lote:'LOTE',sitioAnatomico:'Sitio',nombreVacuna:'Vacuna',etiquetaDosis:'Primera',observaciones:'Dato anterior',versionRegistro:2} as AplicacionVacuna}/>);
 await user.clear(screen.getByDisplayValue('Dato anterior'));await user.type(screen.getByPlaceholderText(/Enmienda de número de lote/),'Rectificación sintética');
 await user.click(screen.getByRole('button',{name:/Guardar Revisión/}));expect(corregir).toHaveBeenCalledWith('CENTRO_PEDIATRICO','p__v__d',{lote:'LOTE',sitioAnatomico:'Sitio',observaciones:'',motivo:'Rectificación sintética'},'Pediatra (Pediatra)',2);
});
