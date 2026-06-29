const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string' || !DATE_ONLY_REGEX.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayDateOnly(): Date {
  const now = new Date();
  const isoLocalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return new Date(`${isoLocalDate}T00:00:00.000Z`);
}
