import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTabelasHeader } from '../contexts/TabelasHeaderContext';
import { format, parseISO, isBefore, isAfter, endOfYear, isValid } from 'date-fns';
import { fetchMemberRows, filterMembrosAtivosComNomeValido } from '../lib/membros-data';
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
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CakeIcon from '@mui/icons-material/Cake';
import { tipoMembro } from '../lib/membro-stats';

const MESES: { value: number; label: string }[] = [
  { value: 0, label: 'Janeiro' },
  { value: 1, label: 'Fevereiro' },
  { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Maio' },
  { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' },
  { value: 10, label: 'Novembro' },
  { value: 11, label: 'Dezembro' },
];

/** Formata data de nascimento para exibição; retorna '-' se inválida (ex.: mascarada "*******"). */
function formatDataNascimento(raw: unknown): string {
  if (raw == null || String(raw).trim() === '') return '-';
  try {
    const d = parseISO(String(raw));
    if (!isValid(d)) return '-';
    return format(d, "d 'de' MMMM", { locale: ptBR });
  } catch {
    return '-';
  }
}

export default function Aniversariantes() {
  const { setHeader } = useTabelasHeader();

  useEffect(() => {
    setHeader({
      title: 'Aniversariantes',
      subtitle: 'Apenas membros ativos. Ordem até o fim do ano atual.',
      indicadores: null,
    });
    return () => setHeader(null);
  }, [setHeader]);

  // Mesma query e cache da página Membros (fonte: nc_membros ou nc_data_dynamic)
  const { data: membrosRaw = [], isLoading } = useQuery({
    queryKey: ['NC_membros'],
    queryFn: async () => {
      const data = await fetchMemberRows();
      return data;
    },
  });

  const ativosComNomeValido = useMemo(
    () => filterMembrosAtivosComNomeValido(membrosRaw as Record<string, unknown>[]),
    [membrosRaw]
  );

  const membros = useMemo(() => {
    return ativosComNomeValido
      .filter((m) => m.data_nascimento != null || (m as Record<string, unknown>).DATA_NASCIMENTO != null)
      .map((m) => ({
        ...m,
        data_nascimento: m.data_nascimento ?? (m as Record<string, unknown>).DATA_NASCIMENTO,
      }));
  }, [ativosComNomeValido]);

  const ativos = membros;

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const fimDoAno = endOfYear(hoje);

  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);

  const aniversariantesMes = useMemo(() => {
    return ativos
      .filter((m) => {
        try {
          const raw = m.data_nascimento;
          if (raw == null) return false;
          const d = parseISO(String(raw));
          return d.getMonth() === mesSelecionado;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const da = parseISO(String(a.data_nascimento)).getDate();
        const db = parseISO(String(b.data_nascimento)).getDate();
        return da - db;
      });
  }, [ativos, mesSelecionado]);

  const proximos = useMemo(() => {
    return ativos
      .filter((m) => {
        try {
          const d = m.data_nascimento ? parseISO(String(m.data_nascimento)) : null;
          if (!d) return false;
          const dataAnivEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
          if (isBefore(dataAnivEsteAno, hoje)) return false;
          if (isAfter(dataAnivEsteAno, fimDoAno)) return false;
          return true;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const da = parseISO(String(a.data_nascimento));
        const db = parseISO(String(b.data_nascimento));
        const aNext = new Date(hoje.getFullYear(), da.getMonth(), da.getDate());
        const bNext = new Date(hoje.getFullYear(), db.getMonth(), db.getDate());
        return aNext.getTime() - bNext.getTime();
      });
  }, [ativos, hoje, fimDoAno]);

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );

  const nomeMesSelecionado = MESES[mesSelecionado]?.label ?? format(hoje, 'MMMM', { locale: ptBR });

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Aniversariantes do mês — linha inteira */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CakeIcon /> Aniversariantes do mês
                </Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="aniv-mes-label">Mês</InputLabel>
                  <Select
                    labelId="aniv-mes-label"
                    value={mesSelecionado}
                    label="Mês"
                    onChange={(e) => setMesSelecionado(Number(e.target.value))}
                  >
                    {MESES.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  ({nomeMesSelecionado})
                </Typography>
              </Box>
              {aniversariantesMes.length === 0 ? (
                <Typography color="text.secondary">Nenhum aniversariante neste mês.</Typography>
              ) : (
                <Grid container spacing={1}>
                  {aniversariantesMes.map((m, idx) => {
                    const tipo = tipoMembro(m);
                    const row = m as Record<string, unknown>;
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={row.id != null ? String(row.id) : `mes-${idx}-${row.nome_colete ?? row.nome_completo}`}>
                        <Card variant="outlined" sx={{ borderColor: 'primary.main' }}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                              <Typography fontWeight={600} component="span">
                                {String(row.nome_colete ?? row.nome_completo ?? '-')}
                              </Typography>
                              <Chip
                                size="small"
                                label={tipo}
                                variant="outlined"
                                color={tipo === 'Full' ? 'success' : tipo === 'PP' ? 'primary' : 'default'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {formatDataNascimento(m.data_nascimento)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Próximos aniversariantes — linha inteira, abaixo */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Próximos aniversariantes (até dezembro)
              </Typography>
              {proximos.length === 0 ? (
                <Typography color="text.secondary">Nenhum próximo aniversário até o fim do ano.</Typography>
              ) : (
                <List dense disablePadding>
                  {proximos.map((m, idx) => {
                    const row = m as Record<string, unknown>;
                    return (
                      <ListItem key={row.id != null ? String(row.id) : `prox-${idx}-${row.nome_colete ?? row.nome_completo}`} divider>
                        <ListItemText
                          primary={String(row.nome_colete ?? row.nome_completo ?? '-')}
                          secondary={formatDataNascimento(row.data_nascimento)}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
