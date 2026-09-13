import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';

export function AdminsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Administrateurs</h1>
      </header>
      <FeaturePlaceholder
        title="Gestion des administrateurs & rôles"
        sprint="le Sprint 3"
        description="L'attribution des rôles (RBAC complet) via l'interface sera disponible au Sprint 3. Le modèle et les politiques de sécurité existent déjà."
      />
    </div>
  );
}
