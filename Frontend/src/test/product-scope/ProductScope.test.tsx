import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { isRouteInInstitution, patientTabs } from '../../app/productScope';
import { MockCatalogRepository } from '../../mocks/mockCatalogRepository';
import { MockLaboratoryRepository } from '../../mocks/mockLaboratoryRepository';
import { MockPatientRepository } from '../../mocks/mockPatientRepository';
import { DEMO_ACCOUNTS } from '../../mocks/demoAccounts';
import { Sidebar } from '../../design-system/components/Sidebar';
import { SesionUsuario, InstitucionId } from '../../services/types';
import App from '../../app/App';

beforeEach(() => localStorage.clear());
const institutions: InstitucionId[] = ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'LABORATORIO_CLINICO', 'CENTRO_PEDIATRICO'];

describe('Producto final: límites de vistas', () => {
  it.each(institutions)('limita rutas y pestañas a %s', institution => {
    expect(isRouteInInstitution('/hospital/camas', institution)).toBe(institution === 'HOSPITAL_GENERAL');
    expect(isRouteInInstitution('/laboratorio/calidad', institution)).toBe(institution === 'LABORATORIO_CLINICO');
    expect(isRouteInInstitution('/agenda', institution)).toBe(institution !== 'LABORATORIO_CLINICO');
    expect(patientTabs(institution).includes('SEGUROS')).toBe(institution === 'HOSPITAL_GENERAL');
    expect(patientTabs(institution).includes('CRECIMIENTO')).toBe(institution === 'CENTRO_PEDIATRICO');
    expect(patientTabs(institution)).toEqual(expect.arrayContaining(['CONSULTAS', 'DIAGNOSTICOS', 'RECETAS']));
  });
  it.each(institutions)('no enlaza módulos externos desde %s', institution => {
    const account = DEMO_ACCOUNTS.find(a => a.institucionId === institution && a.estado === 'ACTIVO')!;
    const session = { ...account, cuentaId: account.id, fechaInicio: '', tokenSintetico: '' } as SesionUsuario;
    render(<BrowserRouter><Sidebar sesion={session} collapsed={false} onToggleCollapse={() => {}} /></BrowserRouter>);
    for (const link of screen.getAllByRole('link')) expect(isRouteInInstitution(new URL(link.getAttribute('href')!, 'http://localhost').pathname, institution)).toBe(true);
    expect(screen.queryByText(/Matriz de Roles|Personal de laboratorio/)).not.toBeInTheDocument();
  });
  it('el acceso solo solicita cuenta y contraseña', async () => {
    window.history.replaceState({}, '', '/acceso'); render(<App />);
    expect(await screen.findByLabelText(/Correo institucional/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Olvidó|demostración|motor/)).not.toBeInTheDocument();
  });
});

describe('Procesos documentados de laboratorio', () => {
  it('permite editar/desactivar catálogos y conserva los registros', async () => {
    const repo = new MockCatalogRepository();
    const original = await repo.guardarReferenciaLaboratorio('LABORATORIO_CLINICO', { categoria: 'solicitantes', nombre: 'Solicitante de prueba', estado: 'ACTIVO' });
    await repo.guardarReferenciaLaboratorio('LABORATORIO_CLINICO', { ...original, estado: 'INACTIVO' });
    const restored = await new MockCatalogRepository().obtenerReferenciasLaboratorio('LABORATORIO_CLINICO', 'solicitantes');
    expect(restored.find(r => r.id === original.id)?.estado).toBe('INACTIVO');
    await expect(repo.guardarReferenciaLaboratorio('LABORATORIO_CLINICO', { ...original, id: undefined })).rejects.toThrow(/Ya existe/);
    await expect(repo.obtenerReferenciasLaboratorio('HOSPITAL_GENERAL', 'solicitantes')).rejects.toThrow(/pertenece/);
  });
  it('conserva prueba, versión, muestra, edad y precio; crea el cobro de la orden', async () => {
    const catalog = new MockCatalogRepository(); const repo = new MockLaboratoryRepository();
    const test = (await catalog.obtenerPruebasLaboratorio('LABORATORIO_CLINICO'))[0];
    const order = await repo.crearOrden('LABORATORIO_CLINICO', { pacienteId: 'pac-lab-001', pacienteNombre: 'Paciente de prueba', pacienteDpi: '123', pacienteEdad: 42, pacienteSexo: 'MASCULINO', medicoSolicitante: 'Solicitante', prioridad: 'RUTINA', motivoClinico: 'Revisión', pruebasSeleccionadasIds: [test.id], preciosAcordados: { [test.id]: 175.25 } });
    expect(order.pacienteEdad).toBe(42); expect(order.items[0]).toMatchObject({ nombrePrueba: test.nombre, codigoPrueba: test.codigoPrueba, versionPrueba: test.version, tipoMuestra: test.tipoMuestra, arancelGTQ: 175.25 });
    expect(order.muestras[0].tipoMuestra).toBe(test.tipoMuestra);
    const invoice = await repo.obtenerFacturaPorOrden('LABORATORIO_CLINICO', order.id);
    expect(invoice?.saldoPendienteCentavos).toBe(17525);
    let sample = await repo.actualizarEstadoMuestra('LABORATORIO_CLINICO', order.muestras[0].id, 'TOMADA', undefined, 'Operador');
    sample = await repo.registrarTrasladoMuestra('LABORATORIO_CLINICO', sample.id, 'Sección de análisis', 'Operador');
    expect(sample.eventosTrazabilidad.at(-1)).toMatchObject({ tipoEvento: 'TRASLADO', actor: 'Operador' });
    sample = await repo.actualizarEstadoMuestra('LABORATORIO_CLINICO', sample.id, 'PROCESADA', undefined, 'Operador');
    expect(sample.eventosTrazabilidad.at(-1)?.tipoEvento).toBe('PROCESAMIENTO');
  });
  it('rechaza un precio negativo sin crear la orden', async () => {
    const repo = new MockLaboratoryRepository(); const catalog = new MockCatalogRepository();
    const test = (await catalog.obtenerPruebasLaboratorio('LABORATORIO_CLINICO'))[0];
    const count = (await repo.obtenerBandeja('LABORATORIO_CLINICO')).length;
    await expect(repo.crearOrden('LABORATORIO_CLINICO', { pacienteId: 'test', pacienteNombre: 'Test', pacienteDpi: '', pacienteEdad: 1, pacienteSexo: 'MASCULINO', medicoSolicitante: 'Test', prioridad: 'RUTINA', motivoClinico: 'Test', pruebasSeleccionadasIds: [test.id], preciosAcordados: { [test.id]: -1 } })).rejects.toThrow(/precio/);
    expect((await repo.obtenerBandeja('LABORATORIO_CLINICO')).length).toBe(count);
  });
});

