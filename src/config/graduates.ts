/**
 * Diplômés de la promotion mise à l'honneur.
 *
 * Les familles et invités des diplômés indiquent à l'inscription de qui ils
 * sont l'invité (plan de salle). Pour ajouter un nom : l'ajouter ici puis
 * redéployer. Le nom est enregistré tel quel en base (colonne guest_of).
 */
export const GRADUATES = [
  'Adelphe FOGANG',
  'Gelis MELACHEU MOMO',
  'Ariane MEGNIE',
  'Karl TATANG',
  'Marielle DINGA',
  'Francis T. MBAGNIA',
  'Dany BOREL',
  'Clémence YONKEU',
  'Junior ATIDO',
] as const;

type GraduateName = (typeof GRADUATES)[number];

/** Anciens libellés : des invitations déjà enregistrées les utilisent. */
const FORMER_NAMES = {
  'Gelis MELACHEU MOMO': ['Gelis MOMO'],
  'Francis T. MBAGNIA': ['Francis TCHOUMMI'],
  'Clémence YONKEU': ['Clemence YONKUE'],
} satisfies Partial<Record<GraduateName, readonly string[]>>;

/** Ignore accents, casse, ponctuation et ordre des mots. */
export function nameKey(name: string): string {
  return (
    name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  ).sort().join(' ');
}

const canonicalNames = new Map(GRADUATES.map((name) => [nameKey(name), name]));
for (const [name, aliases] of Object.entries(FORMER_NAMES)) {
  for (const alias of aliases) canonicalNames.set(nameKey(alias), name as GraduateName);
}

export function canonicalGraduateName(name: string): string {
  return canonicalNames.get(nameKey(name)) ?? name;
}

export function graduateNameKey(name: string): string {
  return nameKey(canonicalGraduateName(name));
}

export function canonicalGraduateHosts(names: string[]): string[] {
  return [...new Set(names.map(canonicalGraduateName))];
}

/** Valeurs exactes à rechercher dans guest_of, y compris avant la correction. */
export function storedGraduateNames(name: string): string[] {
  const canonical = canonicalGraduateName(name);
  const former: Partial<Record<string, readonly string[]>> = FORMER_NAMES;
  return [canonical, ...(former[canonical] ?? [])];
}
