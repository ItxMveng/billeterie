import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  Clock,
  ArrowRight,
  Users,
  Sparkles,
  Camera,
  HeartHandshake,
  GraduationCap,
  Award,
  QrCode,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { EventService, type ResolvedEvent } from '@/features/events/EventService';
import { associationConfig } from '@/config/event.config';
import { formatDate } from '@/lib/utils';
import { SmartImage } from '@/components/ui/SmartImage';
import { BrandLogo } from '@/components/ui/BrandLogo';

/* -------------------------------------------------------------------------- */
/* Contenu — modifiable sans toucher à la mise en page                        */
/* -------------------------------------------------------------------------- */

/** Promotion mise à l'honneur (année universitaire écoulée). */
const PROMOTION = '2025-2026';

const PILIERS = [
  { icon: GraduationCap, color: 'navy', title: 'Célébrer', text: 'Mettre à l’honneur la réussite de chaque diplômé.' },
  { icon: HeartHandshake, color: 'brand', title: 'Rassembler', text: 'Diplômés, familles et amis réunis pour l’occasion.' },
  { icon: Sparkles, color: 'navy', title: 'Inspirer', text: 'Montrer aux plus jeunes où mène le parcours.' },
  { icon: Users, color: 'brand', title: 'Rester connectés', text: 'Le diplôme en poche, la communauté reste là.' },
] as const;

// Déroulé de la soirée : l'heure de début vient de l'événement (base).
const PROGRAMME = [
  { title: 'Accueil des invités', text: 'Installation des diplômés et de leurs proches.' },
  { title: "Mot d'ouverture", text: 'Discours du bureau CPBA.' },
  { title: 'Témoignages', text: 'Des diplômés racontent leur parcours.' },
  { title: 'Remise des diplômes', text: 'Chaque diplômé est appelé sur scène.' },
  { title: 'Photo de promotion', text: 'Photo officielle, puis photos avec les proches.' },
  { title: 'Cocktail', text: 'Un moment convivial pour clôturer la soirée.' },
];

/** Qui peut s'inscrire — même ordre que le formulaire d'inscription. */
const CATEGORIES = [
  { icon: GraduationCap, label: 'Diplômés', text: `Promotion ${PROMOTION}.` },
  { icon: HeartHandshake, label: 'Familles / Invités des diplômés', text: 'Parents, proches et amis invités par un diplômé.' },
  { icon: Award, label: 'Invités CPBA', text: 'Personnalités et partenaires conviés par CPBA.' },
  { icon: Users, label: 'Étudiants', text: 'Venus applaudir la promotion.' },
];

const RAISONS = [
  { icon: Award, title: 'Célébrer la réussite', text: 'Des années d’efforts méritent une vraie cérémonie.' },
  { icon: HeartHandshake, title: 'Partager avec ses proches', text: 'Familles et amis sont conviés à ce moment.' },
  { icon: Sparkles, title: 'Inspirer la relève', text: 'Chaque parcours motive ceux qui arrivent.' },
  { icon: Camera, title: 'Garder un souvenir', text: 'Photo de promo et moments à immortaliser.' },
];



const FAQ = [
  {
    q: 'Qui peut participer à la cérémonie ?',
    a: `Les diplômés de la promotion ${PROMOTION}, les familles et invités des diplômés, les invités CPBA, ainsi que les étudiants.`,
  },
  {
    q: 'Je suis diplômé(e), dois-je aussi inscrire mes proches ?',
    a: 'Oui : chaque personne présente a besoin de son propre billet. Vos proches s’inscrivent dans la catégorie « Famille / Invité(e) des diplômés » et indiquent votre nom.',
  },
  {
    q: 'Comment obtiendrai-je mon billet ?',
    a: "Immédiatement. Dès que vous validez le formulaire, votre billet avec QR code est disponible dans votre espace personnel, accessible via le lien privé reçu à l'inscription. Vous pouvez aussi le télécharger en PDF.",
  },
  {
    q: "Comment se déroule l'entrée le jour J ?",
    a: "Présentez le QR code de votre billet. Un agent le scanne et votre entrée est validée immédiatement.",
  },
  {
    q: "J'ai perdu mon lien d'accès, que faire ?",
    a: "Écrivez-nous depuis l'adresse email utilisée lors de l'inscription. Par sécurité, le lien ne peut pas être retrouvé publiquement.",
  },
];

