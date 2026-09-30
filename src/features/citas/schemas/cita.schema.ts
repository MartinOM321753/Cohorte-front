import { z } from 'zod'

export const citaFormSchema = z.object({
  pacienteUUID: z.string().min(1, 'Paciente obligatorio'),
  fechaCita: z
    .string()
    .min(1, 'Fecha y hora de la cita son obligatorias')
    .refine((value) => {
      const date = new Date(value)
      return !Number.isNaN(date.getTime()) && date > new Date()
    }, 'La fecha de la cita debe ser futura'),
  duracionMinutos: z
    .coerce.number()
    .min(15, 'La duración mínima es 15 minutos')
    .max(240, 'La duración máxima es 240 minutos'),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export type CitaFormData = z.infer<typeof citaFormSchema>
