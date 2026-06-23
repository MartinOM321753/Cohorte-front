import { z } from 'zod'

export const PASSWORD_REQUIREMENTS_TEXT =
  'Minimo 12 caracteres, mayuscula, minuscula, numero y simbolo'

export const strongPasswordSchema = z
  .string()
  .min(12, 'La contrasena debe tener al menos 12 caracteres')
  .max(100, 'Maximo 100 caracteres')
  .refine((value) => value.trim() === value, 'La contrasena no debe iniciar ni terminar con espacios')
  .refine((value) => /[A-Z]/.test(value), 'Debe incluir al menos una mayuscula')
  .refine((value) => /[a-z]/.test(value), 'Debe incluir al menos una minuscula')
  .refine((value) => /\d/.test(value), 'Debe incluir al menos un numero')
  .refine((value) => /[^A-Za-z0-9]/.test(value), 'Debe incluir al menos un simbolo')
