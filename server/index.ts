import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
// Carregar .env.local por múltiplos caminhos (cwd e raiz do projeto relativa ao server)
const envLocalPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '.env.local'),
];
for (const envLocalPath of envLocalPaths) {
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
    break;
  }
}

function readGoogleSheetsApiKeyFromRawEnvFile(filePath: string): string | null {
  const raw = fs.readFileSync(filePath, 'utf8');
  const line = raw.split(/\r?\n/).find((l) => /^\s*GOOGLE_SHEETS_API_KEY\s*=/.test(l));
  if (!line) return null;
  const afterEq = line.replace(/^\s*GOOGLE_SHEETS_API_KEY\s*=\s*/, '').trim();
  if (!afterEq) return null;
  if ((afterEq.startsWith('"') && afterEq.endsWith('"')) || (afterEq.startsWith("'") && afterEq.endsWith("'"))) {
    return afterEq.slice(1, -1).trim();
  }
  return afterEq.trim();
}

// Fallback: se GOOGLE_SHEETS_API_KEY ainda não estiver definida, tentar cada path
if (!process.env.GOOGLE_SHEETS_API_KEY?.trim()) {
  for (const envLocalPath of envLocalPaths) {
    if (fs.existsSync(envLocalPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
      let key = parsed.GOOGLE_SHEETS_API_KEY;
      if (key != null && String(key).trim()) {
        process.env.GOOGLE_SHEETS_API_KEY = String(key).trim();
        break;
      }
      key = readGoogleSheetsApiKeyFromRawEnvFile(envLocalPath) ?? undefined;
      if (key != null && String(key).trim()) {
        process.env.GOOGLE_SHEETS_API_KEY = String(key).trim();
        break;
      }
    }
  }
}

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { runSync, getGoogleSheetsApiKey } from './sync-engine';
import { checkGoogleSheetsStatus, checkOneDriveStatus } from './source-status';
import { fetchSheetHeaders } from './fetchers/google-sheets';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários');
  return createClient(url, key);
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/sync', async (req, res) => {
  try {
    const sourceId = req.body?.sourceId as string | undefined;
    const result = await runSync(sourceId);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      ok: false,
      results: { error: err instanceof Error ? err.message : String(err) },
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/source-status', async (req, res) => {
  try {
    const { url, tipo, sheet_id } = req.body;
    if (!url || !tipo) {
      return res.status(400).json({ online: false, error: 'url e tipo são obrigatórios' });
    }
    if (tipo === 'google_sheets') {
      const apiKey = getGoogleSheetsApiKey();
      if (!apiKey) return res.json({ online: false, error: 'GOOGLE_SHEETS_API_KEY não configurada. Adicione no .env ou .env.local.' });
      const result = await checkGoogleSheetsStatus(url, sheet_id || '0', apiKey);
      return res.json(result);
    }
    if (tipo === 'onedrive') {
      const result = await checkOneDriveStatus(url);
      return res.json(result);
    }
    res.status(400).json({ online: false, error: 'Tipo não suportado' });
  } catch (err) {
    res.status(500).json({
      online: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Retorna todas as colunas da primeira linha (cabeçalho) da planilha para importação automática. */
app.post('/api/sheet-headers', async (req, res) => {
  try {
    const { url, sheet_id, start_row } = req.body;
    if (!url) return res.status(400).json({ error: 'url é obrigatória' });
    const apiKey = getGoogleSheetsApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_SHEETS_API_KEY não configurada. Adicione no .env ou .env.local.' });
    }
    const headerRow = start_row != null && start_row > 1 ? start_row - 1 : 1;
    const columns = await fetchSheetHeaders(url, sheet_id || '0', headerRow, apiKey);
    res.json({ columns });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Proxy para Supabase: evita bloqueio de Private Network Access quando o frontend é servido de IP público e o Supabase está em rede privada (ex.: 192.168.x.x). */
app.use('/api/supabase', async (req, res) => {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) {
    res.status(502).json({ error: 'Supabase URL não configurada no servidor' });
    return;
  }
  const pathAndQuery = req.url || '/';
  const targetUrl = `${supabaseUrl}${pathAndQuery}`;
  const headers: Record<string, string> = {};
  const forwardHeaders = ['apikey', 'authorization', 'content-type', 'x-client-info', 'prefer', 'accept', 'accept-encoding'];
  for (const k of forwardHeaders) {
    const v = req.headers[k];
    if (v) headers[k] = Array.isArray(v) ? v[0] : v;
  }
  let body: string | undefined;
  if (req.body != null && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = typeof req.body === 'string' ? req.body : (req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body));
  }
  try {
    const response = await fetch(targetUrl, { method: req.method, headers, body });
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error('[Proxy Supabase]', err);
    res.status(502).json({ error: 'Falha ao conectar no Supabase', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/dashboard-stats', async (req, res) => {
  try {
    const { total, full, pp, membros_14 } = req.body;
    const supabase = getSupabase();
    const { error } = await supabase
      .from('nc_dashboard_stats')
      .upsert(
        {
          stats_key: 'membros',
          total: Number(total) || 0,
          full: Number(full) || 0,
          pp: Number(pp) || 0,
          membros_14: Number(membros_14) || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stats_key' }
      );
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// SPA: servir dist em produção (Docker/Coolify) e fallback para index.html
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 / path-to-regexp não aceita '*' sozinho; usar regex para catch-all
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

cron.schedule('0 */6 * * *', async () => {
  console.log('[Cron] Executando sync...');
  try {
    const r = await runSync();
    console.log('[Cron] Sync concluído:', r.results);
  } catch (e) {
    console.error('[Cron] Erro no sync:', e);
  }
});

const PORT = Number(process.env.PORT) || 3000;
if (!getGoogleSheetsApiKey()) {
  console.warn(
    '[Server] GOOGLE_SHEETS_API_KEY não definida. Fontes Google Sheets e sync falharão. Adicione em .env ou .env.local na raiz do projeto.'
  );
}
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
