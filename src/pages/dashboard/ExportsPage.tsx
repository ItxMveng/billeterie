import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { ParticipantService } from '@/features/participants/ParticipantService';
import { PaymentService } from '@/features/payments/PaymentService';
import { toCsv, downloadCsv } from '@/lib/export-csv';
import { AppError } from '@/lib/errors';
import {
  PARTICIPANT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from '@/types/enums';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ForbiddenState } from '@/components/common/ForbiddenState';

export function ExportsPage() {
  const { can } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!can('exports:read')) return <ForbiddenState />;

  const run = async (key: string, fn: () => Promise<void>) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof AppError ? e.userMessage : 'Export impossible.');
    } finally {
      setBusy(null);
    }
  };

  const exportParticipants = () =>
    run('participants', async () => {
      const rows = await ParticipantService.search({}, 5000);
      const csv = toCsv(rows, [
        { key: 'first_name', header: 'Prénom' },
        { key: 'last_name', header: 'Nom' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Téléphone' },
        { key: 'participant_type', header: 'Catégorie', format: (r) => PARTICIPANT_TYPE_LABELS[r.participant_type] },
        { key: 'verification_status', header: 'Vérification', format: (r) => VERIFICATION_STATUS_LABELS[r.verification_status] },
        { key: 'payment_required', header: 'Paiement requis', format: (r) => ((r.payment_required ?? r.participant_type !== 'NEW_STUDENT') ? 'Oui' : 'Non') },
        { key: 'payment_status', header: 'Statut paiement', format: (r) => PAYMENT_STATUS_LABELS[r.payment_status] },
        { key: 'payment_reference', header: 'Référence' },
        { key: 'ticket_status', header: 'Billet' },
        { key: 'checked_in', header: 'Entré', format: (r) => (r.checked_in ? 'Oui' : 'Non') },
      ]);
      downloadCsv(`participants-${Date.now()}.csv`, csv);
    });

  const exportPayments = () =>
    run('payments', async () => {
      const rows = await PaymentService.listAll();
      const csv = toCsv(rows, [
        { key: 'reference', header: 'Référence' },
        { key: 'participant', header: 'Participant', format: (r) => r.participant ? `${r.participant.first_name} ${r.participant.last_name}` : '' },
        { key: 'email', header: 'Email', format: (r) => r.participant?.email ?? '' },
        { key: 'amount_cents', header: 'Montant', format: (r) => (r.amount_cents / 100).toFixed(2) },
        { key: 'currency', header: 'Devise' },
        { key: 'status', header: 'Statut', format: (r) => PAYMENT_STATUS_LABELS[r.status] },
        { key: 'provider', header: 'Fournisseur' },
        { key: 'confirmed_at', header: 'Confirmé le' },
      ]);
      downloadCsv(`paiements-${Date.now()}.csv`, csv);
    });

  const exportCheckins = () =>
    run('checkins', async () => {
      const rows = await ParticipantService.search({ checked_in: true }, 5000);
      const csv = toCsv(rows, [
        { key: 'first_name', header: 'Prénom' },
        { key: 'last_name', header: 'Nom' },
        { key: 'participant_type', header: 'Catégorie', format: (r) => PARTICIPANT_TYPE_LABELS[r.participant_type] },
        { key: 'checked_in_at', header: 'Heure d\'entrée' },
      ]);
      downloadCsv(`checkins-${Date.now()}.csv`, csv);
    });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Exports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Exports CSV (UTF-8). Aucune donnée technique sensible (tokens, hash)
          n'est exportée.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ExportCard title="Participants" description="Liste complète des inscrits.">
          <Button loading={busy === 'participants'} onClick={exportParticipants}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </ExportCard>

        {can('payments:read') && (
          <ExportCard title="Paiements" description="Références, montants, statuts.">
            <Button loading={busy === 'payments'} onClick={exportPayments}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
          </ExportCard>
        )}

        <ExportCard title="Check-ins" description="Participants entrés et heure.">
          <Button loading={busy === 'checkins'} onClick={exportCheckins}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </ExportCard>
      </div>
    </div>
  );
}

function ExportCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
