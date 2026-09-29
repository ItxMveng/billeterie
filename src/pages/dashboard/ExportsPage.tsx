import { useState } from 'react';
import { Download, Users, CreditCard, ScanLine, ClipboardList } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { PaymentService } from '@/features/payments/PaymentService';
import { SchoolService } from '@/features/schools/SchoolService';
import { TicketService } from '@/features/tickets/TicketService';
import { EventService } from '@/features/events/EventService';
import { toCsv, downloadCsv } from '@/lib/export-csv';
import { AppError } from '@/lib/errors';
import { formatDateTime, formatDateShort } from '@/lib/utils';
import {
  PARTICIPANT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
} from '@/types/enums';
import type { ParticipantRow, PaymentWithParticipant } from '@/types/database';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ForbiddenState } from '@/components/common/ForbiddenState';
import { useToast } from '@/components/ui/useToast';

/* ── Libellés lisibles ─────────────────────────────────────────────────── */

const TICKET_LABELS: Record<string, string> = {
  GENERATED: 'Émis',
  CANCELLED: 'Annulé',
  NOT_GENERATED: 'Non émis',
};
const SOURCE_LABELS: Record<string, string> = {
  PUBLIC: 'Inscription en ligne',
  IMPORT: 'Import',
};
const oui = (b: boolean | null | undefined) => (b ? 'Oui' : 'Non');

/** Contexte partagé par tous les exports (écoles, billets, événement). */
async function loadContext() {
  const [schools, tickets, event] = await Promise.all([
    SchoolService.listAll(),
    TicketService.listAll(),
    EventService.getActiveEvent(),
  ]);
  const schoolById = new Map(schools.map((s) => [s.id, s.short_name || s.name]));
  const ticketByParticipant = new Map(
    tickets
      .filter((t) => t.status !== 'CANCELLED')
      .map((t) => [t.participant_id, t.ticket_number]),
  );
  return { schoolById, ticketByParticipant, event };
}

/** Horodatage compact pour les noms de fichiers : 2026-10-03_19-30. */
function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

