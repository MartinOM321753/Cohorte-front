import { z } from 'zod'

export const tipoEstudioSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional(),
  tipoCapturaDefecto: z.enum(['NORMAL', 'GRUPOS']).optional().default('NORMAL'),
})

export type TipoEstudioFormData = z.infer<typeof tipoEstudioSchema>


/**
 * Generic estudio creation schema
 */
export const estudioMedicoSchema = z.object({
  pacienteUUID: z.string(),
  usuarioRealizaUUID: z.string(),
  idTipoEstudio: z.number().min(1, 'Debe seleccionar un tipo de estudio'),
  fechaEstudio: z.string().min(1, 'La fecha y hora son requeridas'),
  observaciones: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
})

export type EstudioMedicoFormData = z.infer<typeof estudioMedicoSchema>
