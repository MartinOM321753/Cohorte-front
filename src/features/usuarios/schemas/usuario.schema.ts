import { z } from 'zod'

const personaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().optional(),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  sexo: z.enum(['M', 'F'], { required_error: 'Seleccione el sexo' }),
  telefono: z
    .string()
    .regex(/^\d{10}$/, 'Debe tener exactamente 10 dígitos')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
})

export const usuarioSchema = z.object({
  username: z
    .string()
    .min(4, 'Mínimo 4 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  idRol: z
    .number({
      required_error: 'Seleccione un rol',
      invalid_type_error: 'Seleccione un rol',
    })
    .min(1, 'Seleccione un rol'),
  persona: personaSchema,
})

export type UsuarioFormData = z.infer<typeof usuarioSchema>
