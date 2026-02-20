import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTabelasHeader } from '../contexts/TabelasHeaderContext';
import { fetchMemberRows, filterMembrosAtivosComNomeValido } from '../lib/membros-data';
import { contarMembros, tipoMembro } from '../lib/membro-stats';
import { supabase } from '../lib/supabase';
import { format, parseISO, isBefore, isAfter, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemButton,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import RouteIcon from '@mui/icons-material/Route';
import CakeIcon from '@mui/icons-material/Cake';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/* Paleta harmônica para gráficos – tons modernos */
const CHART_COLORS = [
  '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899',
  '#06b6d4', '#6366f1', '#22c55e', '#f97316', '#a855f7',
];

const cardGlassSx = (theme: { palette: { mode: string } }) => ({
  height: '100%',
  background: theme.palette.mode === 'dark'
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.9)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0,0,0,0.24)'
    : '0 8px 32px rgba(0,0,0,0.06)',
});

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={(theme) => ({
      ...cardGlassSx(theme),
      borderLeft: `4px solid ${color}`,
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, ${color}18 0%, rgba(255,255,255,0.05) 70%)`
        : `linear-gradient(135deg, ${color}12 0%, rgba(255,255,255,0.9) 70%)`,
    })}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: 2,
            bgcolor: `${color}22`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.25 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

type TooltipPayloadItem = { name?: string; value?: number; payload?: { name?: string } };
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly TooltipPayloadItem[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item?.payload?.name ?? (label != null ? String(label) : '');
  const value = item?.value ?? 0;
  return (
    <Box
      component="div"
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">{name}</Typography>
      <Typography variant="body2" fontWeight={600}>{value} membros</Typography>
    </Box>
  );
}

function formatDataNascimento(raw: unknown): string {
  if (raw == null || String(raw).trim() === '') return '-';
  try {
    const d = parseISO(String(raw));
    return format(d, "d 'de' MMMM", { locale: ptBR });
  } catch {
    return '-';
  }
}

export default function Dashboard() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const { setHeader } = useTabelasHeader();
  const pieRadius = { inner: isSm ? 40 : 60, outer: isSm ? 70 : 95 };

  useEffect(() => {
    setHeader({
      title: 'Dashboard',
      subtitle: 'Visão geral do NACIONAES LEMC',
      indicadores: null,
    });
    return () => setHeader(null);
  }, [setHeader]);

  const { data: membrosRaw = [], isLoading } = useQuery({
    queryKey: ['NC_membros'],
    queryFn: fetchMemberRows,
  });

  const membrosList = useMemo(
    () => filterMembrosAtivosComNomeValido(membrosRaw as Record<string, unknown>[]),
    [membrosRaw]
  );

  const contadores = useMemo(() => contarMembros(membrosList), [membrosList]);

  const porGraduacao = useMemo(
    () =>
      Object.entries(
        membrosList.reduce<Record<string, number>>((acc, m) => {
          const g = (m.graduacao as string) || 'Sem graduação';
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [membrosList]
  );

  const porTipoSanguineo = useMemo(() => {
    const mapa = membrosList.reduce<Record<string, number>>((acc, m) => {
      const ts = String(m.ts_frh ?? m.TS_FRH ?? 'Não informado').trim() || 'Não informado';
      acc[ts] = (acc[ts] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.value - b.value);
  }, [membrosList]);

  const hoje = new Date();
  const fimDoAno = endOfYear(hoje);

  const aniversariantesMes = useMemo(() => {
    const mes = hoje.getMonth();
    return membrosList
      .filter((m) => {
        try {
          const raw = m.data_nascimento ?? m.DATA_NASCIMENTO;
          if (raw == null) return false;
          const d = parseISO(String(raw));
          return d.getMonth() === mes;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const da = parseISO(String(a.data_nascimento ?? a.DATA_NASCIMENTO)).getDate();
        const db = parseISO(String(b.data_nascimento ?? b.DATA_NASCIMENTO)).getDate();
        return da - db;
      });
  }, [membrosList, hoje]);

  const proximosAniversariantes = useMemo(
    () =>
      membrosList
        .filter((m) => {
          try {
            const raw = m.data_nascimento ?? m.DATA_NASCIMENTO;
            if (!raw) return false;
            const d = parseISO(String(raw));
            const dataAniv = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
            if (isBefore(dataAniv, hoje)) return false;
            if (isAfter(dataAniv, fimDoAno)) return false;
            return true;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const da = parseISO(String(a.data_nascimento ?? a.DATA_NASCIMENTO));
          const db = parseISO(String(b.data_nascimento ?? b.DATA_NASCIMENTO));
          const aNext = new Date(hoje.getFullYear(), da.getMonth(), da.getDate());
          const bNext = new Date(hoje.getFullYear(), db.getMonth(), db.getDate());
          return aNext.getTime() - bNext.getTime();
        })
        .slice(0, 5),
    [membrosList, hoje, fimDoAno]
  );

  const { data: viagensRecentes = [] } = useQuery({
    queryKey: ['NC_viagens_recentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nc_viagens')
        .select('nome_apelido, descricao_trajeto, data_partida, km_considerado')
        .order('data_partida', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });

  const { data: kmTotal } = useQuery({
    queryKey: ['NC_kms_total'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nc_kms_totais').select('km_total');
      if (error) throw error;
      const total = (data ?? []).reduce((s: number, r: { km_total?: string | number }) => {
        const v = Number(r?.km_total ?? 0);
        return s + (isNaN(v) ? 0 : v);
      }, 0);
      return Math.round(total);
    },
  });

  const pctFull = contadores.totais > 0 ? Math.round((contadores.full / contadores.totais) * 100) : 0;

  if (isLoading) {
    return (
      <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Carregando dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Total de Membros"
            value={contadores.totais}
            subtitle="Ativos"
            icon={<PeopleIcon fontSize="medium" />}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Full Patch"
            value={contadores.full}
            subtitle={`${pctFull}% do total`}
            icon={<MilitaryTechIcon fontSize="medium" />}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="PP"
            value={contadores.pp}
            subtitle="Prospect/Probation"
            icon={<TrendingUpIcon fontSize="medium" />}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="14"
            value={contadores.membros14}
            subtitle="Nunca Serão"
            icon={<PeopleIcon fontSize="medium" />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* Gráficos principais – glassmorphism + gráficos redesenhados */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={(t) => ({ ...cardGlassSx(t), minHeight: { xs: 260, md: 320 } })}>
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <MilitaryTechIcon fontSize="small" /> Composição por Graduação
              </Typography>
              <Box sx={{ height: { xs: 220, sm: 260, md: 280 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 48, left: 8 }}>
                    <Pie
                      data={porGraduacao}
                      cx="50%"
                      cy="50%"
                      innerRadius={pieRadius.inner}
                      outerRadius={pieRadius.outer}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth={1.5}
                    >
                      {porGraduacao.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload ?? undefined} label={label != null ? String(label) : undefined} />} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)' }} />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: 10 }}
                      formatter={(value) => (
                        <span style={{ color: 'inherit', marginRight: 8 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={(t) => ({ ...cardGlassSx(t), minHeight: { xs: 260, md: 320 } })}>
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <BloodtypeIcon fontSize="small" /> Tipo Sanguíneo
              </Typography>
              <Box sx={{ height: { xs: 220, sm: 260, md: 280 } }}>
                {porTipoSanguineo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={porTipoSanguineo.map((entry, i) => ({ ...entry, fill: CHART_COLORS[i % CHART_COLORS.length] }))}
                      layout="vertical"
                      margin={{ left: 20, right: 24, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                      <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload ?? undefined} label={label != null ? String(label) : undefined} />} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)' }} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="value" name="Membros" radius={[0, 6, 6, 0]} maxBarSize={28}>
                        {porTipoSanguineo.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Sem dados de tipo sanguíneo</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Aniversariantes + Acesso rápido + Extras */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={cardGlassSx}>
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <CakeIcon fontSize="small" /> Aniversariantes do mês
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
              </Typography>
              {aniversariantesMes.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Nenhum aniversariante este mês.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {aniversariantesMes.slice(0, 6).map((m, idx) => {
                    const row = m as Record<string, unknown>;
                    const tipo = tipoMembro(m);
                    return (
                      <ListItem
                        key={row.id ? String(row.id) : `aniv-${idx}`}
                        divider={idx < aniversariantesMes.slice(0, 6).length - 1}
                        component={Link}
                        to={`/membros/${row.id}`}
                        disablePadding
                        sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                      >
                        <ListItemButton sx={{ width: '100%', display: 'block', px: 1.5, py: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                            <Typography fontWeight={600} variant="body2" noWrap sx={{ flex: '1 1 auto', minWidth: 0 }}>
                              {String(row.nome_colete ?? row.nome_completo ?? '-')}
                            </Typography>
                            <Chip
                              size="small"
                              label={tipo}
                              variant="outlined"
                              color={tipo === 'Full' ? 'success' : tipo === 'PP' ? 'primary' : 'default'}
                              sx={{ height: 18, fontSize: '0.65rem', flexShrink: 0 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', flexShrink: 0 }}>
                              {formatDataNascimento(row.data_nascimento ?? row.DATA_NASCIMENTO)}
                            </Typography>
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={cardGlassSx}>
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <RouteIcon fontSize="small" /> Próximos aniversários
              </Typography>
              {proximosAniversariantes.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Nenhum até o fim do ano.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {proximosAniversariantes.map((m, idx) => {
                    const row = m as Record<string, unknown>;
                    return (
                      <ListItem
                        key={row.id ? String(row.id) : `prox-${idx}`}
                        divider={idx < proximosAniversariantes.length - 1}
                        component={Link}
                        to={`/membros/${row.id}`}
                        disablePadding
                        sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                      >
                        <ListItemButton sx={{ width: '100%', display: 'block', px: 1.5, py: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                            <Typography fontWeight={500} variant="body2" noWrap sx={{ minWidth: 0, flex: 1 }}>
                              {String(row.nome_colete ?? row.nome_completo ?? '-')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                              {formatDataNascimento(row.data_nascimento ?? row.DATA_NASCIMENTO)}
                            </Typography>
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={cardGlassSx}>
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <RouteIcon fontSize="small" /> Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {kmTotal != null && kmTotal > 0 && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Km totais rodados
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="primary">
                      {kmTotal.toLocaleString('pt-BR')} km
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Full Patch
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {pctFull}% dos membros
                  </Typography>
                </Box>
                {viagensRecentes.length > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Últimas 3 viagens (por data)
                    </Typography>
                    {viagensRecentes.slice(0, 3).map((v, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                          flexWrap: 'wrap',
                          py: 0.25,
                          borderBottom: i < Math.min(3, viagensRecentes.length) - 1 ? '1px solid' : 0,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {String(v?.nome_apelido ?? v?.descricao_trajeto ?? '-')}
                        </Typography>
                        {v?.data_partida != null && (
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(String(v.data_partida)), 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Acesso rápido membros */}
      <Card sx={(theme) => ({ mt: 3, ...cardGlassSx(theme) })}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Typography variant="h6" color="primary">
              Acesso rápido aos membros
            </Typography>
            <Chip
              component={Link}
              to="/membros"
              label="Ver todos"
              icon={<ChevronRightIcon />}
              clickable
              color="primary"
              variant="outlined"
              sx={{ textDecoration: 'none' }}
            />
          </Box>
          <List sx={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 0 }}>
            {membrosList.slice(0, 9).map((m) => {
              const row = m as Record<string, unknown>;
              const tipo = tipoMembro(m);
              return (
                <ListItem key={String(row.id)} disablePadding>
                  <ListItemButton
                    component={Link}
                    to={`/membros/${row.id}`}
                    sx={{ borderRadius: 1, py: 0.75 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                        {String(row.nome_colete ?? row.nome_completo ?? '-')}
                      </Typography>
                      <Chip
                        size="small"
                        label={tipo}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', flexShrink: 0 }}
                      />
                      <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
