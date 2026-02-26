import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTabelasHeader } from '../contexts/TabelasHeaderContext';
import { fetchMemberRows, filterMembrosAtivosComNomeValido } from '../lib/membros-data';
import { tipoMembro } from '../lib/membro-stats';
import { getKmTotaisPorNomes } from '../lib/kms-data';
import { evolucaoPorKm } from '../lib/evolucao';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GroupsIcon from '@mui/icons-material/Groups';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

type TipoOrdem = 'Full' | '14' | 'PP';
const ORDEM_PIRAMIDE: TipoOrdem[] = ['Full', 'PP', '14'];
const LABELS: Record<TipoOrdem, string> = {
  Full: 'Membros Fechados',
  '14': '14',
  PP: 'PP',
};
const ICONS: Record<TipoOrdem, React.ReactNode> = {
  Full: <MilitaryTechIcon fontSize="small" />,
  '14': <GroupsIcon fontSize="small" />,
  PP: <TrendingUpIcon fontSize="small" />,
};
const CORES_CHIP: Record<TipoOrdem, 'success' | 'default' | 'primary'> = {
  Full: 'success',
  '14': 'default',
  PP: 'primary',
};

function fmtData(v: unknown): string {
  if (v == null) return '-';
  const s = String(v).trim();
  if (!s) return '-';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toLocaleDateString('pt-BR');
  return s;
}

const LINHAS_DATA = [
  { label: 'Data de 14', key: 'data_admissao', alt: 'DATA_ADMISSAO' },
  { label: 'Data de PP', key: 'data_pp', alt: 'DATA_PP' },
  { label: 'Data de Full', key: 'data_full_patch', alt: 'DATA_FULL_PATCH' },
] as const;

function MembroCard({
  m,
  evolucaoNome,
}: {
  m: Record<string, unknown>;
  evolucaoNome?: string | null;
}) {
  const tipo = tipoMembro(m);
  const nome = String(m.nome_colete ?? m.nome_completo ?? m.NOME_COLETE ?? m.NOME_COMPLETO ?? '-');
  const graduacao = String(m.graduacao ?? m.GRADUACAO ?? '-');
  const tsFrh = String(m.ts_frh ?? m.TS_FRH ?? '-');

  return (
    <Card
      component={Link}
      to={`/membros/${m.id}`}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        transition: (theme) =>
          theme.transitions.create(['box-shadow', 'transform'], {
            duration: theme.transitions.duration.short,
          }),
        '&:hover': {
          boxShadow: (theme) =>
            theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} component="span" sx={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
            {nome}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {evolucaoNome && (
              <Chip
                size="small"
                label={evolucaoNome}
                variant="outlined"
                sx={{ height: 22, fontSize: '0.7rem', borderColor: 'primary.main', color: 'primary.main' }}
              />
            )}
            <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          <Chip
            size="small"
            label={tipo}
            color={CORES_CHIP[tipo]}
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
          {graduacao !== '-' && (
            <Chip size="small" label={graduacao} variant="filled" sx={{ height: 22, fontSize: '0.7rem' }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 'auto', minHeight: 52 }}>
          {LINHAS_DATA.map(({ label, key, alt }) => (
            <Typography key={key} variant="caption" color="text.secondary">
              {label}: {fmtData((m[key] ?? m[alt]) as unknown)}
            </Typography>
          ))}
          {tsFrh !== '-' && (
            <Typography variant="caption" color="text.secondary">
              Tipo sang.: {tsFrh}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Membros() {
  const { setHeader } = useTabelasHeader();

  useEffect(() => {
    setHeader({ title: 'Membros', indicadores: null });
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

  const nomesMembros = useMemo(
    () =>
      membrosList.map((m) =>
        String(m.nome_colete ?? m.nome_completo ?? m.NOME_COLETE ?? m.NOME_COMPLETO ?? '').trim()
      ).filter(Boolean),
    [membrosList]
  );

  const { data: kmTotaisPorNome = {} } = useQuery({
    queryKey: ['NC_kms_totais_membros', nomesMembros.join('|')],
    queryFn: () => getKmTotaisPorNomes(nomesMembros),
    enabled: nomesMembros.length > 0,
  });

  const evolucaoPorNome = useMemo(() => {
    const map: Record<string, string> = {};
    for (const nome of nomesMembros) {
      const total = kmTotaisPorNome[nome] ?? 0;
      const evo = evolucaoPorKm(total);
      if (evo?.nome) map[nome] = evo.nome;
    }
    return map;
  }, [nomesMembros, kmTotaisPorNome]);

  const [busca, setBusca] = useState('');

  const membrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return membrosList;
    return membrosList.filter((m) => {
      const nome = String(
        m.nome_colete ?? m.nome_completo ?? m.NOME_COLETE ?? m.NOME_COMPLETO ?? ''
      ).trim().toLowerCase();
      const graduacao = String(m.graduacao ?? m.GRADUACAO ?? '').toLowerCase();
      const evo = (evolucaoPorNome[nome] ?? '').toLowerCase();
      return (
        nome.includes(termo) ||
        graduacao.includes(termo) ||
        evo.includes(termo)
      );
    });
  }, [membrosList, busca, evolucaoPorNome]);

  const membrosPorTipo = useMemo(() => {
    const map: Record<TipoOrdem, Record<string, unknown>[]> = {
      Full: [],
      '14': [],
      PP: [],
    };
    for (const m of membrosFiltrados) {
      const tipo = tipoMembro(m);
      map[tipo].push(m);
    }
    return map;
  }, [membrosFiltrados]);

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por nome, graduação ou evolução..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          },
        }}
      />
      {ORDEM_PIRAMIDE.map((tipo) => {
        const membros = membrosPorTipo[tipo];
        if (membros.length === 0) return null;

        return (
          <Box key={tipo} sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              {ICONS[tipo]}
              <Typography variant="h6" color="primary" component="span">
                {LABELS[tipo]}
              </Typography>
              <Chip
                size="small"
                label={membros.length}
                color={CORES_CHIP[tipo]}
                sx={{ ml: 0.5, height: 22 }}
              />
            </Box>
            <Grid container spacing={2}>
              {membros.map((m) => {
                const nome = String(m.nome_colete ?? m.nome_completo ?? m.NOME_COLETE ?? m.NOME_COMPLETO ?? '').trim();
                return (
                  <Grid key={String(m.id)} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <MembroCard
                      m={m as Record<string, unknown>}
                      evolucaoNome={nome ? evolucaoPorNome[nome] ?? null : null}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}
