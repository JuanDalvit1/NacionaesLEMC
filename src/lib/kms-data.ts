import { supabase } from './supabase';

/** Normaliza nome para comparação (trim, lowercase). */
function normalizarNome(s: string): string {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Verifica se o nome da planilha bate com o nome do membro (um contém o outro). */
function nomeBate(nomeMembro: string, nomePlanilha: string): boolean {
  const a = normalizarNome(nomeMembro);
  const b = normalizarNome(nomePlanilha);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/**
 * Retorna o source_id da primeira fonte ativa cujo nome indica planilha de KM.
 */
export async function getKmPlanilhaSourceId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('nc_sources')
    .select('id')
    .eq('active', true)
    .or('nome.ilike.%km%,nome.ilike.%controle de km%')
    .order('nome')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export interface LancamentoKm {
  km: number;
  descricao?: string;
  data_partida?: string;
  data_chegada?: string;
}

/**
 * Busca na planilha de KM (nc_data_dynamic) os lançamentos do membro (nome como referência)
 * e retorna a lista de valores (km) com descrição e datas, ordenados por data.
 */
export async function listarLancamentosKmPorNome(nomeMembro: string): Promise<LancamentoKm[]> {
  const nome = String(nomeMembro ?? '').trim();
  if (!nome) return [];

  const sourceId = await getKmPlanilhaSourceId();
  if (!sourceId) return [];

  const { data: rows, error } = await supabase
    .from('nc_data_dynamic')
    .select('row_data')
    .eq('source_id', sourceId);
  if (error) throw error;
  if (!rows?.length) return [];

  const lancamentos: LancamentoKm[] = [];
  for (const row of rows as { row_data: Record<string, unknown> }[]) {
    const rd = row?.row_data ?? {};
    const nomePlanilha =
      (rd['nome/apelido'] as string) ?? (rd['nome_apelido'] as string) ?? '';
    if (!nomeBate(nome, nomePlanilha)) continue;
    const km = Number(rd['km_a_ser_considerado'] ?? rd['km_considerado'] ?? 0);
    if (Number.isNaN(km)) continue;
    lancamentos.push({
      km: Math.round(km * 1000) / 1000,
      descricao: String(rd['descrição_do_trajeto'] ?? rd['descricao_trajeto'] ?? '').trim() || undefined,
      data_partida: rd['data_partida'] != null ? String(rd['data_partida']) : undefined,
      data_chegada: rd['data_chegada'] != null ? String(rd['data_chegada']) : undefined,
    });
  }
  lancamentos.sort((a, b) => {
    const da = a.data_partida ?? '';
    const db = b.data_partida ?? '';
    return da.localeCompare(db);
  });
  return lancamentos;
}

/**
 * Soma dos km da planilha por nome (usa listarLancamentosKmPorNome e soma).
 */
export async function somarKmPlanilhaPorNome(nomeMembro: string): Promise<number> {
  const lancamentos = await listarLancamentosKmPorNome(nomeMembro);
  const total = lancamentos.reduce((s, l) => s + l.km, 0);
  return Math.round(total * 1000) / 1000;
}
