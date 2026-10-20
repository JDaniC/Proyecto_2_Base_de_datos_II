import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V15 — Administración de Usuarios y Provisión de Cuentas Institucionales', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V15: Administrador institucional accede a /administracion/usuarios, filtra por estado y cambia estados de cuenta', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Administrador Institucional (Ing. Roberto Méndez)
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Gestión de usuarios desde el sidebar
    const linkGestionUsuarios = await screen.findByRole('link', { name: /Gestión de usuarios/i });
    await user.click(linkGestionUsuarios);

    // Verificar cabecera V15
    expect(await screen.findByRole('heading', { name: /Administración de Usuarios y Cuentas \(V15\)/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Hospital General San Juan/i).length).toBeGreaterThan(0);

    // Comprobar filtro por estado «PENDIENTE»
    const botonFiltroPendiente = await screen.findByRole('button', { name: /^PENDIENTE$/i });
    await user.click(botonFiltroPendiente);

    // Usuario pendiente Dr. Alejandro Soto Gómez
    expect(await screen.findByText('Dr. Alejandro Soto Gómez')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    // Habilitar la cuenta pendiente
    const botonHabilitar = screen.getByRole('button', { name: /Habilitar/i });
    await user.click(botonHabilitar);

    // Alerta de éxito y actualización a Activo
    expect(await screen.findByText(/habilitada exitosamente/i)).toBeInTheDocument();
  });

  it('V15: Modal de aprovisionamiento permite dar de alta un nuevo usuario institucional con rol y trazabilidad UID', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión como administrador
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Ir a /administracion/usuarios
    const linkGestionUsuarios = await screen.findByRole('link', { name: /Gestión de usuarios/i });
    await user.click(linkGestionUsuarios);

    // Clic en «Aprovisionar Usuario Institucional»
    const botonAprovisionar = await screen.findByRole('button', {
      name: /Aprovisionar Usuario Institucional/i
    });
    await user.click(botonAprovisionar);

    // Modal V15
    expect(await screen.findByText(/Aprovisionar Cuenta de Usuario Institucional \(V15\)/i)).toBeInTheDocument();

    // Llenar formulario
    const inputNombre = screen.getByLabelText(/Nombre completo/i);
    await user.type(inputNombre, 'Dra. Claudia Patricia Méndez');

    const inputEmailModal = screen.getByLabelText(/Correo institucional/i);
    await user.type(inputEmailModal, 'claudia.mendez@hospital-general.salud.gt');

    const selectRol = screen.getByLabelText(/Rol institucional asignado/i);
    await user.selectOptions(selectRol, 'MEDICO');

    // Confirmar alta
    const botonGuardar = screen.getByRole('button', { name: /Aprovisionar Usuario \(V15\)/i });
    await user.click(botonGuardar);

    // Mensaje de éxito
    expect(await screen.findByText(/aprovisionado exitosamente/i)).toBeInTheDocument();

    // Comprobar que aparece en la tabla
    expect(screen.getByText('Dra. Claudia Patricia Méndez')).toBeInTheDocument();
    expect(screen.getByText('claudia.mendez@hospital-general.salud.gt')).toBeInTheDocument();
  });
});
