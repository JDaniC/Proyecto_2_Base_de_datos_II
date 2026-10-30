import React from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {AuthGuard} from '../../app/AuthGuard';
import type {SesionUsuario} from '../../services/types';
let sesion: SesionUsuario | null;
vi.mock('../../app/AuthSessionContext', () => ({useAuthSession: () => ({sesion,cargando:false})}));
const cuenta = (id: string, institucion: SesionUsuario['institucionId'] = 'HOSPITAL_GENERAL') => ({cuentaId:id,institucionId:institucion,fechaInicio:id,permisos:['consultas.registrar'],nombre:'Sintético',rolEtiqueta:'Médico'} as SesionUsuario);
afterEach(cleanup);
describe('Formulario clínico y cambios de sesión', () => {
 it('descarta la intención al cambiar de cuenta o institución', () => {
  function Formulario() {const [dato,setDato]=React.useState('');return <input aria-label="Motivo de atención" value={dato} onChange={e=>setDato(e.target.value)} />;}
  const Vista=()=> <MemoryRouter initialEntries={['/pacientes']}><AuthGuard requierePermiso="consultas.registrar"><Formulario /></AuthGuard></MemoryRouter>;
  sesion=cuenta('uno');const view=render(<Vista />);fireEvent.change(screen.getByLabelText('Motivo de atención'),{target:{value:'Intención cuenta uno'}});
  sesion=cuenta('dos');view.rerender(<Vista />);expect((screen.getByLabelText('Motivo de atención') as HTMLInputElement).value).toBe('');
  fireEvent.change(screen.getByLabelText('Motivo de atención'),{target:{value:'Otra institución'}});
  sesion=cuenta('dos','CENTRO_PEDIATRICO');view.rerender(<Vista />);expect((screen.getByLabelText('Motivo de atención') as HTMLInputElement).value).toBe('');
 });
 it('un analista sin permiso no recibe el formulario para prescribir', () => {
  sesion={...cuenta('analista','LABORATORIO_CLINICO'),permisos:['historial.leer']};
  render(<MemoryRouter initialEntries={['/pacientes']}><AuthGuard requierePermiso="consultas.registrar"><button>Prescribir</button></AuthGuard></MemoryRouter>);
  expect(screen.queryByRole('button',{name:'Prescribir'})).toBeNull();
 });
});
