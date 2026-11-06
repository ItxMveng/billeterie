/**
 * Événement consulté dans le tableau de bord.
 *
 * Toutes les pages (statistiques, participants, billets, exports, plan de
 * salle…) lisent les données de CET événement uniquement : les inscrits de
 * la soirée d'accueil ne se mélangent plus à ceux de la remise des diplômes.
 *
 * Choix par défaut : le dernier événement consulté (mémorisé dans le
 * navigateur), sinon l'événement publié, sinon le plus récent.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EventService } from './EventService';
import { EventStatus } from '@/types/enums';
import type { EventRow } from '@/types/database';

const STORAGE_KEY = 'dashboard_event_id';

interface DashboardEventState {
  events: EventRow[];
  /** Événement sélectionné (null tant que la liste charge ou si vide). */
  event: EventRow | null;
  eventId: string | null;
  setEventId: (id: string) => void;
  loading: boolean;
  /** Recharge la liste (après création ou modification d'un événement). */
  reload: () => Promise<void>;
}

const Ctx = createContext<DashboardEventState | null>(null);

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Événement à afficher par défaut parmi la liste (triée par date croissante). */
export function pickDefaultEvent(events: EventRow[], storedId: string | null): EventRow | null {
  if (events.length === 0) return null;
  const stored = storedId ? events.find((e) => e.id === storedId) : undefined;
  if (stored) return stored;
  // Même règle que la base (active_event_id) : premier événement publié.
  const published = events.find((e) => e.status === EventStatus.PUBLISHED);
  return published ?? events[events.length - 1]!;
}

export function DashboardEventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await EventService.listAll();
      setEvents(list);
      setEventIdState((current) => {
        if (current && list.some((e) => e.id === current)) return current;
        return pickDefaultEvent(list, readStored())?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setEventId = useCallback((id: string) => {
    setEventIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
  }, []);

  const value = useMemo<DashboardEventState>(
    () => ({
      events,
      event: events.find((e) => e.id === eventId) ?? null,
      eventId,
      setEventId,
      loading,
      reload,
    }),
    [events, eventId, setEventId, loading, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardEvent(): DashboardEventState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDashboardEvent doit être utilisé dans DashboardEventProvider');
  return ctx;
}
