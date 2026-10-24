import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V17 — Catálogos Institucionales Unificados (H08, H05, C05, L10, P04)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V17: Administrador institucional accede a /administracion/catalogos y navega por todas las pestañas unificadas', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Administrador
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Catálogos institucionales desde el Sidebar
    const linkCatalogos = await screen.findByRole('link', { name: /Catálogos institucionales/i });
    await user.click(linkCatalogos);

    // Verificar encabezado V17
    expect(await screen.findByRole('heading', { name: /Catálogos Institucionales Unificados \(V17\)/i })).toBeInTheDocument();

    // Comprobar presencia de pestañas oficiales
    expect(screen.getByRole('tab', { name: /Personal Médico \(H08\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Aseguradoras \(H05\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Catálogos Odontológicos \(C05\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pruebas de Laboratorio \(L10\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Vacunas y Dosis \(P04\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /CIE-10 Nosológico/i })).toBeInTheDocument();

    // 1. Verificar pestaña activa por defecto: Personal Médico H08
    expect(await screen.findByText('Dra. Elena Morales')).toBeInTheDocument();
    expect(screen.getByText('CMG-10421')).toBeInTheDocument();
    expect(screen.getByText('Medicina Interna')).toBeInTheDocument();

    // 2. Navegar a Aseguradoras H05
    const tabAseguradoras = screen.getByRole('tab', { name: /Aseguradoras \(H05\)/i });
    await user.click(tabAseguradoras);
    expect(await screen.findByText(/Seguros El Roble, S.A./i)).toBeInTheDocument();
    expect(screen.getByText(/Plan Roble Oro Hospitalario/i)).toBeInTheDocument();

    // 3. Navegar a Catálogos Odontológicos C05
    const tabOdonto = screen.getByRole('tab', { name: /Catálogos Odontológicos \(C05\)/i });
    await user.click(tabOdonto);
    expect(await screen.findByText(/Profilaxis Ultrassónica y Aplicación de Flúor/i)).toBeInTheDocument();
    expect(screen.getByText('Sin odontograma')).toBeInTheDocument();

    // 4. Navegar a Pruebas de Laboratorio L10
    const tabLab = screen.getByRole('tab', { name: /Pruebas de Laboratorio \(L10\)/i });
    await user.click(tabLab);
    expect(await screen.findByText(/Hematología Completa Automatizada/i)).toBeInTheDocument();
    expect(screen.getByText('Regla CA16')).toBeInTheDocument();

    // 5. Navegar a Vacunas P04
    const tabVacunas = screen.getByRole('tab', { name: /Vacunas y Dosis \(P04\)/i });
    await user.click(tabVacunas);
    expect(await screen.findByText(/BCG \(Bacilo de Calmette-Guérin\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Hepatitis B Pediátrica/i)).toBeInTheDocument();
  });

  it('V17: Da de alta un nuevo médico especialista en H08 con validación de colegiado CMG', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Admin
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Catálogos
    const linkCatalogos = await screen.findByRole('link', { name: /Catálogos institucionales/i });
    await user.click(linkCatalogos);

    // Abrir modal de Registrar Médico
    const botonRegistrar = await screen.findByRole('button', { name: /Registrar Médico \(H08\)/i });
    await user.click(botonRegistrar);

    // Completar formulario del modal
    expect(await screen.findByRole('heading', { name: /Alta de Médico Especialista \(H08\)/i })).toBeInTheDocument();

    const inputNombre = screen.getByPlaceholderText(/Ej. Dr. Mario Fernando Carrillo/i);
    await user.type(inputNombre, 'Dr. Mario Fernando Carrillo');

    const inputColegiado = screen.getByPlaceholderText(/CMG-XXXXX/i);
    await user.type(inputColegiado, 'CMG-15201');

    const inputEmailMed = screen.getByPlaceholderText(/medico@hospital-general.salud.gt/i);
    await user.type(inputEmailMed, 'mario.carrillo@hospital-general.salud.gt');

    const botonSubmit = screen.getByRole('button', { name: /Registrar Profesional/i });
    await user.click(botonSubmit);

    // Verificar notificación de éxito y presencia en la lista
    expect(await screen.findByText(/registrado exitosamente/i)).toBeInTheDocument();
    expect(screen.getByText('Dr. Mario Fernando Carrillo')).toBeInTheDocument();
    expect(screen.getByText('CMG-15201')).toBeInTheDocument();
  });
});
