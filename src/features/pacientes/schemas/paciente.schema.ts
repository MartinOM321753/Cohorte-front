import { z } from 'zod'

export const pacienteFormSchema = z.object({
  folio: z.string()
    .min(1, 'El folio es requerido')
    .min(3, 'El folio debe tener al menos 3 caracteres'),
  
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  
  apellidoPaterno: z.string()
    .min(1, 'El apellido paterno es obligatorio')
    .min(2, 'El apellido paterno debe tener al menos 2 caracteres'),
  
  apellidoMaterno: z.string()
    .min(2, 'El apellido materno debe tener al menos 2 caracteres')
    .optional()
    .or(z.literal('')),
  
  fechaNacimiento: z.string()
    .min(1, 'La fecha de nacimiento es obligatoria')
    .refine((date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      return selectedDate < today
    }, 'La fecha de nacimiento debe ser en el pasado'),
  
  sexo: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'El sexo debe ser M o F' })
  }),
  
  telefono: z.string()
    .optional()
    .refine(
      (val) => !val || /^\d{10}$/.test(val),
      'El teléfono debe tener exactamente 10 dígitos'
    )
    .or(z.literal('')),
  
  email: z.string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'El correo electrónico debe ser válido'
    )
    .or(z.literal('')),
})

export type PacienteFormData = z.infer<typeof pacienteFormSchema>
