import { z } from 'zod'

export const ESTADOS_CITA = [
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
  { value: 'NO_ASISTIO', label: 'No asistió' },
] as const

export type EstadoCita = (typeof ESTADOS_CITA)[number]['value']

export const citaFormSchema = z.object({
  pacienteUUID: z.string().min(1, 'Paciente obligatorio'),
  fechaCita: z
    .string()
    .min(1, 'Fecha y hora de la cita son obligatorias')
    .refine((value) => {
      const date = new Date(value)
      return !Number.isNaN(date.getTime())
    }, 'Fecha y hora inválidas'),
  duracionMinutos: z.coerce
    .number()
    .min(15, 'La duración mínima es 15 minutos')
    .max(240, 'La duración máxima es 240 minutos'),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (usa formato #RRGGBB)')
    .optional(),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  estadoCita: z
    .enum(['PROGRAMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'])
    .optional(),
})

export type CitaFormData = z.infer<typeof citaFormSchema>
