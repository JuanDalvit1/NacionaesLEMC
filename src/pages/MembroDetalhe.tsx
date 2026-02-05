import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { listarLancamentosKmPorNome } from '../lib/kms-data';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';

const CAMPOS_PESSOAIS: { key: keyof Record<string, unknown>; label: string }[] = [
  { key: 'data_nascimento', label: 'Data de Nascimento' },
  { key: 'ts_frh', label: 'TS/FRH' },
  { key: 'cpf', label: 'CPF' },
  { key: 'cnh', label: 'CNH' },
  { key: 'graduacao', label: 'Graduação' },
  { key: 'funcao', label: 'Função' },
  { key: 'situacao', label: 'Situação' },
  { key: 'motocicleta', label: 'Motocicleta' },
  { key: 'placa', label: 'Placa' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'contato_emergencia', label: 'Contato Emergência' },
];

function formatVal(val: unknown): string {
  if (val == null || String(val).trim() === '') return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}/.test(val)) {
    try {
      return format(parseISO(val), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return String(val);
    }
  }
  return String(val).trim();
}

const cardSx = (theme: { palette: { mode: string } }) => ({
  height: '100%',
  borderRadius: 2,
  background: theme.palette.mode === 'dark'
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.9)',
  boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.24)' : '0 8px 32px rgba(0,0,0,0.06)',
});

export default function MembroDetalhe() {
  const { id } = useParams<{ id: string }>();

  const { data: membro, isLoading } = useQuery({
    queryKey: ['NC_membro', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('nc_membros').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const nomeMembro = (membro?.nome_colete as string) || (membro?.nome_completo as string) || '';
  const { data: lancamentosKm = [] } = useQuery({
    queryKey: ['NC_kms_planilha_lancamentos', nomeMembro],
    queryFn: () => listarLancamentosKmPorNome(nomeMembro),
    enabled: !!membro && !!nomeMembro,
  });
  const kmTotalPlanilha = lancamentosKm.reduce((s, l) => s + l.km, 0);

  if (isLoading || !membro)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );

  const m = membro as Record<string, unknown>;
  const nomeExibido = String(m.nome_colete ?? m.nome_completo ?? 'Membro');
  const camposComValor = CAMPOS_PESSOAIS.filter(({ key }) => {
    const v = m[key];
    return v != null && String(v).trim() !== '';
  });

  return (
    <Box sx={{ pb: 3 }}>
      <Button
        component={Link}
        to="/membros"
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{ mb: 2, color: 'text.secondary', minHeight: 44 }}
      >
        Voltar
      </Button>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
          <PersonIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
            {nomeExibido}
          </Typography>
          {m.graduacao && String(m.graduacao).trim() && (
            <Chip
              label={String(m.graduacao)}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
          {m.situacao && String(m.situacao).trim() && (
            <Chip
              label={String(m.situacao)}
              size="small"
              color={String(m.situacao).toUpperCase() === 'ATIVO' ? 'success' : 'default'}
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Ficha do membro
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={cardSx} variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <PersonIcon fontSize="small" /> Dados Pessoais
              </Typography>
              {camposComValor.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum dado pessoal cadastrado.
                </Typography>
              ) : (
                <Box component="dl" sx={{ m: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {camposComValor.map(({ key, label }) => (
                    <Box
                      key={key}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        py: 0.75,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-of-type': { borderBottom: 0 },
                      }}
                    >
                      <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: { xs: '100%', sm: 140 }, fontWeight: 500 }}>
                        {label}
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ m: 0, flex: 1 }}>
                        {formatVal(m[key])}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={cardSx} variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <RouteIcon fontSize="small" /> Quilometragem
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Lançamentos (soma)
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 120,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      py: 0.5,
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'action.selected' },
                    }}
                  >
                    {lancamentosKm.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum lançamento na planilha.
                      </Typography>
                    ) : (
                      <>
                        {lancamentosKm.map((l, i) => (
                          <Box
                            key={i}
                            sx={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              py: 0.25,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <Typography component="span" variant="body2" fontWeight={600}>
                              {i > 0 ? '+ ' : ''}
                              {Number(l.km).toLocaleString('pt-BR')}
                            </Typography>
                            {(l.descricao || l.data_partida) && (
                              <Typography component="span" variant="caption" color="text.secondary">
                                {[
                                  l.data_partida
                                    ? format(parseISO(l.data_partida), 'dd/MM/yyyy', { locale: ptBR })
                                    : '',
                                  l.descricao,
                                ]
                                  .filter(Boolean)
                                  .join(' — ')}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </>
                    )}
                  </Box>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Total (planilha KMs)
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {lancamentosKm.length > 0 ? `${Number(kmTotalPlanilha).toLocaleString('pt-BR')} km` : '–'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={cardSx} variant="outlined">
        <CardContent>
          <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            <RouteIcon fontSize="small" /> Viagens (planilha KMs)
          </Typography>
          {lancamentosKm.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhuma viagem registrada na planilha de KMs para este membro.
            </Typography>
          ) : (
            <List dense disablePadding sx={{ borderRadius: 1, overflow: 'hidden' }}>
              {lancamentosKm.map((l, i) => (
                <ListItem
                  key={i}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '100px 1fr 80px' },
                    gap: 1.5,
                    alignItems: 'center',
                    py: 1.25,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {l.data_partida
                      ? format(parseISO(l.data_partida), 'dd/MM/yyyy', { locale: ptBR })
                      : '–'}
                  </Typography>
                  <Typography variant="body2">{l.descricao ?? '–'}</Typography>
                  <Chip
                    label={`${Number(l.km).toLocaleString('pt-BR')} km`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ width: 'fit-content', fontWeight: 600 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
