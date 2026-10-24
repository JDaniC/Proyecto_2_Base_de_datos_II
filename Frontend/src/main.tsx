import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './design-system/tokens.css';
import './design-system/responsive.css';
import './design-system/feature-utilities.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
