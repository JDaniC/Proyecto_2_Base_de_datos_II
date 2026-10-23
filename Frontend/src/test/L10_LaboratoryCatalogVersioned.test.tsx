import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L10 — Catálogo Versionado de Determinaciones de Laboratorio (L10, CA16)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionAdminLab = {
    cuentaId: 'usr-admin-lab-01',
    email: 'admin@lab-clinico.salud.gt',
    nombre: 'Dra. Lucrecia Meléndez',
    rolId: 'ADMIN_INSTITUCIONAL',
    rolEtiqueta: 'Administradora de Laboratorio',
    institucionId: 'LABORATORIO_CLINICO',
    institucionNombre: 'Laboratorio Clínico Central',
    motorObjetivo: 'MongoDB',
    permisos: [
      'usuarios.administrar',
      'resultados.analizar',
      'resultados.validar',
      'pacientes.administrar',
      'historial.leer'
    ],
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-lab-admin'
  };

  it('L10: Muestra determinaciones de laboratorio versionadas, secciones y parámetros de referencia', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdminLab));
    window.history.pushState({}, '', '/administracion/catalogos?tab=laboratorio');

    render(<App />);

    // Título y regla CA16
    expect(await screen.findByText(/Catálogo de Pruebas y Parámetros Versionados de Laboratorio \(L10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Regla CA16/i)).toBeInTheDocument();

    // Pruebas iniciales del catálogo
    expect(screen.getByText('HEM-001')).toBeInTheDocument();
    expect(screen.getByText('Hematología Completa Automatizada')).toBeInTheDocument();
    expect(screen.getByText('v2.0')).toBeInTheDocument();
    expect(screen.getByText(/Citometría de Flujo e Impedancia Eléctrica/i)).toBeInTheDocument();

    // Parámetros analíticos visibles
    expect(screen.getByText('Recuento de Leucocitos')).toBeInTheDocument();
    expect(screen.getByText(/4.5 - 11.0 10\^3\/µL/i)).toBeInTheDocument();
  });

  it('L10: Permite registrar una nueva prueba analítica en el catálogo', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdminLab));
    window.history.pushState({}, '', '/administracion/catalogos?tab=laboratorio');

    render(<App />);
    const user = userEvent.setup();

    // Abrir modal
    const btnNueva = await screen.findByRole('button', { name: /Nueva Determinación \(L10\)/i });
    await user.click(btnNueva);

    // Modal visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar Nueva Determinación de Laboratorio \(L10\)/i)).toBeInTheDocument();

    // Completar formulario
    await user.type(screen.getByLabelText(/Código Oficial \*/i), 'INM-005');
    await user.type(screen.getByLabelText(/Nombre de la Determinación \/ Prueba \*/i), 'Anticuerpos Anti-TPO');
    await user.type(screen.getByLabelText(/Tipo de Muestra Requerida \*/i), 'Suero sanguíneo sin hemólisis');
    await user.type(screen.getByLabelText(/Método Analítico \/ Principio \*/i), 'Quimioluminiscencia (CLIA)');

    // Llenar primer parámetro
    const inputParamNombre = screen.getByLabelText(/Nombre de parámetro 1/i);
    const inputParamUnidad = screen.getByLabelText(/Unidad de parámetro 1/i);
    const inputParamRango = screen.getByLabelText(/Rango de referencia de parámetro 1/i);

    await user.type(inputParamNombre, 'Anti-TPO');
    await user.type(inputParamUnidad, 'UI/mL');
    await user.type(inputParamRango, '< 34.0');

    // Guardar
    const btnGuardar = screen.getByRole('button', { name: /Registrar Determinación/i });
    await user.click(btnGuardar);

    // Verificación en la lista
    expect(await screen.findByText('INM-005')).toBeInTheDocument();
    expect(screen.getByText('Anticuerpos Anti-TPO')).toBeInTheDocument();
    expect(screen.getAllByText('v1.0').length).toBeGreaterThan(0);
  });

  it('L10: Aplica Regla CA16 creando una nueva versión inmutable (v+1) de una prueba existente', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdminLab));
    window.history.pushState({}, '', '/administracion/catalogos?tab=laboratorio');

    render(<App />);
    const user = userEvent.setup();

    // Localizar la prueba QUI-010 (Glucosa Sérica v1.0)
    expect(await screen.findByText('QUI-010')).toBeInTheDocument();
    expect(screen.getByText('Glucosa Sérica en Ayunas')).toBeInTheDocument();
    expect(screen.getAllByText('v1.0').length).toBeGreaterThan(0);

    // Hacer clic en "Nueva Versión (CA16)"
    const btnsNuevaVersion = screen.getAllByRole('button', { name: /Nueva Versión \(CA16\)/i });
    await user.click(btnsNuevaVersion[1]); // QUI-010 es la segunda en el catálogo

    // Modal en modo versionado
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Nueva Versión de Determinación: v2.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Atención de Trazabilidad \(CA16\)/i)).toBeInTheDocument();

    // Código está deshabilitado para preservar identidad
    const inputCodigo = screen.getByLabelText(/Código Oficial \*/i);
    expect(inputCodigo).toBeDisabled();

    // Actualizar método y motivo
    const inputMetodo = screen.getByLabelText(/Método Analítico \/ Principio \*/i);
    await user.clear(inputMetodo);
    await user.type(inputMetodo, 'Hexoquinasa Automatizada Cobas c 311');

    // Guardar nueva versión
    const btnGuardarVersion = screen.getByRole('button', { name: /Guardar Nueva Versión \(CA16\)/i });
    await user.click(btnGuardarVersion);

    // Verificar que ahora muestra v2.0 y nuevo método
    expect(await screen.findByText(/Hexoquinasa Automatizada Cobas c 311/i)).toBeInTheDocument();
  });

  it('L10: Permite desactivar y reactivar una prueba de laboratorio', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAdminLab));
    window.history.pushState({}, '', '/administracion/catalogos?tab=laboratorio');

    render(<App />);
    const user = userEvent.setup();

    // Esperar carga y presionar primer botón Desactivar
    const btnsDesactivar = await screen.findAllByRole('button', { name: /Desactivar/i });
    await user.click(btnsDesactivar[0]);

    // Debe mostrar badge INACTIVA y botón Reactivar
    expect(await screen.findByText('INACTIVA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reactivar/i })).toBeInTheDocument();
  });
});
