import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Image avec repli graphique soigné.
 *
 * Tant que la photo réelle n'est pas déposée dans `public/images/`, un visuel
 * dégradé + motif est affiché : la mise en page reste belle et ne « troue » pas.
 * Dès que le fichier existe, la photo s'affiche automatiquement.
 *
 * Les dimensions sont réservées par le conteneur (aspect-ratio) → pas de
 * décalage de mise en page au chargement (CLS).
 */
export function SmartImage({
  src,
  alt,
  className,
  caption,
  tone = 'navy',
}: {
  src: string;
  alt: string;
  className?: string;
  /** Légende affichée sur le repli, pour guider l'ajout de la vraie photo. */
  caption?: string;
  tone?: 'navy' | 'brand' | 'mixed';
}) {
  const [failed, setFailed] = useState(false);

  const gradients: Record<string, string> = {
    navy: 'from-navy-700 via-navy-800 to-navy-950',
    brand: 'from-brand-400 via-brand-500 to-brand-700',
    mixed: 'from-navy-800 via-navy-700 to-brand-600',
  };

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'relative isolate flex items-center justify-center overflow-hidden bg-gradient-to-br',
          gradients[tone],
          className,
        )}
      >
        {/* Motif géométrique décoratif */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-25"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="sm-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sm-dots)" />
        </svg>
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex flex-col items-center gap-2 px-6 text-center text-white/80">
          <ImageIcon className="h-8 w-8" aria-hidden="true" />
          {caption && <p className="text-xs font-medium">{caption}</p>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
