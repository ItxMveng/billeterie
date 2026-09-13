import { z } from 'zod';

/** Schéma de connexion administrateur (email + mot de passe). */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est obligatoire.")
    .email('Email invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

/**
 * Définition du mot de passe (invitation ou réinitialisation).
 * Longueur minimale alignée sur le réglage par défaut de Supabase Auth.
 */
export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
      .max(72, 'Le mot de passe est trop long.'),
    confirm: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Les deux mots de passe ne correspondent pas.',
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
