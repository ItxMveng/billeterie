/**
 * RBAC — matrice de permissions centralisée (côté client).
 *
 * ⚠️ Ce module contrôle l'AFFICHAGE et la navigation. Il ne constitue PAS la
 * sécurité réelle : l'autorisation est aussi appliquée côté base via la RLS et
 * la fonction SQL `has_role()` (voir SECURITY.md). Cacher un bouton n'est
 * jamais suffisant.
 */

import { Role } from '@/types/enums';

export type Permission =
  | 'dashboard:access'
  | 'participants:read'
  | 'participants:write'
  | 'schools:read'
  | 'schools:write'
  | 'events:read'
  | 'events:write'
  | 'payments:read'
  | 'payments:write'
  | 'tickets:read'
  | 'tickets:write'
  | 'checkin:operate'
  | 'admins:manage'
  | 'settings:manage'
  | 'audit:read'
  | 'exports:read';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:access',
  'participants:read',
  'participants:write',
  'schools:read',
  'schools:write',
  'events:read',
  'events:write',
  'payments:read',
  'payments:write',
  'tickets:read',
  'tickets:write',
  'checkin:operate',
  'admins:manage',
  'settings:manage',
  'audit:read',
  'exports:read',
];

/** Permissions accordées par rôle. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [...ALL_PERMISSIONS],
  [Role.ADMIN]: [
    'dashboard:access',
    'participants:read',
    'participants:write',
    'schools:read',
    'schools:write',
    'events:read',
    'events:write',
    'payments:read',
    'tickets:read',
    'tickets:write',
    'checkin:operate',
    'settings:manage',
    'audit:read',
    'exports:read',
  ],
  [Role.FINANCE]: [
    'dashboard:access',
    'participants:read',
    'payments:read',
    'payments:write',
    'exports:read',
  ],
  [Role.CHECKIN]: [
    'dashboard:access',
    'participants:read',
    'tickets:read',
    'checkin:operate',
  ],
  [Role.VIEWER]: [
    'dashboard:access',
    'participants:read',
    'schools:read',
    'events:read',
    'payments:read',
    'tickets:read',
  ],
};

/** L'ensemble de rôles accorde-t-il la permission demandée ? */
export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

/** Union des permissions d'un ensemble de rôles. */
export function permissionsForRoles(roles: Role[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const perm of ROLE_PERMISSIONS[role] ?? []) set.add(perm);
  }
  return set;
}
