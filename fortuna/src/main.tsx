import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { applyUiSettings, loadUiSettings } from './ui/settings';
import './ui/styles/app.css';
import './ui/styles/screens.css';
import './ui/styles/console.css';
import './ui/styles/world.css';

applyUiSettings(loadUiSettings());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
