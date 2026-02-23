import { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from './theme';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeContext';
import { TabelasHeaderProvider } from './contexts/TabelasHeaderContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Dashboard from './pages/Dashboard';
import Tabelas from './pages/Tabelas';
import Aniversariantes from './pages/Aniversariantes';
import Membros from './pages/Membros';
import MembroDetalhe from './pages/MembroDetalhe';
import AdminPage from './pages/AdminPage';
import AdminGuard from './components/AdminGuard';

const LOADING_DURATION_MS = 5000;
const LOADING_FADEOUT_MS = 850;

const queryClient = new QueryClient();

function AppWithTheme() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TabelasHeaderProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tabelas" element={<Tabelas />} />
                <Route path="aniversariantes" element={<Aniversariantes />} />
                <Route path="membros" element={<Membros />} />
                <Route path="membros/:id" element={<MembroDetalhe />} />
                <Route path="admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TabelasHeaderProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), LOADING_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setLoading(false), LOADING_FADEOUT_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  return (
    <>
      {/* App montado durante exiting para aparecer por baixo do fade out */}
      {(!loading || exiting) && (
        <ThemeModeProvider>
          <AppWithTheme />
        </ThemeModeProvider>
      )}
      {loading && <LoadingScreen exiting={exiting} />}
    </>
  );
}

export default App;
