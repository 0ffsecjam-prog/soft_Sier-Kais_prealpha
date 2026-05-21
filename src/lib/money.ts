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

// Cap MVP: $1.000.000 ARS. Cabe holgado en Int32 (máx ~2.147B). Para precios
// más altos habría que migrar la columna a BigInt en Prisma.
export const MAX_PRICE_CENTS = 100_000_000;
export const MAX_PRICE_ARS = MAX_PRICE_CENTS / 100;

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
