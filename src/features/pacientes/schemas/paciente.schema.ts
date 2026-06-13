import { z } from 'zod'
import { esMayorDeEdadConTolerancia } from '@/components/ui/date-time-picker'

export const pacienteFormSchema = z.object({
  // Opcional: si el participante ya contaba con un folio de seguimiento previo,
  // el usuario lo captura aquí (se normaliza a MAYÚSCULAS/alfanumérico en backend);
  // si se omite, el sistema genera uno automáticamente (formato COH-AA-NNNNN).
  folio: z.string()
    .trim()
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[A-Za-z0-9-]*$/, 'Solo letras, números y guiones')
    .optional()
    .or(z.literal('')),

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
      'El participante debe ser mayor de 18 años (tolerancia de 3 meses)',
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

  // ── Clasificación de reclutamiento (obligatoria al registrar) ──────────────
  tipoReclutamiento: z.enum(['RETORNO', 'NUEVO'], {
    errorMap: () => ({ message: 'Seleccione la clasificación de reclutamiento' }),
  }),

  estadoContacto: z
    .enum(['PENDIENTE', 'ACEPTA_PARTICIPAR', 'ACEPTA_CUESTIONARIO_RECUPERACION', 'RECHAZA_CONTACTO_FUTURO'])
    .optional()
    .nullable(),

  medioContacto: z
    .enum(['TELEFONO', 'CORREO', 'PRESENCIAL', 'OTRO'])
    .optional()
    .nullable(),

  observaciones: z.string()
    .trim()
    .max(500, 'Las observaciones no pueden superar 500 caracteres')
    .optional()
    .or(z.literal('')),

  fechaContacto: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true
      const fecha = new Date(`${val}T00:00:00`)
      const hoy = new Date()
      hoy.setHours(23, 59, 59, 999)
      return fecha <= hoy
    }, 'La fecha de contacto no puede ser una fecha futura')
    .or(z.literal('')),
})
  .superRefine((data, ctx) => {
    if (data.tipoReclutamiento === 'RETORNO' && !data.estadoContacto) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estadoContacto'],
        message: 'Seleccione el resultado del contacto para participantes de retorno',
      })
    }
  })

export type PacienteFormData = z.infer<typeof pacienteFormSchema>
