import React from 'react';
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
import {ServiceProvider, useServices} from '../../app/ServiceContext';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createHttpServices} from '../../services/http/serviceFactory';
import type {RegistroConsultaCompletaDTO} from '../../services/types';
const id = '00000000-0000-4000-8000-000000000001';
const dto: RegistroConsultaCompletaDTO = {pacienteId: id, versionPaciente: 3, citaId: id, versionCita: 2, responsableId: id, versionVinculo: 4, motivo: 'Control sintético', sintomas: '', signosVitales: {pesoKg: 25, tallaCm: null, temperaturaC: null, presionSistolica: null, presionDiastolica: null, frecuenciaCardiacaLpm: null}, diagnosticos: [], tratamientos: [], idempotencyKey: id};
const consulta = {id, paciente_id: id, version: 1, fecha_hora: '2026-10-30T12:00:00Z', profesional: {nombre: 'Servidor', rol: 'PEDIATRA'}, estado: 'FINALIZADA', motivo: 'Control sintético', sintomas: '', signos_vitales: {peso_kg: 25}, diagnosticos: [], tratamientos: []};
const response = (status: number, data: unknown) => new Response(JSON.stringify(status < 400 ? {data} : {error: {codigo: 'RECHAZADO', mensaje: 'Rechazado'}}), {status, headers: {'Content-Type':'application/json'}});
afterEach(() => {cleanup(); vi.unstubAllGlobals();});
describe('E03 transporte clínico', () => {
  it('el proveedor usado por React entrega el adaptador clínico real', async () => {
    const fetch = vi.fn().mockResolvedValue(response(201, consulta)); vi.stubGlobal('fetch',fetch);
    function Formulario() {
      const {consultationRepository} = useServices();
      const [estado,setEstado] = React.useState('pendiente');
      return React.createElement('button',{onClick:async () => {try {await consultationRepository.registrarConsultaCompleta('HOSPITAL_GENERAL',dto,{nombre:'Ignorado',rol:'Ignorado'});setEstado('confirmado');}catch {setEstado('rechazado');}}},estado);
    }
    render(React.createElement(ServiceProvider,{mode:'api',children:React.createElement(Formulario)}));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('confirmado'));
    expect(fetch.mock.calls[0][0]).toContain('/consultas/completas');
  });
  it('envía referencias/versiones y conserva clave al perder respuesta, omitiendo autoridad del cliente', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('respuesta perdida')).mockResolvedValueOnce(response(201, consulta)); vi.stubGlobal('fetch', fetch);
    const s = createHttpServices();
    await expect(s.consultationRepository.registrarConsultaCompleta('CENTRO_PEDIATRICO', dto, {nombre: 'Falso',rol:'ADMIN'})).rejects.toMatchObject({status:503});
    const c = await s.consultationRepository.registrarConsultaCompleta('CENTRO_PEDIATRICO', dto, {nombre:'Falso',rol:'ADMIN'});
    expect(c.profesionalNombre).toBe('Servidor'); expect(c.signosVitales.pesoKg).toBe(25);
    const [first, second] = fetch.mock.calls;
    expect(first[1].body).toBe(second[1].body); expect(first[1].headers['Idempotency-Key']).toBe(second[1].headers['Idempotency-Key']);
    const body = JSON.parse(first[1].body); expect(body).toMatchObject({version_paciente:3,version_cita:2,version_vinculo:4}); expect(body.profesional).toBeUndefined(); expect(body.institucionId).toBeUndefined();
  });
  it('corregir receta elimina IDs de persistencia y conserva datos clínicos', async () => {
    const fetch = vi.fn().mockResolvedValue(response(200,consulta));vi.stubGlobal('fetch',fetch);
    const medicamento = {id:'interno', nombre:'Sintético',presentacion:'Tableta',concentracion:'10 mg',dosis:'1 tableta',unidad:'',frecuencia:'Cada día',duracion:'3 días',via:'Oral',indicaciones:'Prueba'};
    await createHttpServices().consultationRepository.actualizarConsultaFinalizada('HOSPITAL_GENERAL',id,id,{...dto,receta:{medicamentos:[medicamento]}},'Corrección','Ignorado',1);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.contenido.receta.medicamentos[0]).not.toHaveProperty('id');
    expect(body.contenido.signos_vitales).not.toHaveProperty('perimetro_cefalico_cm');
    expect(body.contenido.receta.medicamentos[0].dosis).toBe('1 tableta');
  });
  it.each([400,403,409,503])('conserva rechazo HTTP %s en corrección, sin éxito simulado', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status, null)));
    await expect(createHttpServices().consultationRepository.actualizarConsultaFinalizada('HOSPITAL_GENERAL', id,id,dto,'Corrección','Falso',1)).rejects.toMatchObject({status});
  });
  it('consulta revisión histórica y rechaza consulta de otro paciente', async () => {
    const fetch = vi.fn().mockImplementation(async () => response(200,consulta)); vi.stubGlobal('fetch',fetch);
    const r = createHttpServices().consultationRepository;
    await r.obtenerPorId('HOSPITAL_GENERAL',id,id,1); expect(fetch.mock.calls[0][0]).toContain('version=1');
    await expect(r.obtenerPorId('HOSPITAL_GENERAL','otro',id)).rejects.toMatchObject({status:409});
  });
  it('agenda traduce el día inclusivo al rango civil HTTP y no trunca páginas', async () => {
    const fetch=vi.fn().mockResolvedValue(response(200,[]));vi.stubGlobal('fetch',fetch);
    await createHttpServices().appointmentRepository.obtenerCitas('CLINICA_ODONTOLOGICA',{fechaDesde:'2026-10-30',fechaHasta:'2026-10-30',profesionalId:'TODOS',estado:'TODOS'});
    expect(fetch.mock.calls[0][0]).toContain('fecha_hasta=2026-10-31');
    expect(fetch.mock.calls[0][0]).not.toContain('profesional_id=');
    expect(fetch.mock.calls[0][0]).not.toContain('estado=');
  });
  it('archivo conserva versión, motivo y clave en reintento sin respuesta', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('offline')); vi.stubGlobal('fetch',fetch);
    const r = createHttpServices().patientRepository;
    for(let n=0;n<2;n++) await expect(r.archivar('HOSPITAL_GENERAL',id,'TRASLADO','Motivo sintético',3)).rejects.toMatchObject({status:503});
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(fetch.mock.calls[1][1].headers['Idempotency-Key']);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({causa:'TRASLADO',motivo:'Motivo sintético',version_esperada:3});
  });
});
