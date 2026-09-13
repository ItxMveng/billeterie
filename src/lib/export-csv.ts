/**
 * Export CSV — génération pure + déclenchement de téléchargement.
 *
 * ⚠️ N'exportez jamais de secrets (tokens, hash, colonnes techniques). Les
 * colonnes exportées sont choisies explicitement par l'appelant.
 */

export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  /** Formatage optionnel de la valeur. */
  format?: (row: T) => string | number | null | undefined;
}

function escapeCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n;]/.test(s)) {
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
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.format ? c.format(row) : row[c.key as keyof T]))
      .join(','),
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
