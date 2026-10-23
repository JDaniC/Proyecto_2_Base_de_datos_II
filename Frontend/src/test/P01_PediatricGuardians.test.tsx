import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P01 — Responsables del Menor y Consentimiento Clínico (P01, CA09)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionPediatria = {
    cuentaId: 'usr-ped-01',
    email: 'dra.marcela@pediatria-demo.gt',
    nombre: 'Dra. Marcela Estrada',
    rolId: 'PEDIATRA',
    rolEtiqueta: 'Médico Pediatra',
    institucionId: 'CENTRO_PEDIATRICO',
    institucionNombre: 'Centro Médico Pediátrico',
    motorObjetivo: 'Firestore',
    permisos: [
      'pacientes.administrar',
      'consultas.registrar',
      'historial.leer',
      'usuarios.administrar'
    ],
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-ped-01'
  };

  it('P01: Muestra los responsables del menor con principalidad obligatoria y facultad de autorización (CA09)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=responsables');

    render(<App />);

    // Encabezado del expediente
    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('HC-PED-0401').length).toBeGreaterThan(0);

    // Pestaña activa
    expect(screen.getByRole('tab', { name: /Responsables y tutores/i })).toBeInTheDocument();

    // Banner de consentimiento clínico acreditado (CA09)
    expect(await screen.findByText(/Facultad de Consentimiento Clínico Acreditada \(Regla CA09\)/i)).toBeInTheDocument();

    // Tutor inicial del mock (Andrea Arrecis)
    expect(screen.getByText('Andrea Arrecis de Álvarez')).toBeInTheDocument();
    expect(screen.getByText('Madre')).toBeInTheDocument();
    expect(screen.getByText('5555-9401')).toBeInTheDocument();
    expect(screen.getByText('9900-40901-0101')).toBeInTheDocument();
    expect(screen.getByText('Responsable Principal')).toBeInTheDocument();
    expect(screen.getByText('Autoriza Atención')).toBeInTheDocument();
  });

  it('P01: Protege la principalidad obligatoria impidiendo eliminar al único responsable principal (Regla CA09)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=responsables');

    render(<App />);

    expect(await screen.findByText('Andrea Arrecis de Álvarez')).toBeInTheDocument();

    // Como Andrea es la única responsable principal, el botón eliminar debe estar deshabilitado
    const tarjeta = screen.getByText('Andrea Arrecis de Álvarez').closest('div[class*="rounded-xl"]');
    expect(tarjeta).not.toBeNull();

    const botonEliminar = within(tarjeta!).getByTitle(/Regla CA09: No es posible dar de baja al único responsable principal/i);
    expect(botonEliminar).toBeDisabled();
  });

  it('P01: Permite vincular un nuevo responsable secundario con autorización independiente de atención (Regla CA09)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=responsables');

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Andrea Arrecis de Álvarez')).toBeInTheDocument();

    // Abrir modal de vincular nuevo tutor
    const btnVincular = screen.getByRole('button', { name: /Vincular Nuevo Responsable \(CA09\)/i });
    await user.click(btnVincular);

    expect(await screen.findByText(/Vincular Tutor \/ Responsable Legal/i)).toBeInTheDocument();

    // Llenar formulario: Abuela como tutora secundaria pero autorizada a consentir atención
    const inputNombre = screen.getByPlaceholderText(/Carmen Eugenia Morales/i);
    await user.type(inputNombre, 'Lucrecia Morales de Arrecis');

    const selectParentesco = screen.getByLabelText(/Parentesco con el menor/i);
    await user.selectOptions(selectParentesco, 'Abuelo/a');

    const inputTelefono = screen.getByPlaceholderText('Ej. 5555-1234');
    await user.type(inputTelefono, '5555-8822');

    // Desmarcar principal (debe ser secundaria), pero dejar autorizaAtencion = true
    const checkPrincipal = screen.getByLabelText(/Responsable Principal \(es_principal = true\)/i);
    if ((checkPrincipal as HTMLInputElement).checked) {
      await user.click(checkPrincipal);
    }

    const btnGuardar = screen.getByRole('button', { name: /Guardar Responsable \(CA09\)/i });
    await user.click(btnGuardar);

    // Debe mostrar notificación y aparecer en la lista
    expect(await screen.findByText(/vinculado correctamente/i)).toBeInTheDocument();
    expect(await screen.findByText('Lucrecia Morales de Arrecis')).toBeInTheDocument();
    expect(screen.getByText('Abuelo/a')).toBeInTheDocument();
    expect(screen.getByText('Tutor Secundario')).toBeInTheDocument();
  });

  it('P01: En modal de edición bloquea desmarcar al único responsable principal (Regla CA09)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=responsables');

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Andrea Arrecis de Álvarez')).toBeInTheDocument();

    const tarjeta = screen.getByText('Andrea Arrecis de Álvarez').closest('div[class*="rounded-xl"]');
    const botonEditar = within(tarjeta!).getByTitle(/Editar datos y facultades del tutor/i);
    await user.click(botonEditar);

    expect(await screen.findByText(/Editar Datos y Facultades del Tutor/i)).toBeInTheDocument();

    // El checkbox de principal debe estar deshabilitado porque es la única principal
    const checkPrincipal = screen.getByLabelText(/Responsable Principal \(es_principal = true\)/i);
    expect(checkPrincipal).toBeDisabled();
    expect(screen.getByText(/Protección CA09: No puede desmarcarse al único responsable principal/i)).toBeInTheDocument();
  });
});
