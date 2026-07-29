import { Ponto, PontoType } from '../types';

export const PONTO_SEQUENCE: PontoType[] = ['SAIDA_ALMOCO', 'RETORNO_ALMOCO'];

// Almoço é global por dia, independente de qual visita está ativa.
export function getNextPonto(pontos: Ponto[]): PontoType | null {
  const types = pontos.map(p => p.type);
  if (types.includes('RETORNO_ALMOCO')) return null;
  if (!types.includes('SAIDA_ALMOCO')) return 'SAIDA_ALMOCO';
  return 'RETORNO_ALMOCO';
}
