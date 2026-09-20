/**
 * Schémas de validation Zod pour l'inscription d'un participant.
 *
 * La validation est CONDITIONNELLE à la catégorie :
 * - ALUMNI : ancienne école obligatoire.
 * - OTHER / NEW_STUDENT : école non requise.
 *
 * ⚠️ La validation client ne remplace pas les contraintes base + RLS.
 * On ne fait jamais confiance aux données du frontend (voir SECURITY.md).
 */

import { z } from 'zod';
import { ParticipantType } from '@/types/enums';
import { requiresSchool } from '@/features/participants/participant.logic';

// Téléphone : règle raisonnable et internationale (chiffres, +, espaces,
// tirets, points, parenthèses ; 6 à 20 caractères une fois normalisé).
const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;

const baseParticipant = z.object({
  participant_type: z.nativeEnum(ParticipantType, {
    errorMap: () => ({ message: 'Veuillez choisir une catégorie.' }),
  }),
  first_name: z
    .string()
    .trim()
    .min(1, 'Le prénom est obligatoire.')
    .max(80, 'Le prénom est trop long.'),
  last_name: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(80, 'Le nom est trop long.'),
  email: z
    .string()
    .trim()
    .min(1, "L'email est obligatoire.")
    .email('Email invalide.')
    .max(254, "L'email est trop long.")
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(1, 'Le téléphone est obligatoire.')
    .regex(PHONE_REGEX, 'Numéro de téléphone invalide.'),
  // École : optionnelle au niveau du champ, rendue obligatoire par le refine
  // pour la catégorie ALUMNI.
  school_id: z.string().uuid('École invalide.').optional().nullable(),
  /**
   * Numéro étudiant officiel — FACULTATIF. Proposé aux nouveaux étudiants :
   * il fiabilise la vérification automatique contre la liste officielle.
   * Aucune donnée sensible n'est demandée par ailleurs.
   */
  external_identifier: z
    .string()
    .trim()
    .max(40, 'Identifiant trop long.')
    .optional()
    .or(z.literal('')),
});

/**
 * Schéma complet de l'inscription publique.
 * `superRefine` applique la règle « école obligatoire » (NEW_STUDENT + ALUMNI).
 */
export const registrationSchema = baseParticipant.superRefine((data, ctx) => {
  // École obligatoire pour les nouveaux étudiants (école actuelle) comme pour
  // les anciens (ancienne école). Facultative pour les invités.
  if (requiresSchool(data.participant_type) && !data.school_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['school_id'],
      message:
        data.participant_type === ParticipantType.ALUMNI
          ? "L'ancienne école est obligatoire pour un ancien étudiant."
          : "Merci d'indiquer l'école dans laquelle vous étudiez.",
    });
  }
});

/** Type inféré des données validées (après transformations). */
export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationValues = z.output<typeof registrationSchema>;
