import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P04 — Catálogo Versionado de Vacunas y Esquema Pediátrico (P04)', () => {
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
    tokenSintetico: 'inst-token-ped-04'
  };

  it('P04: Despliega biológicos oficiales con versiones inmutables y dosis recomendadas por edad (P04)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/administracion/catalogos?tab=vacunas');

    render(<App />);

    // Encabezado de la vista
    expect(
      await screen.findByText(/Catálogo Oficial de Inmunizaciones y Esquema Pediátrico \(P04\)/i)
    ).toBeInTheDocument();

    // Biológicos oficiales
    expect(screen.getByText(/BCG \(Bacilo de Calmette-Guérin\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Hepatitis B Pediátrica/i)).toBeInTheDocument();

    // Patologías prevenidas
    expect(screen.getByText(/Formas graves de Tuberculosis/i)).toBeInTheDocument();
    expect(screen.getByText(/Hepatitis B y transmisión vertical perinatal/i)).toBeInTheDocument();

    // Dosis oficiales y edades recomendadas
    expect(screen.getByText('Dosis única al nacer')).toBeInTheDocument();
    expect(screen.getByText('Dosis neonatal primeras 24 h')).toBeInTheDocument();
    expect(screen.getAllByText('Segunda dosis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tercera dosis').length).toBeGreaterThan(0);

    // Versión inmutable del esquema
    expect(screen.getAllByText(/Esquema Nacional MSPAS v2.1/i).length).toBeGreaterThan(0);
  });

  it('P04: Permite filtrar vacunas por nombre o patología prevenida (P04)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/administracion/catalogos?tab=vacunas');

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/BCG \(Bacilo de Calmette-Guérin\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Hepatitis B Pediátrica/i)).toBeInTheDocument();

    // Filtrar por 'Tuberculosis'
    const inputBuscar = screen.getByPlaceholderText(/Filtrar registros del catálogo/i);
    await user.type(inputBuscar, 'Tuberculosis');

    expect(screen.getByText(/BCG \(Bacilo de Calmette-Guérin\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hepatitis B Pediátrica/i)).not.toBeInTheDocument();
  });

  it('P04: Permite registrar una nueva vacuna con sus dosis oficiales asociadas (P04)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/administracion/catalogos?tab=vacunas');

    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole('button', { name: /Nueva Vacuna \/ Esquema \(P04\)/i })
    ).toBeInTheDocument();

    // Abrir modal
    const btnNueva = screen.getByRole('button', { name: /Nueva Vacuna \/ Esquema \(P04\)/i });
    await user.click(btnNueva);

    expect(
      await screen.findByRole('heading', { name: /Registrar Nueva Vacuna \/ Esquema Pediátrico \(P04\)/i })
    ).toBeInTheDocument();

    // Llenar campos
    const inputNombre = screen.getByPlaceholderText(/ej. Vacuna contra Varicela/i);
    await user.type(inputNombre, 'Vacuna contra Rotavirus Oral');

    const inputEnfermedad = screen.getByPlaceholderText(/ej. Varicela e infecciones secundarias/i);
    await user.type(inputEnfermedad, 'Gastroenteritis grave por rotavirus y deshidratación severa');

    // Cambiar vía a ORAL
    const selectVia = screen.getByLabelText(/Vía de Administración/i);
    await user.selectOptions(selectVia, 'ORAL');

    // Agregar segunda dosis
    const btnAgregarDosis = screen.getByRole('button', { name: /Agregar Dosis/i });
    await user.click(btnAgregarDosis);

    // Guardar
    const btnGuardar = screen.getByRole('button', { name: /Guardar Vacuna en Catálogo \(P04\)/i });
    await user.click(btnGuardar);

    // Debe mostrarse en el catálogo
    expect(await screen.findByText('Vacuna contra Rotavirus Oral')).toBeInTheDocument();
    expect(screen.getByText(/Gastroenteritis grave por rotavirus/i)).toBeInTheDocument();
  });
});
