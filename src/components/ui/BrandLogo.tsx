import { useState } from 'react';
import { cn } from '@/lib/utils';
import { associationConfig } from '@/config/event.config';

/**
 * Logo de l'association.
 *
 * Affiche `public/images/logo.png` dès que le fichier est déposé. En son
 * absence, un monogramme « CPBA » est rendu : le design reste cohérent, rien
 * n'apparaît cassé.
 */
export function BrandLogo({
  size = 40,
  className,
  rounded = 'rounded-xl',
}: {
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={associationConfig.name}
        style={{ width: size, height: size }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center bg-navy-900 font-display font-extrabold leading-none text-white',
          rounded,
          className,
        )}
      >
        <span style={{ fontSize: Math.max(9, size * 0.28) }}>
          {associationConfig.shortName}
        </span>
      </span>
    );
  }

  return (
    <img
      src="/images/logo.png"
      alt={associationConfig.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn('shrink-0 bg-white object-contain', rounded, className)}
      style={{ width: size, height: size }}
    />
  );
}
