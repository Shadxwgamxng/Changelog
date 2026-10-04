import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LiveProvider } from './store';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';

// In FiveM-NUI eingebettet (iframe): ESC schließt das Fenster über die Eltern-Seite.
if (window.parent !== window) window.addEventListener('keydown', (e) => e.key === 'Escape' && window.parent.postMessage({ type: 'cbrn-close' }, '*'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <LiveProvider>
        <App />
      </LiveProvider>
    </HashRouter>
  </React.StrictMode>,
);
