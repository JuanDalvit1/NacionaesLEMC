import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTabelasHeader } from '../contexts/TabelasHeaderContext';
import { fetchMemberRows, filterMembrosAtivosComNomeValido } from '../lib/membros-data';
import { tipoMembro } from '../lib/membro-stats';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
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

function MembroCard({ m }: { m: Record<string, unknown> }) {
  const tipo = tipoMembro(m);
  const nome = String(m.nome_colete ?? m.nome_completo ?? m.NOME_COLETE ?? m.NOME_COMPLETO ?? '-');
  const graduacao = String(m.graduacao ?? m.GRADUACAO ?? '-');
  const dataAdmissao = fmtData(m.data_admissao ?? m.DATA_ADMISSAO);
  const tsFrh = String(m.ts_frh ?? m.TS_FRH ?? '-');

  return (
    <Card
      component={Link}
      to={`/membros/${m.id}`}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
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
          <Typography variant="subtitle1" fontWeight={700} component="span" sx={{ flex: 1, lineHeight: 1.3 }}>
            {nome}
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            Entrada: {dataAdmissao}
          </Typography>
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

  const membrosPorTipo = useMemo(() => {
    const map: Record<TipoOrdem, Record<string, unknown>[]> = {
      Full: [],
      '14': [],
      PP: [],
    };
    for (const m of membrosList) {
      const tipo = tipoMembro(m);
      map[tipo].push(m);
    }
    return map;
  }, [membrosList]);

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
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
              {membros.map((m) => (
                <Grid key={String(m.id)} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <MembroCard m={m as Record<string, unknown>} />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}
