import { z } from 'zod'
import { esMayorDeEdadConTolerancia } from '@/components/ui/date-time-picker'

const personaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().trim().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().trim().optional(),
  fechaNacimiento: z.string()
    .min(1, 'La fecha de nacimiento es obligatoria')
    .refine(
      (date) => esMayorDeEdadConTolerancia(date),
      'El usuario debe ser mayor de 18 años (tolerancia de 3 meses)',
    ),
  sexo: z.enum(['M', 'F'], { required_error: 'Seleccione el sexo' }),
  telefono: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Debe tener exactamente 10 dígitos')
    .optional()
    .or(z.literal('')),
  // Email requerido: se usa para enviar la contraseña generada
  email: z.string().trim().min(1, 'El correo es obligatorio').email('Correo electrónico inválido'),
})

export const usuarioSchema = z.object({
  // username eliminado: el backend lo genera automáticamente
  rolUuid: z
    .string({ required_error: 'Seleccione un rol' })
    .trim()
    .min(1, 'Seleccione un rol'),
  persona: personaSchema,
})

export type UsuarioFormData = z.infer<typeof usuarioSchema>
