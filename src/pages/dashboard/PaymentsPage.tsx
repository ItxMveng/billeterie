import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';

export function PaymentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
      </header>
      <FeaturePlaceholder
        title="Gestion des paiements (Wero)"
        sprint="le Sprint 2"
        description="Le suivi et la validation des paiements Wero seront disponibles au Sprint 2."
      />
    </div>
  );
}
