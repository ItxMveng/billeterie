import { GraduationCap, MapPin, CalendarDays } from 'lucide-react';
import { QRCodeImage } from '@/components/ui/QRCode';
import { Badge } from '@/components/ui/Badge';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import { formatDate } from '@/lib/utils';
import type { TicketView } from './TicketService';

/**
 * Carte de billet, adaptée mobile. Le QR encode l'URL de check-in contenant le
 * token privé du participant — aucune donnée personnelle n'y figure.
 */
export function TicketCard({
  ticket,
  token,
}: {
  ticket: TicketView;
  token: string;
}) {
  const checkinUrl = `${window.location.origin}/checkin?t=${encodeURIComponent(token)}`;

  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 bg-brand-700 px-5 py-4 text-white">
        <GraduationCap className="h-6 w-6" aria-hidden="true" />
        <div>
          <p className="text-sm/none opacity-80">Billet</p>
          <p className="font-mono text-lg font-semibold">{ticket.ticket_number}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 p-6">
        <QRCodeImage value={checkinUrl} size={200} />

        <div className="w-full space-y-1 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {ticket.first_name} {ticket.last_name}
          </p>
          <Badge tone="brand">
            {PARTICIPANT_TYPE_LABELS[ticket.participant_type]}
          </Badge>
          {ticket.school_name && (
            <p className="text-sm text-slate-500">{ticket.school_name}</p>
          )}
        </div>

        <div className="w-full space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
          {ticket.event_name && (
            <p className="font-medium text-slate-800">{ticket.event_name}</p>
          )}
          {ticket.event_date && (
            <p className="flex items-center justify-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
              {formatDate(ticket.event_date)}
            </p>
          )}
          {ticket.event_location && (
            <p className="flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
              {ticket.event_location}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Présentez ce QR code à l'entrée. Ne le partagez pas.
        </p>
      </div>
    </div>
  );
}
