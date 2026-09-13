import { describe, it, expect } from 'vitest';
import {
  buildParticipantImport,
  buildVerificationImport,
  parseParticipantType,
} from './import-mappers';
import { ParticipantType } from '@/types/enums';

describe('parseParticipantType', () => {
  it('reconnaît les libellés FR/EN', () => {
    expect(parseParticipantType('Nouveau')).toBe(ParticipantType.NEW_STUDENT);
    expect(parseParticipantType('alumni')).toBe(ParticipantType.ALUMNI);
    expect(parseParticipantType('Invité')).toBe(ParticipantType.OTHER);
    expect(parseParticipantType('dirigeant')).toBeNull();
  });
});

describe('buildParticipantImport', () => {
  it('accepte une ligne valide', () => {
    const p = buildParticipantImport([
      { prenom: 'Awa', nom: 'Nkolo', email: 'awa@example.com', telephone: '+33600000000', categorie: 'ancien' },
    ]);
    expect(p.validCount).toBe(1);
    expect(p.rows[0]!.participant_type).toBe(ParticipantType.ALUMNI);
    expect(p.rows[0]!.email).toBe('awa@example.com');
  });

  it('signale email invalide, nom manquant, catégorie invalide', () => {
    const p = buildParticipantImport([
      { prenom: 'A', nom: 'B', email: 'pas-email', categorie: 'autre' },
      { prenom: '', nom: 'B', email: 'a@b.com', categorie: 'autre' },
      { prenom: 'A', nom: 'B', email: 'a@b.com', categorie: 'dirigeant' },
    ]);
    expect(p.validCount).toBe(0);
    expect(p.issues).toHaveLength(3);
    expect(p.issues[0]!.message).toMatch(/email/i);
    expect(p.issues[1]!.message).toMatch(/nom|prénom/i);
    expect(p.issues[2]!.message).toMatch(/catégorie/i);
  });

  it('interprète already_paid', () => {
    const p = buildParticipantImport([
      { prenom: 'A', nom: 'B', email: 'a@b.com', categorie: 'autre', deja_paye: 'oui' },
    ]);
    expect(p.rows[0]!.already_paid).toBe(true);
  });
});

describe('buildVerificationImport', () => {
  it('accepte une ligne sans email', () => {
    const p = buildVerificationImport([{ prenom: 'A', nom: 'B' }]);
    expect(p.validCount).toBe(1);
    expect(p.rows[0]!.email).toBeNull();
  });
  it('rejette un email invalide', () => {
    const p = buildVerificationImport([{ prenom: 'A', nom: 'B', email: 'x' }]);
    expect(p.validCount).toBe(0);
    expect(p.issues).toHaveLength(1);
  });
});
