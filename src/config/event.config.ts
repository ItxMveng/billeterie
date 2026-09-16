/**
 * Configuration de l'événement — valeurs de REPLI (bootstrap).
 *
 * Architecture prévue :
 *   1. Sprint 1 : ces valeurs de repli (issues des variables VITE_* ou de
 *      constantes clairement identifiées comme placeholders) alimentent la
 *      landing page tant qu'aucun événement n'existe en base.
 *   2. Sprint 2+ : `EventService.getActiveEvent()` renvoie l'événement réel
 *      depuis Supabase. La landing lit alors la base, et retombe sur cette
 *      config seulement en absence de données.
 *
 * ⚠️ Les prix définis ici NE SONT PAS une source de vérité fiable.
 *    Ils servent uniquement à l'affichage. Le montant réellement dû est
 *    déterminé côté serveur/base au moment du paiement (voir BUSINESS_RULES).
 */

interface EventConfig {
  /** Indique si une donnée est un placeholder non confirmé (à afficher comme tel). */
  isPlaceholder: boolean;
  name: string;
  date: string; // ISO (YYYY-MM-DD)
  /** Heure de début (HH:MM). */
  startTime: string;
  location: string;
  currency: string;
  /** Prix indicatifs en centimes (affichage uniquement). */
  alumniPriceCents: number;
  otherPriceCents: number;
}

function num(key: string, fallback: number): number {
  const raw = import.meta.env[key as keyof ImportMetaEnv];
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(key: string, fallback: string): string {
  const raw = import.meta.env[key as keyof ImportMetaEnv];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : fallback;
}

// Valeurs de repli explicitement marquées « à confirmer » : aucune donnée
// métier définitive n'est inventée ici.
const FALLBACK_NAME = "Cérémonie d'accueil";
const FALLBACK_LOCATION = '31 rue de Vendée, 29200 Brest';
const FALLBACK_DATE = '2026-10-03';
const FALLBACK_START = '19:00';

const name = str('VITE_EVENT_NAME', FALLBACK_NAME);
const location = str('VITE_EVENT_LOCATION', FALLBACK_LOCATION);
const date = str('VITE_EVENT_DATE', FALLBACK_DATE);

export const eventConfig: EventConfig = {
  // Les informations sont désormais confirmées : plus de mention « à confirmer ».
  isPlaceholder: false,
  name,
  date,
  startTime: str('VITE_EVENT_START_TIME', FALLBACK_START),
  location,
  currency: str('VITE_CURRENCY', 'EUR'),
  alumniPriceCents: num('VITE_ALUMNI_PRICE_CENTS', 2500),
  otherPriceCents: num('VITE_OTHER_PRICE_CENTS', 2500),
};

/**
 * Instructions de paiement Wero — configurables (placeholders tant que non
 * fournies). Le bénéficiaire/numéro réels doivent être renseignés via VITE_*.
 */
export const paymentConfig = {
  provider: 'Wero',
  beneficiary: str('VITE_WERO_BENEFICIARY', 'Association (bénéficiaire à confirmer)'),
  phoneOrHandle: str('VITE_WERO_HANDLE', 'À confirmer'),
  instructions: str(
    'VITE_WERO_INSTRUCTIONS',
    "Effectuez le paiement via Wero au bénéficiaire indiqué, en précisant votre " +
      'référence de paiement, puis confirmez ci-dessous.',
  ),
  isPlaceholder:
    str('VITE_WERO_BENEFICIARY', '') === '' || str('VITE_WERO_HANDLE', '') === '',
};

/** Identité de l'association (informations confirmées). */
export const associationConfig = {
  isPlaceholder: false,
  name: 'Club-Pro Breizh Afriture',
  shortName: 'CPBA',
  shortDescription:
    "Le Club-Pro Breizh Afriture accompagne l'arrivée et l'intégration des " +
    'étudiants camerounais en Bretagne : entraide, rencontres et moments ' +
    'de partage tout au long de l\'année.',
  contactEmail: 'contact@cpba-community.org',
  address: '31 rue de Vendée, 29200 Brest',
};
