import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
      </header>
      <FeaturePlaceholder
        title="Paramètres de la plateforme"
        sprint="le Sprint 3"
        description="La configuration de l'événement et des paramètres via l'interface sera disponible ultérieurement."
      />
    </div>
  );
}
