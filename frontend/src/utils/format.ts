export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
