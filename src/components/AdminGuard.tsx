import { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { supabase } from '../lib/supabase';
import { ADMIN_AUTH_EMAIL } from '../lib/admin-auth';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

type Props = { children: React.ReactNode };

export default function AdminGuard({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user?.email === ADMIN_AUTH_EMAIL) {
        setAuthenticated(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureAdminUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/ensure-admin-user`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data?.message) throw new Error(data?.error || 'Falha ao garantir usuário admin');
    } catch {
      // Ignora; login pode falhar com "Invalid login" se usuário ainda não existir
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ensureAdminUser();
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: ADMIN_AUTH_EMAIL,
        password,
      });
      if (signError) {
        setError(signError.message === 'Invalid login credentials' ? 'Senha incorreta.' : signError.message);
        return;
      }
      if (data?.user?.email === ADMIN_AUTH_EMAIL) {
        setAuthenticated(true);
        setPassword('');
      } else {
        await supabase.auth.signOut();
        setError('Acesso negado. Apenas o usuário admin pode acessar.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => {}} PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockIcon color="primary" />
        Acesso Admin
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Digite a senha padrão para acessar a área administrativa.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            disabled={submitting}
            sx={{ mb: 2 }}
            autoComplete="current-password"
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Button type="submit" variant="contained" fullWidth disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : 'Entrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
