/**
 * Mappage et validation des imports — PUR et testé.
 *
 * Convertit des lignes CSV normalisées en objets attendus par les RPC d'import,
 * et signale les lignes invalides pour la prévisualisation. La validation
 * serveur reste la référence : ceci améliore l'UX (aperçu) sans s'y substituer.
 */

import { ParticipantType } from '@/types/enums';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Récupère la première valeur non vide parmi des alias de colonnes. */
function pick(rec: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const v = rec[a];
    if (v != null && v.trim() !== '') return v.trim();
  }
  return '';
}

function parseBool(v: string): boolean {
  return ['1', 'true', 'oui', 'yes', 'vrai', 'x'].includes(v.trim().toLowerCase());
}

/** Normalise une catégorie librement saisie vers l'enum métier. */
export function parseParticipantType(raw: string): ParticipantType | null {
  const v = raw.trim().toLowerCase();
  if (['new_student', 'nouveau', 'nouveau_etudiant', 'nouveau étudiant', 'new'].includes(v))
    return ParticipantType.NEW_STUDENT;
  if (['alumni', 'ancien', 'ancien_etudiant', 'ancien étudiant'].includes(v))
    return ParticipantType.ALUMNI;
  if (['other', 'autre', 'invite', 'invité', 'guest'].includes(v))
    return ParticipantType.OTHER;
  return null;
}

export interface ParticipantImportRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  participant_type: ParticipantType;
  school_id?: string | null;
  already_paid?: boolean;
  payment_required?: boolean;
  external_identifier?: string | null;
}

export interface ImportPreview<T> {
  rows: T[];
  issues: Array<{ line: number; message: string }>;
  total: number;
  validCount: number;
}

/** Construit l'aperçu d'import de participants depuis des enregistrements CSV. */
export function buildParticipantImport(
  records: Array<Record<string, string>>,
): ImportPreview<ParticipantImportRow> {
  const rows: ParticipantImportRow[] = [];
  const issues: Array<{ line: number; message: string }> = [];

  records.forEach((rec, idx) => {
    const line = idx + 2; // +1 en-tête, +1 index base-1
    const first_name = pick(rec, ['first_name', 'prenom', 'firstname']);
    const last_name = pick(rec, ['last_name', 'nom', 'lastname']);
    const email = pick(rec, ['email', 'mail', 'courriel']).toLowerCase();
    const phone = pick(rec, ['phone', 'telephone', 'tel', 'mobile']);
    const typeRaw = pick(rec, ['participant_type', 'categorie', 'type']);
    const type = parseParticipantType(typeRaw);

    if (!first_name || !last_name) {
      issues.push({ line, message: 'Nom ou prénom manquant' });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      issues.push({ line, message: 'Email invalide' });
      return;
    }
    if (!type) {
      issues.push({ line, message: `Catégorie invalide : « ${typeRaw} »` });
      return;
    }

    rows.push({
      first_name,
      last_name,
      email,
      phone,
      participant_type: type,
      school_id: pick(rec, ['school_id']) || null,
      already_paid: parseBool(pick(rec, ['already_paid', 'deja_paye', 'paid', 'paye'])),
      payment_required: rec['payment_required']
        ? parseBool(rec['payment_required'])
        : undefined,
      external_identifier: pick(rec, ['external_identifier', 'identifiant', 'matricule']) || null,
    });
  });

  return { rows, issues, total: records.length, validCount: rows.length };
}

export interface VerificationImportRow {
  first_name: string;
  last_name: string;
  email?: string | null;
  school_id?: string | null;
  external_identifier?: string | null;
}

/** Construit l'aperçu d'import de la liste officielle de vérification. */
export function buildVerificationImport(
  records: Array<Record<string, string>>,
): ImportPreview<VerificationImportRow> {
  const rows: VerificationImportRow[] = [];
  const issues: Array<{ line: number; message: string }> = [];

  records.forEach((rec, idx) => {
    const line = idx + 2;
    const first_name = pick(rec, ['first_name', 'prenom', 'firstname']);
    const last_name = pick(rec, ['last_name', 'nom', 'lastname']);
    const email = pick(rec, ['email', 'mail', 'courriel']).toLowerCase();

    if (!first_name || !last_name) {
      issues.push({ line, message: 'Nom ou prénom manquant' });
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      issues.push({ line, message: 'Email invalide' });
      return;
    }

    rows.push({
      first_name,
      last_name,
      email: email || null,
      school_id: pick(rec, ['school_id']) || null,
      external_identifier: pick(rec, ['external_identifier', 'identifiant', 'matricule']) || null,
    });
  });

  return { rows, issues, total: records.length, validCount: rows.length };
}
