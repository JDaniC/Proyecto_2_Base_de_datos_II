import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('C04 — Diagnósticos, Tratamientos y Receta Odontológica (C04, RF-C08, CA18)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('C04: Odontólogo visualiza diagnósticos estructurados, tratamientos y receta oficial con modal de impresión', async () => {
    const user = userEvent.setup();

    // Sesión activa como Odontólogo
    const sesionOdontologo = {
      usuarioId: 'usr-odon-odo-01',
      email: 'javier.castellanos@clinica-dental.salud.gt',
      nombre: 'Dr. Javier Castellanos',
      rolId: 'ODONTOLOGO',
      rolEtiqueta: 'Odontólogo General',
      institucionId: 'CLINICA_ODONTOLOGICA',
      institucionNombre: 'Clínica Odontológica Integral',
      motorObjetivo: 'MySQL',
      colegiado: 'COG-4812',
      permisos: [
        'pacientes.administrar',
        'expedientes.ver',
        'expedientes.modificar',
        'consultas.crear',
        'consultas.ver',
        'recetas.crear',
        'recetas.ver'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-odon-odo'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionOdontologo));
    window.history.pushState({}, '', '/pacientes/pac-odon-001/consultas/con-odon-001');

    render(<App />);

    // Encabezado y badges
    expect(
      await screen.findByRole('heading', {
        name: /Evaluación de dolor molar e inicio de tratamiento endodóntico/i
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Odontología (C04)')).toBeInTheDocument();
    expect(screen.getByText('Finalizada')).toBeInTheDocument();

    // Diagnósticos C04
    expect(screen.getByText('K04.0')).toBeInTheDocument();
    expect(screen.getByText('Pulpitis aguda irreversible')).toBeInTheDocument();
    expect(screen.getByText('K02.1')).toBeInTheDocument();
    expect(screen.getByText('Caries de la dentina')).toBeInTheDocument();

    // Tratamientos odontológicos C04
    expect(
      screen.getAllByText(/Biopulpectomía cameral e instrumentación pieza 2\.1/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Profilaxis dental con ultrasonido/i)
    ).toBeInTheDocument();

    // Receta odontológica C04
    expect(screen.getByText(/REC-ODON-2026-081/i)).toBeInTheDocument();
    expect(screen.getByText(/Amoxicilina/i)).toBeInTheDocument();
    expect(screen.getByText(/Ibuprofeno/i)).toBeInTheDocument();

    // Abrir modal de impresión oficial de receta
    const btnImprimir = screen.getByRole('button', { name: /Imprimir Receta Médica/i });
    await user.click(btnImprimir);

    expect(await screen.findByText(/Prescripción Farmacológica Certificada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Javier Castellanos/i).length).toBeGreaterThan(0);
  });

  it('C04: Secretaría tiene restringido el acceso a notas clínicas y recetas odontológicas (403 ACCESO_DENEGADO / CA18)', async () => {
    // Sesión activa como Secretaría Odontológica
    const sesionSecretaria = {
      usuarioId: 'usr-odon-sec-01',
      email: 'secretaria@clinica-dental.salud.gt',
      nombre: 'Ana Lucía Méndez',
      rolId: 'SECRETARIA',
      rolEtiqueta: 'Secretaría Odontológica',
      institucionId: 'CLINICA_ODONTOLOGICA',
      institucionNombre: 'Clínica Odontológica Integral',
      motorObjetivo: 'MySQL',
      permisos: [
        'pacientes.administrar',
        'agenda.ver',
        'agenda.gestionar'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-odon-sec'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionSecretaria));
    window.history.pushState({}, '', '/pacientes/pac-odon-001/consultas/con-odon-001');

    render(<App />);

    // Verificar bloqueo de acceso por aislamiento de rol (RF-C08, CA18)
    expect(
      await screen.findByText(
        /403 ACCESO_DENEGADO: El personal de secretaría tiene restringido el acceso a notas clínicas, diagnósticos y recetas médicas/i
      )
    ).toBeInTheDocument();
  });
});
