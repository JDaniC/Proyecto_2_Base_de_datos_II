import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('U04 — Pantalla 02 Aprobada: Búsqueda de Pacientes (V04) y Alta/Edición (V05)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V04: Renderiza encabezado «Pacientes del centro», breadcrumb y tabla de pacientes del Hospital General', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales (Hospital General)
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes desde la barra lateral
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    // Encabezado y buscador
    expect(await screen.findByRole('heading', { name: /Pacientes del centro/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Migas de pan/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /Buscador de pacientes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar nuevo paciente/i })).toBeInTheDocument();

    // Comprobar filas de pacientes iniciales
    expect(await screen.findByText('Roberto Estrada Morales')).toBeInTheDocument();
    expect(screen.getByText('HC-HOSP-0104')).toBeInTheDocument();
    expect(screen.getByText('Claudia Méndez Arriola')).toBeInTheDocument();
  });

  it('V04: Permite buscar por prefijo de nombre o documento y muestra resultados correspondientes', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const buscador = await screen.findByRole('searchbox', { name: /Buscador de pacientes/i });
    await user.clear(buscador);
    await user.type(buscador, 'Claudia{enter}');

    // Esperar a que el filtrado asíncrono oculte a Roberto
    await waitFor(() => {
      expect(screen.queryByText('Roberto Estrada Morales')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Claudia Méndez Arriola')).toBeInTheDocument();

    // Búsqueda por documento CUI de Carlos Villagrán
    await user.clear(buscador);
    await user.type(buscador, '9900-10103-0101{enter}');

    expect(await screen.findByText('Carlos Villagrán Sagastume')).toBeInTheDocument();
    expect(screen.queryByText('Claudia Méndez Arriola')).not.toBeInTheDocument();
  });

  it('V04: Panel de filtros permite filtrar por estado ARCHIVADO', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    await screen.findByText('Roberto Estrada Morales');

    // Abrir filtros
    const botonFiltros = screen.getByRole('button', { name: /Alternar panel de filtros/i });
    await user.click(botonFiltros);

    // Cambiar a Solo archivados
    const selectEstado = screen.getByLabelText(/Estado del expediente/i);
    await user.selectOptions(selectEstado, 'ARCHIVADO');

    // Debe mostrarse Gustavo Adolfo Salazar (Archivado)
    expect(await screen.findByText('Gustavo Adolfo Salazar Marroquín')).toBeInTheDocument();
    expect(screen.queryByText('Roberto Estrada Morales')).not.toBeInTheDocument();
  });

  it('V05: Control de duplicados (409 PACIENTE_DUPLICADO) previene registro con mismo documento y ofrece enlace al expediente', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    // Ir a Nuevo paciente
    const botonNuevo = await screen.findByRole('button', { name: /Registrar nuevo paciente/i });
    await user.click(botonNuevo);

    expect(await screen.findByRole('heading', { name: /Alta administrativa de paciente/i })).toBeInTheDocument();

    // Intentar registrar con el CUI existente de Roberto Estrada (9900-10101-0101)
    await user.type(screen.getByLabelText(/Nombres del paciente \*/i), 'Estuardo');
    await user.type(screen.getByLabelText(/Apellidos del paciente \*/i), 'Estrada Gómez');
    await user.type(screen.getByLabelText(/Fecha de nacimiento \*/i), '1995-03-20');
    await user.type(screen.getByLabelText(/Número de documento \/ Identificación \*/i), '9900-10101-0101');
    await user.type(screen.getByLabelText(/Teléfono principal de contacto \*/i), '5555-8888');

    const botonGuardar = screen.getByRole('button', { name: /Registrar paciente/i });
    await user.click(botonGuardar);

    // Debe desplegar el Banner de alerta 409 PACIENTE_DUPLICADO
    expect(
      await screen.findByText(/Control de duplicados institucional \(409 PACIENTE_DUPLICADO\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Roberto Estrada Morales/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver expediente existente/i })).toBeInTheDocument();
  });

  it('V05: Registra exitosamente un nuevo paciente cuando los datos son válidos e inéditos', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonNuevo = await screen.findByRole('button', { name: /Registrar nuevo paciente/i });
    await user.click(botonNuevo);

    await screen.findByRole('heading', { name: /Alta administrativa de paciente/i });

    // Ingresar datos válidos no existentes
    await user.type(screen.getByLabelText(/Nombres del paciente \*/i), 'Héctor Rolando');
    await user.type(screen.getByLabelText(/Apellidos del paciente \*/i), 'Pacheco Barrios');
    await user.type(screen.getByLabelText(/Fecha de nacimiento \*/i), '1992-06-18');
    await user.type(screen.getByLabelText(/Número de documento \/ Identificación \*/i), '9900-88888-0101');
    await user.type(screen.getByLabelText(/Teléfono principal de contacto \*/i), '5555-7777');
    await user.type(screen.getByLabelText(/Dirección de residencia/i), 'Zona 10, Diagonal 6');

    // Contacto de emergencia hospitalario
    await user.type(screen.getByLabelText(/Nombre completo del contacto/i), 'Laura de Pacheco');
    await user.type(screen.getByLabelText(/Parentesco con el paciente/i), 'Esposa');

    const botonGuardar = screen.getByRole('button', { name: /Registrar paciente/i });
    await user.click(botonGuardar);

    // Debe mostrar Toast de confirmación con el código asignado
    expect(
      await screen.findByText(/Paciente registrado exitosamente con código HC-HOSP-/i)
    ).toBeInTheDocument();
  });
});
