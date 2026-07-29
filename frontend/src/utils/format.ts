export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Máscara de preço em centavos: o valor guardado é só os dígitos digitados
// (ex: "1695"), o display converte pra "R$ 16,95" a cada tecla.
export function centsInputToDisplay(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (!clean) return '';
  return formatCurrency(Number(clean) / 100);
}

export function centsInputToNumber(digits: string): number {
  const clean = digits.replace(/\D/g, '');
  return clean ? Number(clean) / 100 : 0;
}
