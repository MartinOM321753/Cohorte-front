import { z } from 'zod'

export const tipoEstudioSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido'),
  descripcion: z.string().trim().optional(),
})

export type TipoEstudioFormData = z.infer<typeof tipoEstudioSchema>

export const parametroEstudioSchema = z.object({
  idTipoEstudio: z.number().min(1, 'Debe seleccionar un tipo de estudio'),
  nombre: z.string().trim().min(1, 'El nombre es requerido'),
  unidad: z.string().trim().optional(),
  tipo: z.enum(['NUMERICO', 'TEXTO', 'BOOLEANO']),
})

export type ParametroEstudioFormData = z.infer<typeof parametroEstudioSchema>

/**
 * Dynamic schema builder for estudio results based on parameters
 */
export function buildEstudioResultadoSchema(parametros: any[]): z.ZodObject<any> {
  const fields: Record<string, any> = {}

  parametros.forEach((param) => {
    switch (param.tipo) {
      case 'NUMERICO':
        fields[`param_${param.id}`] = z.number().optional()
        break
      case 'TEXTO':
        fields[`param_${param.id}`] = z.string().trim().optional()
        break
      case 'BOOLEANO':
        fields[`param_${param.id}`] = z.boolean().optional()
        break
      case 'GRUPO':
        fields[`param_${param.id}`] = z.string().trim().optional()
        break
    }
  })

  return z.object(fields)
}

/**
 * Generic estudio creation schema
 */
export const estudioMedicoSchema = z.object({
  pacienteUUID: z.string(),
  usuarioRealizaUUID: z.string(),
  idTipoEstudio: z.number().min(1, 'Debe seleccionar un tipo de estudio'),
  fechaEstudio: z.string(),
  observaciones: z.string().trim().optional(),
})

export type EstudioMedicoFormData = z.infer<typeof estudioMedicoSchema>
