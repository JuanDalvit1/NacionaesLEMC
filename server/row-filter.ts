/**
 * Filtro de linhas inválidas (sem nome, metadados, situacao inválida, etc.)
 * Mesma lógica do frontend (Tabelas.tsx) para manter consistência.
 * Apenas linhas válidas devem ser persistidas no banco.
 */

const NAO_E_NOME = /^(|\s*[-–—.]+\s*|n\/?a|n\/d|nil|null|\?|\*+)$/i;

const SITUACAO_APENAS_ASTERISCOS = /^\*+$/;

/** Valores permitidos para coluna SITUACAO (Controle de Membros): só estes são persistidos. */
const SITUACAO_PERMITIDA = new Set(['ativo', 'falecido', 'inativo']);

/** Chaves possíveis para coluna SITUACAO (com e sem acento, maiúscula/minúscula). */
const SITUACAO_KEYS = [
  'situacao',
  'SITUACAO',
  'situação',
  'SITUAÇÃO',
  'Situacao',
  'Situação',
];

function getSituacaoValue(row: Record<string, unknown>, colIds: string[]): unknown {
  // Primeiro tenta nos colIds configurados (busca por nome que contenha "situa")
  for (const colId of colIds) {
    const lower = colId.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes('situa')) {
      return row[colId];
    }
  }
  // Fallback: busca pelas chaves padrão
  for (const k of SITUACAO_KEYS) {
    if (k in row) return row[k];
  }
  return undefined;
}

function situacaoPermitida(val: unknown): boolean {
  if (val == null) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (SITUACAO_APENAS_ASTERISCOS.test(s)) return true;
  return SITUACAO_PERMITIDA.has(s.toLowerCase());
}

const NOME_COMPLETO_KEYS = [
  'nome_completo',
  'NOME_COMPLETO',
  'nome completo',
  'Nome Completo',
  'NomeCompleto',
];

function looksLikeNonName(val: unknown): boolean {
  if (val == null) return true;
  const s = String(val).trim();
  if (s.length < 2) return true;
  if (NAO_E_NOME.test(s)) return true;
  if (/^[\s\-\.\*]+$/.test(s)) return true;
  return false;
}

function findNomeCompletoColId(colIds: string[]): string | undefined {
  const lower = (id: string) => id.toLowerCase().replace(/\s/g, '');
  return colIds.find((id) => lower(id) === 'nomecompleto' || lower(id).includes('nomecompleto'));
}

export function rowPassesFilter(
  row: Record<string, unknown>,
  colIds: string[]
): boolean {
  const nomeCompletoColId = findNomeCompletoColId(colIds);

  if (nomeCompletoColId && nomeCompletoColId in row) {
    const val = row[nomeCompletoColId];
    if (looksLikeNonName(val)) return false;
  } else {
    for (const k of NOME_COMPLETO_KEYS) {
      if (k in row) {
        if (looksLikeNonName(row[k])) return false;
        break;
      }
    }
  }

  const nameKeys = [
    'nome',
    'nome_completo',
    'nome_colete',
    'nome_apelido',
    'Nome',
    'Nome Completo',
    'NOME',
    'NOME_COMPLETO',
    'NOME_COLETE',
    'NOME_APELIDO',
  ];
  let v: unknown = undefined;
  for (const k of nameKeys) {
    if (row[k] != null && String(row[k]).trim() !== '') {
      v = row[k];
      break;
    }
  }
  if (v == null) return false;
  if (looksLikeNonName(v)) return false;
  // Removida verificação do firstColId (ex: RG="?" não deve invalidar membro com nome e situação válidos)

  if (!situacaoPermitida(getSituacaoValue(row, colIds))) {
    return false;
  }

  return true;
}

const KMS_NOME_KEYS = [
  'nome',
  'NOME',
  'nome_apelido',
  'NOME_APELIDO',
];

/**
 * Filtro mínimo para tabela nc_kms_totais (Controle de KM's).
 * Aceita linha se tiver nome/nome_apelido válido OU se tiver pelo menos um valor preenchido nas colunas configuradas.
 */
export function rowPassesKmsFilter(
  row: Record<string, unknown>,
  colIds: string[]
): boolean {
  for (const k of KMS_NOME_KEYS) {
    if (row[k] != null && String(row[k]).trim() !== '') {
      const val = String(row[k]).trim();
      if (val.length >= 2 && !NAO_E_NOME.test(val) && !/^[\s\-\.\*]+$/.test(val)) {
        return true;
      }
    }
  }
  // Se não tem nome válido, aceita se tiver qualquer valor preenchido nas colunas da fonte
  for (const colId of colIds) {
    if (row[colId] != null && String(row[colId]).trim() !== '') {
      return true;
    }
  }
  return false;
}
