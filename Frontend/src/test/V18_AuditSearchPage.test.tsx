import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V18 — Bitácora de Auditoría y Trazabilidad Inmutable', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V18: Administrador institucional accede a /administracion/auditoria y visualiza eventos con correlación y actores', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Admin
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Auditoría del sistema desde el Sidebar
    const linkAuditoria = await screen.findByRole('link', { name: /Auditoría del sistema/i });
    await user.click(linkAuditoria);

    // Verificar encabezado V18
    expect(await screen.findByRole('heading', { name: /Bitácora de Auditoría y Trazabilidad \(V18\)/i })).toBeInTheDocument();
    expect(screen.getByText('Inmutable')).toBeInTheDocument();

    // Comprobar presencia de eventos clave (CA10 rectificación, archivo de expediente, cambio de estado)
    expect(await screen.findAllByText('Dra. Elena Morales')).not.toHaveLength(0);
    expect(screen.getAllByText('Ing. Roberto Méndez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RECTIFICACION_CA10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ARCHIVADO_EXPEDIENTE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CAMBIO_ESTADO_CUENTA').length).toBeGreaterThan(0);
  });

  it('V18: Permite inspeccionar el detalle de un evento con diff de cambios y justificación certificada', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Admin
    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    await user.clear(inputEmail);
    await user.type(inputEmail, 'admin.sistemas@hospital-general.salud.gt');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Auditoría
    const linkAuditoria = await screen.findByRole('link', { name: /Auditoría del sistema/i });
    await user.click(linkAuditoria);

    // Esperar a que la lista cargue
    expect(await screen.findByText(/Consulta Medicina Interna — Roberto Estrada Morales/i)).toBeInTheDocument();

    // Abrir modal de inspección del evento CA10
    const botonesInspeccionar = await screen.findAllByRole('button', { name: /Inspeccionar/i });
    await user.click(botonesInspeccionar[1]);

    // Verificar contenido del modal
    expect(await screen.findByRole('heading', { name: /Detalle de Evento de Auditoría/i })).toBeInTheDocument();
    expect(screen.getAllByText(/corr-3312-ab77-9041/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Motivo \/ Justificación Certificada/i)).toBeInTheDocument();
    expect(screen.getByText(/Ajuste de intervalo en pauta de Losartán Potásico/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalle de Modificaciones Registradas/i)).toBeInTheDocument();
    expect(screen.getByText(/planTratamiento.frecuencia/i)).toBeInTheDocument();
    expect(screen.getByText(/Cada 24 horas/i)).toBeInTheDocument();
    expect(screen.getByText(/Cada 12 horas/i)).toBeInTheDocument();

    // Cerrar modal
    const botonCerrar = screen.getByRole('button', { name: /Cerrar detalle/i });
    await user.click(botonCerrar);

    expect(screen.queryByRole('heading', { name: /Detalle de Evento de Auditoría/i })).not.toBeInTheDocument();
  });
});
