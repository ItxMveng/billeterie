import { describe, it, expect } from 'vitest';
import { toCsv } from './export-csv';

interface Row extends Record<string, unknown> {
  name: string;
  email: string;
  amount: number;
}

describe('toCsv', () => {
  const cols = [
    { key: 'name', header: 'Nom' },
    { key: 'email', header: 'Email' },
    { key: 'amount', header: 'Montant' },
  ];

  it('génère en-tête + lignes, séparées par « ; » (Excel français)', () => {
    const rows: Row[] = [{ name: 'Awa', email: 'a@b.com', amount: 10 }];
    expect(toCsv(rows, cols)).toBe('Nom;Email;Montant\r\nAwa;a@b.com;10');
  });

  it('échappe points-virgules, virgules, guillemets et sauts de ligne', () => {
    const rows: Row[] = [{ name: 'Itoua; F', email: 'a"b@c.com', amount: 0 }];
    const csv = toCsv(rows, cols);
    expect(csv).toContain('"Itoua; F"');
    expect(csv).toContain('"a""b@c.com"');
    expect(toCsv([{ name: 'Adelphe FOGANG, Gelis MOMO', email: '', amount: 1 }], cols)).toContain(
      '"Adelphe FOGANG, Gelis MOMO"',
    );
  });

  it('valeurs nulles → cellule vide', () => {
    const rows = [{ name: 'X', email: null, amount: 5 } as unknown as Row];
    expect(toCsv(rows, cols)).toBe('Nom;Email;Montant\r\nX;;5');
  });

  it('applique un format personnalisé', () => {
    const rows: Row[] = [{ name: 'X', email: 'e', amount: 1000 }];
    const csv = toCsv(rows, [
      { key: 'name', header: 'Nom' },
      { key: 'amount', header: 'Euros', format: (r) => (r.amount / 100).toFixed(2) },
    ]);
    expect(csv).toBe('Nom;Euros\r\nX;10.00');
  });

  it('garde les téléphones en texte (0 initial, indicatif +33)', () => {
    const phones = [{ p: '0612345678' }, { p: '+33 6 12 34 56 78' }];
    const csv = toCsv(phones, [{ key: 'p', header: 'Tel' }]);
    expect(csv).toBe('Tel\r\n"=""0612345678"""\r\n"=""+33 6 12 34 56 78"""');
  });

  it('neutralise une saisie qui serait lue comme formule', () => {
    const csv = toCsv([{ n: '=SOMME(A1)' }, { n: '@cmd' }], [{ key: 'n', header: 'Nom' }]);
    expect(csv).toBe("Nom\r\n'=SOMME(A1)\r\n'@cmd");
  });
});
