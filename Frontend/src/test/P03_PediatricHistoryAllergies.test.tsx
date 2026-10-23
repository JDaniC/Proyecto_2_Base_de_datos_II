import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P03 — Antecedentes y Alergias Pediátricas con Alerta Persistente (P03)', () => {
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
    tokenSintetico: 'inst-token-ped-03'
  };

  it('P03: Alergias sin verificar despliega alerta clínica persistente y permite confirmación de ausencia (P03)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    // pac-ped-002: Sofía Valentina Lemus Monroy tiene estadoAlergias = SIN_VERIFICAR
    window.history.pushState({}, '', '/pacientes/pac-ped-002?tab=antecedentes');

    const user = userEvent.setup();
    render(<App />);

    // Encabezado del menor
    expect((await screen.findAllByText('Sofía Valentina Lemus Monroy')).length).toBeGreaterThan(0);

    // Alerta prioritaria persistente en la cabecera
    expect(
      screen.getAllByText(/ALERTA CLÍNICA PRIORITARIA: Alergias sin verificar clínicamente/i).length
    ).toBeGreaterThan(0);

    // Pestaña activa
    expect(screen.getByRole('tab', { name: /Antecedentes y alergias/i })).toBeInTheDocument();

    // Banner de advertencia en la sección de alergias
    expect(screen.getAllByText('SIN_VERIFICAR').length).toBeGreaterThan(0);

    // Botón para confirmar ausencia de alergias
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar Sin Alergias Conocidas/i });
    expect(btnConfirmar).toBeInTheDocument();

    await user.click(btnConfirmar);

    // Ahora debe transicionar a verificado: SIN_ALERGIAS_CONOCIDAS
    expect(
      await screen.findByText(/Verificado: Sin alergias conocidas documentadas/i)
    ).toBeInTheDocument();
    expect(screen.getByText('SIN_ALERGIAS_CONOCIDAS')).toBeInTheDocument();
  });

  it('P03: Paciente con alergias registradas despliega advertencia roja y lista reactivos (P03)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    // pac-ped-001: Mateo Nicolás Álvarez Arrecis tiene estadoAlergias = CON_ALERGIAS
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=antecedentes');

    render(<App />);

    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Alerta roja en la cabecera con alérgenos
    expect(
      screen.getAllByText(/ALERTA CLÍNICA: Paciente con alergias medicamentosas registradas/i).length
    ).toBeGreaterThan(0);

    // Banner en la sección de alergias
    expect(screen.getByText('CON_ALERGIAS')).toBeInTheDocument();

    // Catálogo de alergias activas
    expect(screen.getByText(/Catálogo de Alergias Activas \(2\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Proteína de Leche de Vaca/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Amoxicilina \/ Clavulanato/i).length).toBeGreaterThan(0);

    // Badges de severidad
    expect(screen.getByText('MODERADA')).toBeInTheDocument();
    expect(screen.getByText('SEVERA')).toBeInTheDocument();
  });

  it('P03: Permite registrar una nueva alergia con reacción y severidad documentada (P03)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=antecedentes');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText(/Catálogo de Alergias Activas \(2\)/i)).length).toBeGreaterThan(0);

    // Abrir modal de nueva alergia
    const btnNueva = screen.getByRole('button', { name: /Registrar Nueva Alergia/i });
    await user.click(btnNueva);

    expect(
      await screen.findByRole('heading', { name: /Registrar Alergia o Hipersensibilidad Pediátrica/i })
    ).toBeInTheDocument();

    // Llenar formulario
    const inputSustancia = screen.getByPlaceholderText(/ej. Amoxicilina \/ Clavulanato, Proteína de vaca/i);
    await user.type(inputSustancia, 'Dipirona / Metamizol');

    const textareaReaccion = screen.getByPlaceholderText(/Describa síntomas: tiempo transcurrido/i);
    await user.type(textareaReaccion, 'Exantema maculopapular y prurito generalizado tras 30 minutos de administración');

    const btnGuardar = screen.getByRole('button', { name: /Guardar Alergia/i });
    await user.click(btnGuardar);

    // Debe mostrarse en el catálogo de alergias
    expect(await screen.findByText('Dipirona / Metamizol')).toBeInTheDocument();
    expect(screen.getByText(/Catálogo de Alergias Activas \(3\)/i)).toBeInTheDocument();
  });

  it('P03: Despliega y permite actualizar antecedentes perinatales del menor (P03)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=antecedentes');

    const user = userEvent.setup();
    render(<App />);

    // Sección de perinatales
    expect(
      (await screen.findAllByText(/Antecedentes Perinatales y del Nacimiento/i)).length
    ).toBeGreaterThan(0);

    expect(screen.getByText('38 sem')).toBeInTheDocument();
    expect(screen.getByText('(A término)')).toBeInTheDocument();
    expect(screen.getByText('3,150 g (3.15 kg)')).toBeInTheDocument();
    expect(screen.getByText('Talla: 49 cm')).toBeInTheDocument();
    expect(screen.getByText('8 / 9')).toBeInTheDocument();
    expect(screen.getByText('Parto vaginal eutócico')).toBeInTheDocument();

    // Editar antecedentes perinatales
    const btnEditar = screen.getByRole('button', { name: /Editar Antecedentes Perinatales/i });
    await user.click(btnEditar);

    expect(
      await screen.findByRole('heading', { name: /Editar Antecedentes Perinatales y de Nacimiento/i })
    ).toBeInTheDocument();

    const inputPeso = screen.getByDisplayValue('3150');
    await user.clear(inputPeso);
    await user.type(inputPeso, '3250');

    const btnGuardarCambios = screen.getByRole('button', { name: /Guardar Cambios/i });
    await user.click(btnGuardarCambios);

    // Debe reflejarse el nuevo peso al nacer
    expect(await screen.findByText('3,250 g (3.25 kg)')).toBeInTheDocument();
  });
});
