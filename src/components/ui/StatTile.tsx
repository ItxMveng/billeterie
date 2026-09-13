import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'brand',
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  tone?: 'brand' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const toneClasses: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={cn('rounded-lg p-2', toneClasses[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
