import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LiveProvider } from './store';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <LiveProvider>
        <App />
      </LiveProvider>
    </HashRouter>
  </React.StrictMode>,
);
