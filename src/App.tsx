import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from './components/layout/Toasts';
import { Splash } from './pages/Splash';
import { Simulation } from './pages/Simulation';
import { Dashboard } from './pages/Dashboard';
import { Conversations } from './pages/Conversations';
import { Appointments } from './pages/Appointments';
import { Orders } from './pages/Orders';
import { Business } from './pages/Business';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';
import { useSettingsStore } from './store/settings';
import { initSync } from './services/sync';

export default function App() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0F172A' : '#10B981');
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontSize = fontSize;
    root.dataset.reduceMotion = String(reduceMotion);
    root.classList.toggle('reduce-motion', reduceMotion);
  }, [fontSize, reduceMotion]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    void i18n.changeLanguage(language);
    document.title = `${t('brand.name')} — ${t('brand.tagline')}`;
  }, [language, i18n, t]);

  useEffect(() => {
    void initSync();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route element={<AppShell />}>
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/business" element={<Business />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}
