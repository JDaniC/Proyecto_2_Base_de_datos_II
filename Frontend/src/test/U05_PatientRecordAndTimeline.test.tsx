import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('U05 — Pantalla 03 Aprobada: Expediente Clínico (V06), Timeline (V07) y Archivo (V14)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V06: Renderiza encabezado con nombre, código HC, edad y alerta clínica de alergias registradas', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Pacientes
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    // Ver expediente de Roberto Estrada Morales
    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Encabezado clínico
    expect(await screen.findByRole('heading', { name: 'Roberto Estrada Morales' })).toBeInTheDocument();
    expect(screen.getAllByText('HC-HOSP-0104').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/54 años/i)).toBeInTheDocument();
    expect(screen.getByText('Expediente Activo')).toBeInTheDocument();

    // Alerta clínica de alergias verificadas
    expect(
      await screen.findByText(/ALERTA CLÍNICA: Paciente con alergias medicamentosas registradas/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Penicilina y derivados betalactámicos/i).length).toBeGreaterThan(0);
  });

  it('V06: Muestra alerta prioritaria «Alergias sin verificar» cuando el estado es SIN_VERIFICAR', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    // Ver expediente de Claudia Méndez Arriola (alergias sin verificar)
    const botonVerClaudia = await screen.findByRole('button', {
      name: /Ver expediente de Claudia Méndez Arriola/i
    });
    await user.click(botonVerClaudia);

    expect(await screen.findByRole('heading', { name: 'Claudia Méndez Arriola' })).toBeInTheDocument();
    expect(
      await screen.findByText(/ALERTA CLÍNICA PRIORITARIA: Alergias sin verificar clínicamente/i)
    ).toBeInTheDocument();

    // Debe comprobarse que NO dice erróneamente "Sin alergias"
    expect(screen.queryByText('Sin alergias medicamentosas conocidas')).not.toBeInTheDocument();
  });

  it('V06: Alterna entre pestañas (Consultas, Diagnósticos, Recetas) y visualiza datos clínicos', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    await screen.findByRole('heading', { name: 'Roberto Estrada Morales' });

    // Pestaña Consultas
    const tabConsultas = screen.getByRole('tab', { name: /Consultas/i });
    await user.click(tabConsultas);
    expect(
      await screen.findByText(/Evaluación y control de hipertensión arterial y cifras glucémicas/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/I10 Hipertensión esencial/i).length).toBeGreaterThan(0);

    // Pestaña Diagnósticos
    const tabDx = screen.getByRole('tab', { name: /Diagnósticos/i });
    await user.click(tabDx);
    expect(await screen.findByText('E11.9')).toBeInTheDocument();
    expect(screen.getByText(/Diabetes mellitus tipo 2/i)).toBeInTheDocument();
    expect(screen.getByText('Principal')).toBeInTheDocument();

    // Pestaña Recetas
    const tabRecetas = screen.getByRole('tab', { name: /Recetas emitidas/i });
    await user.click(tabRecetas);
    expect(await screen.findByText(/Receta REC-2026-0419/i)).toBeInTheDocument();
    expect(screen.getByText(/Losartán Potásico 50 mg/i)).toBeInTheDocument();
    expect(screen.getByText(/Metformina Clorhidrato 850 mg/i)).toBeInTheDocument();
  });

  it('V07: Clinical Timeline muestra eventos históricos y permite conmutar orden cronológico (DEC-03)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    await screen.findByRole('heading', { name: 'Roberto Estrada Morales' });

    // Pestaña Timeline
    const tabTimeline = screen.getByRole('tab', { name: /Actividad e historial/i });
    await user.click(tabTimeline);

    expect(await screen.findByText(/Receta médica emitida/i)).toBeInTheDocument();
    expect(screen.getByText(/Apertura y registro inicial de expediente/i)).toBeInTheDocument();

    // Conmutador de orden (DEC-03)
    const botonOrden = screen.getByRole('button', { name: /Alternar orden cronológico/i });
    expect(botonOrden).toHaveTextContent(/Más recientes primero/i);

    await user.click(botonOrden);
    expect(botonOrden).toHaveTextContent(/Cronológico desde apertura \(ASC\)/i);
  });

  it('V14: Archivo de expediente exige causa y motivo, bloqueando consultas nuevas y permitiendo reactivación', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Administrador de Hospital que posee historial.archivar
    const inputEmail = await screen.findByLabelText(/Correo institucional/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    await screen.findByRole('heading', { name: 'Roberto Estrada Morales' });

    // Abrir modal de archivo
    const botonArchivar = screen.getByRole('button', { name: /Archivar/i });
    await user.click(botonArchivar);

    expect(await screen.findByRole('dialog', { name: /Archivo de Expediente Clínico/i })).toBeInTheDocument();

    // Seleccionar causa y escribir motivo
    const selectCausa = screen.getByLabelText(/Causa del archivo de expediente \*/i);
    await user.selectOptions(selectCausa, 'TRASLADO');

    const textareaMotivo = screen.getByLabelText(/Motivo y observaciones del archivo \*/i);
    await user.type(textareaMotivo, 'Traslado a centro hospitalario de Quetzaltenango.');

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar archivo de expediente/i });
    await user.click(botonConfirmar);

    // Debe mostrar Toast y cambiar el estado del badge
    expect(await screen.findByText(/Expediente Archivado/i)).toBeInTheDocument();

    // El botón Nueva consulta debe quedar deshabilitado
    const botonNuevaConsulta = screen.getByRole('button', { name: /Nueva consulta/i });
    expect(botonNuevaConsulta).toBeDisabled();

    // Ahora probar reactivación (V14)
    const botonReactivar = screen.getByRole('button', { name: /Reactivar expediente/i });
    await user.click(botonReactivar);

    expect(await screen.findByRole('dialog', { name: /Reactivación de Expediente Clínico/i })).toBeInTheDocument();

    const textareaReactivar = screen.getByLabelText(/Motivo o resolución de reactivación \*/i);
    await user.type(textareaReactivar, 'Retorno del paciente al área de cobertura hospitalaria.');

    const botonConfirmarReactivacion = screen.getByRole('button', { name: /Confirmar reactivación/i });
    await user.click(botonConfirmarReactivacion);

    // Vuelve a estar activo
    expect(await screen.findByText(/Expediente Activo/i)).toBeInTheDocument();
  });
});
