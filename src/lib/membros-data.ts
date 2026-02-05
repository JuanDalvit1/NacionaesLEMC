import { supabase } from './supabase';

/** Nomes que devem ser excluídos das listas (ex.: linha de cálculo / zona). */
const NOMES_EXCLUIDOS = ['próspero', 'prospero'];

/** Valores que não são um nome válido: vazio, só traço, n/a, só número, etc. */
const NAO_E_NOME = /^(|\s*[-–—.\s]*\s*|n\/?a|n\/d|nil|null|\?|\*+)$/i;
const SO_NUMERO = /^\d+$/;

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

/** True apenas se a situação for explicitamente ATIVO (case-insensitive). */
export function isMembroAtivo(row: Record<string, unknown>): boolean {
  const s = String(row.situacao ?? row.SITUACAO ?? '').trim().toLowerCase();
  return s.includes('ativo');
}

/** True se o membro tem nome válido no lançamento (nome_colete ou nome_completo) e não está na lista de exclusão. */
export function rowHasNomeValido(row: Record<string, unknown>): boolean {
  const colete = String(row.nome_colete ?? row.NOME_COLETE ?? '').trim();
  const completo = String(row.nome_completo ?? row.NOME_COMPLETO ?? '').trim();
  const display = colete || completo;
  if (looksLikeNonName(display)) return false;
  const lower = display.toLowerCase();
  if (NOMES_EXCLUIDOS.some((n) => lower === n)) return false;
  return true;
}

/**
 * Filtra a lista para apenas membros ATIVOS, com nome válido (exclui "14", vazios, PRÓSPERO, etc.).
 * Use nas telas Membros e Aniversariantes.
 */
export function filterMembrosAtivosComNomeValido(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.filter((r) => isMembroAtivo(r) && rowHasNomeValido(r));
}

/**
 * Verifica se um row parece ser de membros (tem campos típicos).
 */
function rowLooksLikeMembro(row: Record<string, unknown>): boolean {
  const hasNome = row?.nome_colete != null || row?.NOME_COLETE != null || row?.nome_completo != null || row?.NOME_COMPLETO != null;
  const hasNascimento = row?.data_nascimento != null || row?.DATA_NASCIMENTO != null;
  const hasSituacao = row?.situacao != null || row?.SITUACAO != null;
  return !!(hasNome && (hasNascimento || hasSituacao));
}

/**
 * Busca lista de membros: primeiro tenta nc_membros; se vazia, usa nc_data_dynamic
 * da primeira fonte ativa cujos rows tenham formato de membros (nome_colete, data_nascimento, etc.).
 * Assim funciona tanto com sync para nc_membros quanto com dados apenas em nc_data_dynamic.
 */
export async function fetchMemberRows(): Promise<Record<string, unknown>[]> {
  const { data: fromMembros, error: errMembros } = await supabase
    .from('nc_membros')
    .select('*')
    .order('nome_colete');

  if (errMembros) throw errMembros;
  if (fromMembros != null && fromMembros.length > 0) {
    return fromMembros as Record<string, unknown>[];
  }

  const { data: sources, error: errSources } = await supabase
    .from('nc_sources')
    .select('id, nome')
    .eq('active', true);

  if (errSources || !sources?.length) return [];

  for (const source of sources as { id: string; nome: string }[]) {
    const { data: dynamicRows, error: errDyn } = await supabase
      .from('nc_data_dynamic')
      .select('row_data')
      .eq('source_id', source.id);

    if (errDyn || !dynamicRows?.length) continue;

    const rows = (dynamicRows as { row_data: Record<string, unknown> }[])
      .map((r) => r.row_data)
      .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object');

    const first = rows[0];
    if (first && rowLooksLikeMembro(first)) {
      return rows;
    }
  }

  return [];
}
