import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGoogleSheets } from './fetchers/google-sheets';
import { fetchOneDrive } from './fetchers/onedrive';
import { rowPassesFilter, rowPassesKmsFilter } from './row-filter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENV_LOCAL_PATHS = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '.env.local'),
];

// Extrai valor de GOOGLE_SHEETS_API_KEY da linha crua (evita dotenv truncar em # ou valor vazio)
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

/** Obtém a API key no momento do uso: process.env ou nova leitura de .env.local (evita perda entre startup e request). */
export function getGoogleSheetsApiKey(): string | null {
  const fromEnv = process.env.GOOGLE_SHEETS_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  for (const envLocalPath of ENV_LOCAL_PATHS) {
    if (fs.existsSync(envLocalPath)) {
      const key = readGoogleSheetsApiKeyFromRawEnvFile(envLocalPath);
      if (key) return key;
      const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
      const parsedKey = parsed.GOOGLE_SHEETS_API_KEY;
      if (parsedKey != null && String(parsedKey).trim()) return String(parsedKey).trim();
    }
  }
  return null;
}

// Garantir .env.local quando o engine roda sozinho (ex.: npm run sync)
if (!process.env.GOOGLE_SHEETS_API_KEY?.trim()) {
  for (const envLocalPath of ENV_LOCAL_PATHS) {
    if (fs.existsSync(envLocalPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
      let key: string | undefined | null = parsed.GOOGLE_SHEETS_API_KEY;
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

interface NCSource {
  id: string;
  nome: string;
  tipo: 'google_sheets' | 'onedrive';
  url: string;
  sheet_id: string;
  table_name: string;
  start_row: number;
  active: boolean;
}

interface NCSourceColumn {
  col_name: string;
  col_type: string;
  position: string;
  ordem: number;
}

function rowHash(row: Record<string, unknown>): string {
  const str = JSON.stringify(row, Object.keys(row).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários');
  return createClient(url, key);
}

export async function runSync(sourceId?: string): Promise<{ ok: boolean; results: Record<string, string> }> {
  const supabase = getSupabase();
  const results: Record<string, string> = {};

  let query = supabase.from('nc_sources').select('*').eq('active', true);
  if (sourceId) query = query.eq('id', sourceId);
  const { data: sources, error: srcErr } = await query;

  if (srcErr) {
    return { ok: false, results: { error: srcErr.message } };
  }
  if (!sources?.length) {
    return { ok: true, results: { message: 'Nenhuma fonte ativa' } };
  }

  for (const src of sources as NCSource[]) {
    try {
      const { data: cols } = await supabase
        .from('nc_source_columns')
        .select('col_name, col_type, position, ordem')
        .eq('source_id', src.id)
        .order('ordem');

      if (!cols?.length) {
        results[src.nome] = 'Sem colunas configuradas';
        continue;
      }

      const config = {
        id: src.id,
        url: src.url,
        sheet_id: src.sheet_id,
        table_name: src.table_name,
        start_row: src.start_row,
        columns: cols as NCSourceColumn[],
      };

      let rows: Record<string, unknown>[];

      if (src.tipo === 'google_sheets') {
        const apiKey = getGoogleSheetsApiKey();
        if (!apiKey) throw new Error('GOOGLE_SHEETS_API_KEY não configurada. Adicione no .env ou .env.local.');
        rows = await fetchGoogleSheets(config, apiKey);
      } else if (src.tipo === 'onedrive') {
        rows = await fetchOneDrive(config);
      } else {
        results[src.nome] = `Tipo não suportado: ${src.tipo}`;
        continue;
      }

      const tableName = src.table_name;
      const sourceNome = src.nome ?? '';
      const colIds = (cols as NCSourceColumn[]).map((c) => c.col_name);
      const tblLower = tableName?.toLowerCase?.() ?? '';
      const lowerSource = sourceNome.toLowerCase();
      const isKmsSource =
        tblLower === 'nc_kms_totais' ||
        tblLower.includes('kms') ||
        tblLower.includes("km's") ||
        lowerSource.includes('kms') ||
        lowerSource.includes("km's") ||
        lowerSource.includes('controle de km');
      // Para KMs: grava TODAS as linhas no banco (sem filtro); filtro fica no frontend se necessário
      const filteredRows = isKmsSource
        ? rows
        : rows.filter((r) => rowPassesFilter(r, colIds));

      const filteredHashes = new Set<string>();
      const filteredNomesKms = new Set<string>();

      for (let i = 0; i < filteredRows.length; i++) {
        const row = filteredRows[i];
        // Para fonte KMs: hash inclui índice da linha para não colapsar duplicatas (duas linhas iguais = dois registros).
        const hash = isKmsSource ? rowHash({ ...row, __rowIndex: i }) : rowHash(row);

        const tbl = tableName?.toLowerCase?.() ?? '';
        if (tbl === 'nc_membros') {
          filteredHashes.add(hash);
          await upsertMembros(supabase, row, hash);
        } else if (tbl === 'nc_viagens') {
          filteredHashes.add(hash);
          await upsertViagens(supabase, row, hash);
        } else if (isKmsSource) {
          filteredHashes.add(hash);
          const { error: dynErr } = await supabase.from('nc_data_dynamic').upsert(
            {
              source_id: src.id,
              row_data: row,
              row_hash: hash,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'source_id,row_hash' }
          );
          if (dynErr) throw new Error(`nc_data_dynamic: ${dynErr.message}`);
        } else if (tbl === 'nc_kms_totais') {
          // table_name literal nc_kms_totais: agrega por nome (uso legado)
          const nome = (
            row.nome ??
            row.NOME ??
            row.nome_apelido ??
            row.NOME_APELIDO ??
            row['nome/apelido'] ??
            ''
          ) as string;
          if (nome && String(nome).trim().length >= 2) filteredNomesKms.add(String(nome).trim());
          const { error: kmsErr } = await upsertKmsTotais(supabase, row);
          if (kmsErr) throw new Error(`nc_kms_totais: ${kmsErr.message}`);
        } else {
          filteredHashes.add(hash);
          const { error: dynErr } = await supabase.from('nc_data_dynamic').upsert(
            {
              source_id: src.id,
              row_data: row,
              row_hash: hash,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'source_id,row_hash' }
          );
          if (dynErr) throw new Error(`nc_data_dynamic: ${dynErr.message}`);
        }
      }

      const tbl = tableName?.toLowerCase?.() ?? '';
      if (tbl === 'nc_membros') {
        const { data: all } = await supabase.from('nc_membros').select('id, source_row_hash');
        const toDel = (all ?? []).filter((r: { source_row_hash: string }) => !filteredHashes.has(r.source_row_hash));
        if (toDel.length > 0) {
          await supabase.from('nc_membros').delete().in('id', toDel.map((r: { id: string }) => r.id));
        }
        // Calcula estatísticas apenas para membros ATIVOS
        const { data: membrosData } = await supabase.from('nc_membros').select('data_full_patch, data_pp').eq('situacao', 'ATIVO');
        let full = 0;
        let pp = 0;
        let membros14 = 0;
        const hasVal = (v: unknown) => v != null && String(v).trim() !== '';
        for (const m of (membrosData ?? []) as { data_full_patch?: unknown; data_pp?: unknown }[]) {
          if (hasVal(m.data_full_patch)) full++;
          else if (hasVal(m.data_pp)) pp++;
          else membros14++;
        }
        await supabase.from('nc_dashboard_stats').upsert(
          {
            stats_key: 'membros',
            total: full + pp + membros14,
            full,
            pp,
            membros_14: membros14,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stats_key' }
        );
      } else if (tbl === 'nc_viagens') {
        const { data: allViagens } = await supabase.from('nc_viagens').select('id, source_row_hash');
        const toDel = (allViagens ?? []).filter((v: { source_row_hash: string }) => !filteredHashes.has(v.source_row_hash));
        if (toDel.length > 0) {
          await supabase.from('nc_viagens').delete().in('id', toDel.map((v: { id: string }) => v.id));
        }
      } else if (tbl === 'nc_kms_totais' && filteredNomesKms.size > 0) {
        const { data: allKms } = await supabase.from('nc_kms_totais').select('id, nome');
        const toDel = (allKms ?? []).filter((k: { nome: string }) => !filteredNomesKms.has(String(k.nome || '').trim()));
        if (toDel.length > 0) {
          await supabase.from('nc_kms_totais').delete().in('id', toDel.map((k: { id: string }) => k.id));
        }
      }
      if (isKmsSource || tbl === 'nc_data_dynamic') {
        const { data: all } = await supabase.from('nc_data_dynamic').select('id, row_hash').eq('source_id', src.id);
        const toDel = (all ?? []).filter((r: { row_hash: string }) => !filteredHashes.has(r.row_hash));
        if (toDel.length > 0) {
          await supabase.from('nc_data_dynamic').delete().in('id', toDel.map((r: { id: string }) => r.id));
        }
      }

      await supabase
        .from('nc_sources')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_row_count: filteredRows.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', src.id);

      results[src.nome] = `OK: ${filteredRows.length} linhas (${rows.length - filteredRows.length} filtradas)`;
    } catch (err) {
      results[src.nome] = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: true, results };
}

function mapToMembros(row: Record<string, unknown>): Record<string, unknown> {
  const m: Record<string, unknown> = {
    rg: row.rg ?? row.RG ?? null,
    nome_completo: row.nome_completo ?? row.NOME_COMPLETO ?? null,
    nome_colete: row.nome_colete ?? row.NOME_COLETE ?? null,
    data_nascimento: row.data_nascimento ?? row.DATA_NASCIMENTO ?? null,
    ts_frh: row.ts_frh ?? row.TS_FRH ?? null,
    cpf: row.cpf ?? row.CPF ?? null,
    cnh: row.cnh ?? row.CNH ?? null,
    situacao: row.situacao ?? row.SITUACAO ?? null,
    graduacao: row.graduacao ?? row.GRADUACAO ?? null,
    data_admissao: row.data_admissao ?? row.DATA_ADMISSAO ?? null,
    data_pp: row.data_pp ?? row.DATA_PP ?? null,
    data_full_patch: row.data_full_patch ?? row.DATA_FULL_PATCH ?? null,
    funcao: row.funcao ?? row.FUNCAO ?? null,
    motocicleta: row.motocicleta ?? row.MOTOCICLETA ?? null,
    placa: row.placa ?? row.PLACA ?? null,
    telefone: row.telefone ?? row.TELEFONE ?? null,
    email: row.email ?? row.EMAIL ?? null,
    emergencia: row.emergencia ?? row.EMERGENCIA ?? null,
    contato_emergencia: row.contato_emergencia ?? row.CONTATO_EMERGENCIA ?? null,
    subregional: row.subregional ?? row.SUBREGIONAL ?? null,
    observacoes: row.observacoes ?? row.OBSERVACOES ?? null,
    regional: row.regional ?? row.REGIONAL ?? 'GOIAS',
  };
  return m;
}

async function upsertMembros(supabase: SupabaseClient, row: Record<string, unknown>, hash: string) {
  const data = { ...mapToMembros(row), source_row_hash: hash, updated_at: new Date().toISOString() };

  const { data: existing } = await supabase
    .from('nc_membros')
    .select('id')
    .eq('source_row_hash', hash)
    .single();

  if (existing) {
    await supabase.from('nc_membros').update(data).eq('id', existing.id);
  } else {
    await supabase.from('nc_membros').insert(data);
  }
}

function mapToViagens(row: Record<string, unknown>): Record<string, unknown> {
  return {
    nome_apelido: row.nome_apelido ?? row.NOME_APELIDO ?? null,
    descricao_trajeto: row.descricao_trajeto ?? row.DESCRICAO_TRAJETO ?? null,
    data_partida: row.data_partida ?? row.DATA_PARTIDA ?? null,
    data_chegada: row.data_chegada ?? row.DATA_CHEGADA ?? null,
    composicao_grupo: row.composicao_grupo ?? row.COMPOSICAO_GRUPO ?? null,
    km_inicial: row.km_inicial ?? row.KM_INICIAL ?? null,
    km_final: row.km_final ?? row.KM_FINAL ?? null,
    km_considerado: row.km_considerado ?? row.KM_CONSIDERADO ?? null,
    observacoes: row.observacoes ?? row.OBSERVACOES ?? null,
  };
}

async function upsertViagens(supabase: SupabaseClient, row: Record<string, unknown>, hash: string) {
  const data = {
    ...mapToViagens(row),
    source_row_hash: hash,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('nc_viagens')
    .select('id')
    .eq('source_row_hash', hash)
    .single();

  if (existing) {
    await supabase.from('nc_viagens').update(data).eq('id', existing.id);
  } else {
    await supabase.from('nc_viagens').insert(data);
  }
}

async function upsertKmsTotais(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ error: { message: string; code?: string } | null }> {
  const nome = (
    row.nome ??
    row.NOME ??
    row.nome_apelido ??
    row.NOME_APELIDO ??
    row['nome/apelido'] ??
    ''
  ) as string;
  const kmRaw =
    row.km_a_ser_considerado ??
    row.KM_A_SER_CONSIDERADO ??
    row.km_total ??
    row.KM_TOTAL ??
    row.km_considerado ??
    0;
  const km = parseFloat(String(kmRaw)) || 0;
  if (!nome || String(nome).trim().length < 2) return { error: null };

  const data = {
    nome: String(nome).trim(),
    km_total: km,
    ultima_atualizacao: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: selectErr } = await supabase
    .from('nc_kms_totais')
    .select('id')
    .eq('nome', data.nome)
    .single();

  if (selectErr && selectErr.code !== 'PGRST116') return { error: selectErr };
  if (existing) {
    const { error: updateErr } = await supabase.from('nc_kms_totais').update(data).eq('id', existing.id);
    return { error: updateErr };
  }
  const { error: insertErr } = await supabase.from('nc_kms_totais').insert(data);
  return { error: insertErr };
}
