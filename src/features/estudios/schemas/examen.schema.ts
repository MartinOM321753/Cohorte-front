import { z } from 'zod'

const optionalNumber = z
  .union([z.number(), z.nan()])
  .transform((v) => (typeof v === 'number' && !isNaN(v) ? v : undefined))
  .optional()

export const examenSchema = z.object({
  nombreExamen: z
    .string()
    .trim()
    .min(1, 'El nombre del examen es requerido')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  unidad: z.string().trim().max(10, 'Máximo 10 caracteres').optional().or(z.literal('')),
  valorMinMujeres: optionalNumber,
  valorMaxMujeres: optionalNumber,
  valorMinHombres: optionalNumber,
  valorMaxHombres: optionalNumber,
})

export type ExamenFormData = z.infer<typeof examenSchema>

export const resultadoExamenSchema = z.object({
  pacienteUUID: z.string().min(1, 'Seleccione un participante'),
  usuarioRegistroUUID: z.string().min(1),
  idExamen: z.number().min(1, 'Seleccione un examen'),
  valorObtenido: z
    .number({ invalid_type_error: 'Ingrese un valor numérico' })
    .finite('Valor inválido'),
  observaciones: z.string().trim().optional().or(z.literal('')),
  fechaResultado: z.string().min(1, 'La fecha es requerida'),
})

export type ResultadoExamenFormData = z.infer<typeof resultadoExamenSchema>
