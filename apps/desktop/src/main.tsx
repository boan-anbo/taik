/**
 * Taik Desktop - Main Entry Point
 */

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { setupErrorLogging } from './utils/errorLogger';
import './styles/global.css';

// Initialize error logging to file
setupErrorLogging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
