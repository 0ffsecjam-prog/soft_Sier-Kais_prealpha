export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sun: 'Domingo',
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
};

export interface DaySchedule {
  open: number;   // 0-23
  close: number;  // 1-24
  isOpen: boolean;
}

export type WeeklySchedule = Record<WeekdayKey, DaySchedule>;

export const COURT_STATUS = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;
export type CourtStatus = (typeof COURT_STATUS)[keyof typeof COURT_STATUS];

export const COURT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Disponible',
  MAINTENANCE: 'Servicio técnico',
  UNAVAILABLE: 'No disponible',
};

export function defaultSchedule(openingHour: number, closingHour: number): WeeklySchedule {
  const base: DaySchedule = { open: openingHour, close: closingHour, isOpen: true };
  return {
    sun: { ...base }, mon: { ...base }, tue: { ...base }, wed: { ...base },
    thu: { ...base }, fri: { ...base }, sat: { ...base },
  };
}

export function parseSchedule(json: string | null, fallback: WeeklySchedule): WeeklySchedule {
  if (!json) return fallback;
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return fallback; }
  if (!parsed || typeof parsed !== 'object') return fallback;
  const obj = parsed as Record<string, unknown>;
  const out: WeeklySchedule = { ...fallback };
  for (const key of WEEKDAY_KEYS) {
    const day = obj[key] as Record<string, unknown> | undefined;
    if (
      day && typeof day === 'object' &&
      typeof day.open === 'number' && typeof day.close === 'number' &&
      typeof day.isOpen === 'boolean'
    ) {
      out[key] = {
        open: clampHour(day.open, 0, 23),
        close: clampHour(day.close, 1, 24),
        isOpen: day.isOpen,
      };
    }
  }
  return out;
}

export function serializeSchedule(s: WeeklySchedule): string {
  return JSON.stringify(s);
}

export function dayScheduleFor(schedule: WeeklySchedule, date: Date): DaySchedule {
  return schedule[WEEKDAY_KEYS[date.getDay()]];
}

function clampHour(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function isValidSchedule(s: WeeklySchedule): boolean {
  return WEEKDAY_KEYS.every((k) => {
    const d = s[k];
    return d.open >= 0 && d.open <= 23 && d.close >= 1 && d.close <= 24 && d.close > d.open;
  });
}
