import { describe, it, expect } from 'vitest';
import { buildSeatingPlan, nameKey } from './seating';
import type { ParticipantRow } from '@/types/database';
import type { ParticipantType } from '@/types/enums';

let n = 0;
function p(
  type: ParticipantType,
  first: string,
  last: string,
  extra: Partial<ParticipantRow> = {},
): ParticipantRow {
  n += 1;
  return {
    id: `p${n}`,
    event_id: 'e1',
    first_name: first,
    last_name: last,
    email: `${n}@x.fr`,
    phone: '0600000000',
    participant_type: type,
    school_id: null,
    verification_status: 'NOT_REQUIRED',
    payment_status: 'NOT_REQUIRED',
    payment_required: false,
    payment_reference: null,
    registration_status: 'CONFIRMED',
    ticket_status: 'GENERATED',
    verified_by: null,
    verified_at: null,
    rejected_reason: null,
    source: 'PUBLIC',
    external_identifier: null,
    guest_of: [],
    checked_in: false,
    checked_in_at: null,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    ...extra,
  };
}

const GRADS = ['Adelphe FOGANG', 'Gelis MOMO'];

describe('nameKey', () => {
  it('ignore casse, accents et ordre prénom/nom', () => {
    expect(nameKey('Adelphe FOGANG')).toBe(nameKey('fogang  adelphe'));
    expect(nameKey('Clémence YONKUE')).toBe(nameKey('Clemence Yonkue'));
  });
});

describe('buildSeatingPlan', () => {
  it('regroupe les invités sous chaque diplômé et retrouve son inscription', () => {
    const grad = p('ALUMNI', 'Adelphe', 'Fogang');
    const mum = p('OTHER', 'Marie', 'Fogang', { guest_of: ['Adelphe FOGANG'] });
    const friend = p('OTHER', 'Paul', 'Bakary', { guest_of: ['Adelphe FOGANG', 'Gelis MOMO'] });
    const plan = buildSeatingPlan([grad, mum, friend], GRADS);

    const adelphe = plan.groups.find((g) => g.graduate === 'Adelphe FOGANG')!;
    expect(adelphe.graduateRegistration?.id).toBe(grad.id);
    expect(adelphe.guests.map((g) => g.id)).toEqual([friend.id, mum.id]); // tri par nom
    const gelis = plan.groups.find((g) => g.graduate === 'Gelis MOMO')!;
    expect(gelis.graduateRegistration).toBeNull();
    expect(gelis.guests.map((g) => g.id)).toEqual([friend.id]);
  });

  it('isole les familles sans diplômé, les invités CPBA et les étudiants', () => {
    const lost = p('OTHER', 'Jean', 'Sans');
    const vip = p('CPBA_GUEST', 'Vip', 'Guest');
    const student = p('NEW_STUDENT', 'Eve', 'Etud');
    const plan = buildSeatingPlan([lost, vip, student], GRADS);
    expect(plan.unassignedFamilies.map((x) => x.id)).toEqual([lost.id]);
    expect(plan.cpbaGuests.map((x) => x.id)).toEqual([vip.id]);
    expect(plan.students.map((x) => x.id)).toEqual([student.id]);
  });

  it('écarte les billets annulés et les inscriptions rejetées', () => {
    const cancelled = p('OTHER', 'A', 'B', { guest_of: ['Gelis MOMO'], ticket_status: 'CANCELLED' });
    const rejected = p('OTHER', 'C', 'D', { guest_of: ['Gelis MOMO'], registration_status: 'REJECTED' });
    const plan = buildSeatingPlan([cancelled, rejected], GRADS);
    expect(plan.groups.every((g) => g.guests.length === 0)).toBe(true);
  });

  it('garde un groupe pour un nom choisi qui n’est plus dans la liste', () => {
    const guest = p('OTHER', 'X', 'Y', { guest_of: ['Ancien NOM'] });
    const plan = buildSeatingPlan([guest], GRADS);
    expect(plan.groups.map((g) => g.graduate)).toEqual([...GRADS, 'Ancien NOM']);
  });

  it('liste à part les diplômés inscrits absents de la liste', () => {
    const extra = p('ALUMNI', 'Hors', 'Liste');
    const plan = buildSeatingPlan([extra], GRADS);
    expect(plan.otherGraduates.map((x) => x.id)).toEqual([extra.id]);
  });
});