export function ExportsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!can('exports:read')) return <ForbiddenState />;

  const run = async (key: string, label: string, fn: () => Promise<number>) => {
    setBusy(key);
    try {
      const count = await fn();
      toast.success(`${count} ligne(s) exportée(s).`, label);
    } catch (e) {
      toast.error(e instanceof AppError ? e.userMessage : 'Export impossible.');
    } finally {
      setBusy(null);
    }
  };

  /* ── 1. Participants — export complet ──────────────────────────────── */
  const exportParticipants = () =>
    run('participants', 'Participants', async () => {
      const [rows, ctx] = await Promise.all([
        ParticipantService.search({}, 5000),
        loadContext(),
      ]);
      const csv = toCsv<ParticipantRow>(rows, [
        { key: 'ticket', header: 'N° de billet', format: (r) => ctx.ticketByParticipant.get(r.id) ?? '' },
        { key: 'last_name', header: 'Nom', format: (r) => r.last_name.toUpperCase() },
        { key: 'first_name', header: 'Prénom' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Téléphone' },
        { key: 'participant_type', header: 'Catégorie', format: (r) => PARTICIPANT_TYPE_LABELS[r.participant_type] },
        { key: 'school', header: 'École', format: (r) => (r.school_id ? ctx.schoolById.get(r.school_id) ?? '' : '') },
        { key: 'external_identifier', header: 'N° étudiant' },
        { key: 'registration_status', header: 'Inscription', format: (r) => REGISTRATION_STATUS_LABELS[r.registration_status] },
        { key: 'verification_status', header: 'Vérification', format: (r) => VERIFICATION_STATUS_LABELS[r.verification_status] },
        { key: 'payment_required', header: 'Paiement requis', format: (r) => oui(r.payment_required) },
        { key: 'payment_status', header: 'Statut paiement', format: (r) => PAYMENT_STATUS_LABELS[r.payment_status] },
        { key: 'payment_reference', header: 'Réf. paiement' },
        { key: 'ticket_status', header: 'Statut billet', format: (r) => TICKET_LABELS[r.ticket_status] ?? r.ticket_status },
        { key: 'checked_in', header: 'Entré', format: (r) => oui(r.checked_in) },
        { key: 'checked_in_at', header: "Heure d'entrée", format: (r) => formatDateTime(r.checked_in_at) },
        { key: 'source', header: 'Origine', format: (r) => SOURCE_LABELS[r.source] ?? r.source },
        { key: 'created_at', header: 'Inscrit le', format: (r) => formatDateTime(r.created_at) },
      ]);
      downloadCsv(`participants_${stamp()}.csv`, csv);
      return rows.length;
    });

  /* ── 2. Paiements ──────────────────────────────────────────────────── */
  const exportPayments = () =>
    run('payments', 'Paiements', async () => {
      const [rows, ctx] = await Promise.all([PaymentService.listAll(), loadContext()]);
      const csv = toCsv<PaymentWithParticipant>(rows, [
        { key: 'reference', header: 'Référence' },
        { key: 'nom', header: 'Nom', format: (r) => r.participant?.last_name.toUpperCase() ?? '' },
        { key: 'prenom', header: 'Prénom', format: (r) => r.participant?.first_name ?? '' },
        { key: 'email', header: 'Email', format: (r) => r.participant?.email ?? '' },
        { key: 'phone', header: 'Téléphone', format: (r) => r.participant?.phone ?? '' },
        { key: 'categorie', header: 'Catégorie', format: (r) => (r.participant ? PARTICIPANT_TYPE_LABELS[r.participant.participant_type] : '') },
        { key: 'ecole', header: 'École', format: (r) => (r.participant?.school_id ? ctx.schoolById.get(r.participant.school_id) ?? '' : '') },
        // Montant en nombre décimal : exploitable directement dans un tableur.
        { key: 'amount_cents', header: 'Montant', format: (r) => (r.amount_cents / 100).toFixed(2).replace('.', ',') },
        { key: 'currency', header: 'Devise' },
        { key: 'status', header: 'Statut', format: (r) => PAYMENT_STATUS_LABELS[r.status] },
        { key: 'provider', header: 'Moyen' },
        { key: 'created_at', header: 'Créé le', format: (r) => formatDateTime(r.created_at) },
        { key: 'confirmed_at', header: 'Confirmé le', format: (r) => formatDateTime(r.confirmed_at) },
      ]);
      downloadCsv(`paiements_${stamp()}.csv`, csv);
      return rows.length;
    });

  /* ── 3. Entrées (check-in) ─────────────────────────────────────────── */
  const exportCheckins = () =>
    run('checkins', 'Entrées', async () => {
      const [rows, ctx] = await Promise.all([
        ParticipantService.search({ checked_in: true }, 5000),
        loadContext(),
      ]);
      // Ordre chronologique d'arrivée.
      const sorted = [...rows].sort((a, b) =>
        (a.checked_in_at ?? '').localeCompare(b.checked_in_at ?? ''),
      );
      const csv = toCsv<ParticipantRow>(sorted, [
        { key: 'checked_in_at', header: "Heure d'entrée", format: (r) => formatDateTime(r.checked_in_at) },
        { key: 'ticket', header: 'N° de billet', format: (r) => ctx.ticketByParticipant.get(r.id) ?? '' },
        { key: 'last_name', header: 'Nom', format: (r) => r.last_name.toUpperCase() },
        { key: 'first_name', header: 'Prénom' },
        { key: 'participant_type', header: 'Catégorie', format: (r) => PARTICIPANT_TYPE_LABELS[r.participant_type] },
        { key: 'school', header: 'École', format: (r) => (r.school_id ? ctx.schoolById.get(r.school_id) ?? '' : '') },
        { key: 'email', header: 'Email' },
      ]);
      downloadCsv(`entrees_${stamp()}.csv`, csv);
      return sorted.length;
    });

  /* ── 4. Liste d'émargement (secours papier) ────────────────────────── */
  const exportAttendance = () =>
    run('emargement', "Liste d'émargement", async () => {
      const [rows, ctx] = await Promise.all([
        ParticipantService.search({}, 5000),
        loadContext(),
      ]);
      // Uniquement les personnes réellement attendues, triées par nom.
      const attendus = rows
        .filter((r) => r.ticket_status === 'GENERATED')
        .sort((a, b) =>
          a.last_name.localeCompare(b.last_name, 'fr', { sensitivity: 'base' }) ||
          a.first_name.localeCompare(b.first_name, 'fr', { sensitivity: 'base' }),
        );
      const csv = toCsv<ParticipantRow>(attendus, [
        { key: 'last_name', header: 'Nom', format: (r) => r.last_name.toUpperCase() },
        { key: 'first_name', header: 'Prénom' },
        { key: 'participant_type', header: 'Catégorie', format: (r) => PARTICIPANT_TYPE_LABELS[r.participant_type] },
        { key: 'school', header: 'École', format: (r) => (r.school_id ? ctx.schoolById.get(r.school_id) ?? '' : '') },
        { key: 'ticket', header: 'N° de billet', format: (r) => ctx.ticketByParticipant.get(r.id) ?? '' },
        { key: 'signature', header: 'Signature', format: () => '' },
      ]);
      downloadCsv(`emargement_${stamp()}.csv`, csv);
      return attendus.length;
    });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Exports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fichiers CSV encodés en UTF-8 avec BOM : ils s'ouvrent directement
          dans Excel ou LibreOffice, accents compris. Aucune donnée technique
          (jeton, empreinte, identifiant interne) n'est exportée.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ExportCard
          icon={Users}
          title="Participants — export complet"
          description="Identité, école, catégorie, statuts d'inscription, de vérification, de paiement, numéro de billet, entrée et origine de l'inscription."
        >
          <Button loading={busy === 'participants'} onClick={exportParticipants}>
            <Download className="h-4 w-4" aria-hidden="true" /> Exporter
          </Button>
        </ExportCard>

        <ExportCard
          icon={ClipboardList}
          title="Liste d'émargement"
          description="Les personnes attendues, triées par nom, avec une colonne Signature vierge. À imprimer comme secours si le réseau venait à manquer le jour J."
        >
          <Button loading={busy === 'emargement'} onClick={exportAttendance}>
            <Download className="h-4 w-4" aria-hidden="true" /> Exporter
          </Button>
        </ExportCard>

        <ExportCard
          icon={ScanLine}
          title="Entrées"
          description="Les personnes déjà entrées, dans l'ordre chronologique d'arrivée, avec leur billet et leur école."
        >
          <Button loading={busy === 'checkins'} onClick={exportCheckins}>
            <Download className="h-4 w-4" aria-hidden="true" /> Exporter
          </Button>
        </ExportCard>

        {can('payments:read') && (
          <ExportCard
            icon={CreditCard}
            title="Paiements"
            description="Références, montants, statuts, moyen et dates de confirmation, avec le participant et son école."
          >
            <Button loading={busy === 'payments'} onClick={exportPayments}>
              <Download className="h-4 w-4" aria-hidden="true" /> Exporter
            </Button>
          </ExportCard>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Les montants sont exportés au format décimal français (virgule) pour
        être additionnés directement dans un tableur. Les dates sont au format
        jour/mois/année. Export du {formatDateShort(new Date().toISOString())}.
      </p>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        <div className="mt-auto">{children}</div>
      </CardContent>
    </Card>
  );
}
