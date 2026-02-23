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
 * Converte valor de km da planilha para inteiro.
 * Regras:
 *   - Se já for number, arredonda para inteiro (negativo só se vier explícito).
 *   - Se for string: remove TODOS os pontos (milhar pt-BR), troca vírgula por ponto.
 *   - Negativo APENAS quando a string começa com '-' (ex.: "-2.404" → -2404).
 *     Qualquer outro valor (ex.: "900", "2.404") é sempre positivo, para não
 *     deduzir lançamentos duplicados por erro de parsing.
 *   - Retorna 0 se inválido.
 */
function parseKmValue(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return Number.isNaN(raw) ? 0 : Math.round(raw);
  const s = String(raw).trim();
  if (!s) return 0;
  const isNegative = s.startsWith('-');
  const sNum = isNegative ? s.slice(1).trim() : s;
  const normalized = sNum.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  const value = Number.isNaN(n) ? 0 : Math.round(n);
  return isNegative ? -value : value;
}

/**
 * Formata km inteiro no padrão pt-BR: "2.404" para positivo, "-2.404" para negativo.
 */
export function formatKm(km: number): string {
  return km.toLocaleString('pt-BR');
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
  /** Valor inteiro em km (positivo = soma, negativo = subtrai). */
  km: number;
  descricao?: string;
  data_partida?: string;
  data_chegada?: string;
}

/**
 * Busca na planilha de KM (nc_data_dynamic) os lançamentos do membro (nome como referência)
 * e retorna a lista de valores (km inteiro) com descrição e datas, ordenados por data.
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
    const rawKm = rd['km_a_ser_considerado'] ?? rd['km_considerado'] ?? 0;
    const km = parseKmValue(rawKm);
    lancamentos.push({
      km,
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
 * Soma dos km da planilha por nome.
 * Positivos somam, negativos subtraem.
 */
export function somarLancamentos(lancamentos: LancamentoKm[]): number {
  return lancamentos.reduce((s, l) => s + l.km, 0);
}

/** Formato de viagem para exibição (ex.: últimas viagens no Dashboard). */
export interface ViagemPlanilha {
  nome_apelido: string;
  descricao_trajeto?: string;
  data_partida?: string;
  km_considerado?: number;
}

/**
 * Retorna as últimas N viagens da planilha de KM, ordenadas por data de partida (mais recente primeiro).
 */
export async function getUltimasViagensPlanilha(limit: number): Promise<ViagemPlanilha[]> {
  const sourceId = await getKmPlanilhaSourceId();
  if (!sourceId) return [];

  const { data: rows, error } = await supabase
    .from('nc_data_dynamic')
    .select('row_data')
    .eq('source_id', sourceId);
  if (error) throw error;
  if (!rows?.length) return [];

  const viagens: ViagemPlanilha[] = (rows as { row_data: Record<string, unknown> }[]).map((row) => {
    const rd = row?.row_data ?? {};
    const rawKm = rd['km_a_ser_considerado'] ?? rd['km_considerado'] ?? 0;
    return {
      nome_apelido: String(rd['nome/apelido'] ?? rd['nome_apelido'] ?? '').trim(),
      descricao_trajeto: String(rd['descrição_do_trajeto'] ?? rd['descricao_trajeto'] ?? '').trim() || undefined,
      data_partida: rd['data_partida'] != null ? String(rd['data_partida']) : undefined,
      km_considerado: parseKmValue(rawKm) || undefined,
    };
  });

  viagens.sort((a, b) => {
    const da = a.data_partida ?? '';
    const db = b.data_partida ?? '';
    return db.localeCompare(da);
  });
  return viagens.slice(0, limit);
}

/**
 * Retorna o total geral de KM: somatório de todos os lançamentos da planilha de KM
 * (cada linha em nc_data_dynamic = um lançamento; soma de todos os km_a_ser_considerado/km_considerado).
 */
export async function getTotalGeralKmPlanilha(): Promise<number> {
  const sourceId = await getKmPlanilhaSourceId();
  if (!sourceId) return 0;

  const { data: rows, error } = await supabase
    .from('nc_data_dynamic')
    .select('row_data')
    .eq('source_id', sourceId);
  if (error) throw error;
  if (!rows?.length) return 0;

  let total = 0;
  for (const row of rows as { row_data: Record<string, unknown> }[]) {
    const rd = row?.row_data ?? {};
    const rawKm = rd['km_a_ser_considerado'] ?? rd['km_considerado'] ?? 0;
    total += parseKmValue(rawKm);
  }
  return total;
}

/**
 * Retorna totais de km por membro (chave = nome do membro).
 * Uma única busca na planilha; cada linha é atribuída ao primeiro nome da lista que bater.
 */
export async function getKmTotaisPorNomes(nomes: string[]): Promise<Record<string, number>> {
  const lista = nomes.map((n) => String(n ?? '').trim()).filter(Boolean);
  if (lista.length === 0) return {};

  const sourceId = await getKmPlanilhaSourceId();
  if (!sourceId) return {};

  const { data: rows, error } = await supabase
    .from('nc_data_dynamic')
    .select('row_data')
    .eq('source_id', sourceId);
  if (error) throw error;
  if (!rows?.length) return {};

  const totais: Record<string, number> = {};
  for (const nome of lista) totais[nome] = 0;

  for (const row of rows as { row_data: Record<string, unknown> }[]) {
    const rd = row?.row_data ?? {};
    const nomePlanilha =
      (rd['nome/apelido'] as string) ?? (rd['nome_apelido'] as string) ?? '';
    const rawKm = rd['km_a_ser_considerado'] ?? rd['km_considerado'] ?? 0;
    const km = parseKmValue(rawKm);
    const nomeMembro = lista.find((n) => nomeBate(n, nomePlanilha));
    if (nomeMembro != null) totais[nomeMembro] = (totais[nomeMembro] ?? 0) + km;
  }

  return totais;
}
