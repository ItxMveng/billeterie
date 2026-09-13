/**
 * CheckinService — contrôle d'entrée. La validation est ATOMIQUE et décidée
 * côté serveur (RPC `validate_checkin`) : le client ne fait jamais confiance
 * au contenu du QR ni ne décide de l'entrée.
 */

import { requireSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { CheckinResult } from './checkin.logic';
import type { ParticipantType } from '@/types/enums';

export interface CheckinResponse {
  result: CheckinResult;
  first_name?: string;
  last_name?: string;
  participant_type?: ParticipantType;
  school_name?: string | null;
  ticket_number?: string;
  checked_in_at?: string;
  first_checkin_at?: string;
  reason?: string;
}

export const CheckinService = {
  /** Valide un token de billet et effectue le check-in (atomique, serveur). */
  async validate(token: string): Promise<CheckinResponse> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.rpc('validate_checkin', { p_token: token });
    if (error) {
      const appError = toAppError(error);
      logger.reportError(appError, { scope: 'CheckinService.validate' });
      throw appError;
    }
    return (data as CheckinResponse) ?? { result: 'ERROR' };
  },
};