describe('Datos de paciente según institución', () => {
  it('no trata dos documentos opcionales vacíos como un mismo paciente', async () => {
    const repo = new MockPatientRepository();
    const dto = { nombres: 'Paciente', apellidos: 'Sin documento', fechaNacimiento: '2000-01-01', sexo: 'MASCULINO' as const, tipoIdentificacion: 'SIN_DOCUMENTO_MENOR' as const, numeroIdentificacion: '', telefono: '5555', correo: '', direccion: '', idempotencyKey: 'scope-test' };
    const first = await repo.crear('CLINICA_ODONTOLOGICA', dto);
    const second = await repo.crear('CLINICA_ODONTOLOGICA', { ...dto, nombres: 'Otra persona' });
    expect(first.id).not.toBe(second.id);
  });
  it('mantiene el grupo sanguíneo hospitalario al editar', async () => {
    const repo = new MockPatientRepository();
    const patient = await repo.actualizar('HOSPITAL_GENERAL', 'pac-hosp-001', { grupoSanguineo: 'O+', idempotencyKey: 'blood-test' });
    expect(patient.grupoSanguineo).toBe('O+');
  });
});

describe('Núcleo clínico común y mantenimiento', () => {
  it.each(institutions)('registra y corrige consulta/diagnóstico/tratamiento/receta en %s', async institution => {
    const { MockConsultationRepository } = await import('../../mocks/mockConsultationRepository');
    const repo = new MockConsultationRepository();
    const patients = new MockPatientRepository();
    const patient = (await patients.buscar(institution, { limite: 1 })).items[0];
    const created = await repo.registrarConsultaCompleta(institution, {
      pacienteId: patient.id, motivo: 'Consulta de seguimiento', sintomas: 'Evaluación',
      signosVitales: { pesoKg: 16, tallaCm: 100, temperaturaC: null, presionSistolica: null, presionDiastolica: null, frecuenciaCardiacaLpm: null },
      diagnosticos: [{ codigoCIE: 'Z00.0', nombre: 'Evaluación', esPrincipal: true }],
      tratamientos: [{ descripcion: 'Seguimiento', indicaciones: 'Control' }],
      receta: { medicamentos: [{ nombre: 'Medicamento de prueba', presentacion: 'Suspensión', concentracion: '250 mg / 5 ml', dosis: '5', unidad: 'ml', frecuencia: 'Cada 8 horas', duracion: '5 días', via: 'Oral', indicaciones: 'Según prescripción' }] }, idempotencyKey: 'clinical-scope-test'
    }, { nombre: 'Profesional de prueba', rol: 'Médico' });
    expect(created.receta?.medicamentos[0].concentracion).toBe('250 mg / 5 ml');
    const updated = await repo.actualizarConsultaFinalizada(institution, patient.id, created.id, {
      motivo: 'Consulta corregida', diagnosticos: [{ codigoCIE: 'Z00.1', nombre: 'Control corregido', esPrincipal: true }],
      tratamientos: [{ descripcion: 'Tratamiento corregido', indicaciones: 'Seguimiento' }],
      receta: { medicamentos: [{ nombre: 'Medicamento corregido', presentacion: 'Suspensión', concentracion: '100 mg / ml', dosis: '2', unidad: 'ml', frecuencia: 'Diaria', duracion: '3 días', via: 'Oral', indicaciones: 'Control' }] }
    }, 'Corrección de registro', 'Profesional');
    expect(updated.historialRevisiones?.at(-1)?.anterior?.motivo).toBe('Consulta de seguimiento');
    const history = await new MockPatientRepository().obtenerExpedienteCompleto(institution, patient.id);
    expect(history?.consultas.find(c => c.id === created.id)?.motivo).toBe('Consulta corregida');
    expect(history?.diagnosticos.some(d => d.nombre === 'Control corregido')).toBe(true);
    expect(history?.recetas.some(r => r.medicamentos[0]?.nombre === 'Medicamento corregido')).toBe(true);
  });
});

