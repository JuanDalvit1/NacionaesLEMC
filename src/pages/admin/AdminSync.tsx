import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { parseJsonResponse } from '../../lib/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Paper,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

export default function AdminSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);

  const { data: sources = [] } = useQuery({
    queryKey: ['nc_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nc_sources')
        .select('id, nome, last_sync_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await parseJsonResponse<{ results?: Record<string, string>; error?: string }>(res);
      setResult(data.results ?? { error: data.error || 'Erro desconhecido' });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao chamar API. Verifique se o servidor está rodando (npm run server).';
      // Em produção (Coolify), proxy pode devolver corpo vazio → "Unexpected end of JSON input"
      const hint =
        /json|Unexpected end|resposta vazia/i.test(msg)
          ? ' No Coolify: configure o proxy para encaminhar POST em /api (remova caddy_0.try_files ou use Traefik). Veja DEPLOY.md.'
          : '';
      setResult({ error: msg + hint });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        Sincronizar Dados
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Execute a coleta dos dados das planilhas configuradas. O sync roda automaticamente a cada 6
        horas quando o servidor está ativo, ou você pode disparar manualmente.
      </Typography>

      <Button
        variant="contained"
        startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
        onClick={handleSync}
        disabled={syncing}
        sx={{ mb: 2 }}
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
      </Button>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
            Status das fontes
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {(sources as { nome: string; last_sync_at: string | null }[]).map((s) => (
              <Typography component="li" key={s.nome} variant="body2">
                {s.nome}:{' '}
                {s.last_sync_at
                  ? new Date(s.last_sync_at).toLocaleString('pt-BR')
                  : 'Nunca sincronizado'}
              </Typography>
            ))}
          </Box>
        </CardContent>
      </Card>

      {result && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
            Resultado do último sync
          </Typography>
          <Box
            component="pre"
            sx={(theme) => ({
              m: 0,
              fontSize: '0.85rem',
              overflow: 'auto',
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
              color: theme.palette.text.primary,
              borderRadius: 1,
            })}
          >
            {JSON.stringify(result, null, 2)}
          </Box>
        </Paper>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Em desenvolvimento, inicie o servidor com <code>npm run server</code> em outro terminal para
        que o botão funcione.
      </Typography>
    </Box>
  );
}
