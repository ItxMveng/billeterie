import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { logger } from '@/lib/logger';

/**
 * Rendu d'un QR code à partir d'une valeur (URL de check-in contenant le token
 * privé). Aucune donnée personnelle n'est encodée dans le QR.
 */
export function QRCodeImage({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((e) => logger.error('QR generation failed', { cause: e }));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-label="Génération du QR code…"
        role="img"
      />
    );
  }
  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code du billet"
      className={className}
    />
  );
}
