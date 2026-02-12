/** Faixas de KM para Evolução: ícone + nome. Ordem do maior para o menor para pegar a primeira que bater. */
export const EVOLUCAO_FAIXAS: {
  minKm: number;
  maxKm: number;
  nome: string;
  tipo: 'mira' | 'estrelas';
  estrelas?: number;
}[] = [
  { minKm: 67500, maxKm: Infinity, nome: 'BRASIL', tipo: 'estrelas', estrelas: 5 },
  { minKm: 37500, maxKm: 67499, nome: 'SUL', tipo: 'estrelas', estrelas: 4 },
  { minKm: 15000, maxKm: 37499, nome: 'NORDESTE', tipo: 'estrelas', estrelas: 3 },
  { minKm: 7500, maxKm: 14999, nome: 'SUDESTE', tipo: 'estrelas', estrelas: 2 },
  { minKm: 2500, maxKm: 7499, nome: 'NORTE', tipo: 'estrelas', estrelas: 1 },
  { minKm: 500, maxKm: 2499, nome: 'CENTRO-OESTE', tipo: 'mira' },
];

export type FaixaEvolucao = (typeof EVOLUCAO_FAIXAS)[number];

export function evolucaoPorKm(kmTotal: number): FaixaEvolucao | null {
  const faixa = EVOLUCAO_FAIXAS.find((f) => kmTotal >= f.minKm && kmTotal <= f.maxKm);
  return faixa ?? null;
}

/** Retorna quantos km faltam para a próxima evolução, ou null se já está no máximo (BRASIL). */
export function kmParaProximaEvolucao(kmTotal: number): number | null {
  const idx = EVOLUCAO_FAIXAS.findIndex((f) => kmTotal >= f.minKm && kmTotal <= f.maxKm);
  if (idx <= 0) return null;
  const proxima = EVOLUCAO_FAIXAS[idx - 1];
  const faltam = proxima.minKm - kmTotal;
  return faltam > 0 ? faltam : null;
}
