import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import { ensureCsrf } from './lib/csrf';

// Initialize CSRF token on app boot (fire-and-forget)
// This ensures the token is available before the first POST request
ensureCsrf().catch(error => {
  console.warn('Failed to initialize CSRF token on boot:', error);
  // Don't block app startup on CSRF fetch failure
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
