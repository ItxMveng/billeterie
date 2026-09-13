/**
 * Liste de barres horizontales, accessible et responsive (sans dépendance).
 * Chaque barre indique son libellé et sa valeur en texte (lisible sans couleur).
 */
export function BarList({
  items,
  emptyLabel = 'Aucune donnée',
}: {
  items: Array<{ label: string; value: number }>;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-0.5 flex items-center justify-between text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="ml-2 font-medium text-slate-900">{item.value}</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`${item.label} : ${item.value}`}
          >
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
