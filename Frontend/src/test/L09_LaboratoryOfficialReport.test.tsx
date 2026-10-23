import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L09 — Vista Previa y Emisión Oficial de Informe Analítico (L09, CA13)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L09: Visualiza informe emitido oficial con membrete, resultados validados, hash SHA-256 y firma (CA13)', async () => {
    const sesionValidador = {
      cuentaId: 'usr-lab-val-01',
      email: 'validador@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'VALIDADOR_LABORATORIO',
      rolEtiqueta: 'Químico Biólogo Validador',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      colegiado: 'QB-4912',
      permisos: [
        'resultados.analizar',
        'resultados.validar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-validador'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionValidador));
    // ord-lab-05 tiene informe ya emitido (INF-LAB-2026-0085)
    window.history.pushState({}, '', '/laboratorio/informes/ord-lab-05');

    render(<App />);

    // 1. Membrete oficial
    expect(await screen.findByText(/Licencia Sanitaria MS-7819-GT/i)).toBeInTheDocument();
    const membretes = screen.getAllByText(/LABORATORIO CLÍNICO CENTRAL/i);
    expect(membretes.length).toBeGreaterThan(0);

    // 2. Estado de emisión y código oficial
    expect(screen.getByText(/EMITIDO OFICIAL/i)).toBeInTheDocument();
    expect(screen.getByText('INF-LAB-2026-0085')).toBeInTheDocument();

    // 3. Ficha del paciente y médico
    expect(screen.getByText('Jorge Mario Castillo')).toBeInTheDocument();
    expect(screen.getByText('Dr. Alejandro Morales (Colegiado CMG-6540)')).toBeInTheDocument();

    // 4. Parámetros del examen validado
    expect(screen.getAllByText(/Troponina I de Alta Sensibilidad/i).length).toBeGreaterThan(0);
    expect(screen.getByText('0.145')).toBeInTheDocument();
    expect(screen.getByText('ng/mL')).toBeInTheDocument();
    expect(screen.getByText(/CR[IÍ]TICO/i)).toBeInTheDocument();

    // 5. Bloque de certificación criptográfica (CA13)
    expect(screen.getByText(/Certificación Digital de Integridad \(Regla CA13\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SHA256:7f83b165/i)).toBeInTheDocument();
    expect(screen.getByText('Colegiado QB-4912')).toBeInTheDocument();
    expect(screen.getByText(/Químico Biólogo · Validador Responsable/i)).toBeInTheDocument();
  });

  it('L09: Bloquea emisión oficial si existen exámenes pendientes de validación técnica (CA13)', async () => {
    const sesionValidador = {
      cuentaId: 'usr-lab-val-01',
      email: 'validador@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'VALIDADOR_LABORATORIO',
      rolEtiqueta: 'Químico Biólogo Validador',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: [
        'resultados.analizar',
        'resultados.validar',
        'pacientes.administrar'
      ],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-validador'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionValidador));
    // ord-lab-01 tiene pruebas en análisis que no están aún validadas
    window.history.pushState({}, '', '/laboratorio/informes/ord-lab-01');

    render(<App />);

    // Verificar advertencia de pruebas no validadas
    expect(await screen.findByText(/Pruebas pendientes de validación técnica \(CA13\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/VISTA PREVIA PRELIMINAR/i).length).toBeGreaterThan(0);

    // Botón de emisión deshabilitado
    const btnEmitir = screen.getByRole('button', { name: /Emitir Informe Oficial/i });
    expect(btnEmitir).toBeDisabled();
  });

  it('L09: Permite invocar la impresión oficial / exportación PDF', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const sesionValidador = {
      cuentaId: 'usr-lab-val-01',
      email: 'validador@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'VALIDADOR_LABORATORIO',
      rolEtiqueta: 'Químico Biólogo Validador',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: ['resultados.validar'],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-validador'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionValidador));
    window.history.pushState({}, '', '/laboratorio/informes/ord-lab-05');

    render(<App />);
    const user = userEvent.setup();

    const btnImprimir = await screen.findByRole('button', { name: /Imprimir informe oficial/i });
    await user.click(btnImprimir);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
