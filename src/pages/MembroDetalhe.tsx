import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { listarLancamentosKmPorNome, somarLancamentos, formatKm } from '../lib/kms-data';
import { evolucaoPorKm, kmParaProximaEvolucao } from '../lib/evolucao';
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
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { keyframes } from '@emotion/react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import StarIcon from '@mui/icons-material/Star';

const starPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 6px rgba(255,215,0,0.5)); opacity: 1; }
  50% { filter: drop-shadow(0 0 16px rgba(255,215,0,0.85)); opacity: 1; }
`;

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
  const kmTotalPlanilha = somarLancamentos(lancamentosKm);

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
          {String(m.graduacao ?? '').trim() ? (
            <Chip
              label={String(m.graduacao)}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ) : null}
          {String(m.situacao ?? '').trim() ? (
            <Chip
              label={String(m.situacao)}
              size="small"
              color={String(m.situacao).toUpperCase() === 'ATIVO' ? 'success' : 'default'}
              variant="outlined"
            />
          ) : null}
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
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    minHeight: 100,
                    position: 'relative',
                    overflow: 'hidden',
                    background: (t) =>
                      t.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(30,30,45,0.95) 0%, rgba(20,20,35,0.98) 100%)'
                        : 'linear-gradient(145deg, rgba(40,40,60,0.92) 0%, rgba(25,25,45,0.96) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(94,53,177,0.15) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 1.5, fontWeight: 600, letterSpacing: '0.05em' }}>
                    Evolução
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: 56 }}>
                    {(() => {
                      const evo = evolucaoPorKm(kmTotalPlanilha);
                      if (!evo) {
                        return (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            Acumule 500 km ou mais para sua primeira evolução.
                          </Typography>
                        );
                      }
                      return (
                        <>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'rgba(255,255,255,0.95)',
                              animation: `${starPulse} 2s ease-in-out infinite`,
                            }}
                          >
                            {evo.tipo === 'mira' ? (
                              <GpsFixedIcon sx={{ fontSize: 32, color: '#ffd700', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.4))' }} />
                            ) : (
                              Array.from({ length: evo.estrelas ?? 0 }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  sx={{
                                    fontSize: 28,
                                    color: '#ffd700',
                                    filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.5))',
                                  }}
                                />
                              ))
                            )}
                          </Box>
                          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700, letterSpacing: '0.03em', mt: 1 }}>
                            {evo.nome}
                          </Typography>
                        </>
                      );
                    })()}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.5)',
                      mt: 1.5,
                      lineHeight: 1.4,
                      px: 1,
                    }}
                  >
                    Para conquistar sua evolução precisa ter seu interstício de um ano para cada evolução.
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      Total (planilha KMs)
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      {lancamentosKm.length > 0 ? `${formatKm(kmTotalPlanilha)} km` : '–'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    {(() => {
                      const faltam = kmParaProximaEvolucao(kmTotalPlanilha);
                      if (faltam === null) {
                        const evo = evolucaoPorKm(kmTotalPlanilha);
                        if (evo?.nome === 'BRASIL') {
                          return (
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              Máximo alcançado
                            </Typography>
                          );
                        }
                        return (
                          <Typography variant="caption" color="text.secondary">
                            {kmTotalPlanilha < 500 ? `${500 - kmTotalPlanilha} km para 1ª evolução` : '–'}
                          </Typography>
                        );
                      }
                      return (
                        <Typography variant="caption" color="text.secondary">
                          {formatKm(faltam)} km para próxima evolução
                        </Typography>
                      );
                    })()}
                  </Box>
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
                    {(() => {
                      if (!l.data_partida || typeof l.data_partida !== 'string') return '–';
                      try {
                        const d = parseISO(l.data_partida);
                        if (Number.isNaN(d.getTime())) return '–';
                        return format(d, 'dd/MM/yyyy', { locale: ptBR });
                      } catch {
                        return '–';
                      }
                    })()}
                  </Typography>
                  <Typography variant="body2">{l.descricao ?? '–'}</Typography>
                  <Chip
                    label={`${formatKm(l.km)} km`}
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
