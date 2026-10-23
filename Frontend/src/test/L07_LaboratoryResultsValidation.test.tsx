import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L07 — Revisión y Validación Técnica Independiente de Resultados (L07, CA13, CA18)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L07: Bloquea acceso a analista sin permiso resultados.validar con pantalla 403 explicativa (CA13, CA18)', async () => {
    const sesionAnalistaSinValidar = {
      cuentaId: 'usr-lab-ana-01',
      email: 'sofia.paniagua@lab-clinico.salud.gt',
      nombre: 'Licda. Sofía Paniagua',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Analista de Bioquímica',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: ['resultados.analizar', 'pacientes.administrar'],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-analista'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalistaSinValidar));
    window.history.pushState({}, '', '/laboratorio/resultados/validacion');

    render(<App />);

    // Verificar pantalla 403 explicativa por separación estricta de funciones
    expect(await screen.findByText(/Acceso Denegado — Requiere Permiso de Validación \(CA18\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Su cuenta actual no cuenta con el permiso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver a la Bandeja de Laboratorio/i })).toBeInTheDocument();
  });

  it('L07: Validador autorizado inspecciona parámetros y certifica resultado pasando de BORRADOR a VALIDADO', async () => {
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
    window.history.pushState({}, '', '/laboratorio/resultados/validacion');

    render(<App />);
    const user = userEvent.setup();

    // 1. Verificar encabezado y badge de L07
    expect((await screen.findAllByText(/Revisión y Validación de Resultados/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/L07 — VALIDACIÓN/i)).toBeInTheDocument();

    // 2. Lista de resultados candidatos
    expect((await screen.findAllByText(/Urocultivo con Antibiograma Automatizado/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/María Elena Estrada/i).length).toBeGreaterThan(0);

    // 3. Inspección analítica de parámetros
    expect(await screen.findByText(/Recuento de Colonias/i)).toBeInTheDocument();
    expect(screen.getByText(/Escherichia coli \(cepa sensible\)/i)).toBeInTheDocument();

    // 4. Formulario de certificación facultativa
    expect(screen.getByText(/Certificación Técnica y Dictamen Facultativo/i)).toBeInTheDocument();
    const btnValidar = screen.getByRole('button', { name: /Validar y Certificar Resultado/i });
    expect(btnValidar).toBeInTheDocument();

    // 5. Ejecutar validación
    await user.click(btnValidar);

    // 6. Confirmación de resultado validado
    expect(await screen.findByText(/Resultado Validado/i)).toBeInTheDocument();
    expect(screen.getByText(/validado y certificado con éxito/i)).toBeInTheDocument();
  });
});
