import React, { lazy } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RouteContent } from '../../app/RouteContent';

describe('Carga de pantallas bajo demanda', () => {
  it('conserva la navegación mientras espera y muestra el contenido al cargar', async () => {
    let complete!: (value: { default: React.ComponentType }) => void;
    const Page = lazy(() => new Promise<{ default: React.ComponentType }>((resolve) => { complete = resolve; }));
    render(<MemoryRouter><nav>Menú del centro</nav><RouteContent><Page /></RouteContent></MemoryRouter>);
    expect(screen.getByRole('navigation')).toHaveTextContent('Menú del centro');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando pantalla');
    await act(async () => { complete({ default: () => <h1>Expediente</h1> }); });
    expect(await screen.findByRole('heading', { name: 'Expediente' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('presenta recuperación sin exponer detalles del fallo de descarga', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const Page = lazy(() => Promise.reject(new Error('internal-module-location')));
      render(<MemoryRouter><nav>Menú del centro</nav><RouteContent><Page /></RouteContent></MemoryRouter>);
      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo abrir esta pantalla');
      expect(screen.getByRole('button', { name: 'Volver a cargar' })).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.queryByText('internal-module-location')).not.toBeInTheDocument();
    } finally { log.mockRestore(); }
  });

  it('permite navegar a otra pantalla después de un fallo', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => { throw new Error('fallo de render'); };
    try {
      render(
        <MemoryRouter initialEntries={['/fallo']}>
          <Link to="/pacientes">Ir a pacientes</Link>
          <RouteContent>
            <Routes>
              <Route path="/fallo" element={<Broken />} />
              <Route path="/pacientes" element={<h1>Pacientes</h1>} />
            </Routes>
          </RouteContent>
        </MemoryRouter>,
      );
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('link', { name: 'Ir a pacientes' }));
      expect(await screen.findByRole('heading', { name: 'Pacientes' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally { log.mockRestore(); }
  });
});
