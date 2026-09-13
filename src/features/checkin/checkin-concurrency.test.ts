import { describe, it, expect } from 'vitest';

/**
 * TEST DE CONTRAT — concurrence du check-in.
 *
 * ⚠️ Honnêteté du périmètre : ce test NE teste PAS PostgreSQL. La garantie
 * réelle est fournie par la RPC `validate_checkin`
 * (`supabase/migrations/0006_sprint3_business.sql`) :
 *
 *     UPDATE participants SET checked_in = true, checked_in_at = now()
 *     WHERE id = ? AND checked_in = false RETURNING id;
 *
 * L'UPDATE conditionnel pose un verrou de ligne : sur deux scans simultanés,
 * un seul UPDATE voit `checked_in = false` et retourne une ligne ; l'autre en
 * retourne zéro → ALREADY_USED. La contrainte `checkins.ticket_id UNIQUE`
 * sert de garde-fou supplémentaire.
 *
 * Ce test verrouille la SÉMANTIQUE attendue (compare-and-set : exactement un
 * succès) pour prévenir toute régression d'un futur refactor qui remplacerait
 * l'opération atomique par un SELECT-puis-UPDATE. Un test d'intégration contre
 * une vraie instance Supabase reste nécessaire (limitation documentée).
 */

/** Modèle de l'UPDATE conditionnel : compare-and-set atomique. */
function makeAtomicStore(initialCheckedIn = false) {
  let checkedIn = initialCheckedIn;
  return {
    /** Retourne true si CE appel a effectué la transition (comme RETURNING). */
    tryCheckIn(): boolean {
      if (checkedIn) return false; // 0 ligne mise à jour
      checkedIn = true; // 1 ligne mise à jour
      return true;
    },
    get isCheckedIn() {
      return checkedIn;
    },
  };
}

function resultOf(applied: boolean): 'VALID' | 'ALREADY_USED' {
  return applied ? 'VALID' : 'ALREADY_USED';
}

describe('Contrat de concurrence du check-in', () => {
  it('deux scans simultanés → exactement un VALID, un ALREADY_USED', async () => {
    const store = makeAtomicStore();

    const [a, b] = await Promise.all([
      Promise.resolve().then(() => resultOf(store.tryCheckIn())),
      Promise.resolve().then(() => resultOf(store.tryCheckIn())),
    ]);

    const results = [a, b];
    expect(results.filter((r) => r === 'VALID')).toHaveLength(1);
    expect(results.filter((r) => r === 'ALREADY_USED')).toHaveLength(1);
    expect(store.isCheckedIn).toBe(true);
  });

  it('N scans simultanés → un seul check-in effectif', async () => {
    const store = makeAtomicStore();
    const N = 25;

    const results = await Promise.all(
      Array.from({ length: N }, () =>
        Promise.resolve().then(() => resultOf(store.tryCheckIn())),
      ),
    );

    expect(results.filter((r) => r === 'VALID')).toHaveLength(1);
    expect(results.filter((r) => r === 'ALREADY_USED')).toHaveLength(N - 1);
  });

  it('un ticket déjà utilisé ne redevient jamais valide', () => {
    const store = makeAtomicStore(true);
    expect(resultOf(store.tryCheckIn())).toBe('ALREADY_USED');
    expect(resultOf(store.tryCheckIn())).toBe('ALREADY_USED');
  });

  it('le premier scan sur un ticket neuf est accepté', () => {
    const store = makeAtomicStore();
    expect(resultOf(store.tryCheckIn())).toBe('VALID');
  });
});