/* -------------------------------------------------------------------------- */

export function LandingPage() {
  const [event, setEvent] = useState<ResolvedEvent | null>(null);

  useEffect(() => {
    void EventService.getActiveEvent().then(setEvent);
  }, []);

  const startLabel = event?.startTime ? formatTime(event.startTime) : null;

  return (
    <>
      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div className="absolute inset-0 -z-20">
          <SmartImage
            src="/images/hero.jpg"
            alt="Membres CPBA et invités réunis autour des drapeaux du Cameroun et de la France"
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
            <Eyebrow light>Remise des diplômes · Promotion {PROMOTION}</Eyebrow>

            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Bravo
              <span className="mt-1 block text-brand-400">à nos diplômés !</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy-100">
              Une soirée pour célébrer la réussite des diplômés de la promotion{' '}
              {PROMOTION}, entourés de leurs familles, de leurs amis et de toute
              la communauté.
            </p>

            {/* Infos clés */}
            <div className="mt-9 flex flex-wrap gap-4">
              <InfoCard
                icon={CalendarDays}
                title={event ? formatDate(event.date) : '—'}
                subtitle={startLabel ? `À partir de ${startLabel}` : 'Horaire à confirmer'}
              />
              <InfoCard
                icon={MapPin}
                title={event?.location || 'Lieu à confirmer'}
                subtitle="Lieu de la cérémonie"
              />
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <CtaPrimary to="/inscription">S'inscrire</CtaPrimary>
              <CtaGhost to="#ceremonie">En savoir plus</CtaGhost>
            </div>
          </div>

          {/* Annotation manuscrite */}
          <p
            aria-hidden="true"
            className="pointer-events-none absolute bottom-12 right-6 hidden max-w-[15rem] -rotate-6 text-right text-brand-300 lg:block"
          >
            <span className="handwritten text-3xl">
              Des années d'efforts,<br />une soirée de fierté !
            </span>
            <Squiggle className="ml-auto mt-1 w-40 text-brand-400" />
          </p>
        </div>
      </section>

      {/* ═══════════════════════ À PROPOS ═══════════════════════ */}
      <section id="ceremonie" className="scroll-mt-20 bg-cream py-20 lg:py-28">
        <div className="container grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Eyebrow>Une soirée de fierté</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-navy-900 sm:text-5xl">
              Plus qu'une cérémonie,
              <br />
              un aboutissement !
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-navy-700">
              Diplômés de la promotion {PROMOTION}, familles, invités et
              étudiants : cette soirée est faite pour vous. Ensemble, nous
              célébrons des années de travail, d'entraide et de persévérance.
            </p>
          </div>

          {/* Collage type polaroid */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="rotate-2 rounded-3xl bg-white p-3 shadow-lift transition-transform duration-300 motion-safe:hover:rotate-0">
              <SmartImage
                src="/images/village.jpg"
                alt="Étudiants CPBA en tenues traditionnelles camerounaises"
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
      <section id="programme" className="scroll-mt-20 bg-navy-950 py-20 text-white lg:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <Eyebrow light>Le programme</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Le déroulé de la soirée
            </h2>
          </div>

          {/* Repères clés */}
          <div className="mt-8 flex flex-wrap gap-3">
            <KeyFact icon={CalendarDays}>{event ? formatDate(event.date) : '—'}</KeyFact>
            <KeyFact icon={Clock}>{startLabel ?? 'Horaire à confirmer'}</KeyFact>
            <KeyFact icon={MapPin}>{event?.location || 'Lieu à confirmer'}</KeyFact>
          </div>

          {/* Étapes numérotées */}
          <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMME.map((step, i) => (
              <li key={step.title} className="bg-navy-950 p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-4xl font-extrabold text-brand-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {i === 0 && startLabel && (
                    <span className="rounded-full bg-brand-500/20 px-3 py-1 text-sm font-semibold text-brand-200">
                      {startLabel}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-navy-200">{step.text}</p>
              </li>
            ))}
          </ol>

          {/* Qui peut s'inscrire */}
          <div id="categories" className="mt-20 scroll-mt-20">
            <Eyebrow light>Les inscriptions</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Qui peut s'inscrire ?
            </h2>
            <p className="mt-3 max-w-xl text-navy-200">
              Chaque personne présente doit avoir son propre billet.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map(({ icon: Icon, label, text }, i) => (
                <li
                  key={label}
                  className={'rounded-3xl p-6 ' + (i === 0 ? 'bg-brand-500 text-white' : 'bg-white text-navy-900')}
                >
                  <span
                    className={
                      'inline-flex h-12 w-12 items-center justify-center rounded-2xl ' +
                      (i === 0 ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-600')
                    }
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold">{label}</h3>
                  <p className={'mt-1 text-sm leading-relaxed ' + (i === 0 ? 'text-white/90' : 'text-navy-600')}>
                    {text}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <CtaPrimary to="/inscription">S'inscrire</CtaPrimary>
            </div>
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
                alt="Membres CPBA réunis à l'ENIB"
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
                Ici, chaque diplôme est<br />une victoire collective.
              </span>
            </p>
          </div>

          <div className="order-1 lg:order-2">
            <Eyebrow>Pourquoi venir ?</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
              Parce qu'une réussite, ça se fête ensemble !
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

      {/* ═══════════════════════ À PROPOS : CPBA ═══════════════════════ */}
      <section id="a-propos" className="scroll-mt-20 bg-navy-50 py-20 lg:py-24">
        <div className="container grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative">
            <div className="overflow-hidden rounded-4xl shadow-lift">
              <SmartImage
                src="/images/association.jpg"
                alt="Membres CPBA réunis"
                caption="public/images/association.jpg"
                tone="navy"
                className="aspect-[16/10]"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute -bottom-5 -right-4 hidden h-24 w-24 rounded-3xl bg-brand-500/90 lg:block"
            />
          </div>

          <div>
            <Eyebrow>À propos</Eyebrow>
            <div className="mt-5 flex items-center gap-4">
              <BrandLogo size={64} rounded="rounded-2xl" className="shadow-soft" />
              <div>
                <h2 className="font-display text-4xl font-bold leading-none text-navy-900">
                  {associationConfig.shortName}
                </h2>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-brand-600">
                  {associationConfig.name}
                </p>
              </div>
            </div>
            <p className="mt-6 leading-relaxed text-navy-700">
              C'est avant tout un réseau professionnel qui rassemble des
              personnes de divers horizons autour d'une vision commune du
              développement : mettre en commun les ressources de chacun pour
              permettre à tous de rayonner ensemble.
            </p>
            <p className="mt-4 leading-relaxed text-navy-700">
              CPBA incarne l'espoir et l'opportunité pour de nombreux étudiants
              talentueux, en Afrique comme en France.
            </p>
            <p className="mt-4 leading-relaxed text-navy-600">
              Grâce à des partenariats solides entre des écoles d'Afrique et de
              France, nous ouvrons les portes de l'éducation, de la croissance
              personnelle et de la réussite professionnelle.
            </p>
            <p className="mt-6">
              <span className="handwritten text-2xl text-brand-600">
                Une communauté, un avenir.
              </span>
            </p>
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
              <Eyebrow light center>Promotion {PROMOTION}</Eyebrow>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                {event ? `Rejoignez-nous le ${formatDate(event.date)} pour célébrer nos diplômés !` : 'Rejoignez-nous pour célébrer nos diplômés !'}
              </h2>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <CtaPrimary to="/inscription">S'inscrire</CtaPrimary>
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

function KeyFact({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium">
      <Icon className="h-4 w-4 text-brand-300" aria-hidden="true" />
      {children}
    </span>
  );
}

/** « 20:00:00 » → « 20h00 ». */
function formatTime(time: string): string {
  return time.slice(0, 5).replace(':', 'h');
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
