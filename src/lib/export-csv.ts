/**
 * Export CSV — génération pure + déclenchement de téléchargement.
 *
 * Format pensé pour Excel en français, ouvert par double-clic :
 * - séparateur « ; » (Excel FR attend le point-virgule, pas la virgule) ;
 * - BOM UTF-8 pour les accents ;
 * - numéros de téléphone gardés en texte (sinon Excel retire le 0 initial
 *   ou transforme « +33… » en nombre).
 *
 * ⚠️ N'exportez jamais de secrets (tokens, hash, colonnes techniques). Les
 * colonnes exportées sont choisies explicitement par l'appelant.
 */

export const CSV_SEPARATOR = ';';

export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  /** Formatage optionnel de la valeur. */
  format?: (row: T) => string | number | null | undefined;
}

/** « 06 12 34 56 78 », « +33612345678 » : chiffres qu'Excel abîmerait. */
const PHONE_LIKE = /^[+0][\d\s().-]{5,}$/;

function escapeCell(value: unknown): string {
  if (value == null) return '';
  let s = String(value);
  if (PHONE_LIKE.test(s)) {
    // Formule texte : Excel affiche la valeur telle quelle.
    return `"=""${s}"""`;
  }
  // Une saisie commençant par = + - @ serait exécutée comme formule par le
  // tableur (injection CSV) : on la neutralise.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",;\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Construit une chaîne CSV (RFC-4180-ish) à partir de lignes typées.
 * Pas de contrainte `Record<string, unknown>` : les `interface` ne la
 * satisfont pas (absence d'index signature implicite).
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(CSV_SEPARATOR);
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.format ? c.format(row) : row[c.key as keyof T]))
      .join(CSV_SEPARATOR),
  );
  return [header, ...lines].join('\r\n');
}

/** Déclenche le téléchargement d'un CSV côté navigateur (ajoute le BOM UTF-8). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
