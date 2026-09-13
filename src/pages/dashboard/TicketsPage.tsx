import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';

export function TicketsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Billets</h1>
      </header>
      <FeaturePlaceholder
        title="Billetterie & QR codes"
        sprint="le Sprint 2"
        description="La génération des billets et des QR codes sera disponible au Sprint 2."
      />
    </div>
  );
}
