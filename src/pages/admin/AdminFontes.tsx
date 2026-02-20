import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { parseJsonResponse } from '../../lib/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Link,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

type SourceTipo = 'google_sheets' | 'onedrive';

interface NCSource {
  id: string;
  nome: string;
  tipo: SourceTipo;
  url: string;
  sheet_id: string;
  table_name: string;
  start_row: number;
  active: boolean;
  last_sync_at: string | null;
  last_sync_row_count?: number | null;
}

interface NCSourceColumn {
  id: string;
  col_name: string;
  col_type: string;
  description: string;
  position: string;
  ordem: number;
}

function extractGidFromUrl(url: string): string {
  const m = url.match(/[?&]gid=(\d+)/);
  return m ? m[1] : '0';
}

export default function AdminFontes() {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [colunasDialogAberto, setColunasDialogAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<NCSource | null>(null);
  const [statusResult, setStatusResult] = useState<Record<string, { online: boolean; error?: string }>>({});

  const { data: sources = [], isLoading, error: sourcesError } = useQuery({
    queryKey: ['nc_sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nc_sources').select('*').order('created_at');
      if (error) throw error;
      return (data ?? []) as NCSource[];
    },
  });

  const { data: colunasMap = {} } = useQuery({
    queryKey: ['nc_source_columns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nc_source_columns')
        .select('*')
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

  const insertSource = useMutation({
    mutationFn: async (values: Partial<NCSource>) => {
      const { data, error } = await supabase.from('nc_sources').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nc_sources'] });
      setDialogAberto(false);
      setEditando(null);
    },
  });

  const updateSource = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<NCSource> }) => {
      const { error } = await supabase.from('nc_sources').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nc_sources'] });
      setDialogAberto(false);
      setEditando(null);
    },
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('nc_source_columns').delete().eq('source_id', id);
      const { error } = await supabase.from('nc_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nc_sources', 'nc_source_columns'] }),
  });

  const insertColuna = useMutation({
    mutationFn: async (values: Partial<NCSourceColumn> & { source_id: string }) => {
      const { source_id, ...rest } = values;
      const { error } = await supabase.from('nc_source_columns').insert({ ...rest, source_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nc_source_columns'] });
    },
  });

  const deleteColuna = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('nc_source_columns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nc_source_columns'] }),
  });

  const checkSourceStatus = async (s: NCSource) => {
    try {
      const res = await fetch(`${API_BASE}/api/source-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: s.url,
          tipo: s.tipo,
          sheet_id: s.sheet_id || extractGidFromUrl(s.url),
        }),
      });
      const data = await parseJsonResponse<{ online?: boolean; error?: string }>(res);
      setStatusResult((prev) => ({
        ...prev,
        [s.id]: { online: data.online ?? false, error: data.error },
      }));
    } catch (e) {
      setStatusResult((prev) => ({
        ...prev,
        [s.id]: { online: false, error: 'Servidor indisponível. Execute npm run server.' },
      }));
    }
  };

  useEffect(() => {
    if (sources.length === 0) return;
    sources.forEach((s) => checkSourceStatus(s));
  }, [sources]);

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );

  if (sourcesError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Erro ao carregar fontes: {sourcesError.message}. Verifique se o Supabase está configurado (.env) e se as
        tabelas nc_sources existem.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Fontes de Dados
          </Typography>
          <Typography color="text.secondary">
            Cadastre links de planilhas e configure as colunas para sincronização.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditando(null);
            setDialogAberto(true);
          }}
        >
          Nova fonte
        </Button>
      </Box>

      {sources.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Nenhuma fonte cadastrada. Clique em "Nova fonte" para adicionar um link de planilha
              (Google Sheets ou OneDrive).
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDialogAberto(true)}
            >
              Adicionar primeira fonte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sources.map((s) => (
            <Card key={s.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 1, mb: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="h6" color="primary">
                      {s.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LinkIcon fontSize="small" color="action" />
                      <Link
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ wordBreak: 'break-all', fontSize: '0.875rem' }}
                      >
                        {s.url}
                      </Link>
                      <IconButton size="small" onClick={() => copyUrl(s.url)} title="Copiar URL">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {s.tipo} → {s.table_name} | Linha inicial: {s.start_row} | GID/Sheet: {s.sheet_id || '-'}
                    </Typography>
                    {s.last_sync_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Última sync: {new Date(s.last_sync_at).toLocaleString('pt-BR')}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={
                        !s.active
                          ? 'Inativa'
                          : statusResult[s.id]?.online === false
                            ? 'Offline'
                            : typeof s.last_sync_row_count === 'number'
                              ? `ATIVA: ${s.last_sync_row_count} LINHAS`
                              : 'Ativa'
                      }
                      color={
                        !s.active
                          ? 'default'
                          : statusResult[s.id]?.online === false
                            ? 'error'
                            : 'success'
                      }
                      size="small"
                      variant={s.active && statusResult[s.id]?.online !== false ? 'filled' : 'outlined'}
                      icon={
                        statusResult[s.id] && statusResult[s.id].online ? (
                          <CheckCircleIcon sx={{ fontSize: 14 }} />
                        ) : statusResult[s.id] && !statusResult[s.id].online ? (
                          <ErrorIcon sx={{ fontSize: 14 }} />
                        ) : undefined
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditando(s);
                        setDialogAberto(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm('Excluir esta fonte e suas colunas?')) deleteSource.mutate(s.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                {statusResult[s.id]?.error && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    {statusResult[s.id].error}
                  </Alert>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Colunas: {(colunasMap[s.id] ?? []).length} configuradas
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setColunasDialogAberto(s.id)}
                  >
                    {colunasMap[s.id]?.length ? 'Editar colunas' : 'Configurar colunas'}
                  </Button>
                </Box>
                {(colunasMap[s.id] ?? []).length > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {(colunasMap[s.id] ?? [])
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((c) => `${c.col_name} (${c.position})`)
                      .join(', ')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogAberto}
        onClose={() => {
          setDialogAberto(false);
          setEditando(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editando ? 'Editar fonte' : 'Nova fonte'}</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const values = {
              nome: fd.get('nome') as string,
              tipo: fd.get('tipo') as SourceTipo,
              url: fd.get('url') as string,
              sheet_id: fd.get('sheet_id') as string,
              table_name: fd.get('table_name') as string,
              start_row: parseInt(fd.get('start_row') as string, 10) || 1,
              active: true,
            };
            if (editando) updateSource.mutate({ id: editando.id, values });
            else insertSource.mutate(values);
          }}
        >
          <DialogContent>
            <TextField
              name="nome"
              label="Nome"
              defaultValue={editando?.nome}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tipo</InputLabel>
              <Select name="tipo" label="Tipo" defaultValue={editando?.tipo || 'google_sheets'} required>
                <MenuItem value="google_sheets">Google Sheets</MenuItem>
                <MenuItem value="onedrive">OneDrive (Excel)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="url"
              label="URL da planilha"
              defaultValue={editando?.url}
              fullWidth
              required
              placeholder="https://docs.google.com/... ou https://onedrive.live.com/..."
              sx={{ mb: 2 }}
            />
            <TextField
              name="sheet_id"
              label="GID (Google) ou Nome da aba (Excel)"
              defaultValue={editando?.sheet_id}
              fullWidth
              helperText="Para Google Sheets: número após gid= na URL. Ex: 1106565265"
              sx={{ mb: 2 }}
            />
            <TextField
              name="table_name"
              label="Tabela destino no banco"
              defaultValue={editando?.table_name}
              fullWidth
              required
              placeholder="NC_membros, NC_viagens, NC_kms_totais..."
              sx={{ mb: 2 }}
            />
            <TextField
              name="start_row"
              label="Linha onde começam os dados"
              type="number"
              defaultValue={editando?.start_row ?? 6}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={insertSource.isPending || updateSource.isPending}>
              {editando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {colunasDialogAberto && (() => {
        const source = sources.find((s) => s.id === colunasDialogAberto);
        return source ? (
          <ColunasDialog
            source={source}
            colunas={colunasMap[colunasDialogAberto] ?? []}
            onClose={() => setColunasDialogAberto(null)}
            onAdd={(c) => {
              insertColuna.mutate({ ...c, source_id: colunasDialogAberto });
            }}
            onDelete={deleteColuna.mutate}
          />
        ) : null;
      })()}
    </Box>
  );
}

function slugHeader(header: string): string {
  const slug = header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return slug || 'col';
}

function ColunasDialog({
  source,
  colunas,
  onClose,
  onAdd,
  onDelete,
}: {
  source: NCSource;
  colunas: NCSourceColumn[];
  onClose: () => void;
  onAdd: (c: { col_name: string; col_type: string; description: string; position: string; ordem: number }) => void;
  onDelete: (id: string) => void;
}) {
  const [colName, setColName] = useState('');
  const [colType, setColType] = useState('text');
  const [colDesc, setColDesc] = useState('');
  const [colPos, setColPos] = useState('');
  const [importando, setImportando] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!colName.trim() || !colPos.trim()) return;
    onAdd({
      col_name: colName.trim().toLowerCase().replace(/\s+/g, '_'),
      col_type: colType,
      description: colDesc,
      position: colPos.trim().toUpperCase(),
      ordem: colunas.length + 1,
    });
    setColName('');
    setColDesc('');
    setColPos('');
  };

  const existingPositions = new Set(colunas.map((c) => c.position.toUpperCase()));

  const handleImportarTodas = async () => {
    if (source.tipo !== 'google_sheets') {
      setImportError('Importação automática só está disponível para Google Sheets.');
      return;
    }
    setImportando(true);
    setImportError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sheet-headers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: source.url,
          sheet_id: source.sheet_id || extractGidFromUrl(source.url),
          start_row: source.start_row ?? 6,
        }),
      });
      const data = await parseJsonResponse<{ columns?: Array<{ position: string; header: string }>; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar cabeçalhos');
      const { columns } = data;
      if (!Array.isArray(columns) || columns.length === 0) {
        setImportError('Nenhuma coluna encontrada na linha de cabeçalho.');
        return;
      }
      let ordem = colunas.length;
      for (const { position, header } of columns) {
        const pos = position.toUpperCase();
        if (existingPositions.has(pos)) continue;
        ordem += 1;
        onAdd({
          col_name: slugHeader(header),
          col_type: 'text',
          description: header,
          position: pos,
          ordem,
        });
        existingPositions.add(pos);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configurar colunas (NOME, TIPO, Descrição, POSIÇÃO)</DialogTitle>
      <DialogContent>
        {source.tipo === 'google_sheets' && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={handleImportarTodas}
              disabled={importando}
            >
              {importando ? 'Importando…' : 'Importar todas as colunas da planilha'}
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Lê a linha de cabeçalho da planilha e adiciona todas as colunas aqui. Depois você pode excluir as que não
              precisar.
            </Typography>
            {importError && (
              <Alert severity="error" sx={{ mt: 1 }} onClose={() => setImportError(null)}>
                {importError}
              </Alert>
            )}
          </Box>
        )}
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>NOME</TableCell>
              <TableCell>TIPO</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>POSIÇÃO</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...colunas].sort((a, b) => a.ordem - b.ordem).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.col_name}</TableCell>
                <TableCell>{c.col_type}</TableCell>
                <TableCell>{c.description || '-'}</TableCell>
                <TableCell>{c.position}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => onDelete(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Adicionar coluna
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="NOME"
            value={colName}
            onChange={(e) => setColName(e.target.value)}
            placeholder="nome_colete"
            size="small"
            sx={{ minWidth: 140 }}
          />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>TIPO</InputLabel>
            <Select value={colType} label="TIPO" onChange={(e) => setColType(e.target.value)}>
              <MenuItem value="text">text</MenuItem>
              <MenuItem value="number">number</MenuItem>
              <MenuItem value="date">date</MenuItem>
              <MenuItem value="boolean">boolean</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Descrição"
            value={colDesc}
            onChange={(e) => setColDesc(e.target.value)}
            size="small"
            placeholder="Nome no colete"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="POSIÇÃO"
            value={colPos}
            onChange={(e) => setColPos(e.target.value)}
            placeholder="A, B, C..."
            size="small"
            sx={{ minWidth: 80 }}
          />
          <Button variant="contained" onClick={handleAdd} startIcon={<AddIcon />}>
            Adicionar
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
