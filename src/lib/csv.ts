/**
 * Parseur CSV minimal et robuste (sans dépendance externe).
 *
 * Gère : guillemets doubles, virgules et sauts de ligne échappés dans les
 * champs entre guillemets, CRLF/LF, et les caractères accentués (UTF-8).
 * Ne gère volontairement pas les séparateurs exotiques : virgule ou
 * point-virgule détecté automatiquement sur la première ligne.
 */

/** Découpe un texte CSV en matrice de chaînes. */
export function parseCsv(text: string): string[][] {
  // Retire un éventuel BOM (U+FEFF).
  const input =
    text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = detectDelimiter(input);

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignoré (CRLF) ; le \n suivant termine la ligne
    } else {
      field += c;
    }
  }

  // Dernier champ / dernière ligne (si le fichier ne finit pas par un saut).
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Retire les lignes entièrement vides.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function detectDelimiter(input: string): ',' | ';' {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? '';
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

/**
 * Convertit une matrice CSV (avec ligne d'en-tête) en objets, en normalisant
 * les en-têtes (minuscules, sans accents, espaces → underscores).
 */
export function csvToRecords(matrix: string[][]): Array<Record<string, string>> {
  if (matrix.length === 0) return [];
  const headers = (matrix[0] ?? []).map(normalizeHeader);
  return matrix.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (cells[i] ?? '').trim();
    });
    return rec;
  });
}

export function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}
