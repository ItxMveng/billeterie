import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  ArrowRight,
  Users,
  Sparkles,
  Music,
  HeartHandshake,
  GraduationCap,
  UserRound,
  Rocket,
  QrCode,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { EventService, type ResolvedEvent } from '@/features/events/EventService';
import { associationConfig } from '@/config/event.config';
import { formatDate, formatMoney } from '@/lib/utils';
import { SmartImage } from '@/components/ui/SmartImage';

/* -------------------------------------------------------------------------- */
/* Contenu — modifiable sans toucher à la mise en page                        */
/* -------------------------------------------------------------------------- */

const PILIERS = [
  { icon: Users, color: 'navy', title: 'Rencontres', text: 'Fais connaissance avec ta promo et ton école.' },
  { icon: Sparkles, color: 'brand', title: 'Découvertes', text: 'Explore les assos, les services et les opportunités.' },
  { icon: Music, color: 'navy', title: 'Animations', text: 'Une ambiance conviviale et festive toute la journée.' },
  { icon: HeartHandshake, color: 'brand', title: "Esprit d'équipe", text: 'Ensemble, on va plus loin.' },
] as const;

const PROGRAMME = [
  { time: 'À confirmer', title: 'Accueil des participants', text: 'Émargement et remise des badges.' },
  { time: 'À confirmer', title: "Mot de l'association", text: "Présentation des activités de l'année." },
  { time: 'À confirmer', title: 'Présentation des écoles', text: "Parcours, conseils et retours d'expérience." },
  { time: 'À confirmer', title: 'Moment convivial', text: 'Rencontres entre promotions.' },
];

const RAISONS = [
  { icon: HeartHandshake, title: 'Créer des liens', text: 'Rencontre des personnes qui partagent ton parcours.' },
  { icon: Sparkles, title: 'Découvrir', text: 'Explore ton environnement et les opportunités.' },
  { icon: Rocket, title: "T'amuser", text: 'Profite d\'une journée festive et conviviale.' },
  { icon: Users, title: "T'engager", text: 'Participe à la vie de ta communauté.' },
];

const FAQ = [
  {
    q: 'Qui peut participer à la cérémonie ?',
    a: "Les nouveaux étudiants, les anciens étudiants et les invités. Chaque catégorie a ses propres modalités d'inscription.",
  },
  {
    q: "L'inscription est-elle payante ?",
    a: "Elle est gratuite pour les nouveaux étudiants, après vérification de leur statut. Elle est payante pour les anciens étudiants et les invités.",
  },
  {
    q: 'Comment obtiendrai-je mon billet ?',
    a: "Après validation, votre billet avec QR code apparaît dans votre espace personnel, accessible via le lien privé reçu à l'inscription.",
  },
  {
    q: "Comment se déroule l'entrée le jour J ?",
    a: "Présentez le QR code de votre billet. Un agent le scanne et votre entrée est validée immédiatement.",
  },
  {
    q: "J'ai perdu mon lien d'accès, que faire ?",
    a: "Contactez l'association avec l'adresse email utilisée lors de l'inscription. Par sécurité, le lien ne peut pas être retrouvé publiquement.",
  },
];

/* -------------------------------------------------------------------------- */

