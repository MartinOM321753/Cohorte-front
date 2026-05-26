import { z } from 'zod'
import { esMayorDeEdadConTolerancia } from '@/components/ui/date-time-picker'

export const pacienteFormSchema = z.object({
  folio: z.string()
    .trim()
    .min(1, 'El folio es requerido')
    .min(3, 'El folio debe tener al menos 3 caracteres'),

  nombre: z.string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres'),

  apellidoPaterno: z.string()
    .trim()
    .min(1, 'El apellido paterno es obligatorio')
    .min(2, 'El apellido paterno debe tener al menos 2 caracteres'),

  apellidoMaterno: z.string()
    .trim()
    .min(2, 'El apellido materno debe tener al menos 2 caracteres')
    .optional()
    .or(z.literal('')),

  fechaNacimiento: z.string()
    .min(1, 'La fecha de nacimiento es obligatoria')
    .refine(
      (date) => esMayorDeEdadConTolerancia(date),
      'El paciente debe ser mayor de 18 años (tolerancia de 3 meses)',
    ),

  sexo: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'El sexo debe ser M o F' }),
  }),

  telefono: z.string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^\d{10}$/.test(val),
      'El teléfono debe tener exactamente 10 dígitos',
    )
    .or(z.literal('')),

  email: z.string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'El correo electrónico debe ser válido',
    )
    .or(z.literal('')),
})

export type PacienteFormData = z.infer<typeof pacienteFormSchema>