describe('Pediatría: crecimiento y control mínimo', () => {
  const pediatricSession = () => ({ ...DEMO_ACCOUNTS.find(a => a.id === 'usr-ped-ped-01')!, cuentaId: 'usr-ped-ped-01', fechaInicio: '', tokenSintetico: '' });
  it('presenta mediciones por consulta sin control independiente ni curvas no sustentadas', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(pediatricSession()));
    window.history.replaceState({}, '', '/pacientes/pac-ped-001?tab=crecimiento'); render(<App />);
    expect(await screen.findByText(/Mediciones por consulta/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nuevo Control de Crecimiento/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Percentil 50|Curvas.*OMS/)).not.toBeInTheDocument();
  });
  it('rechaza abrir por URL una sección de otra institución', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(pediatricSession()));
    window.history.replaceState({}, '', '/laboratorio/inventario'); render(<App />);
    expect(await screen.findByRole('heading', { name: 'No tienes acceso a esta sección' })).toBeInTheDocument();
    expect(screen.queryByText(/Registrar lote/)).not.toBeInTheDocument();
  });
});

describe('Regresiones de integridad de los formularios', () => {
  it('editar datos del menor conserva al tutor adicional y su identidad', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const repo = new MockPatientRepository();
    await repo.agregarResponsable('CENTRO_PEDIATRICO', 'pac-ped-001', { nombre: 'Tutor adicional', parentesco: 'Padre', telefono: '55550000', esPrincipal: false, autorizaAtencion: true });
    const before = await repo.obtenerPorId('CENTRO_PEDIATRICO', 'pac-ped-001');
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify({ ...DEMO_ACCOUNTS.find(a => a.id === 'usr-ped-ped-01'), cuentaId: 'usr-ped-ped-01', fechaInicio: '', tokenSintetico: '' }));
    window.history.replaceState({}, '', '/pacientes/pac-ped-001/editar'); render(<App />);
    await screen.findByDisplayValue(before!.nombres);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios de paciente' }));
    await screen.findByText('Expediente actualizado exitosamente.');
    const after = await new MockPatientRepository().obtenerPorId('CENTRO_PEDIATRICO', 'pac-ped-001');
    expect(after?.responsables?.map(r => r.id).sort()).toEqual(before?.responsables?.map(r => r.id).sort());
    expect(after?.responsables?.some(r => r.nombre === 'Tutor adicional')).toBe(true);
  });
  it('rechaza asociar al resultado una muestra de otra orden', async () => {
    const catalog = new MockCatalogRepository(); const repo = new MockLaboratoryRepository();
    const test = (await catalog.obtenerPruebasLaboratorio('LABORATORIO_CLINICO'))[0];
    const dto = { pacienteId: 'pac-lab-001', pacienteNombre: 'Paciente', pacienteDpi: '123', pacienteEdad: 20, pacienteSexo: 'MASCULINO', medicoSolicitante: 'Profesional', prioridad: 'RUTINA' as const, motivoClinico: 'Revisión', pruebasSeleccionadasIds: [test.id], preciosAcordados: { [test.id]: 100 } };
    const first = await repo.crearOrden('LABORATORIO_CLINICO', dto);
    const second = await repo.crearOrden('LABORATORIO_CLINICO', dto);
    await repo.actualizarEstadoMuestra('LABORATORIO_CLINICO', second.muestras[0].id, 'ACEPTADA');
    await expect(repo.guardarResultadoBorrador('LABORATORIO_CLINICO', { ordenId: first.id, itemOrdenId: first.items[0].id, muestraId: second.muestras[0].id, equipoAnalitico: 'Equipo', metodoAnalitico: 'Método', parametros: [], analistaId: 'analista', analistaNombre: 'Analista' })).rejects.toThrow(/no corresponde/);
    expect(await repo.obtenerResultadosPorOrden('LABORATORIO_CLINICO', first.id)).toHaveLength(0);
  });
});
