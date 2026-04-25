export type Role = 'ADMIN' | 'OPERATOR' | 'MANAGER' | 'VENDOR' | 'TRANSPORT';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

export function hasRole(userRole: Role | undefined | null, allowedRoles: Role[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function isActive(userStatus: UserStatus | undefined | null): boolean {
  return userStatus === 'ACTIVE';
}

export function isAdmin(userRole: Role | undefined | null): boolean {
  return userRole === 'ADMIN';
}

export function isManager(userRole: Role | undefined | null): boolean {
  return userRole === 'MANAGER';
}

export function isOperator(userRole: Role | undefined | null): boolean {
  return userRole === 'OPERATOR';
}

export const ROLES = {
  ADMIN: 'ADMIN' as const,
  OPERATOR: 'OPERATOR' as const,
  MANAGER: 'MANAGER' as const,
} as const;

export const USER_STATUS = {
  PENDING: 'PENDING' as const,
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
} as const;

