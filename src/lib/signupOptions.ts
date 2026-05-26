export const COURT_TYPES = [
  'Fútbol 5',
  'Fútbol 7',
  'Fútbol 8',
  'Fútbol 11',
  'Pádel',
  'Tenis',
  'Básquet',
  'Vóley',
  'Hockey',
  'Otro',
] as const;

export const SURFACE_OPTIONS = [
  { value: 'INDOOR', label: 'Techadas' },
  { value: 'OUTDOOR', label: 'Aire libre' },
  { value: 'MIXED', label: 'Mixtas' },
] as const;

export const MATCHES_PER_WEEK_OPTIONS = [
  'Menos de 10',
  '10 a 30',
  '30 a 60',
  'Más de 60',
] as const;

export const HAS_CAMERAS_OPTIONS = [
  { value: 'ALL', label: 'Sí, en todas las canchas' },
  { value: 'SOME', label: 'En algunas' },
  { value: 'NONE', label: 'No tengo' },
] as const;

export const HAS_INTERNET_OPTIONS = [
  { value: 'YES', label: 'Sí, estable' },
  { value: 'PARTIAL', label: 'Parcial / inestable' },
  { value: 'NO', label: 'No' },
] as const;

export const SIGNUP_STATUS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  CONVERTED: 'CONVERTED',
  REJECTED: 'REJECTED',
} as const;

export const SIGNUP_STATUS_LABEL: Record<string, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  CONVERTED: 'Convertido',
  REJECTED: 'Rechazado',
};

export const HAS_CAMERAS_LABEL: Record<string, string> = {
  ALL: 'En todas', SOME: 'En algunas', NONE: 'No tiene',
};
export const HAS_INTERNET_LABEL: Record<string, string> = {
  YES: 'Estable', PARTIAL: 'Parcial', NO: 'No',
};
export const SURFACE_LABEL: Record<string, string> = {
  INDOOR: 'Techadas', OUTDOOR: 'Aire libre', MIXED: 'Mixtas',
};

export function parseCourtTypes(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
