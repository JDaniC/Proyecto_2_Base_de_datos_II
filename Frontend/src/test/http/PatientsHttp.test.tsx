import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ServiceProvider } from '../../app/ServiceContext';
import { AuthSessionProvider } from '../../app/AuthSessionContext';
import { PatientsListPage } from '../../features/patients/PatientsListPage';
import { PatientFormPage } from '../../features/patients/PatientFormPage';
import { PatientRecordPage } from '../../features/patients/PatientRecordPage';
import { createHttpPatientRepository } from '../../services/http/patients/httpPatientRepository';
import { mapearPaciente } from '../../services/http/patients/patientMapper';
import type { PacienteDto } from '../../services/http/patients/patientDtos';
import { HttpClient } from '../../services/http/httpClient';
import type { CrearPacienteDTO, SesionUsuario, InstitucionId } from '../../services/types';

const id = '00000000-0000-4000-8000-000000000001';
const clave = '00000000-0000-4000-8000-000000000002';
const paciente = (extra: Partial<PacienteDto> = {}): PacienteDto => ({ id, codigo_legible: 'HC-PRUEBA', institucion: 'HOSPITAL_GENERAL', nombres: 'Ána', apellidos: 'Prueba', fecha_nacimiento: '2000-02-29', sexo: 'FEMENINO', estado: 'ACTIVO', version: 3, fecha_registro: '2026-10-28T10:00:00Z', ...extra });
const entrada = (): CrearPacienteDTO => ({ nombres: 'Ána', apellidos: 'Prueba', fechaNacimiento: '2000-02-29', sexo: 'FEMENINO', tipoIdentificacion: 'SIN_DOCUMENTO', numeroIdentificacion: '', telefono: '', correo: '', direccion: '', idempotencyKey: clave });
const respuesta = (data: unknown, cursor?: string) => new Response(JSON.stringify({ data, meta: { correlacion: clave, ...(cursor ? { siguiente_cursor: cursor } : {}) } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fallo = (codigo: string, status: number) => new Response(JSON.stringify({ error: { codigo, mensaje: 'Solicitud rechazada.' }, meta: { correlacion: clave } }), { status });
const http = () => new HttpClient({ baseUrl: '/api/v1', tokenProvider: { obtenerToken: async () => 'token-sintetico', establecerCredenciales: async () => 'token-sintetico', limpiar: async () => {} } });
const sesion = (institucionId: InstitucionId = 'HOSPITAL_GENERAL', clinica = true): SesionUsuario => ({ cuentaId: clave, institucionId, email: 'prueba@example.test', nombre: 'Cuenta de prueba', rolId: 'SECRETARIA', rolEtiqueta: 'Secretaría', institucionNombre: 'Prueba', motorObjetivo: 'PostgreSQL', permisos: clinica ? ['pacientes.administrar', 'historial.leer'] : ['pacientes.administrar'], fechaInicio: '2026-10-28T10:00:00Z', tokenSintetico: 'token-sintetico' });
function mostrar(ruta: string, s = sesion()) {
  const auth = { obtenerCuentasDemo: async () => [], obtenerSesionActual: async () => s, iniciarSesion: async () => s, cerrarSesion: async () => {} };
  return render(<ServiceProvider mode="api" customAuthRepository={auth} customPatientRepository={createHttpPatientRepository(http())}><AuthSessionProvider><MemoryRouter initialEntries={[ruta]}>
    <Link to={`/pacientes/${id}`}>Seleccionar primero</Link><Link to="/pacientes/00000000-0000-4000-8000-000000000009">Seleccionar segundo</Link>
    <Routes><Route path="/pacientes" element={<PatientsListPage />} /><Route path="/pacientes/nuevo" element={<PatientFormPage />} /><Route path="/pacientes/:pacienteId/editar" element={<PatientFormPage />} /><Route path="/pacientes/:pacienteId" element={<PatientRecordPage />} /></Routes>
  </MemoryRouter></AuthSessionProvider></ServiceProvider>);
}
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('Adaptador HTTP de pacientes E02', () => {
  it('una búsqueda vacía no solicita el listado masivo', async () => {
    expect((await createHttpPatientRepository(http()).buscar('HOSPITAL_GENERAL', { q: '   ' })).items).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('envía q, límite, orden y cursor opaco, sin autoridad ni total inventado', async () => {
    fetchMock.mockResolvedValue(respuesta([paciente()], 'cursor-siguiente'));
    const res = await createHttpPatientRepository(http()).buscar('CENTRO_PEDIATRICO', { q: ' Ána ', limite: 1, cursor: 'opaco', orden: 'DESC', estado: 'TODOS' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('q=%C3%81na'); expect(url).toContain('cursor=opaco'); expect(url).toContain('orden=DESC'); expect(url).not.toContain('institucion');
    expect(options.headers.Authorization).toBe('Bearer token-sintetico'); expect(res.totalEncontrados).toBeUndefined(); expect(res.siguienteCursor).toBe('cursor-siguiente');
    expect(res.items[0].institucionId).toBe('HOSPITAL_GENERAL');
  });
  it.each(['NOMBRE_ASC', 'NOMBRE_DESC', 'FECHA_REGISTRO'] as const)('rechaza orden no admitido %s', async (orden) => {
    await expect(createHttpPatientRepository(http()).buscar('HOSPITAL_GENERAL', { q: 'Ana', orden })).rejects.toMatchObject({ status: 400 }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rechaza un filtro de sexo que el servidor no soporta', async () => {
    await expect(createHttpPatientRepository(http()).buscar('HOSPITAL_GENERAL', { q: 'Ana', sexo: 'FEMENINO' })).rejects.toMatchObject({ status: 400 });
  });
  it.each(['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'LABORATORIO_CLINICO', 'CENTRO_PEDIATRICO'] as const)('alta %s omite opcionales vacíos y preserva fecha civil y clave', async (institucion) => {
    fetchMock.mockResolvedValue(respuesta(paciente()));
    await createHttpPatientRepository(http()).crear(institucion, entrada());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ nombres: 'Ána', apellidos: 'Prueba', fecha_nacimiento: '2000-02-29', sexo: 'FEMENINO' });
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe(clave);
  });
  it('responsable explícito y contacto conservan nombres sin dividirlos; principal puede no autorizar', async () => {
    fetchMock.mockResolvedValue(respuesta(paciente()));
    await createHttpPatientRepository(http()).crear('CENTRO_PEDIATRICO', { ...entrada(), responsables: [{ id: '', nombre: 'Ana María De la Cruz', nombres: 'Ana María', apellidos: 'De la Cruz', documento: 'PRUEBA', tipoDocumento: 'PASAPORTE', telefono: '55550000', parentesco: 'Madre', esPrincipal: true, autorizaAtencion: false }] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).responsables[0]).toEqual({ nombres: 'Ana María', apellidos: 'De la Cruz', documento: { tipo: 'PASAPORTE', numero: 'PRUEBA' }, telefono: '55550000', parentesco: 'Madre', es_principal: true, autoriza_atencion: false });
  });
  it('alta de hermano referencia al responsable existente por UUID y versión, sin modificar sus datos', async () => {
    fetchMock.mockResolvedValue(respuesta(paciente()));
    await createHttpPatientRepository(http()).crear('CENTRO_PEDIATRICO', { ...entrada(), responsables: [{ id, version: 4, nombre: 'Tutor Prueba', parentesco: 'Madre', telefono: '55550000', esPrincipal: true, autorizaAtencion: false }] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).responsables).toEqual([{ responsable_id: id, version_responsable: 4, parentesco: 'Madre', es_principal: true, autoriza_atencion: false }]);
    await expect(createHttpPatientRepository(http()).crear('CENTRO_PEDIATRICO', { ...entrada(), responsables: [{ id: 'no-uuid', version: 0, nombre: 'Tutor', parentesco: 'Madre', telefono: '', esPrincipal: true, autorizaAtencion: true }] })).rejects.toMatchObject({ status: 400 });
  });
  it('PATCH distingue omisión, valor y eliminación, exige versión y no escribe responsables', async () => {
    fetchMock.mockResolvedValue(respuesta(paciente()));
    await createHttpPatientRepository(http()).actualizar('HOSPITAL_GENERAL', id, { correo: '', numeroIdentificacion: '', versionEsperada: 3, idempotencyKey: clave });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ version_esperada: 3, correo: null, identificacion: null });
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    await expect(createHttpPatientRepository(http()).actualizar('HOSPITAL_GENERAL', id, { correo: 'x@example.test', idempotencyKey: clave })).rejects.toMatchObject({ status: 400 });
    await expect(createHttpPatientRepository(http()).actualizar('HOSPITAL_GENERAL', id, { responsables: [], versionEsperada: 3, idempotencyKey: clave })).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('legado nulo conserva ausencia y edad civil; pediatría mapea su alias canónico', () => {
    const p = mapearPaciente(paciente({ institucion: 'CENTRO_MEDICO_PEDIATRICO', fecha_nacimiento: null, sexo: 'NO_DECLARADO' }));
    expect(p).toMatchObject({ institucionId: 'CENTRO_PEDIATRICO', edadAnios: null, fechaNacimiento: '', sexo: '', sexoLegado: 'NO_DECLARADO' });
    expect(mapearPaciente(paciente(), '2026-02-28').edadAnios).toBe(25);
    expect(mapearPaciente(paciente(), '2026-03-01').edadAnios).toBe(26);
  });
  it('respuesta de alta incompleta es incierta y permite reintento seguro', async () => {
    fetchMock.mockResolvedValue(respuesta({ id }));
    await expect(createHttpPatientRepository(http()).crear('HOSPITAL_GENERAL', entrada())).rejects.toMatchObject({ status: 503, esReintentable: true });
  });
  it('conserva tipo de documento legado y PATCH ajeno a identidad no lo normaliza', async () => {
    const p = mapearPaciente(paciente({ identificacion: { tipo: 'DPI_HISTORICO', numero: 'A'.repeat(60) } }));
    expect(p.tipoIdentificacion).toBe('LEGADO'); expect(p.tipoIdentificacionLegado).toBe('DPI_HISTORICO'); expect(p.numeroIdentificacion).toHaveLength(60);
    fetchMock.mockResolvedValue(respuesta(paciente()));
    await createHttpPatientRepository(http()).actualizar('HOSPITAL_GENERAL', id, { telefono: '55559999', versionEsperada: 3, idempotencyKey: clave });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ version_esperada: 3, telefono: '55559999' });
  });
  it('proyecta evento y referencias históricas conservando el cursor del expediente', async () => {
    fetchMock.mockResolvedValue(respuesta({ paciente: paciente(), historial: { paciente_id: id, version: 1, estado: 'ACTIVO', eventos: [{ id: clave, tipo: 'RECETA', titulo: 'Receta confirmada', recurso_id: clave, consulta_id: id, version_consulta: 7, fecha_hora: '2026-10-28T10:00:00Z' }] } }, 'cursor-expediente'));
    const res = await createHttpPatientRepository(http()).obtenerExpedienteCompleto('HOSPITAL_GENERAL', id, { orden: 'DESC', tipo: 'RECETA', cursor: 'previo' });
    expect(res?.eventos[0]).toMatchObject({ consultaId: id, recursoId: clave, versionConsulta: 7, profesional: '' }); expect(res?.siguienteCursor).toBe('cursor-expediente');
    expect(fetchMock.mock.calls[0][0]).toContain('/expediente?orden=DESC&tipo=RECETA&cursor=previo');
  });
  it('historial usa su propio endpoint/cursor y operaciones futuras rechazan sin tráfico', async () => {
    fetchMock.mockResolvedValue(respuesta({ paciente_id: id, version: 3, estado: 'ACTIVO', eventos: [] }, 'cursor-historial'));
    const repo = createHttpPatientRepository(http());
    expect(await repo.obtenerHistorial?.('HOSPITAL_GENERAL', id, { limite: 1, orden: 'ASC', cursor: 'opaco' })).toEqual({ eventos: [], siguienteCursor: 'cursor-historial' });
    expect(fetchMock.mock.calls[0][0]).toContain(`/${id}/historial?`);
    await expect(repo.obtenerPolizasSeguro('HOSPITAL_GENERAL', id)).rejects.toMatchObject({ status: 501 }); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 409, 503])('propaga error %s sin fallback', async (status) => {
    fetchMock.mockResolvedValue(fallo('PRUEBA', status));
    await expect(createHttpPatientRepository(http()).crear('HOSPITAL_GENERAL', entrada())).rejects.toMatchObject({ status });
    expect(localStorage.length).toBe(0);
  });
});

describe('Pacientes React con transporte HTTP controlado', () => {
  it('abre sin listado; busca y avanza mediante el cursor del servidor', async () => {
    const user = userEvent.setup(); mostrar('/pacientes');
    expect(await screen.findByText('Busca un paciente para comenzar')).toBeInTheDocument(); expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockImplementation(async (url: string) => respuesta([paciente({ nombres: url.includes('cursor=') ? 'Segunda' : 'Ána' })], url.includes('cursor=') ? undefined : 'cursor-uno'));
    await user.type(screen.getByRole('searchbox'), 'Ána');
    expect(await screen.findByText('Ána Prueba')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(await screen.findByText('Segunda Prueba')).toBeInTheDocument(); expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('cursor=cursor-uno');
    await user.click(screen.getByRole('button', { name: 'Alternar panel de filtros' })); expect(screen.queryByLabelText('Sexo administrativo')).not.toBeInTheDocument();
  });
  it('una respuesta de búsqueda tardía no reemplaza el término vigente', async () => {
    let resolver: (r: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) => url.includes('q=A&') ? new Promise<Response>((r) => { resolver = r; }) : Promise.resolve(respuesta([paciente({ nombres: 'Actual' })])));
    const user = userEvent.setup(); mostrar('/pacientes'); await screen.findByText('Busca un paciente para comenzar');
    await user.type(screen.getByRole('searchbox'), 'A'); await user.type(screen.getByRole('searchbox'), 'n');
    await screen.findByText('Actual Prueba'); resolver(respuesta([paciente({ nombres: 'Antigua' })]));
    await waitFor(() => expect(screen.queryByText('Antigua Prueba')).not.toBeInTheDocument());
  });
  it('reintentar una página fallida conserva cursor, número de página e historial', async () => {
    let caida = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('cursor=pagina-dos')) {
        if (caida) { caida = false; return fallo('PERSISTENCIA_NO_DISPONIBLE', 503); }
        return respuesta([paciente({ nombres: 'Segunda' })]);
      }
      return respuesta([paciente()], 'pagina-dos');
    });
    const user = userEvent.setup(); mostrar('/pacientes'); await screen.findByText('Busca un paciente para comenzar');
    await user.type(screen.getByRole('searchbox'), 'Ana'); await screen.findByText('Ána Prueba');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' })); await user.click(await screen.findByRole('button', { name: 'Reintentar búsqueda' }));
    await screen.findByText('Segunda Prueba'); expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('cursor=pagina-dos'); expect(screen.getByText(/Página 2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Página anterior' })); await screen.findByText('Ána Prueba'); expect(fetchMock.mock.calls.at(-1)?.[0]).not.toContain('cursor=');
  });
  it('secretaría carga solo perfil administrativo y no solicita datos clínicos', async () => {
    fetchMock.mockResolvedValue(respuesta(paciente())); mostrar(`/pacientes/${id}`, sesion('HOSPITAL_GENERAL', false));
    await screen.findByRole('heading', { name: 'Ána Prueba' }); expect(screen.getByText('Perfil administrativo')).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('/expediente'))).toBe(true);
    expect(screen.queryByText('Sin alergias medicamentosas conocidas')).not.toBeInTheDocument();
  });
  it('cambio de paciente invalida la lectura anterior', async () => {
    let resolver: (r: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) => url.includes(`${id}/expediente`) ? new Promise<Response>((r) => { resolver = r; }) : Promise.resolve(respuesta({ paciente: paciente({ id: '00000000-0000-4000-8000-000000000009', nombres: 'Segundo' }), historial: { eventos: [] } })));
    const user = userEvent.setup(); mostrar(`/pacientes/${id}`); await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await user.click(screen.getByText('Seleccionar segundo')); await screen.findByRole('heading', { name: 'Segundo Prueba' });
    resolver(respuesta({ paciente: paciente(), historial: { eventos: [] } })); await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ána Prueba' })).not.toBeInTheDocument());
  });
  it('conserva cuerpo y UUID ante caída; dos submits simultáneos solo envían uno', async () => {
    let resolver: (r: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => { resolver = r; }));
    const user = userEvent.setup(); mostrar('/pacientes/nuevo');
    await user.type(await screen.findByLabelText(/Nombres del paciente/), 'Ana'); await user.type(screen.getByLabelText(/Apellidos del paciente/), 'Prueba');
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '2000-02-29' } });
    const form = screen.getByRole('button', { name: 'Registrar paciente' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1)); resolver(fallo('PERSISTENCIA_NO_DISPONIBLE', 503));
    await screen.findByText('Resultado pendiente de confirmar'); expect(screen.getByLabelText(/Nombres del paciente/)).toBeDisabled();
    fetchMock.mockResolvedValue(respuesta(paciente())); fireEvent.submit(form);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, o]) => o.method === 'POST')).toHaveLength(2));
    const requests = fetchMock.mock.calls.filter(([, o]) => o.method === 'POST');
    expect(requests[0][1].body).toBe(requests[1][1].body); expect(requests[0][1].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/); expect(requests[0][1].headers['Idempotency-Key']).toBe(requests[1][1].headers['Idempotency-Key']);
  });
  it('un 409 conserva la edición y envía solo el campo cambiado con su versión', async () => {
    fetchMock.mockImplementation(async (_url: string, opts: RequestInit) => opts.method === 'PATCH' ? fallo('VERSION_DESACTUALIZADA', 409) : respuesta(paciente({ correo: 'antes@example.test' })));
    const user = userEvent.setup(); mostrar(`/pacientes/${id}/editar`);
    await waitFor(() => expect(screen.getByLabelText('Correo electrónico')).toHaveValue('antes@example.test'));
    await user.clear(screen.getByLabelText('Correo electrónico')); await user.click(screen.getByRole('button', { name: 'Guardar cambios de paciente' }));
    await screen.findByText(/Otra sesión modificó/); expect(screen.getByLabelText('Correo electrónico')).toHaveValue('');
    const patch = fetchMock.mock.calls.find(([, opts]) => opts.method === 'PATCH')!;
    expect(JSON.parse(patch[1].body)).toEqual({ version_esperada: 3, correo: null }); expect(screen.getByLabelText('Correo electrónico')).toBeEnabled();
  });
  it('reintento pediátrico con adulto nuevo conserva UUID aunque transcurra el tiempo', async () => {
    fetchMock.mockResolvedValue(fallo('PERSISTENCIA_NO_DISPONIBLE', 503));
    const user = userEvent.setup(); mostrar('/pacientes/nuevo', sesion('CENTRO_PEDIATRICO'));
    await user.type(await screen.findByLabelText(/Nombres del paciente/), 'Menor'); await user.type(screen.getByLabelText(/Apellidos del paciente/), 'Prueba'); fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '2020-01-01' } });
    await user.type(screen.getByLabelText(/Nombres del responsable/), 'Responsable'); await user.type(screen.getByLabelText(/Apellidos del responsable/), 'Prueba');
    await user.type(screen.getByLabelText(/Documento del responsable/), '1234567890102'); await user.type(screen.getByLabelText(/Teléfono del tutor/), '55550000');
    await user.click(screen.getByRole('button', { name: 'Registrar paciente' })); await screen.findByText('Resultado pendiente de confirmar');
    await new Promise((r) => setTimeout(r, 5));
    await user.click(screen.getByRole('button', { name: 'Registrar paciente' })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe(fetchMock.mock.calls[0][1].headers['Idempotency-Key']);
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
  });
  it('duplicado conserva datos y propone buscar al paciente existente', async () => {
    fetchMock.mockResolvedValue(fallo('PACIENTE_DUPLICADO', 409));
    const user = userEvent.setup(); mostrar('/pacientes/nuevo');
    await user.type(await screen.findByLabelText(/Nombres del paciente/), 'Ana'); await user.type(screen.getByLabelText(/Apellidos del paciente/), 'Prueba');
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '2000-02-29' } });
    await user.type(screen.getByLabelText('Número de documento (opcional)'), '1234567890101');
    await user.click(screen.getByRole('button', { name: 'Registrar paciente' }));
    await screen.findByRole('button', { name: 'Buscar paciente existente' }); expect(screen.getByLabelText(/Nombres del paciente/)).toHaveValue('Ana');
  });
  it('edición pediátrica conserva vínculos y no reenvía sus datos', async () => {
    const ped = paciente({ institucion: 'CENTRO_MEDICO_PEDIATRICO', responsables: [{ responsable: { id: clave, nombre: 'Tutor Prueba', nombres: 'Tutor', apellidos: 'Prueba', telefono: '55550000', version: 2 }, vinculo: { responsable_id: clave, version_responsable: 2, parentesco: 'Tutor', es_principal: true, autoriza_atencion: false }, version_vinculo: 1 }] });
    fetchMock.mockImplementation(async (_url: string, opts: RequestInit) => opts.method === 'PATCH' ? fallo('VERSION_DESACTUALIZADA', 409) : respuesta(ped));
    const user = userEvent.setup(); mostrar(`/pacientes/${id}/editar`, sesion('CENTRO_PEDIATRICO'));
    await screen.findByText(/Tutor Prueba/); expect(screen.queryByLabelText(/Nombres del responsable/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Teléfono principal de contacto'), '55559999'); await user.click(screen.getByRole('button', { name: 'Guardar cambios de paciente' }));
    await screen.findByText(/Otra sesión modificó/);
    const patch = fetchMock.mock.calls.find(([, opts]) => opts.method === 'PATCH')!; expect(JSON.parse(patch[1].body)).toEqual({ version_esperada: 3, telefono: '55559999' });
  });
  it('permite seleccionar responsable desde otro menor sin cargar notas clínicas', async () => {
    const ped = paciente({ institucion: 'CENTRO_MEDICO_PEDIATRICO', responsables: [{ responsable: { id: clave, nombre: 'Tutor Prueba', nombres: 'Tutor', apellidos: 'Prueba', telefono: '55550000', version: 2 }, vinculo: { responsable_id: clave, version_responsable: 2, parentesco: 'Padre', es_principal: true, autoriza_atencion: false }, version_vinculo: 1 }] });
    fetchMock.mockImplementation(async (url: string, opts: RequestInit) => opts.method === 'POST' ? fallo('VERSION_DESACTUALIZADA', 409) : respuesta(url.includes('?') ? [ped] : ped));
    const user = userEvent.setup(); mostrar('/pacientes/nuevo', sesion('CENTRO_PEDIATRICO', false));
    await user.type(await screen.findByLabelText(/Nombres del paciente/), 'Hermana'); await user.type(screen.getByLabelText(/Apellidos del paciente/), 'Prueba'); fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '2020-01-01' } });
    await user.selectOptions(screen.getByLabelText('Origen del responsable'), 'EXISTENTE'); await user.type(screen.getByLabelText('Buscar menor con responsable registrado'), 'Hermano'); await user.click(screen.getByRole('button', { name: 'Buscar menor' }));
    await user.click(await screen.findByRole('button', { name: 'Ver responsables de Ána Prueba' })); await user.click(await screen.findByRole('button', { name: 'Vincular a Tutor Prueba' }));
    await user.click(screen.getByRole('button', { name: 'Registrar paciente' })); await screen.findByText(/Los datos del responsable cambiaron/);
    const post = fetchMock.mock.calls.find(([, opts]) => opts.method === 'POST')!;
    expect(JSON.parse(post[1].body).responsables).toEqual([{ responsable_id: clave, version_responsable: 2, parentesco: 'Madre', es_principal: true, autoriza_atencion: true }]);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('expediente'))).toBe(true);
  });
});
