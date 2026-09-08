import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z.string()
    .min(1, { message: 'Ingrese su usuario o correo electrónico' }),
  password: z.string()
    .min(1, { message: 'La contraseña es requerida' }),
})

export type LoginFormData = z.infer<typeof loginSchema>
