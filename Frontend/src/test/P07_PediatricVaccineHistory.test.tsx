import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P07 — Historial Cronológico Vacunal con Revisiones e Inmutabilidad (P07)', () => {
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
    tokenSintetico: 'inst-token-ped-07'
  };

  it('P07: Despliega el historial cronológico inmutable de aplicaciones vacunales (P07)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Cambiar a subpestaña de Historial
    const btnTabHistorial = await screen.findByRole('button', { name: /Historial Cronológico e Inmutabilidad \(P07\)/i });
    await user.click(btnTabHistorial);

    // Título de la sección
    expect(
      await screen.findByText(/Historial Cronológico de Aplicaciones/i)
    ).toBeInTheDocument();

    // Ver biológicos y dosis en el historial
    expect(screen.getAllByText(/BCG \(Bacilo de Calmette-Guérin\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hepatitis B Pediátrica/i).length).toBeGreaterThan(0);

    // Lotes y sitios
    expect(screen.getByText(/BCG-GT-2022-81/i)).toBeInTheDocument();
    expect(screen.getByText(/HB-PED-2022-19/i)).toBeInTheDocument();

    // Estado vigente y versión inicial
    expect(screen.getAllByText('VIGENTE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
  });

  it('P07: Permite registrar una corrección auditada versionada v+1 con motivo obligatorio (P07)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Cambiar a subpestaña de Historial
    const btnTabHistorial = await screen.findByRole('button', { name: /Historial Cronológico e Inmutabilidad \(P07\)/i });
    await user.click(btnTabHistorial);

    expect(await screen.findByText(/BCG-GT-2022-81/i)).toBeInTheDocument();

    // Hacer clic en botón de editar primer registro (BCG)
    const btnsEditar = screen.getAllByTitle(/Corregir lote o datos auditados/i);
    await user.click(btnsEditar[0]);

    // Modal de corrección
    expect(
      await screen.findByRole('heading', { name: /Corregir Registro de Vacunación \(P07, versión v2\)/i })
    ).toBeInTheDocument();

    // Modificar lote y agregar motivo
    const inputLote = screen.getByDisplayValue('HB-PED-2022-78');
    await user.clear(inputLote);
    await user.type(inputLote, 'HB-PED-2022-78-REV');

    const textareaMotivo = screen.getByPlaceholderText(/ej. Enmienda de número de lote por error tipográfico/i);
    await user.type(textareaMotivo, 'Corrección de número de lote tras auditoría documental del biológico');

    const btnGuardarRevision = screen.getByRole('button', { name: /Guardar Revisión v2/i });
    await user.click(btnGuardarRevision);

    // Verificar que en la tabla ahora se muestra el nuevo lote, estado CORREGIDO y versión v2
    expect(await screen.findByText(/HB-PED-2022-78-REV/i)).toBeInTheDocument();
    expect(screen.getByText('CORREGIDO')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText(/Motivo: Corrección de número de lote tras auditoría/i)).toBeInTheDocument();
  });

  it('P07: Permite anular justificadamente una aplicación vacunal conservando inmutabilidad (P07)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Cambiar a subpestaña de Historial
    const btnTabHistorial = await screen.findByRole('button', { name: /Historial Cronológico e Inmutabilidad \(P07\)/i });
    await user.click(btnTabHistorial);

    expect(await screen.findByText(/HB-PED-2022-78/i)).toBeInTheDocument();

    // Hacer clic en anular tercer registro
    const btnsAnular = screen.getAllByTitle(/Anular aplicación con motivo formal/i);
    await user.click(btnsAnular[0]);

    // Modal de anulación
    expect(
      await screen.findByRole('heading', { name: /Anular Registro de Vacunación \(P07\)/i })
    ).toBeInTheDocument();

    const textareaMotivo = screen.getByPlaceholderText(/ej. Enmienda de número de lote por error tipográfico/i);
    await user.type(textareaMotivo, 'Registro administrativo duplicado atribuido por error');

    const btnConfirmarAnulacion = screen.getByRole('button', { name: /Confirmar Anulación/i });
    await user.click(btnConfirmarAnulacion);

    // Debe mostrarse el badge ANULADO
    expect(await screen.findByText('ANULADO')).toBeInTheDocument();
  });
});
