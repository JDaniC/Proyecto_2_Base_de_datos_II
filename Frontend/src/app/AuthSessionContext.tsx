import React, { createContext, useContext, useEffect, useState } from 'react';
import { SesionUsuario } from '../services/types';
import { IniciarSesionParams } from '../services/contracts';
import { useServices } from './ServiceContext';

interface AuthSessionContextType {
  sesion: SesionUsuario | null;
  cargando: boolean;
  iniciarSesion: (params: IniciarSesionParams) => Promise<SesionUsuario>;
  cerrarSesion: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextType | null>(null);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authRepository } = useServices();
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    let montado = true;

    const authRepoConExpiracion = authRepository as { onExpiracion?: (cb: () => void) => () => void };
    const cancelarSuscripcion = authRepoConExpiracion.onExpiracion?.(() => {
      if (montado) {
        setSesion(null);
      }
    });

    authRepository
      .obtenerSesionActual()
      .then((sesionGuardada) => {
        if (montado) {
          setSesion(sesionGuardada);
          setCargando(false);
        }
      })
      .catch(() => {
        if (montado) setCargando(false);
      });

    return () => {
      montado = false;
      cancelarSuscripcion?.();
    };
  }, [authRepository]);

  const iniciarSesion = async (params: IniciarSesionParams): Promise<SesionUsuario> => {
    const nuevaSesion = await authRepository.iniciarSesion(params);
    setSesion(nuevaSesion);
    return nuevaSesion;
  };

  const cerrarSesion = async (): Promise<void> => {
    await authRepository.cerrarSesion();
    setSesion(null);
  };

  return (
    <AuthSessionContext.Provider value={{ sesion, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = (): AuthSessionContextType => {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession debe ser usado dentro de AuthSessionProvider');
  }
  return context;
};
