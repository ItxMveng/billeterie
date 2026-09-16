import { useState } from 'react';
import { Button, type ButtonProps } from './Button';

/**
 * Bouton d'action destructive avec confirmation en deux temps.
 *
 * Préféré à une boîte de dialogue modale : pas de piège de focus à gérer, et
 * la confirmation reste visible à côté de l'élément concerné. Le libellé de
 * confirmation rappelle explicitement ce qui va se passer.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Confirmer',
  size = 'sm',
  loading,
  className,
  ...rest
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  confirmLabel?: string;
} & Omit<ButtonProps, 'onClick' | 'children'>) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button
        {...rest}
        size={size}
        variant="outline"
        className={className}
        loading={loading}
        onClick={() => setArmed(true)}
      >
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size={size}
        variant="danger"
        loading={loading}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button size={size} variant="ghost" onClick={() => setArmed(false)}>
        Annuler
      </Button>
    </span>
  );
}
