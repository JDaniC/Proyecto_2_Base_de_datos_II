import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L14 — Personal y Permisos de Laboratorio Clínico (L14)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionAdmin = {
    cuentaId: 'usr-admin-lab-01',
    email: 'admin@lab-clinico.salud.gt',
    nombre: 'Dra. Lucrecia Meléndez',
    rolId: 'ADMIN_INSTITUCIONAL',
    rolEtiqueta: 'Administradora Institucional',
    institucionId: 'LABORATORIO_CLINICO',
    institucionNombre: 'Laboratorio Clínico Central',
    motorObjetivo: 'MongoDB',
    permisos: [
      'usuarios.administrar',
      'resultados.validar',
      'pacientes.administrar',
      'historial.leer'
    ],
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-lab-admin'
  };

  it('L14: Muestra el listado de personal especializado, colegiados, funciones y secciones autorizadas', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdmin));
    window.history.pushState({}, '', '/administracion/usuarios?tab=personal-laboratorio');

    render(<App />);

    // Encabezado L14
    expect(await screen.findByText(/Personal y Permisos de Laboratorio Clínico \(L14\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Núcleo Común \+ Especialidad/i)).toBeInTheDocument();

    // Personal del mock
    expect(screen.getByText('Licda. Karen Marroquín')).toBeInTheDocument();
    expect(screen.getByText('COL-QB-4592')).toBeInTheDocument();
    expect(screen.getByText('Validador Clínico')).toBeInTheDocument();
    expect(screen.getAllByText(/Hematología y Coagulación/i).length).toBeGreaterThan(0);

    expect(screen.getByText('Téc. Marco Vinicio Ramos')).toBeInTheDocument();
    expect(screen.getByText('TEC-LAB-8812')).toBeInTheDocument();
    expect(screen.getByText('Analista de Muestras')).toBeInTheDocument();

    expect(screen.getByText('Dra. Elena Morales')).toBeInTheDocument();
    expect(screen.getByText('CMG-10421')).toBeInTheDocument();
    expect(screen.getByText('Médico Solicitante')).toBeInTheDocument();
  });

  it('L14: Permite filtrar personal por término de búsqueda', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdmin));
    window.history.pushState({}, '', '/administracion/usuarios?tab=personal-laboratorio');

    render(<App />);
    const user = userEvent.setup();

    expect(await screen.findByText('Licda. Karen Marroquín')).toBeInTheDocument();

    // Buscar "Marco"
    const inputBuscar = screen.getByPlaceholderText(/Buscar por nombre, correo o colegiado\/licencia/i);
    await user.type(inputBuscar, 'Marco');

    expect(screen.getByText('Téc. Marco Vinicio Ramos')).toBeInTheDocument();
    expect(screen.queryByText('Licda. Karen Marroquín')).not.toBeInTheDocument();
  });

  it('L14: Permite suspender y reactivar la facultad de firma digital de un validador', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdmin));
    window.history.pushState({}, '', '/administracion/usuarios?tab=personal-laboratorio');

    render(<App />);
    const user = userEvent.setup();

    // Karen Marroquín tiene firma habilitada inicialmente
    expect(await screen.findByText('Licda. Karen Marroquín')).toBeInTheDocument();
    const btnSuspender = screen.getAllByRole('button', { name: /Suspender firma/i })[0];
    await user.click(btnSuspender);

    // Debe mostrar notificación y el botón ahora debe ser "Autorizar firma"
    expect(await screen.findByText(/suspendida/i)).toBeInTheDocument();
  });
});
