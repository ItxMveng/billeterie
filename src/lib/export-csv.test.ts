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

  it('génère en-tête + lignes', () => {
    const rows: Row[] = [{ name: 'Awa', email: 'a@b.com', amount: 10 }];
    expect(toCsv(rows, cols)).toBe('Nom,Email,Montant\r\nAwa,a@b.com,10');
  });

  it('échappe virgules, guillemets et sauts de ligne', () => {
    const rows: Row[] = [{ name: 'Itoua, F', email: 'a"b@c.com', amount: 0 }];
    const csv = toCsv(rows, cols);
    expect(csv).toContain('"Itoua, F"');
    expect(csv).toContain('"a""b@c.com"');
  });

  it('valeurs nulles → cellule vide', () => {
    const rows = [{ name: 'X', email: null, amount: 5 } as unknown as Row];
    expect(toCsv(rows, cols)).toBe('Nom,Email,Montant\r\nX,,5');
  });

  it('applique un format personnalisé', () => {
    const rows: Row[] = [{ name: 'X', email: 'e', amount: 1000 }];
    const csv = toCsv(rows, [
      { key: 'name', header: 'Nom' },
      { key: 'amount', header: 'Euros', format: (r) => (r.amount / 100).toFixed(2) },
    ]);
    expect(csv).toBe('Nom,Euros\r\nX,10.00');
  });
});
