import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900',
          'placeholder:text-slate-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          'disabled:cursor-not-allowed disabled:bg-slate-50',
          invalid ? 'border-red-500 focus-visible:ring-red-400' : 'border-slate-300',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
