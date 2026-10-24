import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('H07 — Procedimientos Clínicos y Quirúrgicos Realizados (H07, RF-H04)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('H07: Detalle de consulta médica (V11) visualiza y registra procedimiento clínico ambulatorio', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes -> Expediente -> Consulta
    const linkPacientes = await screen.findByRole('link', { name: /^Pacientes$/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Ir a pestaña Consultas
    const tabConsultas = await screen.findByRole('tab', { name: /Consultas/i });
    await user.click(tabConsultas);

    // Abrir detalle de consulta V11
    const botonesDetalle = await screen.findAllByRole('button', { name: /Ver Detalle de Consulta \(V11\)/i });
    await user.click(botonesDetalle[0]);

    // Verificar panel H07
    expect(await screen.findByRole('heading', { name: /Procedimientos Clínicos Realizados \(H07\)/i })).toBeInTheDocument();
    expect(screen.getByText('Electrocardiograma de 12 derivaciones en reposo')).toBeInTheDocument();
    expect(screen.getByText(/Ritmo sinusal normal/i)).toBeInTheDocument();

    // Registrar nuevo procedimiento ambulatorio
    const btnRegistrar = screen.getByRole('button', { name: /Registrar Procedimiento \(H07\)/i });
    await user.click(btnRegistrar);

    // Llenar formulario
    const inputNombre = screen.getByPlaceholderText(/Curación de herida, Infiltración articular/i);
    await user.type(inputNombre, 'Curación avanzada y desbridamiento de herida quirúrgica');

    const inputResultado = screen.getByPlaceholderText(/Procedimiento tolerado sin incidentes/i);
    await user.type(inputResultado, 'Lecho cruento limpio, tejido de granulación visible, sin exudado purulento');

    // Confirmar
    const btnGuardar = screen.getByRole('button', { name: /Guardar Procedimiento \(H07\)/i });
    await user.click(btnGuardar);

    // Verificación
    expect(await screen.findByText(/Procedimiento clínico registrado exitosamente/i)).toBeInTheDocument();
    expect(screen.getByText('Curación avanzada y desbridamiento de herida quirúrgica')).toBeInTheDocument();
  });

  it('H07: Detalle de hospitalización (H02) muestra procedimientos quirúrgicos realizados durante internamiento', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Hospitalizaciones
    const linkHospitalizaciones = await screen.findByRole('link', { name: /^Hospitalizaciones$/i });
    await user.click(linkHospitalizaciones);

    // Abrir detalle del primer paciente activo
    const botonesDetalle = await screen.findAllByRole('button', { name: /Ver Detalle/i });
    await user.click(botonesDetalle[0]);

    // Esperar encabezado del paciente en el detalle
    expect(await screen.findByRole('heading', { name: /Roberto Estrada Morales/i })).toBeInTheDocument();

    // Cambiar a la pestaña de Procedimientos Realizados (H07)
    const btnTabProc = await screen.findByRole('tab', { name: /Procedimientos Realizados \(H07\)/i });
    await user.click(btnTabProc);

    // Verificar procedimiento quirúrgico/hospitalario registrado
    expect(await screen.findByText(/Colocación de catéter venoso periférico/i)).toBeInTheDocument();
    expect(screen.getByText(/Enfra\. Mayra Castillo/i)).toBeInTheDocument();
    expect(screen.getByText(/Cateterización exitosa en fosa antecubital/i)).toBeInTheDocument();
  });

  it('H07: Expediente clínico (?tab=procedimientos) consolida intervenciones y filtra por origen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    const linkPacientes = await screen.findByRole('link', { name: /^Pacientes$/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a la pestaña de Procedimientos realizados
    const tabProcedimientos = await screen.findByRole('tab', { name: /Procedimientos realizados/i });
    await user.click(tabProcedimientos);

    // Encabezado y KPIs de la subvista H07
    expect(await screen.findByRole('heading', { name: /Procedimientos Clínicos y Quirúrgicos Realizados \(H07\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Total Realizados/i)).toBeInTheDocument();
    expect(screen.getByText(/Quirúrgicos \/ Hospitalización/i)).toBeInTheDocument();
    expect(screen.getByText(/Ambulatorios \/ Consulta/i)).toBeInTheDocument();

    // Comprobar presencia de procedimientos de hospitalización y consulta
    expect(await screen.findByText('Colecistectomía Laparoscópica Electiva')).toBeInTheDocument();
    expect(screen.getByText('Electrocardiograma de 12 derivaciones en reposo')).toBeInTheDocument();

    // Filtrar por Hospitalización
    const btnFiltroHosp = screen.getByRole('button', { name: /Hospitalización \(/i });
    await user.click(btnFiltroHosp);
    expect(screen.getByText('Colecistectomía Laparoscópica Electiva')).toBeInTheDocument();

    // Filtrar por Consulta Ambulatoria
    const btnFiltroCons = screen.getByRole('button', { name: /Consulta Ambulatoria \(/i });
    await user.click(btnFiltroCons);
    expect(screen.getByText('Electrocardiograma de 12 derivaciones en reposo')).toBeInTheDocument();

    // Registrar nuevo procedimiento desde el modal
    const btnNuevoModal = screen.getByRole('button', { name: /Registrar Procedimiento \(H07\)/i });
    await user.click(btnNuevoModal);

    expect(await screen.findByRole('heading', { name: /Registrar Procedimiento Clínico Realizado \(H07\)/i })).toBeInTheDocument();

    const inputModalNombre = screen.getByLabelText(/Nombre del Procedimiento \*/i);
    await user.type(inputModalNombre, 'Drenaje percutáneo de colección');

    const inputModalResultado = screen.getByLabelText(/Resultado o Hallazgos Obtenidos \*/i);
    await user.type(inputModalResultado, 'Obtención de 50 cc de líquido seroso estéril');

    const btnConfirmar = screen.getByRole('button', { name: /Confirmar registro de procedimiento realizado/i });
    await user.click(btnConfirmar);

    expect(await screen.findByText(/Procedimiento clínico registrado exitosamente/i)).toBeInTheDocument();
  });
});
