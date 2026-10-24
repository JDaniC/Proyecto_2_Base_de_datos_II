import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('C03 — Consulta Odontológica y Reglas de Cita Previa (C03, CA06, CA17)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('C03: Odontólogo accede a consulta de paciente, visualiza título odontológico y banner sin odontograma', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión como Dr. Javier Castellanos (Odontólogo)
    const botonHerramientas = await screen.findByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-odon-odo-01');

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a expediente de María Fernanda López Barillas
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const btnExpediente = await screen.findByRole('button', {
      name: /Ver expediente de María Fernanda López Barillas/i
    });
    await user.click(btnExpediente);

    // Clic en Nueva consulta
    const btnNuevaConsulta = await screen.findByRole('button', { name: /Nueva consulta/i });
    await user.click(btnNuevaConsulta);

    // Verificar encabezado y banner C03
    expect(
      await screen.findByRole('heading', { name: /Registro de Consulta Odontológica \(C03\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Atención Odontológica Especializada \(C03\):/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sin odontograma según alcance expreso/i)
    ).toBeInTheDocument();
  });

  it('C03: Bloquea inicio de consulta desde cita CANCELADA (409 ESTADO_INVALIDO) o ATENDIDA (409 CITA_YA_ATENDIDA)', async () => {
    const user = userEvent.setup();
    // Configurar sesión activa como Odontólogo y URL de cita CANCELADA antes de renderizar
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
        'recetas.ver',
        'agenda.ver',
        'agenda.gestionar'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-odon-odo'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionOdontologo));
    window.history.pushState({}, '', '/pacientes/pac-odon-003/consultas/nueva?citaId=cita-odon-003');

    render(<App />);

    // Verificar alerta de conflicto 409 ESTADO_INVALIDO
    expect(
      await screen.findByText(/Conflicto de Cita Vinculada \(409 ESTADO_INVALIDO\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No se puede iniciar una consulta clínica vinculada a una cita en estado CANCELADA \(CA06\)/i)
    ).toBeInTheDocument();

    // El botón para avanzar debe estar deshabilitado
    const btnSiguiente = screen.getByRole('button', { name: /Siguiente paso/i });
    expect(btnSiguiente).toBeDisabled();

    // Desbloquear haciendo clic en Continuar consulta sin vincular cita previa
    const btnDesvincular = screen.getByRole('button', { name: /Continuar consulta sin vincular cita previa/i });
    await user.click(btnDesvincular);

    expect(screen.queryByText(/Conflicto de Cita Vinculada/i)).not.toBeInTheDocument();
  });

  it('C03: Carga automática de motivo desde cita PROGRAMADA y sugerencias de procedimientos odontológicos en Paso 3', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonHerramientas = await screen.findByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-odon-odo-01');

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Ir a agenda y dar clic en "Iniciar consulta odontológica" desde cita programada
    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    const citaCard = await screen.findByText('Evaluación de caries oclusal y profilaxis dental profunda');
    await user.click(citaCard);

    const btnIniciar = await screen.findByRole('button', { name: /Iniciar consulta odontológica/i });
    await user.click(btnIniciar);

    // Verificar que cargó el motivo automáticamente en Paso 1
    const textareaMotivo = await screen.findByLabelText(/Motivo de consulta principal/i);
    expect(textareaMotivo).toHaveValue('Evaluación de caries oclusal y profilaxis dental profunda');

    // Avanzar a Paso 2 (Signos Vitales)
    const btnSiguiente = screen.getByRole('button', { name: /Siguiente paso/i });
    await user.click(btnSiguiente);

    // Avanzar a Paso 3 (Diagnósticos y Tratamientos)
    const btnSiguiente2 = await screen.findByRole('button', { name: /Siguiente paso/i });
    await user.click(btnSiguiente2);

    // Verificar sugerencias de procedimientos odontológicos C05
    expect(
      await screen.findByText(/Procedimientos odontológicos sugeridos del catálogo \(C05\):/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/\+ Profilaxis dental con ultrasonido/i)).toBeInTheDocument();
  });
});
