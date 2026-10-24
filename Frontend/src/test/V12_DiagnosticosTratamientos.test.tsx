import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V12 — Diagnósticos Codificados CIE-10 y Tratamientos Clínicos', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V12: Visualiza diagnóstico principal vigente, filtra patologías por CIE-10 y alterna filtros', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes y abrir expediente
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a la pestaña «Diagnósticos»
    const tabDiagnosticos = await screen.findByRole('tab', { name: /Diagnósticos/i });
    await user.click(tabDiagnosticos);

    // Verificar banner de Diagnóstico Principal Vigente V12
    expect(await screen.findByText(/Diagnóstico Principal Vigente \(V12\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('I10').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hipertensión esencial \(primaria\)/i).length).toBeGreaterThan(0);

    // Probar filtro por texto en tabla
    const inputFiltro = screen.getByPlaceholderText(/Filtrar por CIE-10, patología o profesional/i);
    await user.type(inputFiltro, 'Diabetes');

    // Debe mostrar E11.9
    expect(screen.getByText('E11.9')).toBeInTheDocument();

    // Limpiar filtro
    await user.clear(inputFiltro);

    // Probar botón de filtro «Principal»
    const botonFiltroPrincipal = screen.getByRole('button', { name: /^Principal$/i });
    await user.click(botonFiltroPrincipal);

    // Debe mostrar el principal
    expect(screen.getAllByText('I10').length).toBeGreaterThan(0);

    // Probar botón de filtro «Secundarios»
    const botonFiltroSecundarios = screen.getByRole('button', { name: /^Secundarios$/i });
    await user.click(botonFiltroSecundarios);

    expect(screen.getByText('E11.9')).toBeInTheDocument();
  });

  it('V12: Abre modal, busca en catálogo institucional CIE-10 y registra un nuevo diagnóstico', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes y abrir expediente
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a pestaña Diagnósticos
    const tabDiagnosticos = await screen.findByRole('tab', { name: /Diagnósticos/i });
    await user.click(tabDiagnosticos);

    // Clic en «Registrar Diagnóstico CIE-10 (V12)»
    const botonNuevoDx = await screen.findByRole('button', {
      name: /Registrar Diagnóstico CIE-10 \(V12\)/i
    });
    await user.click(botonNuevoDx);

    // Modal de registro V12
    expect(await screen.findByText(/Registrar Diagnóstico Clínico Codificado \(V12\)/i)).toBeInTheDocument();

    // Buscar en catálogo institucional
    const inputBuscarCatalogo = screen.getByPlaceholderText(/Escriba código .* o patología/i);
    await user.type(inputBuscarCatalogo, 'asma');

    // Seleccionar resultado J45.9
    const resultadoAsma = await screen.findByText(/Asma bronquial no especificada/i);
    await user.click(resultadoAsma);

    // Verificar que se autocompletaron los campos
    const inputCodigo = screen.getByLabelText(/^Código/i);
    expect(inputCodigo).toHaveValue('J45.9');

    // Pauta terapéutica
    const textareaTratamiento = screen.getByLabelText(/Tratamiento o Pauta Terapéutica/i);
    await user.type(textareaTratamiento, 'Inhalador de salbutamol según necesidad y control ambiental.');

    // Guardar diagnóstico
    const botonGuardar = screen.getByRole('button', { name: /Guardar Diagnóstico \(V12\)/i });
    await user.click(botonGuardar);

    // Verificar que aparece en la tabla de diagnósticos del paciente
    expect(await screen.findByText('J45.9')).toBeInTheDocument();
    expect(screen.getByText('Asma bronquial no especificada')).toBeInTheDocument();
  });
});
