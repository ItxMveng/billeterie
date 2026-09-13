import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  GraduationCap,
  UserPlus,
  Users,
  UserRound,
} from 'lucide-react';
import { EventService, type ResolvedEvent } from '@/features/events/EventService';
import { associationConfig } from '@/config/event.config';
import { formatDate } from '@/lib/utils';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const CATEGORIES = [
  {
    icon: UserPlus,
    label: PARTICIPANT_TYPE_LABELS.NEW_STUDENT,
    text: "Participation gratuite, sur inscription et après vérification du statut.",
  },
  {
    icon: Users,
    label: PARTICIPANT_TYPE_LABELS.ALUMNI,
    text: "Participation payante. Possibilité d'indiquer son ancienne école.",
  },
  {
    icon: UserRound,
    label: PARTICIPANT_TYPE_LABELS.OTHER,
    text: 'Participation payante, ouverte aux invités et sympathisants.',
  },
];

// Programme : structure facilement modifiable (placeholders assumés).
const PROGRAMME = [
  { time: 'À confirmer', title: 'Accueil des participants' },
  { time: 'À confirmer', title: "Mot de l'association" },
  { time: 'À confirmer', title: 'Présentation des écoles et parcours' },
  { time: 'À confirmer', title: 'Moment convivial / networking' },
];

const FAQ = [
  {
    q: 'Qui peut participer à la cérémonie ?',
    a: 'Les nouveaux étudiants, les anciens étudiants et les invités. Chaque catégorie a ses propres modalités d\'inscription.',
  },
  {
    q: 'L\'inscription est-elle payante ?',
    a: 'Elle est gratuite pour les nouveaux étudiants (après vérification). Elle est payante pour les anciens étudiants et les invités.',
  },
  {
    q: 'Comment obtiendrai-je mon billet ?',
    a: 'Le billet avec QR code sera émis après validation (vérification pour les nouveaux, paiement pour les autres). Cette étape arrive dans une prochaine version.',
  },
  {
    q: 'Comment se déroulera l\'entrée le jour J ?',
    a: 'L\'entrée se fera par scan du QR code du billet. Le module de contrôle sera disponible ultérieurement.',
  },
];

export function LandingPage() {
  const [event, setEvent] = useState<ResolvedEvent | null>(null);

  useEffect(() => {
    void EventService.getActiveEvent().then(setEvent);
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="brand" className="mb-4">
              <GraduationCap className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Cérémonie d'accueil
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {event?.name ?? 'Cérémonie d\'accueil'}
              {event?.isPlaceholder && (
                <span className="ml-2 align-middle text-xs font-normal text-amber-600">
                  (à confirmer)
                </span>
              )}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              Un moment pour accueillir et accompagner les étudiants camerounais
              arrivant dans les différentes écoles.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {event ? formatDate(event.date) : '—'}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {event?.location ?? 'Lieu à confirmer'}
              </span>
            </div>

            <div className="mt-8">
              <Link
                to="/inscription"
                className="inline-flex h-12 items-center rounded-lg bg-brand-700 px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                Je m'inscris
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRÉSENTATION CÉRÉMONIE + ASSOCIATION */}
      <section className="container grid gap-8 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">La cérémonie</h2>
          <p className="mt-3 text-slate-600">
            Cette cérémonie marque l'arrivée des nouveaux étudiants et favorise
            les rencontres entre nouvelles et anciennes promotions. Le contenu
            détaillé sera précisé prochainement.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            L'association
            {associationConfig.isPlaceholder && (
              <span className="ml-2 text-xs font-normal text-amber-600">
                (informations à confirmer)
              </span>
            )}
          </h2>
          <p className="mt-3 text-slate-600">{associationConfig.shortDescription}</p>
        </div>
      </section>

      {/* CATÉGORIES */}
      <section className="border-y border-slate-200 bg-white">
        <div className="container py-16">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Catégories de participants
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CATEGORIES.map(({ icon: Icon, label, text }) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <Icon className="h-8 w-8 text-brand-700" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
                    {label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMME */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold text-slate-900">Programme</h2>
        <p className="mt-1 text-sm text-slate-500">
          Horaires provisoires — susceptibles d'évoluer.
        </p>
        <ol className="mt-6 space-y-3">
          {PROGRAMME.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <span className="w-28 shrink-0 text-sm font-medium text-brand-700">
                {item.time}
              </span>
              <span className="text-slate-800">{item.title}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-white">
        <div className="container py-16">
          <h2 className="text-2xl font-bold text-slate-900">Questions fréquentes</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-lg border border-slate-200 bg-white p-4"
              >
                <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-brand-700">
        <div className="container py-14 text-center">
          <h2 className="text-2xl font-bold text-white">
            Participer à la cérémonie
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-brand-50">
            Réservez votre place dès maintenant.
          </p>
          <div className="mt-6">
            <Link
              to="/inscription"
              className="inline-flex h-12 items-center rounded-lg bg-white px-8 text-base font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            >
              Je m'inscris
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
