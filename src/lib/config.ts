import { prisma } from './db';

// Defaults: si no existe en ConfigSetting, se usa el valor de aquí.
export const CONFIG_DEFAULTS = {
  default_recording_price_cents: '350000',
  default_download_fee_cents: '80000',
  default_revenue_share_pct_bp: '7000',
  token_max_uses_default: '20',
  max_upload_size_mb: '500',
  log_retention_days: '90',
  app_currency: 'ARS',
  emulated_db_ip: '127.0.0.1',
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;

const CACHE_TTL_MS = 30_000;
let cache: { value: Record<string, string>; expiresAt: number } | null = null;

async function loadAll(): Promise<Record<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const rows = await prisma.configSetting.findMany();
  const map: Record<string, string> = { ...CONFIG_DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  cache = { value: map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

export function invalidateConfigCache() {
  cache = null;
}

export async function getConfig(key: ConfigKey): Promise<string> {
  const map = await loadAll();
  return map[key] ?? CONFIG_DEFAULTS[key];
}

export async function getConfigInt(key: ConfigKey): Promise<number> {
  const v = await getConfig(key);
  const n = Number(v);
  return Number.isFinite(n) ? n : Number(CONFIG_DEFAULTS[key]);
}

export async function setConfig(key: string, value: string, description?: string) {
  await prisma.configSetting.upsert({
    where: { key },
    create: { key, value, description: description ?? null },
    update: { value, description: description ?? undefined },
  });
  invalidateConfigCache();
}

export async function getAllConfig(): Promise<Array<{ key: string; value: string; isDefault: boolean; description?: string | null }>> {
  const rows = await prisma.configSetting.findMany();
  const stored = new Map(rows.map((r) => [r.key, r] as const));
  const keys = new Set<string>([...Object.keys(CONFIG_DEFAULTS), ...stored.keys()]);

  return Array.from(keys).map((key) => {
    const row = stored.get(key);
    return {
      key,
      value: row?.value ?? (CONFIG_DEFAULTS as Record<string, string>)[key],
      isDefault: !row,
      description: row?.description ?? null,
    };
  });
}
