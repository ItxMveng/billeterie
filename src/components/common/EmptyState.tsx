import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'Aucune donnée',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <Inbox className="h-8 w-8 text-slate-400" aria-hidden="true" />
      <div>
        <p className="font-medium text-slate-800">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
