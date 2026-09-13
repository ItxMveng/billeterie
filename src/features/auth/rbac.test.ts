import { describe, it, expect } from 'vitest';
import { hasPermission, permissionsForRoles } from './rbac';
import { Role } from '@/types/enums';

describe('RBAC — hasPermission', () => {
  it('SUPER_ADMIN a toutes les permissions', () => {
    expect(hasPermission([Role.SUPER_ADMIN], 'admins:manage')).toBe(true);
    expect(hasPermission([Role.SUPER_ADMIN], 'payments:write')).toBe(true);
    expect(hasPermission([Role.SUPER_ADMIN], 'checkin:operate')).toBe(true);
  });

  it('VIEWER est en lecture seule (pas d\'écriture)', () => {
    expect(hasPermission([Role.VIEWER], 'participants:read')).toBe(true);
    expect(hasPermission([Role.VIEWER], 'participants:write')).toBe(false);
    expect(hasPermission([Role.VIEWER], 'admins:manage')).toBe(false);
  });

  it('FINANCE gère les paiements mais pas le check-in', () => {
    expect(hasPermission([Role.FINANCE], 'payments:write')).toBe(true);
    expect(hasPermission([Role.FINANCE], 'checkin:operate')).toBe(false);
    expect(hasPermission([Role.FINANCE], 'admins:manage')).toBe(false);
  });

  it('CHECKIN opère le check-in mais ne gère pas les paiements', () => {
    expect(hasPermission([Role.CHECKIN], 'checkin:operate')).toBe(true);
    expect(hasPermission([Role.CHECKIN], 'payments:write')).toBe(false);
  });

  it('ADMIN ne peut pas gérer les administrateurs (réservé SUPER_ADMIN)', () => {
    expect(hasPermission([Role.ADMIN], 'participants:write')).toBe(true);
    expect(hasPermission([Role.ADMIN], 'admins:manage')).toBe(false);
  });

  it('aucun rôle → aucune permission', () => {
    expect(hasPermission([], 'dashboard:access')).toBe(false);
  });

  it('audit:read réservé à ADMIN/SUPER_ADMIN', () => {
    expect(hasPermission([Role.ADMIN], 'audit:read')).toBe(true);
    expect(hasPermission([Role.SUPER_ADMIN], 'audit:read')).toBe(true);
    expect(hasPermission([Role.FINANCE], 'audit:read')).toBe(false);
    expect(hasPermission([Role.CHECKIN], 'audit:read')).toBe(false);
    expect(hasPermission([Role.VIEWER], 'audit:read')).toBe(false);
  });

  it('CHECKIN peut opérer le check-in mais rien exporter ni gérer', () => {
    expect(hasPermission([Role.CHECKIN], 'checkin:operate')).toBe(true);
    expect(hasPermission([Role.CHECKIN], 'exports:read')).toBe(false);
    expect(hasPermission([Role.CHECKIN], 'payments:write')).toBe(false);
    expect(hasPermission([Role.CHECKIN], 'admins:manage')).toBe(false);
  });

  it('FINANCE peut exporter mais pas gérer les admins', () => {
    expect(hasPermission([Role.FINANCE], 'exports:read')).toBe(true);
    expect(hasPermission([Role.FINANCE], 'admins:manage')).toBe(false);
  });

  it('cumul de rôles → union des permissions', () => {
    const perms = permissionsForRoles([Role.FINANCE, Role.CHECKIN]);
    expect(perms.has('payments:write')).toBe(true);
    expect(perms.has('checkin:operate')).toBe(true);
    expect(perms.has('admins:manage')).toBe(false);
  });
});
