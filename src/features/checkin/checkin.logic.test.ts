import { describe, it, expect } from 'vitest';
import { extractToken, presentCheckin } from './checkin.logic';

describe('extractToken', () => {
  it('extrait le token d\'une URL de check-in', () => {
    expect(extractToken('https://app.example/checkin?t=abc123')).toBe('abc123');
  });
  it('gère les paramètres multiples', () => {
    expect(extractToken('https://app.example/checkin?x=1&t=tok&y=2')).toBe('tok');
  });
  it('gère une chaîne relative avec ?t=', () => {
    expect(extractToken('/checkin?t=zzz')).toBe('zzz');
  });
  it('accepte un token brut', () => {
    expect(extractToken('  deadbeef  ')).toBe('deadbeef');
  });
  it('chaîne vide → vide', () => {
    expect(extractToken('')).toBe('');
  });
});

describe('presentCheckin', () => {
  it('VALID autorise l\'entrée', () => {
    const p = presentCheckin('VALID');
    expect(p.allowEntry).toBe(true);
    expect(p.tone).toBe('success');
  });
  it('ALREADY_USED refuse (warning)', () => {
    const p = presentCheckin('ALREADY_USED');
    expect(p.allowEntry).toBe(false);
    expect(p.tone).toBe('warning');
  });
  it('CANCELLED / PAYMENT_UNPAID / INVALID refusent (error)', () => {
    for (const r of ['CANCELLED', 'PAYMENT_UNPAID', 'INVALID'] as const) {
      const p = presentCheckin(r);
      expect(p.allowEntry).toBe(false);
      expect(p.tone).toBe('error');
    }
  });
});
