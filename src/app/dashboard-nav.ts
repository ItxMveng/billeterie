import {
  LayoutDashboard,
  Users,
  BadgeCheck,
  UploadCloud,
  School,
  CalendarDays,
  CreditCard,
  Ticket,
  ScanLine,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/features/auth/rbac';

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Permission requise pour afficher l'entrée (et protéger la route). */
  permission: Permission;
  /** true si la fonctionnalité n'est pas encore implémentée (Sprint 2/3). */
  upcoming?: boolean;
  end?: boolean;
}

/**
 * Source unique de la navigation du dashboard. Utilisée à la fois pour :
 * - construire le menu (filtré par permissions) ;
 * - déclarer les routes protégées avec la même permission.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    to: '/dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    permission: 'dashboard:access',
    end: true,
  },
  {
    to: '/dashboard/participants',
    label: 'Participants',
    icon: Users,
    permission: 'participants:read',
  },
  {
    to: '/dashboard/verification',
    label: 'Vérification',
    icon: BadgeCheck,
    permission: 'participants:write',
  },
  {
    to: '/dashboard/imports',
    label: 'Imports',
    icon: UploadCloud,
    permission: 'participants:write',
  },
  {
    to: '/dashboard/ecoles',
    label: 'Écoles',
    icon: School,
    permission: 'schools:read',
  },
  {
    to: '/dashboard/evenement',
    label: 'Événement',
    icon: CalendarDays,
    permission: 'events:read',
  },
  {
    to: '/dashboard/paiements',
    label: 'Paiements',
    icon: CreditCard,
    permission: 'payments:read',
  },
  {
    to: '/dashboard/billets',
    label: 'Billets',
    icon: Ticket,
    permission: 'tickets:read',
  },
  {
    to: '/dashboard/scanner',
    label: 'Scanner',
    icon: ScanLine,
    permission: 'checkin:operate',
    upcoming: true,
  },
  {
    to: '/dashboard/administrateurs',
    label: 'Administrateurs',
    icon: ShieldCheck,
    permission: 'admins:manage',
    upcoming: true,
  },
  {
    to: '/dashboard/parametres',
    label: 'Paramètres',
    icon: Settings,
    permission: 'settings:manage',
    upcoming: true,
  },
];
