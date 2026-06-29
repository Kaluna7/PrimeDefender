import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { I18nProvider } from './i18n/I18nContext.jsx';
import App from './App.jsx';
import siteIcon from './assets/images/icon.webp';

function setSiteIcon(href) {
  for (const rel of ['icon', 'apple-touch-icon']) {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
    if (rel === 'icon') link.type = 'image/webp';
  }
}

setSiteIcon(siteIcon);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
