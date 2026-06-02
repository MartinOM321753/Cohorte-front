import { z } from 'zod'

const optionalPositiveNumber = (label: string, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: `${label} debe ser un número válido` })
      .positive(`${label} debe ser mayor a 0`)
      .max(max, `${label} no puede exceder ${max}`)
      .optional()
  )

const optionalIntRange = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: `${label} debe ser un número válido` })
      .int(`${label} debe ser un número entero`)
      .min(min, `${label} debe ser al menos ${min}`)
      .max(max, `${label} no puede exceder ${max}`)
      .optional()
  )

export const somatometriaSchema = z.object({
  fechaMedicion: z.string().min(1, 'La fecha de medición es requerida'),
  pesoKg: optionalPositiveNumber('Peso', 300),
  tallaM: optionalPositiveNumber('Talla', 3),
  presionSistolica: optionalIntRange('Presión sistólica', 50, 300),
  presionDiastolica: optionalIntRange('Presión diastólica', 20, 200),
  circunferenciaAbdominalCm: optionalPositiveNumber('Circunferencia abdominal', 300),
  frecuenciaCardiacaReposo: optionalIntRange('Frecuencia cardiaca', 20, 300),
  observaciones: z.string().optional(),
})

export type SomatometriaFormData = z.infer<typeof somatometriaSchema>
