import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  normalizeName,
  normalizeIdentifier,
  matchVerificationRecord,
  type VerificationRecordLike,
} from './verification.logic';
import { VerificationRecordStatus } from '@/types/enums';

const SCHOOL_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SCHOOL_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function rec(p: Partial<VerificationRecordLike> & { id: string }): VerificationRecordLike {
  return {
    first_name: 'Francis',
    last_name: 'Itoua',
    email: null,
    school_id: null,
    external_identifier: null,
    status: VerificationRecordStatus.AVAILABLE,
    ...p,
  };
}

describe('normalisation', () => {
  it('email : minuscules + trim', () => {
    expect(normalizeEmail('  Francis.Itoua@Example.COM ')).toBe('francis.itoua@example.com');
  });
  it('nom : accents retirés, minuscules, espaces réduits', () => {
    expect(normalizeName('  Frańçis   ÉLOÏSE ')).toBe('francis eloise');
  });
  it('identifiant : majuscules sans espaces', () => {
    expect(normalizeIdentifier(' ab 12 ')).toBe('AB12');
  });
});

describe('matchVerificationRecord', () => {
  it('MATCH par email (casse/espaces normalisés)', () => {
    const res = matchVerificationRecord(
      { first_name: 'Francis', last_name: 'Itoua', email: 'Francis.Itoua@example.com' },
      [rec({ id: 'r1', email: 'francis.itoua@example.com' })],
    );
    expect(res.outcome).toBe('MATCH');
    expect(res.recordId).toBe('r1');
    expect(res.reason).toBe('EMAIL');
  });

  it('MATCH par identifiant externe prioritaire', () => {
    const res = matchVerificationRecord(
      { first_name: 'X', last_name: 'Y', email: 'x@y.com', external_identifier: 'STU-9' },
      [rec({ id: 'r1', external_identifier: 'stu-9', email: 'autre@mail.com' })],
    );
    expect(res.outcome).toBe('MATCH');
    expect(res.reason).toBe('EXTERNAL_ID');
  });

  it('MATCH par nom + école quand une seule correspondance', () => {
    const res = matchVerificationRecord(
      { first_name: 'Francis', last_name: 'Itoua', email: 'inconnu@mail.com', school_id: SCHOOL_A },
      [rec({ id: 'r1', school_id: SCHOOL_A }), rec({ id: 'r2', school_id: SCHOOL_B })],
    );
    expect(res.outcome).toBe('MATCH');
    expect(res.recordId).toBe('r1');
    expect(res.reason).toBe('NAME_SCHOOL');
  });

  it('nom seul → AMBIGUOUS (jamais un MATCH automatique)', () => {
    const res = matchVerificationRecord(
      { first_name: 'Francis', last_name: 'Itoua', email: 'inconnu@mail.com' },
      [rec({ id: 'r1' })],
    );
    expect(res.outcome).toBe('AMBIGUOUS');
    expect(res.reason).toBe('NAME_ONLY');
  });

  it('emails multiples identiques → AMBIGUOUS', () => {
    const res = matchVerificationRecord(
      { first_name: 'A', last_name: 'B', email: 'dup@mail.com' },
      [rec({ id: 'r1', email: 'dup@mail.com' }), rec({ id: 'r2', email: 'dup@mail.com' })],
    );
    expect(res.outcome).toBe('AMBIGUOUS');
    expect(res.candidateIds).toEqual(['r1', 'r2']);
  });

  it('aucune correspondance → NO_MATCH', () => {
    const res = matchVerificationRecord(
      { first_name: 'Inconnu', last_name: 'Personne', email: 'none@mail.com' },
      [rec({ id: 'r1', email: 'other@mail.com', first_name: 'Autre', last_name: 'Nom' })],
    );
    expect(res.outcome).toBe('NO_MATCH');
  });

  it('ignore les enregistrements non AVAILABLE', () => {
    const res = matchVerificationRecord(
      { first_name: 'Francis', last_name: 'Itoua', email: 'francis.itoua@example.com' },
      [rec({ id: 'r1', email: 'francis.itoua@example.com', status: VerificationRecordStatus.MATCHED })],
    );
    expect(res.outcome).toBe('NO_MATCH');
  });
});
