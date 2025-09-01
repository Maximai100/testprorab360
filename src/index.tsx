import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProjectProvider } from './context/ProjectContext';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </React.StrictMode>
);