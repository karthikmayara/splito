// ─────────────────────────────────────────────────────────────
// main.tsx — Entry point
// React mounts here, global CSS is imported here
// ─────────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './main.css'

// Mount React into the <div id="root"> in index.html
// StrictMode runs every component twice in dev to catch bugs early
// (it's disabled in production builds automatically)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
