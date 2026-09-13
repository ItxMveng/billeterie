/**
 * Logique de vérification des nouveaux étudiants — PURE et testée.
 *
 * Rapproche un participant déclaré `NEW_STUDENT` d'un enregistrement de la
 * liste officielle. Le matching privilégie les informations fiables et ne se
 * fonde JAMAIS uniquement sur le prénom.
 *
 * ⚠️ Cette fonction ne DÉCIDE pas la vérification : elle propose un résultat.
 * L'attribution de `VERIFIED` se fait exclusivement côté serveur via une
 * fonction sécurisée, après contrôle du rôle (voir SECURITY.md).
 */

import { VerificationRecordStatus } from '@/types/enums';

/** Normalise un email pour comparaison (minuscules, sans espaces). */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/** Normalise un nom : minuscules, espaces réduits, accents retirés. */
export function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinés
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Normalise un identifiant externe (majuscules, sans espaces). */
export function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export type MatchOutcome = 'MATCH' | 'AMBIGUOUS' | 'NO_MATCH';

export interface VerificationRecordLike {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  school_id: string | null;
  external_identifier: string | null;
  status: VerificationRecordStatus;
}

export interface ParticipantMatchInput {
  first_name: string;
  last_name: string;
  email: string;
  school_id?: string | null;
  external_identifier?: string | null;
}

export interface MatchResult {
  outcome: MatchOutcome;
  /** Enregistrement retenu en cas de MATCH unique. */
  recordId?: string;
  /** Enregistrements candidats en cas d'ambiguïté. */
  candidateIds: string[];
  /** Critère ayant produit le résultat (traçabilité). */
  reason:
    | 'EXTERNAL_ID'
    | 'EMAIL'
    | 'NAME_SCHOOL'
    | 'NAME_ONLY'
    | 'NONE';
}

function fullName(r: { first_name: string; last_name: string }): string {
  return `${normalizeName(r.first_name)} ${normalizeName(r.last_name)}`;
}

/**
 * Rapproche un participant d'une liste d'enregistrements officiels.
 * Seuls les enregistrements AVAILABLE sont considérés.
 */
export function matchVerificationRecord(
  participant: ParticipantMatchInput,
  records: VerificationRecordLike[],
): MatchResult {
  const available = records.filter(
    (r) => r.status === VerificationRecordStatus.AVAILABLE,
  );

  // 1) Identifiant externe (le plus fiable).
  const pid = normalizeIdentifier(participant.external_identifier);
  if (pid) {
    const byId = available.filter(
      (r) => normalizeIdentifier(r.external_identifier) === pid,
    );
    if (byId.length === 1)
      return { outcome: 'MATCH', recordId: byId[0]!.id, candidateIds: [byId[0]!.id], reason: 'EXTERNAL_ID' };
    if (byId.length > 1)
      return { outcome: 'AMBIGUOUS', candidateIds: byId.map((r) => r.id), reason: 'EXTERNAL_ID' };
  }

  // 2) Email normalisé.
  const pemail = normalizeEmail(participant.email);
  if (pemail) {
    const byEmail = available.filter((r) => normalizeEmail(r.email) === pemail);
    if (byEmail.length === 1)
      return { outcome: 'MATCH', recordId: byEmail[0]!.id, candidateIds: [byEmail[0]!.id], reason: 'EMAIL' };
    if (byEmail.length > 1)
      return { outcome: 'AMBIGUOUS', candidateIds: byEmail.map((r) => r.id), reason: 'EMAIL' };
  }

  // 3) Nom complet + établissement.
  const pname = fullName(participant);
  if (pname.trim()) {
    if (participant.school_id) {
      const byNameSchool = available.filter(
        (r) => fullName(r) === pname && r.school_id === participant.school_id,
      );
      if (byNameSchool.length === 1)
        return { outcome: 'MATCH', recordId: byNameSchool[0]!.id, candidateIds: [byNameSchool[0]!.id], reason: 'NAME_SCHOOL' };
      if (byNameSchool.length > 1)
        return { outcome: 'AMBIGUOUS', candidateIds: byNameSchool.map((r) => r.id), reason: 'NAME_SCHOOL' };
    }

    // 4) Nom seul → jamais un MATCH automatique (validation manuelle requise).
    const byName = available.filter((r) => fullName(r) === pname);
    if (byName.length >= 1)
      return { outcome: 'AMBIGUOUS', candidateIds: byName.map((r) => r.id), reason: 'NAME_ONLY' };
  }

  return { outcome: 'NO_MATCH', candidateIds: [], reason: 'NONE' };
}
