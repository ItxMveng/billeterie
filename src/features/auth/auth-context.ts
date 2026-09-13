import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Role } from '@/types/enums';
import type { Permission } from './rbac';

export interface AuthContextValue {
  /** true tant que l'état d'authentification initial n'est pas résolu. */
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: Role[];
  isAuthenticated: boolean;
  /** true si l'environnement Supabase est configuré. */
  configured: boolean;
  /** Contrôle de permission (RBAC côté client). */
  can: (permission: Permission) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Définit le mot de passe de l'utilisateur connecté (invitation / reset). */
  updatePassword: (password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
