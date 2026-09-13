import { useAsync } from '@/hooks/useAsync';
import { ParticipantService } from '@/features/participants/ParticipantService';
import {
  PARTICIPANT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  type ParticipantType,
  type PaymentStatus,
  type VerificationStatus,
  type RegistrationStatus,
} from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/Badge';

function verificationTone(s: VerificationStatus) {
  return s === 'VERIFIED' ? 'green' : s === 'REJECTED' ? 'red' : s === 'PENDING' ? 'amber' : 'neutral';
}
function paymentTone(s: PaymentStatus) {
  return s === 'PAID' ? 'green' : s === 'FAILED' || s === 'REJECTED' ? 'red' : s === 'PENDING' ? 'amber' : 'neutral';
}
function registrationTone(s: RegistrationStatus) {
  return s === 'CONFIRMED' ? 'green' : s === 'REJECTED' ? 'red' : 'amber';
}
function typeTone(t: ParticipantType) {
  return t === 'NEW_STUDENT' ? 'brand' : t === 'ALUMNI' ? 'neutral' : 'neutral';
}

export function ParticipantsPage() {
  const { data, loading, error, reload } = useAsync(
    () => ParticipantService.list(),
    [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Participants</h1>
        <p className="mt-1 text-sm text-slate-600">
          Liste des inscriptions. Catégorie, vérification, paiement et
          inscription sont des dimensions distinctes.
        </p>
      </header>

      {loading && <LoadingState label="Chargement des participants…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="Aucun participant"
          description="Les inscriptions apparaîtront ici."
        />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Nom</th>
                <th scope="col" className="px-4 py-3">Contact</th>
                <th scope="col" className="px-4 py-3">Catégorie</th>
                <th scope="col" className="px-4 py-3">Vérification</th>
                <th scope="col" className="px-4 py-3">Paiement</th>
                <th scope="col" className="px-4 py-3">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{p.email}</div>
                    <div className="text-xs text-slate-400">{p.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={typeTone(p.participant_type)}>
                      {PARTICIPANT_TYPE_LABELS[p.participant_type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={verificationTone(p.verification_status)}>
                      {VERIFICATION_STATUS_LABELS[p.verification_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={paymentTone(p.payment_status)}>
                      {PAYMENT_STATUS_LABELS[p.payment_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={registrationTone(p.registration_status)}>
                      {REGISTRATION_STATUS_LABELS[p.registration_status]}
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