export function LandingPage() {
  const [event, setEvent] = useState<ResolvedEvent | null>(null);

  useEffect(() => {
    void EventService.getActiveEvent().then(setEvent);
  }, []);

  const categories = [
    {
      icon: GraduationCap,
      label: 'Nouveaux étudiants',
      text: "Découvre ton école, obtiens tes infos et rencontre ta promo.",
      badge: 'Inscription gratuite',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      iconClass: 'bg-navy-100 text-navy-700',
      featured: true,
    },
    {
      icon: Users,
      label: 'Anciens étudiants',
      text: 'Retrouve tes anciens camarades et reste connecté à la communauté.',
      badge: event ? formatMoney(event.alumniPriceCents, event.currency) : 'Payant',
      badgeClass: 'bg-brand-100 text-brand-800',
      iconClass: 'bg-brand-100 text-brand-600',
      featured: false,
    },
    {
      icon: UserRound,
      label: 'Autres / Invités',
      text: 'Partenaires, familles, amis… vous êtes les bienvenus !',
      badge: event ? formatMoney(event.otherPriceCents, event.currency) : 'Payant',
      badgeClass: 'bg-navy-100 text-navy-800',
      iconClass: 'bg-navy-100 text-navy-600',
      featured: false,
    },
  ];

  return (
    <>
      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div className="absolute inset-0 -z-20">
          <SmartImage
            src="/images/hero.jpg"
            alt="Étudiants réunis lors de la cérémonie d'accueil"
            caption="Ajoutez public/images/hero.jpg"
            tone="mixed"
            className="h-full w-full"
          />
        </div>
        {/* Voile pour garantir la lisibilité du texte (contraste AA) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-950/50"
        />
        <div aria-hidden="true" className="grain absolute inset-0 -z-10" />

        <div className="container relative py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl animate-fade-up">
            <Eyebrow light>Événement de bienvenue</Eyebrow>

            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Bienvenue
              <span className="mt-1 block text-brand-400">dans l'aventure !</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy-100">
              Une journée pour faire connaissance, découvrir la vie étudiante et
              partager un moment convivial avec toute la communauté.
            </p>

            {/* Infos clés */}
            <div className="mt-9 flex flex-wrap gap-4">
              <InfoCard
                icon={CalendarDays}
                title={event ? formatDate(event.date) : 'Date à confirmer'}
                subtitle={event?.isPlaceholder ? 'à confirmer' : 'Journée complète'}
              />
              <InfoCard
                icon={MapPin}
                title={event?.location ?? 'Lieu à confirmer'}
                subtitle="Lieu de la cérémonie"
              />
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <CtaPrimary to="/inscription">Je m'inscris maintenant</CtaPrimary>
              <CtaGhost to="#a-propos">En savoir plus</CtaGhost>
            </div>
          </div>

          {/* Annotation manuscrite */}
          <p
            aria-hidden="true"
            className="pointer-events-none absolute bottom-12 right-6 hidden max-w-[15rem] -rotate-6 text-right text-brand-300 lg:block"
          >
            <span className="handwritten text-3xl">
              De nouveaux visages,<br />les mêmes valeurs !
            </span>
            <Squiggle className="ml-auto mt-1 w-40 text-brand-400" />
          </p>
        </div>
      </section>

      {/* ═══════════════════════ À PROPOS ═══════════════════════ */}
      <section id="a-propos" className="scroll-mt-20 bg-cream py-20 lg:py-28">
        <div className="container grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Eyebrow>Un événement pour tous</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-navy-900 sm:text-5xl">
              Plus qu'une rencontre,
              <br />
              une vraie expérience !
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-navy-700">
              Que tu sois nouvel étudiant, ancien ou simplement invité, cette
              journée est faite pour toi. Profite d'un moment unique pour
              t'informer, échanger et créer des liens durables.
            </p>
            <p className="mt-4 max-w-lg leading-relaxed text-navy-600">
              {associationConfig.shortDescription}
            </p>
          </div>

          {/* Collage type polaroid */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="rotate-2 rounded-3xl bg-white p-3 shadow-lift transition-transform duration-300 motion-safe:hover:rotate-0">
              <SmartImage
                src="/images/village.jpg"
                alt="Village des associations lors de l'événement"
                caption="public/images/village.jpg"
                tone="navy"
                className="aspect-[4/3] rounded-2xl"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-8 -left-6 hidden w-40 -rotate-6 rounded-2xl bg-white p-2 shadow-soft sm:block"
            >
              <SmartImage
                src="/images/ambiance.jpg"
                alt=""
                tone="brand"
                className="aspect-square rounded-xl"
              />
            </div>
            <p
              aria-hidden="true"
              className="absolute -right-2 -bottom-10 hidden text-right text-brand-600 lg:block"
            >
              <span className="handwritten text-2xl">
                Des échanges,<br />des sourires !
              </span>
            </p>
          </div>
        </div>

        {/* Piliers */}
        <div className="container mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PILIERS.map(({ icon: Icon, color, title, text }) => (
            <div key={title} className="group text-center sm:text-left">
              <span
                className={
                  'inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 motion-safe:group-hover:-translate-y-1 ' +
                  (color === 'brand'
                    ? 'bg-brand-100 text-brand-600'
                    : 'bg-navy-100 text-navy-700')
                }
              >
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-navy-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ PROGRAMME + CATÉGORIES ═══════════════════════ */}
      <section id="programme" className="scroll-mt-20 bg-navy-50 py-20 lg:py-28">
        <div className="container grid gap-16 lg:grid-cols-2">
          {/* Programme */}
          <div>
            <Eyebrow>Le programme</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
              Une journée riche en découvertes
            </h2>

            <ol className="mt-10">
              {PROGRAMME.map((item, i) => (
                <li key={item.title} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < PROGRAMME.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[9px] top-6 h-full w-[2px] bg-brand-200"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="relative mt-1.5 h-5 w-5 shrink-0 rounded-full border-[5px] border-brand-200 bg-brand-500"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-brand-600">
                      {item.time}
                    </p>
                    <h3 className="mt-0.5 font-semibold text-navy-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">
                      {item.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Catégories */}
          <div id="categories" className="scroll-mt-20">
            <Eyebrow>Les catégories</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
              Qui peut participer ?
            </h2>

            <ul className="mt-10 space-y-4">
              {categories.map(({ icon: Icon, label, text, badge, badgeClass, iconClass, featured }) => (
                <li
                  key={label}
                  className={
                    'relative rounded-3xl border bg-white p-6 shadow-soft transition-transform duration-200 motion-safe:hover:-translate-y-1 ' +
                    (featured ? 'border-brand-300 ring-1 ring-brand-200' : 'border-navy-100')
                  }
                >
                  <div className="flex items-start gap-4">
                    <span className={'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ' + iconClass}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold text-navy-900">
                        {label}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-navy-600">{text}</p>
                      <span className={'mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ' + badgeClass}>
                        {badge}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-xs text-navy-500">
              Montants indicatifs — le montant exact est confirmé au moment du paiement.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ POURQUOI VENIR ═══════════════════════ */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="container grid items-center gap-14 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="-rotate-2 overflow-hidden rounded-4xl shadow-lift transition-transform duration-300 motion-safe:hover:rotate-0">
              <SmartImage
                src="/images/groupe.jpg"
                alt="Groupe d'étudiants échangeant en extérieur"
                caption="public/images/groupe.jpg"
                tone="mixed"
                className="aspect-[4/3]"
              />
            </div>
            <p
              aria-hidden="true"
              className="absolute bottom-4 left-6 hidden max-w-[16rem] text-white lg:block"
            >
              <span className="handwritten text-2xl drop-shadow">
                Ici, tu n'es pas juste un étudiant,<br />tu fais partie d'une communauté.
              </span>
            </p>
          </div>

          <div className="order-1 lg:order-2">
            <Eyebrow>Pourquoi venir ?</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
              Parce que ta nouvelle vie commence ici !
            </h2>

            <div className="mt-10 grid gap-7 sm:grid-cols-2">
              {RAISONS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-navy-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Réassurance billetterie */}
            <div className="mt-10 flex flex-wrap gap-3">
              <Pill icon={QrCode}>Billet avec QR code</Pill>
              <Pill icon={ShieldCheck}>Entrée sécurisée</Pill>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section id="faq" className="scroll-mt-20 bg-white py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="text-center">
            <Eyebrow center>Questions</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
              Vous vous demandez peut-être…
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-navy-100 bg-cream px-5 py-4 transition-colors duration-200 open:border-brand-200 open:bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-navy-900 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
                  <span>{item.q}</span>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition-transform duration-200 group-open:rotate-180">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>
                <p className="mt-3 pr-12 text-sm leading-relaxed text-navy-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
      <section className="bg-white pb-20 lg:pb-28">
        <div className="container">
          <div className="relative isolate overflow-hidden rounded-4xl bg-navy-900 px-6 py-16 text-center sm:px-12">
            {/* Blobs décoratifs */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 text-brand-500/90"
              viewBox="0 0 200 200"
            >
              <path
                fill="currentColor"
                d="M42.7,-63.6C55.9,-56.5,67.3,-45.4,72.8,-31.9C78.3,-18.4,77.9,-2.5,74.1,12.4C70.3,27.3,63.1,41.2,52.1,52.3C41.1,63.4,26.3,71.7,10.3,75.1C-5.7,78.4,-22.9,76.8,-37.3,69.6C-51.7,62.4,-63.3,49.6,-70.2,34.8C-77.1,20,-79.3,3.2,-75.6,-11.8C-71.9,-26.8,-62.3,-40,-50.1,-47.9C-37.9,-55.8,-23.1,-58.4,-8.7,-61.3C5.7,-64.2,29.5,-70.7,42.7,-63.6Z"
                transform="translate(100 100)"
              />
            </svg>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -right-12 h-64 w-64 text-navy-500/70"
              viewBox="0 0 200 200"
            >
              <path
                fill="currentColor"
                d="M38.5,-57.9C51.8,-50.4,64.9,-41.7,71.2,-29.3C77.5,-16.9,77,-0.8,72.2,13C67.4,26.8,58.3,38.3,47.2,47.9C36.1,57.5,23,65.2,8.3,69.1C-6.4,73,-22.7,73.1,-35.9,66.6C-49.1,60.1,-59.2,47,-65.7,32.6C-72.2,18.2,-75.1,2.5,-72,-11.7C-68.9,-25.9,-59.8,-38.6,-47.8,-46.6C-35.8,-54.6,-20.9,-57.9,-6.3,-59.3C8.3,-60.7,25.2,-65.4,38.5,-57.9Z"
                transform="translate(100 100)"
              />
            </svg>
            <div aria-hidden="true" className="grain absolute inset-0" />

            <div className="relative">
              <Eyebrow light center>Prêt à vivre cette belle aventure ?</Eyebrow>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Rejoins-nous pour une journée inoubliable !
              </h2>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <CtaPrimary to="/inscription">Je m'inscris maintenant</CtaPrimary>
                <CtaGhost to="/mon-billet">J'ai déjà un billet</CtaGhost>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────── Sous-composants ─────────────────────────── */

function Eyebrow({
  children,
  light,
  center,
}: {
  children: React.ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <p
      className={
        'flex items-center gap-3 text-sm font-semibold uppercase tracking-wider ' +
        (light ? 'text-brand-300 ' : 'text-brand-600 ') +
        (center ? 'justify-center' : '')
      }
    >
      <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-brand-500" />
      {children}
    </p>
  );
}

function InfoCard({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof CalendarDays;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-navy-200">{subtitle}</p>
      </div>
    </div>
  );
}

function CtaPrimary({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-8 font-display text-base font-semibold text-white shadow-glow transition-transform duration-200 hover:bg-brand-600 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
    >
      {children}
      <ArrowRight
        className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

function CtaGhost({ to, children }: { to: string; children: React.ReactNode }) {
  const isAnchor = to.startsWith('#');
  const className =
    'inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-white/30 px-7 font-display text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950';
  return isAnchor ? (
    <a href={to} className={className}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof QrCode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700">
      <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
      {children}
    </span>
  );
}

function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 8c18-7 36 4 54-1s36-8 54-2 24 6 48 1"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
