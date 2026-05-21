export const ROLES = {
  ADMIN: 'ADMIN',
  CANCHA: 'CANCHA',
  CLIENTE: 'CLIENTE',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(value: unknown): value is Role {
  return value === ROLES.ADMIN || value === ROLES.CANCHA || value === ROLES.CLIENTE;
}

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  CANCHA: '/cancha/dashboard',
  CLIENTE: '/cliente/dashboard',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  CANCHA: 'Cancha',
  CLIENTE: 'Cliente',
};
