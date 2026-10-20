import React, { createContext, useContext, useMemo } from 'react';
import { AuthRepository } from '../services/contracts';
import { MockAuthRepository } from '../mocks/mockAuthRepository';

interface ServiceContainer {
  authRepository: AuthRepository;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

export const ServiceProvider: React.FC<{ children: React.ReactNode; customAuthRepository?: AuthRepository }> = ({
  children,
  customAuthRepository,
}) => {
  const services = useMemo<ServiceContainer>(() => {
    return {
      authRepository: customAuthRepository || new MockAuthRepository(),
    };
  }, [customAuthRepository]);

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
};

export const useServices = (): ServiceContainer => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices debe utilizarse dentro de un ServiceProvider');
  }
  return context;
};
