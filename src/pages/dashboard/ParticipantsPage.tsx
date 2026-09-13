import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import {
  ParticipantService,
  type ParticipantFilters,
} from '@/features/participants/ParticipantService';
import {
  PARTICIPANT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  ParticipantType,
  PaymentStatus,
  VerificationStatus,
  type PaymentStatus as PaymentStatusT,
  type VerificationStatus as VerificationStatusT,
} from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

function payTone(s: PaymentStatusT) {
  return s === 'PAID' ? 'green' : s === 'REJECTED' || s === 'FAILED' ? 'red' : s === 'NOT_REQUIRED' ? 'neutral' : 'amber';
}
function verifTone(s: VerificationStatusT) {
  return s === 'VERIFIED' ? 'green' : s === 'REJECTED' ? 'red' : s === 'PENDING' ? 'amber' : 'neutral';
}

export function ParticipantsPage() {
  const [filters, setFilters] = useState<ParticipantFilters>({});
  const [qInput, setQInput] = useState('');

  const { data, loading, error, reload } = useAsync(
    () => ParticipantService.search(filters),
    [JSON.stringify(filters)],
  );

  const applyQ = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: qInput.trim() || undefined }));
  };

  const setFilter = <K extends keyof ParticipantFilters>(key: K, value: ParticipantFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Participants</h1>
        <p className="mt-1 text-sm text-slate-600">
          Recherche par nom, email, téléphone ou référence de paiement. Résultats
          limités pour rester performant.
        </p>
      </header>

      <form onSubmit={applyQ} className="flex flex-wrap gap-2">
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Rechercher…"
          className="max-w-xs"
          aria-label="Recherche"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"
        >
          Rechercher
        </button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label="Catégorie"
          value={filters.participant_type ?? ''}
          onChange={(e) => setFilter('participant_type', (e.target.value || undefined) as ParticipantType)}
        >
          <option value="">Toutes catégories</option>
          {Object.values(ParticipantType).map((t) => (
            <option key={t} value={t}>{PARTICIPANT_TYPE_LABELS[t]}</option>
          ))}
        </Select>
        <Select
          aria-label="Vérification"
          value={filters.verification_status ?? ''}
          onChange={(e) => setFilter('verification_status', (e.target.value || undefined) as VerificationStatus)}
        >
          <option value="">Toute vérification</option>
          {Object.values(VerificationStatus).map((s) => (
            <option key={s} value={s}>{VERIFICATION_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select
          aria-label="Paiement"
          value={filters.payment_status ?? ''}
          onChange={(e) => setFilter('payment_status', (e.target.value || undefined) as PaymentStatus)}
        >
          <option value="">Tout paiement</option>
          {Object.values(PaymentStatus).map((s) => (
            <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select
          aria-label="Check-in"
          value={filters.checked_in === undefined ? '' : filters.checked_in ? 'yes' : 'no'}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              checked_in: e.target.value === '' ? undefined : e.target.value === 'yes',
            }))
          }
        >
          <option value="">Entrée : tous</option>
          <option value="yes">Entrés</option>
          <option value="no">Non entrés</option>
        </Select>
      </div>

      {loading && <LoadingState label="Chargement…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState title="Aucun résultat" description="Ajustez votre recherche ou vos filtres." />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Nom</th>
                <th scope="col" className="px-4 py-3">Catégorie</th>
                <th scope="col" className="px-4 py-3">Vérif.</th>
                <th scope="col" className="px-4 py-3">Paiement</th>
                <th scope="col" className="px-4 py-3">Billet</th>
                <th scope="col" className="px-4 py-3">Entrée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/participants/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.first_name} {p.last_name}
                    </Link>
                    <div className="text-xs text-slate-400">{p.email}</div>
                  </td>
                  <td className="px-4 py-3">{PARTICIPANT_TYPE_LABELS[p.participant_type]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={verifTone(p.verification_status)}>
                      {VERIFICATION_STATUS_LABELS[p.verification_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={payTone(p.payment_status)}>
                      {PAYMENT_STATUS_LABELS[p.payment_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.ticket_status === 'GENERATED' ? 'green' : 'neutral'}>
                      {p.ticket_status === 'GENERATED' ? 'Émis' : p.ticket_status === 'CANCELLED' ? 'Annulé' : '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.checked_in ? 'green' : 'neutral'}>
                      {p.checked_in ? 'Entré' : 'Non'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
