import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { HomePage } from './pages/home/HomePage.jsx';
import { IntegrationDocsPage } from './pages/docs/IntegrationDocsPage.jsx';
import { MonitoringPage } from './pages/monitoring/MonitoringPage.jsx';
import { SettingsPage } from './pages/account/SettingsPage.jsx';
import { ApiPurchasePage } from './pages/payment/ApiPurchasePage.jsx';
import { SignInPage } from './pages/auth/SignInPage.jsx';
import { AboutUsPage } from './pages/about/AboutUsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="signin" element={<SignInPage />} />
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="purchase" element={<ApiPurchasePage />} />
        <Route path="purchase/checkout/:planId" element={<ApiPurchasePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="docs" element={<IntegrationDocsPage />} />
        <Route path="about" element={<AboutUsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
