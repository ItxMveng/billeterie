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
