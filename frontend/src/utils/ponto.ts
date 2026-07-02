import { Ponto, PontoType } from '../types';

export const PONTO_SEQUENCE: PontoType[] = ['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'];

export function getNextPonto(pontos: Ponto[]): PontoType | null {
  const types = pontos.map(p => p.type);
  if (types.includes('SAIDA')) return null;
  if (!types.includes('ENTRADA')) return 'ENTRADA';
  if (!types.includes('SAIDA_ALMOCO')) return 'SAIDA_ALMOCO';
  if (!types.includes('RETORNO_ALMOCO')) return 'RETORNO_ALMOCO';
  return 'SAIDA';
}
