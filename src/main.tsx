import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { captureAuthFlow } from './features/auth/auth-flow';
import './index.css';

// Doit s'exécuter AVANT que le client Supabase ne consomme le fragment d'URL
// contenant le jeton d'invitation / de réinitialisation.
captureAuthFlow();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error("Élément racine #root introuvable dans index.html.");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
