import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { GraduationCap, MapPin, CalendarDays, Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { downloadTicketPdf } from './ticket-pdf';
import type { TicketView } from './TicketService';

/**
 * Carte de billet, adaptée mobile.
 *
 * Le QR encode l'URL de check-in contenant le token privé du participant —
 * aucune donnée personnelle n'y figure. Le même QR est réutilisé pour le PDF
 * (généré une seule fois).
 */
export function TicketCard({
  ticket,
  token,
}: {
  ticket: TicketView;
  token: string;
}) {
  const checkinUrl = `${window.location.origin}/checkin?t=${encodeURIComponent(token)}`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Résolution volontairement élevée : le QR reste net une fois imprimé.
    QRCode.toDataURL(checkinUrl, { width: 640, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((e) => logger.error('QR generation failed', { cause: e }));
    return () => {
      active = false;
    };
  }, [checkinUrl]);

  const onDownload = async () => {
    if (!qrDataUrl) return;
    setPdfError(null);
    setDownloading(true);
    try {
      await downloadTicketPdf(ticket, qrDataUrl);
    } catch (e) {
      logger.error('PDF generation failed', { cause: e });
      setPdfError("Le téléchargement a échoué. Réessayez.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-3">
      <div className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-lift">
        <div className="flex items-center gap-3 bg-navy-900 px-5 py-4 text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-navy-200">Billet d'entrée</p>
            <p className="font-mono text-lg font-bold">{ticket.ticket_number}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR code du billet"
              width={200}
              height={200}
              className="h-[200px] w-[200px]"
            />
          ) : (
            <div
              className="h-[200px] w-[200px] animate-pulse rounded-xl bg-navy-50"
              role="status"
              aria-label="Génération du QR code…"
            />
          )}

          <div className="w-full space-y-1.5 text-center">
            <p className="font-display text-lg font-bold text-navy-900">
              {ticket.first_name} {ticket.last_name}
            </p>
            <Badge tone="brand">{PARTICIPANT_TYPE_LABELS[ticket.participant_type]}</Badge>
            {ticket.school_name && (
              <p className="text-sm text-navy-500">{ticket.school_name}</p>
            )}
          </div>

          <div className="w-full space-y-2 border-t border-navy-100 pt-4 text-sm text-navy-600">
            {ticket.event_name && (
              <p className="text-center font-semibold text-navy-800">{ticket.event_name}</p>
            )}
            {ticket.event_date && (
              <p className="flex items-center justify-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-600" aria-hidden="true" />
                {formatDate(ticket.event_date)}
              </p>
            )}
            {ticket.event_location && (
              <p className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                {ticket.event_location}
              </p>
            )}
          </div>

          <p className="text-center text-xs text-navy-400">
            Présentez ce QR code à l'entrée. Ne le partagez pas.
          </p>
        </div>
      </div>

      <Button
        className="w-full"
        variant="outline"
        onClick={() => void onDownload()}
        loading={downloading}
        disabled={!qrDataUrl}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Télécharger mon billet (PDF)
      </Button>
      {pdfError && (
        <p role="alert" className="text-center text-sm text-red-600">
          {pdfError}
        </p>
      )}
    </div>
  );
}
