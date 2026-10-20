import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ServiceProvider } from './ServiceContext';
import { AuthSessionProvider } from './AuthSessionContext';
import { LoginPage } from '../features/auth/LoginPage';
import { SessionActiveView } from '../features/auth/SessionActiveView';

export const App: React.FC = () => {
  return (
    <ServiceProvider>
      <AuthSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/acceso" element={<LoginPage />} />
            <Route path="/sesion-activa" element={<SessionActiveView />} />
            <Route path="/" element={<Navigate to="/acceso" replace />} />
            <Route path="*" element={<Navigate to="/acceso" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthSessionProvider>
    </ServiceProvider>
  );
};

export default App;
