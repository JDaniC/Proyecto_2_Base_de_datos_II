import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V10 — Pantalla 04 Aprobada: Registro de Consulta Médica (Stepper en 4 pasos + Revisión)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V10: Navega a la ruta /consultas/nueva, renderiza Stepper y valida motivo obligatorio en Paso 1', async () => {
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

    // Clic en «Nueva consulta» desde el perfil del paciente
    const botonNuevaConsulta = await screen.findByRole('button', { name: /Nueva consulta/i });
    await user.click(botonNuevaConsulta);

    // Encabezado y Stepper de 4 pasos + Revisión
    expect(await screen.findByRole('heading', { name: /Registro de Consulta Médica \(Pantalla 04 Aprobada\)/i })).toBeInTheDocument();
    expect(screen.getByText('Datos Consulta')).toBeInTheDocument();
    expect(screen.getByText('Signos Vitales')).toBeInTheDocument();
    expect(screen.getByText(/Diagnósticos \(V12\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Receta Médica \(V13\)/i)).toBeInTheDocument();
    expect(screen.getByText('Revisión Final')).toBeInTheDocument();

    // Comprobar Textareas de 120px aprobadas
    const textareaSintomas = screen.getByLabelText(/Síntomas y evolución cronológica/i);
    expect(textareaSintomas).toHaveStyle({ minHeight: '120px' });
    const textareaObservaciones = screen.getByLabelText(/Observaciones clínicas del examen físico/i);
    expect(textareaObservaciones).toHaveStyle({ minHeight: '120px' });

    // Intentar avanzar sin motivo
    const botonSiguiente = screen.getByRole('button', { name: /Siguiente paso/i });
    await user.click(botonSiguiente);

    // Debe bloquear y mostrar alerta
    expect(await screen.findByRole('alert')).toHaveTextContent(/El motivo de la consulta es obligatorio/i);
  });

  it('V10: Flujo completo a través de los 4 pasos, cálculo de IMC, diagnósticos CIE-10 (V12), receta (V13) y confirmación', async () => {
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

    const botonNuevaConsulta = await screen.findByRole('button', { name: /Nueva consulta/i });
    await user.click(botonNuevaConsulta);

    await screen.findByRole('heading', { name: /Registro de Consulta Médica \(Pantalla 04 Aprobada\)/i });

    // --- PASO 1: Datos de Consulta ---
    const inputMotivo = screen.getByLabelText(/Motivo de consulta principal/i);
    await user.type(inputMotivo, 'Evaluación y control trimestral de cifras tensionales y glucemia');

    const textareaSintomas = screen.getByLabelText(/Síntomas y evolución cronológica/i);
    await user.type(textareaSintomas, 'Paciente refiere buen estado general, cefaleas leves matutinas esporádicas.');

    const botonSiguientePaso1 = screen.getByRole('button', { name: /Siguiente paso/i });
    await user.click(botonSiguientePaso1);

    // --- PASO 2: Signos Vitales ---
    expect(await screen.findByRole('heading', { name: /Paso 2: Signos Vitales y Parámetros Fisiológicos/i })).toBeInTheDocument();
    expect(screen.getByText(/Los parámetros no medidos deben permanecer vacíos/i)).toBeInTheDocument();

    const inputPeso = screen.getByLabelText(/Peso corporal \(kg\)/i);
    await user.type(inputPeso, '75');
    const inputTalla = screen.getByLabelText(/Talla \/ Altura \(cm\)/i);
    await user.type(inputTalla, '175');

    // Debe calcular el IMC automáticamente
    expect(await screen.findByText(/IMC calculado automáticamente:/i)).toBeInTheDocument();
    expect(screen.getByText(/24.5 kg\/m² \(Normal\)/i)).toBeInTheDocument();

    const inputPaSis = screen.getByLabelText(/PA Sistólica \(mmHg\)/i);
    await user.type(inputPaSis, '125');
    const inputPaDia = screen.getByLabelText(/PA Diastólica \(mmHg\)/i);
    await user.type(inputPaDia, '82');

    const botonSiguientePaso2 = screen.getByRole('button', { name: /Siguiente paso/i });
    await user.click(botonSiguientePaso2);

    // --- PASO 3: Diagnósticos y Tratamientos (V12) ---
    expect(await screen.findByRole('heading', { name: /Paso 3: Diagnósticos \(CIE-10\) y Tratamientos/i })).toBeInTheDocument();

    // Buscar y agregar diagnóstico I10
    const inputBusquedaCIE = screen.getByLabelText(/Buscador y catálogo de diagnósticos/i);
    await user.type(inputBusquedaCIE, 'Hipertensión');

    const botonAgregarI10 = await screen.findByRole('button', { name: /Agregar/i });
    await user.click(botonAgregarI10);

    // El diagnóstico aparece marcado como Principal por defecto
    expect(await screen.findByText('Hipertensión esencial (primaria)')).toBeInTheDocument();
    expect(screen.getByText('Principal')).toBeInTheDocument();

    // Agregar tratamiento no farmacológico
    const inputTratDesc = screen.getByLabelText(/Tratamiento \/ Procedimiento/i);
    await user.type(inputTratDesc, 'Dieta hiposódica y caminatas de 30 minutos');
    const botonAnadirTrat = screen.getByRole('button', { name: /Añadir/i });
    await user.click(botonAnadirTrat);

    expect(await screen.findByText(/Dieta hiposódica y caminatas de 30 minutos/i)).toBeInTheDocument();

    const botonSiguientePaso3 = screen.getByRole('button', { name: /Siguiente paso/i });
    await user.click(botonSiguientePaso3);

    // --- PASO 4: Receta Médica (V13) ---
    expect(await screen.findByRole('heading', { name: /Paso 4: Prescripción y Receta Médica \(V13\)/i })).toBeInTheDocument();

    // Activar emisión de receta
    const checkReceta = screen.getByLabelText(/Emitir receta médica oficial en esta atención/i);
    await user.click(checkReceta);

    // Seleccionar sugerencia frecuente "Losartán Potásico"
    const sugerenciaLosartan = await screen.findByRole('button', { name: /\+ Losartán Potásico/i });
    await user.click(sugerenciaLosartan);

    // Clic en agregar fármaco a la receta
    const botonAgregarFarmaco = screen.getByRole('button', { name: /Agregar fármaco a la receta/i });
    await user.click(botonAgregarFarmaco);

    // Medicamento aparece en la lista de prescripción
    expect((await screen.findAllByText(/Losartán Potásico/i)).length).toBeGreaterThanOrEqual(2);

    const botonSiguientePaso4 = screen.getByRole('button', { name: /Siguiente paso/i });
    await user.click(botonSiguientePaso4);

    // --- PASO 5: Revisión Final ---
    expect(await screen.findByRole('heading', { name: /Paso 5: Revisión Consolidada de la Consulta/i })).toBeInTheDocument();
    expect(screen.getByText(/Certificación clínica de la atención/i)).toBeInTheDocument();
    expect(screen.getByText('24.5 (Normal)')).toBeInTheDocument();
    expect(screen.getByText(/125\/82 mmHg/i)).toBeInTheDocument();
    expect(screen.getByText(/Hipertensión esencial/i)).toBeInTheDocument();

    // Confirmar y registrar consulta
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar y Registrar Consulta Completa/i });
    await user.click(botonConfirmar);

    // Redirige al expediente clínico del paciente con la consulta guardada
    expect(await screen.findByText('Expediente Activo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Roberto Estrada Morales' })).toBeInTheDocument();
  }, 15000);
});
