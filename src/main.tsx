import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './i18n';
import './index.css';
import { MantineProvider } from '@mantine/core';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <MantineProvider>
      <App />
    </MantineProvider>
  </BrowserRouter>,
);
