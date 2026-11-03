import { describe, it, expect } from 'vitest';
import { registrationSchema } from './participant.schema';
import { ParticipantType } from '@/types/enums';
import { GRADUATES } from '@/config/graduates';

const SCHOOL_UUID = '11111111-1111-1111-1111-111111111111';

const base = {
  first_name: 'Awa',
  last_name: 'Nkolo',
  email: 'Awa.Nkolo@example.com',
  phone: '+33 6 12 34 56 78',
};

describe('registrationSchema', () => {
  it('accepte des données valides (NEW_STUDENT avec son école)', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.NEW_STUDENT,
      school_id: SCHOOL_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('NEW_STUDENT sans école → refusé', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.NEW_STUDENT,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('school_id'))).toBe(true);
    }
  });

  it('normalise l\'email en minuscules', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.CPBA_GUEST,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('awa.nkolo@example.com');
    }
  });

  it('rejette un email invalide', () => {
    const result = registrationSchema.safeParse({
      ...base,
      email: 'pas-un-email',
      participant_type: ParticipantType.OTHER,
    });
    expect(result.success).toBe(false);
  });

  it('rejette un champ obligatoire manquant (prénom vide)', () => {
    const result = registrationSchema.safeParse({
      ...base,
      first_name: '',
      participant_type: ParticipantType.OTHER,
    });
    expect(result.success).toBe(false);
  });

  it('rejette un téléphone invalide', () => {
    const result = registrationSchema.safeParse({
      ...base,
      phone: 'abc',
      participant_type: ParticipantType.OTHER,
    });
    expect(result.success).toBe(false);
  });

  it('ALUMNI (diplômé) et CPBA_GUEST sans école → acceptés', () => {
    for (const type of [ParticipantType.ALUMNI, ParticipantType.CPBA_GUEST]) {
      const result = registrationSchema.safeParse({ ...base, participant_type: type });
      expect(result.success).toBe(true);
    }
  });

  it('ALUMNI avec école → accepté', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.ALUMNI,
      school_id: SCHOOL_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('OTHER avec école (facultative) → accepté', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.OTHER,
      school_id: SCHOOL_UUID,
      guest_of: [GRADUATES[0]],
    });
    expect(result.success).toBe(true);
  });

  it('OTHER (famille) sans diplômé hôte → refusé', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.OTHER,
      guest_of: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('guest_of'))).toBe(true);
    }
  });

  it('OTHER (famille) avec un ou plusieurs diplômés → accepté', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.OTHER,
      guest_of: [GRADUATES[0], GRADUATES[1]],
    });
    expect(result.success).toBe(true);
  });

  it('rejette un diplômé hors liste', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: ParticipantType.OTHER,
      guest_of: ['Inconnu'],
    });
    expect(result.success).toBe(false);
  });

  it('rejette une catégorie invalide', () => {
    const result = registrationSchema.safeParse({
      ...base,
      participant_type: 'DIRECTOR',
    });
    expect(result.success).toBe(false);
  });
});
