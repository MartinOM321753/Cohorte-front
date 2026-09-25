import { z } from 'zod'

export const COLOR_POR_ESTADO: Record<string, string> = {
  PROGRAMADA:  '#3b82f6',
  CONFIRMADA:  '#8b5cf6',
  REALIZADA:   '#22c55e',
  CANCELADA:   '#ef4444',
  NO_ASISTIO:  '#f97316',
}

export const ESTADOS_CITA = [
  { value: 'PROGRAMADA',  label: 'Programada',  color: COLOR_POR_ESTADO.PROGRAMADA  },
  { value: 'CONFIRMADA',  label: 'Confirmada',  color: COLOR_POR_ESTADO.CONFIRMADA  },
  { value: 'REALIZADA',   label: 'Realizada',   color: COLOR_POR_ESTADO.REALIZADA   },
  { value: 'CANCELADA',   label: 'Cancelada',   color: COLOR_POR_ESTADO.CANCELADA   },
  { value: 'NO_ASISTIO',  label: 'No asistió',  color: COLOR_POR_ESTADO.NO_ASISTIO  },
] as const

export type EstadoCita = (typeof ESTADOS_CITA)[number]['value']

const coloresDefault = new Set(Object.values(COLOR_POR_ESTADO))

export function esColorDefault(hex: string | undefined): boolean {
  return !!hex && coloresDefault.has(hex.toLowerCase().trim())
}

export const citaFormSchema = z.object({
  pacienteUUID: z.string(),
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
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (utilice el formato #RRGGBB)')
    .optional(),
  observaciones: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
  estadoCita: z
    .enum(['PROGRAMADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'NO_ASISTIO'])
    .optional(),
})

export type CitaFormData = z.infer<typeof citaFormSchema>
