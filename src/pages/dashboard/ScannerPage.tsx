import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';

export function ScannerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Scanner</h1>
      </header>
      <FeaturePlaceholder
        title="Scanner & check-in à l'entrée"
        sprint="le Sprint 3"
        description="Le scan des QR codes et le check-in (y compris le mode hors ligne) seront disponibles au Sprint 3."
      />
    </div>
  );
}
