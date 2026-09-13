export function FullPageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700"
        aria-hidden="true"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
