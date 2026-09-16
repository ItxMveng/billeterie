import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title?: string;
  message: string;
}

export interface ToastApi {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | undefined>(undefined);
