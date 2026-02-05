import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
import { useTabelasHeader } from '../contexts/TabelasHeaderContext';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
  Collapse,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import SyncIcon from '@mui/icons-material/Sync';
import DataGrid, { type DataGridColumn } from '../components/DataGrid';
import { contarMembros } from '../lib/membro-stats';

const STORAGE_KEY = 'nc_tabelas_prefs';
const LAST_SOURCE_KEY = 'nc_tabelas_last_source';

/** Considerado ativo apenas quando SITUACAO é exatamente ATIVO (case-insensitive). Usa busca case-insensitive no row. */
function rowIsAtivo(row: Record<string, unknown>): boolean {
  const val = getRowValueCaseInsensitive(row, 'situacao') ?? getRowValueCaseInsensitive(row, 'SITUACAO');
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'ativo';
}

/** Valores que não são um nome válido: vazio, só traço/ponto, n/a, só número, etc. */
const NAO_E_NOME = /^(|\s*[-–—.\s]*\s*|n\/?a|n\/d|nil|null|\?|\*+)$/i;
const SO_NUMERO = /^\d+$/;

/** Normaliza string: remove espaços Unicode e caracteres invisíveis, depois trim. */
function normalizeForName(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function looksLikeNonName(val: unknown): boolean {
  if (val == null) return true;
  const s = normalizeForName(String(val));
  if (s.length < 2) return true;
  if (NAO_E_NOME.test(s)) return true;
  if (SO_NUMERO.test(s)) return true;
  if (/^[\s\-–—.\*]+$/.test(s)) return true;
  return false;
}

/** Retorna o id da coluna "Nome completo" (prioridade) ou primeira coluna disponível. */
function getPrimaryNomeColId(colIds: string[]): string | null {
  if (!colIds.length) return null;
  const lower = (s: string) => s.toLowerCase();
  const nomeCompleto = colIds.find((id) => lower(id) === 'nome_completo');
  if (nomeCompleto) return nomeCompleto;
  const nome = colIds.find((id) => lower(id) === 'nome');
  if (nome) return nome;
  return colIds[0];
}

/** Obtém valor do row por chave, com match case-insensitive (row pode vir com NOME_COMPLETO, nome_completo, etc.). */
function getRowValueCaseInsensitive(row: Record<string, unknown>, colId: string): unknown {
  if (colId in row) return row[colId];
  const want = colId.toLowerCase();
  const key = Object.keys(row).find((k) => k.toLowerCase() === want);
  return key != null ? row[key] : undefined;
}

/** True só se a coluna principal de nome (ex.: nome_completo) tiver um nome válido. Usa busca case-insensitive no row. */
function rowHasNomeCompletoValido(row: Record<string, unknown>, primaryNomeColId: string | null): boolean {
  if (!primaryNomeColId) return false;
  const val = getRowValueCaseInsensitive(row, primaryNomeColId);
  return !looksLikeNonName(val);
}

interface TablePrefs {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  visibleColumns: string[];
  apenasAtivos: boolean;
}

function loadPrefs(sourceId: string): Partial<TablePrefs> | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${sourceId}`);
    return raw ? (JSON.parse(raw) as Partial<TablePrefs>) : null;
  } catch {
    return null;
  }
}

function savePrefs(sourceId: string, prefs: TablePrefs): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${sourceId}`, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function loadLastSource(): string | null {
  try {
    return localStorage.getItem(LAST_SOURCE_KEY);
  } catch {
    return null;
  }
}

function saveLastSource(sourceId: string): void {
  try {
    localStorage.setItem(LAST_SOURCE_KEY, sourceId);
  } catch {
    /* ignore */
  }
}

interface NCSource {
  id: string;
  nome: string;
  table_name: string;
}

interface NCSourceColumn {
  col_name: string;
  description: string | null;
  ordem: number;
}

/** Define tabela Supabase para leitura. Fonte "Controle de KM's" usa nc_data_dynamic (uma linha por registro do Sheets). */
function resolveSupabaseTable(tableName: string, sourceNome?: string): string {
  const t = (tableName || '').toLowerCase().trim();
  const nome = (sourceNome || '').toLowerCase();
  // Fonte "Controle de KM's": sempre usa nc_data_dynamic (prioridade sobre table_name)
  const isKmsSource =
    nome.includes('kms') ||
    nome.includes("km's") ||
    nome.includes('controle de km');
  if (isKmsSource) return 'nc_data_dynamic';
  if (t === 'nc_membros') return 'nc_membros';
  if (t === 'nc_viagens') return 'nc_viagens';
  if (t === 'nc_kms_totais') return 'nc_kms_totais';
  return 'nc_data_dynamic';
}

export default function Tabelas() {
  const { setHeader } = useTabelasHeader();
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState<string>('');
  const [colunasExpanded, setColunasExpanded] = useState(false);
  const [prefs, setPrefs] = useState<TablePrefs>({
    sortBy: '',
    sortOrder: 'asc',
    visibleColumns: [],
    apenasAtivos: true,
  });

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ['nc_sources_tabelas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nc_sources')
        .select('id, nome, table_name')
        .eq('active', true)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as NCSource[];
    },
  });

  const { data: colunasMap = {} } = useQuery({
    queryKey: ['nc_source_columns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nc_source_columns')
        .select('source_id, col_name, description, ordem')
        .order('ordem');
      if (error) throw error;
      const map: Record<string, NCSourceColumn[]> = {};
      for (const c of (data ?? []) as (NCSourceColumn & { source_id: string })[]) {
        if (!map[c.source_id]) map[c.source_id] = [];
        map[c.source_id].push(c);
      }
      return map;
    },
  });

  useEffect(() => {
    if (sources.length === 0 || sourceId) return;
    const last = loadLastSource();
    const valid = last && sources.some((s) => s.id === last);
    setSourceId(valid ? last : sources[0].id);
  }, [sources, sourceId]);

  useEffect(() => {
    if (sourceId) saveLastSource(sourceId);
  }, [sourceId]);

  const selectedSource = useMemo(() => sources.find((s) => s.id === sourceId), [sources, sourceId]);

  const allColumns: DataGridColumn[] = useMemo(() => {
    const cols = (colunasMap[sourceId] ?? []).sort((a, b) => a.ordem - b.ordem);
    return cols.map((c) => ({
      id: c.col_name,
      header: c.description || c.col_name.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()),
    }));
  }, [colunasMap, sourceId]);

  useEffect(() => {
    if (!sourceId || allColumns.length === 0) return;
    const saved = loadPrefs(sourceId);
    const colIds = allColumns.map((c) => c.id);
    if (saved) {
      const vis = saved.visibleColumns?.filter((id) => colIds.includes(id)) ?? [];
      setPrefs({
        sortBy: saved.sortBy && colIds.includes(saved.sortBy) ? saved.sortBy : colIds[0] ?? '',
        sortOrder: saved.sortOrder ?? 'asc',
        visibleColumns: vis.length > 0 ? vis : colIds,
        apenasAtivos: saved.apenasAtivos ?? true,
      });
    } else {
      setPrefs({ sortBy: colIds[0] ?? '', sortOrder: 'asc', visibleColumns: colIds, apenasAtivos: true });
    }
  }, [sourceId, allColumns]);

  const updatePrefs = useCallback(
    (updates: Partial<TablePrefs>) => {
      setPrefs((p) => {
        const next = { ...p, ...updates };
        if (sourceId) savePrefs(sourceId, next);
        return next;
      });
    },
    [sourceId]
  );

  const toggleColumn = useCallback(
    (colId: string) => {
      setPrefs((p) => {
        const visible = p.visibleColumns.includes(colId)
          ? p.visibleColumns.filter((id) => id !== colId)
          : [...p.visibleColumns, colId];
        const next = { ...p, visibleColumns: visible };
        if (sourceId) savePrefs(sourceId, next);
        return next;
      });
    },
    [sourceId]
  );
  const tableName = selectedSource?.table_name ?? '';
  const sourceNome = selectedSource?.nome ?? '';
  const supabaseTable = resolveSupabaseTable(tableName, sourceNome);
  const isDynamic = supabaseTable === 'nc_data_dynamic';
  // Tabela "pura": sem filtros de nome/ativo — KMs e qualquer fonte cujo nome ou table_name indique KM(s)
  const lowerName = tableName.toLowerCase();
  const lowerSource = sourceNome.toLowerCase();
  const isKmsTable =
    supabaseTable === 'nc_kms_totais' ||
    lowerName.includes('kms') ||
    lowerName.includes('km\'s') ||
    lowerName.includes('km ') ||
    lowerSource.includes('kms') ||
    lowerSource.includes('km\'s') ||
    lowerSource.includes('controle de km');

  const syncMutation = useMutation({
    mutationFn: async (sid: string) => {
      const res = await fetch(`${API_BASE}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: sid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.results?.error ?? 'Falha no sync');
      return data as { ok: boolean; results: Record<string, string> };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela_data'] });
      queryClient.invalidateQueries({ queryKey: ['nc_sources_tabelas'] });
    },
  });

  // Sync automático ao selecionar fonte de KMs (mantém banco sincronizado com planilha)
  useEffect(() => {
    if (!sourceId || !isKmsTable || syncMutation.isPending) return;
    syncMutation.mutate(sourceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, isKmsTable]);

  const queryEnabled = !!sourceId && !!selectedSource;
  const { data: rows = [], isLoading: loadingData } = useQuery({
    queryKey: ['tabela_data', sourceId, supabaseTable],
    queryFn: async () => {
      if (!sourceId || !selectedSource) return [];

      if (isDynamic) {
        const { data, error } = await supabase
          .from('nc_data_dynamic')
          .select('row_data')
          .eq('source_id', sourceId);
        if (error) throw error;
        const result = ((data ?? []).map((r) => (r as { row_data: Record<string, unknown> }).row_data ?? {})).filter(
          (r) => Object.keys(r).length > 0
        );
        return result;
      }

      const { data, error } = await supabase.from(supabaseTable).select('*');
      if (error) throw error;
      const result = (data ?? []) as Record<string, unknown>[];
      return result;
    },
    enabled: queryEnabled,
  });

  const visibleColumns: DataGridColumn[] = useMemo(() => {
    if (prefs.visibleColumns.length === 0) return allColumns;
    const byId = Object.fromEntries(allColumns.map((c) => [c.id, c]));
    return prefs.visibleColumns.map((id) => byId[id]).filter(Boolean);
  }, [allColumns, prefs.visibleColumns]);

  const primaryNomeColId = useMemo(
    () => getPrimaryNomeColId(allColumns.map((c) => c.id)),
    [allColumns]
  );

  const displayRows = useMemo(() => {
    if (isKmsTable) return rows;
    const withNomeCompleto = rows.filter((r) =>
      rowHasNomeCompletoValido(r as Record<string, unknown>, primaryNomeColId)
    );
    const filtered = prefs.apenasAtivos
      ? withNomeCompleto.filter((r) => rowIsAtivo(r as Record<string, unknown>))
      : withNomeCompleto;
    // Fallback: se os filtros zeraram a lista mas há dados, mostrar todas as linhas (filtro de ativos opcional)
    if (filtered.length === 0 && rows.length > 0) {
      return prefs.apenasAtivos
        ? rows.filter((r) => rowIsAtivo(r as Record<string, unknown>))
        : rows;
    }
    return filtered;
  }, [rows, prefs.apenasAtivos, primaryNomeColId, isKmsTable]);

  const sortedRows = useMemo(() => {
    if (!prefs.sortBy || displayRows.length === 0) return displayRows;
    const key = prefs.sortBy;
    return [...displayRows].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      const aStr = va != null ? String(va) : '';
      const bStr = vb != null ? String(vb) : '';
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return prefs.sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [displayRows, prefs.sortBy, prefs.sortOrder]);

  const isMembrosTable = useMemo(() => {
    const tn = tableName.toLowerCase();
    if (tn === 'nc_membros') return true;
    if (rows.length === 0) return false;
    const r = rows[0] as Record<string, unknown>;
    const hasMemberFields = 'data_full_patch' in r || 'data_pp' in r || 'DATA_FULL_PATCH' in r || 'DATA_PP' in r;
    return !!hasMemberFields;
  }, [tableName, rows]);
  const indicadores = useMemo(() => {
    if (isKmsTable || !isMembrosTable || displayRows.length === 0) return null;
    const c = contarMembros(displayRows as Record<string, unknown>[]);
    return { total: c.totais, membros14: c.membros14, pp: c.pp, full: c.full };
  }, [isKmsTable, isMembrosTable, displayRows]);

  const hasColumns = allColumns.length > 0;

  useEffect(() => {
    setHeader({
      title: 'Visualizador de Tabelas',
      indicadores: indicadores ?? null,
    });
    return () => setHeader(null);
  }, [indicadores, setHeader]);

  useEffect(() => {
    if (!indicadores) return;
    fetch('/api/dashboard-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total: indicadores.total,
        full: indicadores.full,
        pp: indicadores.pp,
        membros_14: indicadores.membros14,
      }),
    }).catch(() => {});
  }, [indicadores]);

  if (loadingSources) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (sources.length === 0) {
    return (
      <Alert severity="info">
        Nenhuma fonte ativa. Configure fontes em Admin → Fontes e execute uma sincronização.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Tabela</InputLabel>
          <Select
            value={sourceId || ''}
            label="Tabela"
            onChange={(e) => setSourceId(e.target.value)}
          >
            {sources.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.nome} ({s.table_name})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {sourceId && (
          <Button
            size="small"
            variant="outlined"
            startIcon={syncMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
            onClick={() => syncMutation.mutate(sourceId)}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Sincronizando...' : 'Atualizar da fonte'}
          </Button>
        )}
        {sourceId && hasColumns && (
          <>
            <Button
              size="small"
              variant={prefs.apenasAtivos ? 'outlined' : 'contained'}
              startIcon={prefs.apenasAtivos ? <PersonIcon /> : <PersonOffIcon />}
              onClick={() => updatePrefs({ apenasAtivos: !prefs.apenasAtivos })}
            >
              {prefs.apenasAtivos ? 'Mostrar Todos' : 'Mostrar Apenas Ativos'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              endIcon={colunasExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setColunasExpanded((e) => !e)}
            >
              Colunas
            </Button>
          </>
        )}
      </Box>
      {syncMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => syncMutation.reset()}>
          {syncMutation.error instanceof Error ? syncMutation.error.message : String(syncMutation.error)}
        </Alert>
      )}
      {syncMutation.isSuccess && syncMutation.data?.results && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => syncMutation.reset()}>
          Banco atualizado. {Object.entries(syncMutation.data.results).map(([nome, msg]) => `${nome}: ${msg}`).join(' ')}
        </Alert>
      )}
      {!sourceId ? (
        <Typography color="text.secondary">Selecione uma tabela para visualizar os dados.</Typography>
      ) : !hasColumns ? (
        <Alert severity="warning">
          Esta fonte não tem colunas configuradas. Configure as colunas em Admin → Fontes.
        </Alert>
      ) : loadingData ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Collapse in={colunasExpanded}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Exibir colunas
              </Typography>
              <FormGroup row>
                {allColumns.map((c) => (
                  <FormControlLabel
                    key={c.id}
                    control={
                      <Checkbox
                        checked={prefs.visibleColumns.includes(c.id)}
                        onChange={() => toggleColumn(c.id)}
                      />
                    }
                    label={c.header}
                  />
                ))}
              </FormGroup>
            </Paper>
          </Collapse>
          <DataGrid
            data={sortedRows}
            columns={visibleColumns}
            sortBy={prefs.sortBy}
            sortOrder={prefs.sortOrder}
            onSort={(colId) =>
              updatePrefs({
                sortBy: colId,
                sortOrder: prefs.sortBy === colId && prefs.sortOrder === 'asc' ? 'desc' : 'asc',
              })
            }
            onColumnReorder={(ids) => updatePrefs({ visibleColumns: ids })}
            pageSize={100}
          />
        </Box>
      )}
    </Box>
  );
}
