import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  UserPlus,
  Users,
  UserRound,
  QrCode,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Ticket,
} from 'lucide-react';
import { EventService, type ResolvedEvent } from '@/features/events/EventService';
import { associationConfig } from '@/config/event.config';
import { formatDate, formatMoney } from '@/lib/utils';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';

/* -------------------------------------------------------------------------- */
/* Contenu structuré — facilement modifiable (aucune donnée inventée).         */
/* -------------------------------------------------------------------------- */

const VALUE_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Gratuit pour les nouveaux',
    text: 'Les nouveaux étudiants participent gratuitement, après vérification de leur statut.',
  },
  {
    icon: QrCode,
    title: 'Billet numérique',
    text: 'Un billet avec QR code personnel, accessible depuis votre téléphone.',
  },
  {
    icon: Ticket,
    title: 'Entrée fluide',
    text: "Un scan à l'entrée et c'est tout. Pas de file d'attente interminable.",
  },
];

const PROGRAMME = [
  { time: 'À confirmer', title: 'Accueil des participants', text: 'Émargement et remise des badges.' },
  { time: 'À confirmer', title: "Mot de l'association", text: 'Présentation des activités de l\'année.' },
  { time: 'À confirmer', title: 'Présentation des écoles', text: 'Parcours, conseils et retours d\'expérience.' },
  { time: 'À confirmer', title: 'Moment convivial', text: 'Rencontres entre promotions.' },
];

