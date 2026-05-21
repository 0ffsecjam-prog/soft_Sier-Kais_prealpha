export function formatCents(cents: number, currency: string = 'ARS'): string {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function parseCents(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100);
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

export function bpToPercent(bp: number): number {
  return bp / 100;
}

export function percentToBp(pct: number): number {
  return Math.round(pct * 100);
}
