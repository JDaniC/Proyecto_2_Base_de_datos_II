import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V11 — Detalle de Consulta Médica e Historial de Revisiones Versionadas (CA10)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V11: Navega al detalle de consulta desde el expediente, renderiza diagnósticos CIE-10, signos vitales y receta', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes y abrir expediente de Roberto Estrada Morales
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a la pestaña «Consultas»
    const tabConsultas = await screen.findByRole('tab', { name: /Consultas/i });
    await user.click(tabConsultas);

    // Encontrar botón de «Ver Detalle de Consulta (V11)» y hacer clic
    const botonesDetalle = await screen.findAllByRole('button', { name: /Ver Detalle de Consulta \(V11\)/i });
    expect(botonesDetalle.length).toBeGreaterThan(0);
    await user.click(botonesDetalle[0]);

    // Verificar cabecera de la consulta V11
    expect(await screen.findByRole('heading', { name: /Evaluación y control de hipertensión arterial/i })).toBeInTheDocument();
    expect(screen.getByText('Finalizada')).toBeInTheDocument();
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);

    // Verificar secciones clínicas
    expect(screen.getByText('Evaluación Clínica y Síntomas')).toBeInTheDocument();
    expect(screen.getByText('Signos Vitales y Mediciones')).toBeInTheDocument();
    expect(screen.getByText(/Diagnósticos \(CIE-10\) y Tratamientos Clínicos \(V12\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Prescripción Farmacológica \/ Receta Oficial \(V13\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Historial de Modificaciones y Revisiones Versionadas \(CA10\)/i)).toBeInTheDocument();

    // Verificar que los signos vitales muestran mediciones y cálculos
    expect(screen.getByText(/135\/85 mmHg/i)).toBeInTheDocument();

    // Abrir modal de impresión de receta
    const botonImprimir = screen.getByRole('button', { name: /Imprimir Receta Médica/i });
    await user.click(botonImprimir);

    expect(await screen.findByText(/Receta Médica Oficial \(V13\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Prescripción Farmacológica Certificada/i)).toBeInTheDocument();

    // Cerrar modal de receta
    const botonCerrarModal = screen.getByRole('button', { name: /^Cerrar$/i });
    await user.click(botonCerrarModal);
  });

  it('V11 / CA10: Rectificación de consulta finalizada genera nueva versión v2 y auditoría inmutable', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes y abrir expediente
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a pestaña Consultas y abrir detalle
    const tabConsultas = await screen.findByRole('tab', { name: /Consultas/i });
    await user.click(tabConsultas);

    const botonesDetalle = await screen.findAllByRole('button', { name: /Ver Detalle de Consulta \(V11\)/i });
    await user.click(botonesDetalle[0]);

    // Clic en «Corregir o Actualizar Consulta (CA10)»
    const botonCorregir = await screen.findByRole('button', {
      name: /Corregir o Actualizar Consulta \(CA10\)/i
    });
    await user.click(botonCorregir);

    // Modal de rectificación
    expect(await screen.findByText(/Rectificar Consulta Médica \(Genera v2 — CA10\)/i)).toBeInTheDocument();

    // Justificación obligatoria requerida
    const inputMotivo = screen.getByLabelText(/Motivo obligatorio de la rectificación/i);
    await user.type(
      inputMotivo,
      'Se amplía el cuadro sintomático para detallar evolución cefalalgia matutina.'
    );

    // Modificar motivo de consulta
    const textareaMotivoConsulta = screen.getByLabelText(/Motivo de consulta/i);
    await user.clear(textareaMotivoConsulta);
    await user.type(textareaMotivoConsulta, 'Control hipertensivo y ajuste de medicación — Actualizado');

    // Confirmar rectificación
    const botonGuardar = screen.getByRole('button', { name: /Guardar nueva revisión \(v2\)/i });
    await user.click(botonGuardar);

    // Alerta de éxito y actualización de versión a v2
    expect(
      await screen.findByText(/Consulta clínica actualizada con éxito a versión v2/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);

    // Verificar que aparece en el historial de revisiones con autor y motivo obligatorio
    expect(
      screen.getByText(/Se amplía el cuadro sintomático para detallar evolución cefalalgia matutina/i)
    ).toBeInTheDocument();
  });
});
