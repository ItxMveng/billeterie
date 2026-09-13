export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-8 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700"
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
