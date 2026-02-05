/**
 * Contadores de membros (Full, PP, 14, Total).
 * Lógica simples: se tem valor lançado = passou dessa etapa.
 */

function hasVal(v: unknown): boolean {
  return v != null && String(v).trim() !== '';
}

function getVal(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  const lowerKeys = Object.keys(obj).map((x) => x.toLowerCase());
  for (const k of keys) {
    const kl = k.toLowerCase();
    const idx = lowerKeys.findIndex((lk) => lk === kl || lk.replace(/_/g, '') === kl.replace(/_/g, ''));
    if (idx >= 0) return obj[Object.keys(obj)[idx]];
  }
  return undefined;
}

export interface ContadoresMembros {
  full: number;
  pp: number;
  membros14: number;
  totais: number;
}

export function contarMembros(membros: Record<string, unknown>[]): ContadoresMembros {
  let full = 0;
  let pp = 0;
  let membros14 = 0;

  for (const m of membros) {
    const dfp = getVal(m, 'data_full_patch', 'DATA_FULL_PATCH');
    const dpp = getVal(m, 'data_pp', 'DATA_PP');
    if (hasVal(dfp)) full++;
    else if (hasVal(dpp)) pp++;
    else membros14++;
  }

  return {
    full,
    pp,
    membros14,
    totais: full + pp + membros14,
  };
}

/** Retorna '14', 'PP' ou 'Full' conforme data_pp / data_full_patch. */
export function tipoMembro(m: Record<string, unknown>): '14' | 'PP' | 'Full' {
  const dfp = getVal(m, 'data_full_patch', 'DATA_FULL_PATCH');
  const dpp = getVal(m, 'data_pp', 'DATA_PP');
  if (hasVal(dfp)) return 'Full';
  if (hasVal(dpp)) return 'PP';
  return '14';
}
