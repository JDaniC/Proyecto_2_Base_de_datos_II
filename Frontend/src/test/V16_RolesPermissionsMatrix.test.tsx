import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V16 — Matriz Institucional de Roles y Permisos (RBAC)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V16: Administrador institucional accede a la pestaña de Roles y visualiza matriz RBAC con roles y permisos', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Administrador Institucional (Ing. Roberto Méndez)
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Gestión de usuarios
    const linkGestionUsuarios = await screen.findByRole('link', { name: /Gestión de usuarios/i });
    await user.click(linkGestionUsuarios);

    // Cambiar a la pestaña «Matriz de Roles y Permisos (V16)»
    const tabRoles = await screen.findByRole('tab', { name: /Matriz de Roles y Permisos \(V16\)/i });
    await user.click(tabRoles);

    // Verificar encabezado y badge de V16
    expect(await screen.findByRole('heading', { name: /Matriz Institucional de Roles y Permisos \(V16\)/i })).toBeInTheDocument();
    expect(screen.getByText('RBAC Estricto')).toBeInTheDocument();

    // Verificar roles institucionales presentes en la tabla
    expect(screen.getAllByText('Médico Especialista').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Secretaría y Admisión').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Administrador Institucional/i).length).toBeGreaterThan(0);

    // Comprobar presencia de permisos institucionales
    expect(screen.getAllByText('Gestión demográfica de pacientes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lectura de expediente clínico').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agenda y gestión de citas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Archivar y reactivar expedientes').length).toBeGreaterThan(0);

    // Filtrar por categoría «CLINICA» / área médica
    const botonAreaClinica = screen.getByRole('button', { name: /Atención/i });
    await user.click(botonAreaClinica);

    // Verificar que aparece Registro de consultas médicas
    const itemsClinicos = await screen.findAllByText('Registro de consultas médicas');
    expect(itemsClinicos.length).toBeGreaterThan(0);

    // Comprobar que en la tabla ya no se muestra el código técnico pacietes.administrar
    expect(screen.queryByText('pacientes.administrar')).not.toBeInTheDocument();
  });

  it('V16: Permite modificar permisos de un rol y emite confirmación con trazabilidad institucional', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Admin
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Ir a /administracion/usuarios?tab=roles directamente
    const linkGestionUsuarios = await screen.findByRole('link', { name: /Gestión de usuarios/i });
    await user.click(linkGestionUsuarios);
    const tabRoles = await screen.findByRole('tab', { name: /Matriz de Roles y Permisos \(V16\)/i });
    await user.click(tabRoles);

    // Buscar permiso de 'informes.emitir'
    const inputBusqueda = await screen.findByPlaceholderText(/Buscar por permiso, código técnico o descripción/i);
    await user.type(inputBusqueda, 'informes.emitir');

    expect(await screen.findByText('Emisión de reportes e informes')).toBeInTheDocument();

    // Toggle permiso para Médico Especialista (asignar informes.emitir)
    const botonToggle = screen.getByRole('button', { name: /Asignar informes.emitir a Médico Especialista/i });
    await user.click(botonToggle);

    // Verificar notificación de éxito
    expect(await screen.findByText(/asignado a Médico Especialista con trazabilidad de auditoría/i)).toBeInTheDocument();
  });
});
