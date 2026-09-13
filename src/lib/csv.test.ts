import { describe, it, expect } from 'vitest';
import { parseCsv, csvToRecords, normalizeHeader } from './csv';

describe('parseCsv', () => {
  it('parse un CSV simple', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('gère les guillemets, virgules et sauts de ligne échappés', () => {
    const csv = 'nom,note\n"Itoua, Francis","ligne1\nligne2"';
    expect(parseCsv(csv)).toEqual([
      ['nom', 'note'],
      ['Itoua, Francis', 'ligne1\nligne2'],
    ]);
  });
  it('gère les guillemets doubles internes', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });
  it('détecte le point-virgule', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('ignore les lignes vides et le BOM', () => {
    expect(parseCsv('﻿a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('gère CRLF', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('csvToRecords', () => {
  it('mappe par en-tête normalisé et conserve les accents des valeurs', () => {
    const recs = csvToRecords([
      ['Prénom', 'Nom'],
      ['Frańçis', 'Itoua'],
    ]);
    expect(recs).toEqual([{ prenom: 'Frańçis', nom: 'Itoua' }]);
  });
});

describe('normalizeHeader', () => {
  it('retire accents, minuscule, espaces → underscore', () => {
    expect(normalizeHeader('  Prénom Complet ')).toBe('prenom_complet');
  });
});
