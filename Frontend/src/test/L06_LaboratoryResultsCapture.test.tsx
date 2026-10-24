import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L06 — Captura de Resultados Analíticos en BORRADOR (L06, CA12, CA13, CA18)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L06: Captura parámetros analíticos dinámicos, detecta alertas clínicas y guarda en BORRADOR con separación de funciones', async () => {
    const sesionAnalista = {
      cuentaId: 'usr-lab-ana-01',
      email: 'sofia.paniagua@lab-clinico.salud.gt',
      nombre: 'Licda. Sofía Paniagua',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Analista de Bioquímica',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: [
        'resultados.analizar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-analista'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalista));
    window.history.pushState({}, '', '/laboratorio/resultados/captura/ord-lab-01');

    render(<App />);
    const user = userEvent.setup();

    // 1. Verificar encabezado y metadatos de la orden
    expect(await screen.findByText(/Captura de Resultados Analíticos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ORD-LAB-2026-0081/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ana Lucía Morales/i)).toBeInTheDocument();
    expect(screen.getByText(/L06 — BORRADOR/i)).toBeInTheDocument();

    // 2. Verificación preanalítica: muestra aceptada
    expect(screen.getByText(/MUE-2026-0081-01/i)).toBeInTheDocument();
    expect(screen.getByText(/Muestra Aceptada/i)).toBeInTheDocument();

    // 3. Pestañas de pruebas incluidas en la orden
    expect(screen.getByRole('button', { name: /Gasometría Arterial Completa/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Electrólitos Séricos/i })).toBeInTheDocument();

    // 4. Parámetros cargados dinámicamente según la prueba
    expect(await screen.findByText(/pH arterial/i)).toBeInTheDocument();
    expect(screen.getByText(/Presión parcial CO2 \(pCO2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Bicarbonato estándar \(HCO3-\)/i)).toBeInTheDocument();

    // 5. Ingresar mediciones y verificar cálculo de alertas clínicas
    const inputPH = screen.getByLabelText(/Valor para pH arterial/i);
    await user.type(inputPH, '7.15'); // Valor menor a 7.20 -> Alerta CRÍTICA de pánico

    // Debe mostrar alerta de pánico y badge CRÍTICO
    expect((await screen.findAllByText(/CRÍTICO/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/¡Valores de Pánico \/ Críticos Detectados!/i)).toBeInTheDocument();

    // Modificar a valor normal
    await user.clear(inputPH);
    await user.type(inputPH, '7.40'); // Normal (7.35 - 7.45)
    expect(screen.getAllByText('NORMAL').length).toBeGreaterThan(0);

    // 6. Verificar aviso de separación de funciones (CA13, CA18)
    expect(screen.getByText(/Separación de Responsabilidades y Seguridad Analítica \(CA13, CA18\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Usted cuenta con permiso de análisis/i)).toBeInTheDocument();
    expect(screen.getByText(/resultados\.analizar/i)).toBeInTheDocument();

    // 7. Guardar resultados en BORRADOR
    const btnGuardar = screen.getByRole('button', { name: /Guardar Resultados en Borrador/i });
    await user.click(btnGuardar);

    // 8. Mensaje de confirmación de borrador
    expect(await screen.findByText(/Borrador Registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/guardados exitosamente en estado BORRADOR/i)).toBeInTheDocument();
  });

  it('L06: Bloquea captura si la muestra no ha sido aceptada en el laboratorio (CA12)', async () => {
    const sesionAnalista = {
      cuentaId: 'usr-lab-ana-01',
      email: 'sofia.paniagua@lab-clinico.salud.gt',
      nombre: 'Licda. Sofía Paniagua',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Analista de Bioquímica',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: ['resultados.analizar'],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-analista'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalista));
    // ord-lab-02 tiene muestra mue-02 en PENDIENTE_TOMA
    window.history.pushState({}, '', '/laboratorio/resultados/captura/ord-lab-02');

    render(<App />);

    // Verificar aviso preanalítico de muestra pendiente
    expect(await screen.findByText(/Muestra pendiente o no apta para análisis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ir al Registro y Recepción de Muestras \(L04\)/i })).toBeInTheDocument();

    // El botón de guardar debe estar deshabilitado
    const btnGuardar = screen.getByRole('button', { name: /Guardar Resultados en Borrador/i });
    expect(btnGuardar).toBeDisabled();
  });
});
