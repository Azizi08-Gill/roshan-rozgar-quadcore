import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig, MotionGlobalConfig } from 'framer-motion';
import App from './App';

// Dev-only: append ?noanim to the URL to skip animations (useful for automated checks).
if (import.meta.env.DEV && new URLSearchParams(location.search).has('noanim')) MotionGlobalConfig.skipAnimations = true;
import './styles/global.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>,
);
