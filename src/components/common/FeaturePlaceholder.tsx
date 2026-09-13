import { Construction } from 'lucide-react';

/**
 * Marque explicitement une fonctionnalité NON encore implémentée.
 * Ne prétend jamais qu'une fonctionnalité fonctionne (exigence Sprint 1).
 */
export function FeaturePlaceholder({
  title,
  sprint = 'un prochain sprint',
  description,
}: {
  title: string;
  sprint?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <Construction className="h-8 w-8 text-slate-400" aria-hidden="true" />
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {description ?? `Fonctionnalité disponible dans ${sprint}.`}
        </p>
      </div>
    </div>
  );
}