const FAQ = [
  {
    q: 'Qui peut participer à la cérémonie ?',
    a: "Les nouveaux étudiants, les anciens étudiants et les invités. Chaque catégorie a ses propres modalités d'inscription.",
  },
  {
    q: "L'inscription est-elle payante ?",
    a: "Elle est gratuite pour les nouveaux étudiants (après vérification de leur statut). Elle est payante pour les anciens étudiants et les invités.",
  },
  {
    q: 'Comment obtiendrai-je mon billet ?',
    a: "Après validation (vérification pour les nouveaux, paiement confirmé pour les autres), votre billet avec QR code apparaît dans votre espace personnel, accessible via le lien privé reçu à l'inscription.",
  },
  {
    q: "Comment se déroule l'entrée le jour J ?",
    a: "Présentez le QR code de votre billet à l'entrée. Un agent le scanne et votre entrée est validée immédiatement.",
  },
  {
    q: "J'ai perdu mon lien d'accès, que faire ?",
    a: "Contactez l'association avec l'adresse email utilisée lors de l'inscription. Pour des raisons de sécurité, le lien ne peut pas être retrouvé publiquement.",
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
      icon: UserPlus,
      label: PARTICIPANT_TYPE_LABELS.NEW_STUDENT,
      price: 'Gratuit',
      text: 'Participation offerte, sur inscription et après vérification de votre statut.',
      highlight: true,
    },
    {
      icon: Users,
      label: PARTICIPANT_TYPE_LABELS.ALUMNI,
      price: event ? formatMoney(event.alumniPriceCents, event.currency) : '—',
      text: "Participation payante. Indiquez votre ancienne école lors de l'inscription.",
      highlight: false,
    },
    {
      icon: UserRound,
      label: PARTICIPANT_TYPE_LABELS.OTHER,
      price: event ? formatMoney(event.otherPriceCents, event.currency) : '—',
      text: 'Participation payante, ouverte aux invités et sympathisants.',
      highlight: false,
    },
  ];

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="relative isolate overflow-hidden bg-brand-900">
        {/* Halos décoratifs — purement visuels */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_70%_-10%,rgba(20,184,166,0.35),transparent),radial-gradient(40rem_30rem_at_10%_110%,rgba(45,212,191,0.25),transparent)]"
        />
        {/* Grille subtile */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
        />

        <div className="container py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-50 backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Cérémonie d'accueil des étudiants camerounais
            </p>

            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
              {event?.name ?? "Cérémonie d'accueil"}
            </h1>
            {event?.isPlaceholder && (
              <p className="mt-3 text-sm text-brand-200">
                (informations définitives à confirmer)
              </p>
            )}

            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-brand-100">
              Une soirée pour accueillir les nouveaux arrivants, retrouver les
              anciens et démarrer l'année entouré.
            </p>

            {/* Informations clés */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <HeroChip icon={CalendarDays} text={event ? formatDate(event.date) : 'Date à confirmer'} />
              <HeroChip icon={MapPin} text={event?.location ?? 'Lieu à confirmer'} />
            </div>

            {/* CTA : une seule action primaire */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/inscription"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-brand-800 shadow-lg shadow-brand-950/30 transition-transform duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 sm:w-auto"
              >
                Je m'inscris
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                to="/mon-billet"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/25 px-6 text-base font-medium text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 sm:w-auto"
              >
                J'ai déjà un billet
              </Link>
            </div>

            <p className="mt-5 text-sm text-brand-200">
              Inscription en 2 minutes · Billet avec QR code
            </p>
          </div>
        </div>

        {/* Transition douce vers la section suivante */}
        <div aria-hidden="true" className="h-16 bg-gradient-to-b from-transparent to-slate-50" />
      </section>

      {/* ==================== POINTS CLÉS ==================== */}
      <section className="container -mt-8 pb-4">
        <ul className="grid gap-4 sm:grid-cols-3">
          {VALUE_POINTS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <span className="inline-flex rounded-xl bg-brand-50 p-2.5">
                <Icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ==================== PRÉSENTATION ==================== */}
      <section className="container grid gap-10 py-16 md:grid-cols-2 md:gap-14 lg:py-20">
        <div>
          <SectionEyebrow>La cérémonie</SectionEyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Un accueil, pas une formalité
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Cette cérémonie marque l'arrivée des nouveaux étudiants et favorise
            les rencontres entre promotions. C'est l'occasion de poser ses
            questions, de trouver des repères et de rencontrer celles et ceux qui
            sont déjà passés par là.
          </p>
          <p className="mt-3 leading-relaxed text-slate-600">
            Le déroulé détaillé sera précisé prochainement.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-6 sm:p-8">
          <SectionEyebrow>L'association</SectionEyebrow>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {associationConfig.name}
          </h2>
          {associationConfig.isPlaceholder && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Informations à confirmer
            </p>
          )}
          <p className="mt-4 leading-relaxed text-slate-700">
            {associationConfig.shortDescription}
          </p>
        </div>
      </section>

      {/* ==================== CATÉGORIES ==================== */}
      <section className="border-y border-slate-200 bg-white">
        <div className="container py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow center>Participer</SectionEyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Trois façons de nous rejoindre
            </h2>
            <p className="mt-3 text-slate-600">
              Choisissez votre profil lors de l'inscription : les étapes
              s'adaptent automatiquement.
            </p>
          </div>

          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {categories.map(({ icon: Icon, label, price, text, highlight }) => (
              <li
                key={label}
                className={
                  'relative flex flex-col rounded-2xl border bg-white p-6 transition-transform duration-200 motion-safe:hover:-translate-y-1 ' +
                  (highlight
                    ? 'border-brand-300 shadow-lg shadow-brand-900/5 ring-1 ring-brand-200'
                    : 'border-slate-200 shadow-sm hover:shadow-md')
                }
              >
                {highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white">
                    Le plus courant
                  </span>
                )}
                <span
                  className={
                    'inline-flex w-fit rounded-xl p-3 ' +
                    (highlight ? 'bg-brand-700' : 'bg-brand-50')
                  }
                >
                  <Icon
                    className={'h-6 w-6 ' + (highlight ? 'text-white' : 'text-brand-700')}
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{label}</h3>
                <p className="mt-1 text-2xl font-bold tracking-tight text-brand-800">
                  {price}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{text}</p>
                <Link
                  to="/inscription"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-800 transition-colors duration-200 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  S'inscrire
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-xs text-slate-500">
            Montants indicatifs — le montant exact est confirmé au moment du paiement.
          </p>
        </div>
      </section>

      {/* ==================== PROGRAMME ==================== */}
      <section className="container py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow center>Déroulé</SectionEyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Programme</h2>
          <p className="mt-3 text-sm text-slate-500">
            Horaires provisoires — susceptibles d'évoluer.
          </p>
        </div>

        <ol className="mx-auto mt-10 max-w-2xl">
          {PROGRAMME.map((item, i) => (
            <li key={item.title} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Ligne de liaison */}
              {i < PROGRAMME.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[11px] top-6 h-full w-px bg-slate-200"
                />
              )}
              <span
                aria-hidden="true"
                className="relative mt-1.5 h-[23px] w-[23px] shrink-0 rounded-full border-4 border-brand-100 bg-brand-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {item.time}
                </p>
                <h3 className="mt-0.5 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="border-t border-slate-200 bg-white">
        <div className="container py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow center>Questions</SectionEyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Questions fréquentes
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-2xl divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-1 text-left font-medium text-slate-900 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                  <span>{item.q}</span>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-2 pr-9 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="relative isolate overflow-hidden bg-brand-800">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40rem_25rem_at_50%_0%,rgba(20,184,166,0.4),transparent)]"
        />
        <div className="container py-16 text-center lg:py-20">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Participer à la cérémonie
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-brand-100">
            Réservez votre place dès maintenant — quelques minutes suffisent.
          </p>
          <Link
            to="/inscription"
            className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-brand-800 shadow-lg shadow-brand-950/30 transition-transform duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
          >
            Je m'inscris
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function HeroChip({
  icon: Icon,
  text,
}: {
  icon: typeof CalendarDays;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
      <Icon className="h-4 w-4 text-brand-200" aria-hidden="true" />
      {text}
    </span>
  );
}

function SectionEyebrow({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <p
      className={
        'text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 ' +
        (center ? 'text-center' : '')
      }
    >
      {children}
    </p>
  );
}
