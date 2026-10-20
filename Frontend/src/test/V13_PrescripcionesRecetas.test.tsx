import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V13 — Crear y Visualizar Recetas Médicas / Prescripción Oficial', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V13: Visualiza historial de recetas emitidas, medicamentos estructurados y abre modal de impresión oficial', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes y abrir expediente
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a la pestaña «Recetas emitidas»
    const tabRecetas = await screen.findByRole('tab', { name: /Recetas emitidas/i });
    await user.click(tabRecetas);

    // Verificar cabecera V13
    expect(await screen.findByText(/Prescripción Farmacológica Certificada \(V13\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Receta Oficial REC-2026-0419/i)).toBeInTheDocument();
    expect(screen.getByText(/Emitida y Vigente/i)).toBeInTheDocument();

    // Verificar fármacos prescritos
    expect(screen.getByText(/Losartán Potásico/i)).toBeInTheDocument();
    expect(screen.getByText(/Metformina Clorhidrato/i)).toBeInTheDocument();

    // Abrir modal de impresión oficial
    const botonImprimir = screen.getByRole('button', { name: /Imprimir Receta \(V13\)/i });
    await user.click(botonImprimir);

    expect(await screen.findByText(/Receta Médica Oficial \(V13\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Prescripción Farmacológica Certificada/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Rp. \(Prescripción Médica\)/i)).toBeInTheDocument();

    // Cerrar modal
    const botonCerrarModal = screen.getByRole('button', { name: /^Cerrar$/i });
    await user.click(botonCerrarModal);
  });

  it('V13: Abre modal «Emitir Nueva Receta», agrega fármaco sugerido y emite nueva receta inmutable', async () => {
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

    // Cambiar a pestaña Recetas emitidas
    const tabRecetas = await screen.findByRole('tab', { name: /Recetas emitidas/i });
    await user.click(tabRecetas);

    // Clic en «Emitir Nueva Receta (V13)»
    const botonNuevaReceta = await screen.findByRole('button', {
      name: /Emitir Nueva Receta \(V13\)/i
    });
    await user.click(botonNuevaReceta);

    // Modal de emisión V13
    expect(await screen.findByText(/Emitir Receta Médica Oficial \(V13\)/i)).toBeInTheDocument();

    // Clic en sugerencia "+ Paracetamol"
    const sugeridoParacetamol = await screen.findByRole('button', { name: /\+ Paracetamol/i });
    await user.click(sugeridoParacetamol);

    // Confirmar que autocompletó los campos del fármaco
    const inputNombre = screen.getByPlaceholderText(/ej. Losartán Potásico/i);
    expect(inputNombre).toHaveValue('Paracetamol');

    // Confirmar emisión de la receta
    const botonEmitir = screen.getByRole('button', { name: /Emitir Receta Oficial \(V13\)/i });
    await user.click(botonEmitir);

    // Verificar que la nueva receta aparece en el historial
    expect(await screen.findByText(/REC-2026-/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Paracetamol/i).length).toBeGreaterThan(0);
  });
});
