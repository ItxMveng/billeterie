/**
 * Génération du billet en PDF.
 *
 * La librairie jsPDF est chargée **dynamiquement** (uniquement au clic) afin de
 * ne pas alourdir le bundle initial du site public.
 *
 * Le PDF ne contient aucune donnée technique (ni token, ni hash) : seulement
 * les informations utiles au porteur et le QR code déjà généré à l'écran.
 */

import { formatDate } from '@/lib/utils';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import type { TicketView } from './TicketService';

const NAVY: [number, number, number] = [10, 31, 54];
const ORANGE: [number, number, number] = [249, 115, 22];
const SLATE: [number, number, number] = [90, 105, 125];

/** Nom de fichier sûr pour le téléchargement. */
function fileName(ticket: TicketView): string {
  const base = `billet-${ticket.ticket_number}`.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${base}.pdf`;
}

export async function downloadTicketPdf(
  ticket: TicketView,
  qrDataUrl: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const pageW = doc.internal.pageSize.getWidth();
  const cardX = 20;
  const cardW = pageW - cardX * 2;
  const cardY = 25;

  // ── En-tête ──────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.roundedRect(cardX, cardY, cardW, 32, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('BILLET D’ENTRÉE', cardX + 10, cardY + 13);

  doc.setFont('courier', 'bold');
  doc.setFontSize(20);
  doc.text(ticket.ticket_number, cardX + 10, cardY + 25);

  // ── Corps ────────────────────────────────────────────────────────────────
  let y = cardY + 48;

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${ticket.first_name} ${ticket.last_name}`, cardX, y);

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...ORANGE);
  doc.text(PARTICIPANT_TYPE_LABELS[ticket.participant_type], cardX, y);

  if (ticket.school_name) {
    y += 7;
    doc.setTextColor(...SLATE);
    doc.setFontSize(11);
    doc.text(ticket.school_name, cardX, y);
  }

  // ── QR code ──────────────────────────────────────────────────────────────
  const qrSize = 62;
  const qrX = (pageW - qrSize) / 2;
  const qrY = y + 14;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text(
    'Présentez ce QR code à l’entrée. Ne le partagez pas.',
    pageW / 2,
    qrY + qrSize + 8,
    { align: 'center' },
  );

  // ── Informations événement ───────────────────────────────────────────────
  let infoY = qrY + qrSize + 24;
  doc.setDrawColor(225, 232, 240);
  doc.line(cardX, infoY - 8, cardX + cardW, infoY - 8);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  if (ticket.event_name) {
    doc.text(ticket.event_name, cardX, infoY);
    infoY += 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE);
  if (ticket.event_date) {
    doc.text(formatDate(ticket.event_date), cardX, infoY);
    infoY += 6;
  }
  if (ticket.event_location) {
    doc.text(ticket.event_location, cardX, infoY);
  }

  doc.save(fileName(ticket));
}
