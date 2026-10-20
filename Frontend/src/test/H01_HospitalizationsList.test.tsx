import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('H01 — Monitoreo de Hospitalizaciones Activas e Históricas', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('H01: Médico especialista accede a /hospital/hospitalizaciones y visualiza pacientes internados y camas ocupadas', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales (Hospital General)
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Hospitalizaciones desde el sidebar
    const linkHospitalizaciones = await screen.findByRole('link', { name: /^Hospitalizaciones$/i });
    await user.click(linkHospitalizaciones);

    // Verificar encabezado H01 y KPIs
    expect(await screen.findByRole('heading', { name: /Hospitalizaciones Activas e Históricas \(H01\)/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Pacientes Internados/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Camas Ocupadas \/ Disponibles/i)).toBeInTheDocument();

    // Comprobar presencia de pacientes hospitalizados activos
    expect(await screen.findByText('Roberto Estrada Morales')).toBeInTheDocument();
    expect(screen.getByText('201-B')).toBeInTheDocument();
    expect(screen.getByText('Carmen Mendoza')).toBeInTheDocument();
    expect(screen.getByText('202-A')).toBeInTheDocument();

    // Comprobar diagnósticos de ingreso nosológicos
    expect(screen.getByText(/Hipertensión esencial \(primaria\) descompensada/i)).toBeInTheDocument();
    expect(screen.getByText(/Apendicitis aguda no especificada/i)).toBeInTheDocument();
  });

  it('H01: Filtra hospitalizaciones por estado «EGRESADA» y visualiza paciente con alta médica', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    const linkHospitalizaciones = await screen.findByRole('link', { name: /^Hospitalizaciones$/i });
    await user.click(linkHospitalizaciones);

    // Comprobar filtro por estado EGRESADA
    const botonEgresada = await screen.findByRole('button', { name: /^EGRESADA$/i });
    await user.click(botonEgresada);

    // Debe mostrar a Lucía Gómez Sandoval y no a Roberto Estrada Morales
    expect(await screen.findByText('Lucía Gómez Sandoval')).toBeInTheDocument();
    expect(screen.queryByText('Roberto Estrada Morales')).not.toBeInTheDocument();
  });
});
