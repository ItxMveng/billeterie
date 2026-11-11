/**
 * Plan de salle — regroupement des participants autour des diplômés.
 *
 * Fonctions pures (testées) : la page se contente de les afficher.
 */

import { ParticipantType } from '@/types/enums';
import type { ParticipantRow } from '@/types/database';
import { canonicalGraduateName, graduateNameKey } from '@/config/graduates';

export interface GraduateGroup {
  /** Nom du diplômé tel qu'il figure dans la liste. */
  graduate: string;
  /** Inscription du diplômé lui-même, si on la retrouve (catégorie Diplômé). */
  graduateRegistration: ParticipantRow | null;
  /** Familles / invités qui ont choisi ce diplômé. */
  guests: ParticipantRow[];
}

export interface SeatingPlan {
  groups: GraduateGroup[];
  /** Familles inscrites sans diplômé indiqué (à rattacher à la main). */
  unassignedFamilies: ParticipantRow[];
  /** Diplômés inscrits qu'on ne retrouve pas dans la liste. */
  otherGraduates: ParticipantRow[];
  cpbaGuests: ParticipantRow[];
  students: ParticipantRow[];
}

export function byLastName(a: ParticipantRow, b: ParticipantRow): number {
  return (
    a.last_name.localeCompare(b.last_name, 'fr', { sensitivity: 'base' }) ||
    a.first_name.localeCompare(b.first_name, 'fr', { sensitivity: 'base' })
  );
}

/**
 * Construit le plan de salle d'un événement.
 * Les participants à billet annulé ou inscription rejetée sont écartés.
 * Un invité de deux diplômés apparaît dans les deux groupes.
 */
export function buildSeatingPlan(
  participants: ParticipantRow[],
  graduates: readonly string[],
): SeatingPlan {
  const present = participants.filter(
    (p) => p.ticket_status !== 'CANCELLED' && p.registration_status !== 'REJECTED',
  );

  // Noms connus : la liste officielle, plus ceux saisis avant un changement de liste.
  const names = new Map(graduates.map((name) => [graduateNameKey(name), canonicalGraduateName(name)]));
  for (const p of present) {
    for (const g of p.guest_of ?? []) {
      const key = graduateNameKey(g);
      if (key && !names.has(key)) names.set(key, canonicalGraduateName(g));
    }
  }

  const alumni = present.filter((p) => p.participant_type === ParticipantType.ALUMNI);
  const alumniByName = new Map<string, ParticipantRow[]>();
  for (const a of alumni) {
    const key = graduateNameKey(`${a.first_name} ${a.last_name}`);
    const matches = alumniByName.get(key) ?? [];
    matches.push(a);
    alumniByName.set(key, matches);
  }
  const matchedAlumni = new Set<string>();

  const groups = Array.from(names, ([key, graduate]) => {
    const matches = alumniByName.get(key);
    const registration = matches?.length === 1 ? matches[0] ?? null : null;
    if (registration) matchedAlumni.add(registration.id);
    return {
      graduate,
      graduateRegistration: registration,
      guests: present
        .filter(
          (p) =>
            p.participant_type !== ParticipantType.ALUMNI &&
            (p.guest_of ?? []).some((g) => graduateNameKey(g) === key),
        )
        .sort(byLastName),
    };
  });

  return {
    groups,
    unassignedFamilies: present
      .filter((p) => p.participant_type === ParticipantType.OTHER && !(p.guest_of ?? []).length)
      .sort(byLastName),
    otherGraduates: alumni.filter((a) => !matchedAlumni.has(a.id)).sort(byLastName),
    cpbaGuests: present
      .filter((p) => p.participant_type === ParticipantType.CPBA_GUEST)
      .sort(byLastName),
    students: present
      .filter((p) => p.participant_type === ParticipantType.NEW_STUDENT)
      .sort(byLastName),
  };
}
