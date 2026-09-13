import { describe, it, expect } from 'vitest';
import { hasPermission, type Permission } from './rbac';
import { Role } from '@/types/enums';

/**
 * Matrice de permissions exhaustive (Sprint 3 §73).
 * `ANONYMOUS` / `PARTICIPANT` = aucun rôle applicatif → aucune permission.
 *
 * ⚠️ Cette matrice décrit le contrôle CÔTÉ CLIENT. Le contrôle effectif est
 * doublé côté serveur (RLS + gardes `is_admin()`/`is_finance()`/`is_checkin()`
 * dans les RPC). Voir SECURITY.md.
 */

type Actor = 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'CHECKIN' | 'VIEWER' | 'ANONYMOUS';

const ROLES_BY_ACTOR: Record<Actor, Role[]> = {
  SUPER_ADMIN: [Role.SUPER_ADMIN],
  ADMIN: [Role.ADMIN],
  FINANCE: [Role.FINANCE],
  CHECKIN: [Role.CHECKIN],
  VIEWER: [Role.VIEWER],
  ANONYMOUS: [],
};

/** true = autorisé attendu, false = refusé attendu. */
const MATRIX: Array<{ permission: Permission; expected: Record<Actor, boolean> }> = [
  {
    permission: 'participants:read',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: true, CHECKIN: true, VIEWER: true, ANONYMOUS: false },
  },
  {
    permission: 'participants:write',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: false, CHECKIN: false, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'payments:read',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: true, CHECKIN: false, VIEWER: true, ANONYMOUS: false },
  },
  {
    permission: 'payments:write',
    expected: { SUPER_ADMIN: true, ADMIN: false, FINANCE: true, CHECKIN: false, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'tickets:write',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: false, CHECKIN: false, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'checkin:operate',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: false, CHECKIN: true, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'admins:manage',
    expected: { SUPER_ADMIN: true, ADMIN: false, FINANCE: false, CHECKIN: false, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'audit:read',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: false, CHECKIN: false, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'exports:read',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: true, CHECKIN: false, VIEWER: false, ANONYMOUS: false },
  },
  {
    permission: 'dashboard:access',
    expected: { SUPER_ADMIN: true, ADMIN: true, FINANCE: true, CHECKIN: true, VIEWER: true, ANONYMOUS: false },
  },
];

describe('Matrice de permissions (rôles × actions critiques)', () => {
  for (const { permission, expected } of MATRIX) {
    describe(permission, () => {
      for (const actor of Object.keys(expected) as Actor[]) {
        const allowed = expected[actor];
        it(`${actor} → ${allowed ? 'autorisé' : 'refusé'}`, () => {
          expect(hasPermission(ROLES_BY_ACTOR[actor], permission)).toBe(allowed);
        });
      }
    });
  }
});

describe('Non-escalade de privilèges', () => {
  it("un ADMIN ne peut pas gérer les administrateurs (donc pas s'attribuer SUPER_ADMIN)", () => {
    expect(hasPermission([Role.ADMIN], 'admins:manage')).toBe(false);
  });
  it('un FINANCE ne peut pas devenir SUPER_ADMIN ni gérer les rôles', () => {
    expect(hasPermission([Role.FINANCE], 'admins:manage')).toBe(false);
    expect(hasPermission([Role.FINANCE], 'settings:manage')).toBe(false);
  });
  it('un CHECKIN ne peut pas toucher aux paiements', () => {
    expect(hasPermission([Role.CHECKIN], 'payments:read')).toBe(false);
    expect(hasPermission([Role.CHECKIN], 'payments:write')).toBe(false);
  });
  it('un VIEWER ne peut rien écrire', () => {
    const writes: Permission[] = [
      'participants:write', 'schools:write', 'events:write',
      'payments:write', 'tickets:write', 'checkin:operate',
      'admins:manage', 'settings:manage',
    ];
    for (const w of writes) {
      expect(hasPermission([Role.VIEWER], w)).toBe(false);
    }
  });
  it('un anonyme n\'a strictement aucune permission', () => {
    const all: Permission[] = MATRIX.map((m) => m.permission);
    for (const p of all) {
      expect(hasPermission([], p)).toBe(false);
    }
  });
});
