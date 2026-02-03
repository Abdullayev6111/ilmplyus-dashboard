import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import App from './App.tsx';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <MantineProvider>
      <App />
    </MantineProvider>
  </BrowserRouter>,
);
