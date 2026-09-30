import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string()
    .min(3, { message: 'El usuario es requerido y debe tener al menos 3 caracteres' }),
  password: z.string()
    .min(6, { message: 'La contraseña es requerida y debe tener al menos 6 caracteres' }),
})

export type LoginFormData = z.infer<typeof loginSchema>
