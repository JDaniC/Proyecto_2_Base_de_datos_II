import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('C05 — Catálogo de Procedimientos y Aranceles Odontológicos (C05, Sin odontograma)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('C05: Odontólogo consulta catálogo estomatológico con aranceles y restricción sin odontograma en modo solo lectura', async () => {
    const sesionOdontologo = {
      usuarioId: 'usr-odon-01',
      email: 'jcastellanos@clinica-dental.salud.gt',
      nombre: 'Dr. Javier Castellanos',
      rolId: 'MEDICO',
      rolEtiqueta: 'Odontólogo Especialista',
      institucionId: 'CLINICA_ODONTOLOGICA',
      institucionNombre: 'Clínica Odontológica Integral',
      motorObjetivo: 'MySQL',
      permisos: [
        'pacientes.administrar',
        'consultas.crear',
        'consultas.ver',
        'consultas.registrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-odon'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionOdontologo));
    window.history.pushState({}, '', '/administracion/catalogos?tab=odontologia');

    render(<App />);

    // Título y alcance sin odontograma
    expect(
      await screen.findByRole('heading', {
        name: /Catálogo de Procedimientos y Aranceles Odontológicos \(C05\)/i
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Sin odontograma')).toBeInTheDocument();

    // Modo solo lectura para profesional clínico
    expect(screen.getByText(/Modo Consulta Clínica \(Solo Lectura\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nuevo Procedimiento \(C05\)/i })).not.toBeInTheDocument();

    // Procedimientos y aranceles referenciales
    expect(screen.getByText('ODON-01')).toBeInTheDocument();
    expect(screen.getByText(/Profilaxis Ultrassónica/i)).toBeInTheDocument();
    expect(screen.getByText('ODON-02')).toBeInTheDocument();
    expect(screen.getByText('ODON-03')).toBeInTheDocument();
    expect(screen.getAllByText(/1200\.00/i).length).toBeGreaterThan(0);

    // Filtro interactivo en tiempo real
    const user = userEvent.setup();
    const inputFiltro = screen.getByPlaceholderText(/Filtrar registros del catálogo activo/i);
    await user.type(inputFiltro, 'Endodoncia');

    expect(screen.getByText('ODON-03')).toBeInTheDocument();
    expect(screen.queryByText('ODON-01')).not.toBeInTheDocument();
  });

  it('C05: Administrador institucional puede crear un nuevo procedimiento con arancel referencial', async () => {
    const sesionAdmin = {
      usuarioId: 'usr-admin-odon-01',
      email: 'admin@clinica-dental.salud.gt',
      nombre: 'Ing. Roberto Méndez',
      rolId: 'ADMIN_INSTITUCIONAL',
      rolEtiqueta: 'Administrador Odontológico',
      institucionId: 'CLINICA_ODONTOLOGICA',
      institucionNombre: 'Clínica Odontológica Integral',
      motorObjetivo: 'MySQL',
      permisos: [
        'usuarios.administrar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-admin'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdmin));
    window.history.pushState({}, '', '/administracion/catalogos?tab=odontologia');

    render(<App />);

    const user = userEvent.setup();

    // Botón de nuevo procedimiento disponible para administradores
    const btnNuevo = await screen.findByRole('button', { name: /Nuevo Procedimiento \(C05\)/i });
    expect(btnNuevo).toBeInTheDocument();
    await user.click(btnNuevo);

    // Modal de registro C05
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Nuevo Procedimiento Odontológico \(C05\)/i)).toBeInTheDocument();

    // Llenar formulario
    const inputCodigo = screen.getByLabelText(/Código Nosológico/i);
    const inputNombre = screen.getByLabelText(/Nombre del Procedimiento/i);
    const inputDuracion = screen.getByLabelText(/Duración Sillón/i);
    const inputArancel = screen.getByLabelText(/Arancel Referencial/i);

    await user.type(inputCodigo, 'ODON-06');
    await user.type(inputNombre, 'Corona de Porcelana sobre Metal');
    await user.clear(inputDuracion);
    await user.type(inputDuracion, '60');
    await user.clear(inputArancel);
    await user.type(inputArancel, '1800');

    // Guardar
    const btnGuardar = screen.getByRole('button', { name: /Registrar Procedimiento/i });
    await user.click(btnGuardar);

    // Verificación de alta en catálogo
    expect(await screen.findByText('ODON-06')).toBeInTheDocument();
    expect(screen.getByText('Corona de Porcelana sobre Metal')).toBeInTheDocument();
    expect(screen.getAllByText(/1800\.00/i).length).toBeGreaterThan(0);
  });
});
