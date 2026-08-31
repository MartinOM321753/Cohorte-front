/** Lo que viaja hacia y desde el servidor. El diseño en sí vive en `types.ts`. */

export type TipoReporte = 'ESTUDIO' | 'EXAMENES' | 'SOMATOMETRIA' | 'EXPEDIENTE' | 'AGREGADO'

export const TIPO_REPORTE_ROTULOS: Record<TipoReporte, string> = {
  ESTUDIO:      'Estudio médico',
  EXAMENES:     'Exámenes de laboratorio',
  SOMATOMETRIA: 'Somatometría',
  EXPEDIENTE:   'Expediente del participante',
  AGREGADO:     'Resumen general',
}

export interface PlantillaReporte {
  id: number
  nombre: string
  descripcion?: string | null
  tipoReporte: TipoReporte
  /** JSON del diseño. Los listados lo devuelven vacío para no cargar de más. */
  diseno?: string | null
  predeterminada: boolean
  activo: boolean
  institucionNombre?: string | null
  fechaCreacion?: string
  fechaActualizacion?: string | null
}

export interface PlantillaReporteRequest {
  nombre: string
  descripcion?: string
  tipoReporte: TipoReporte
  diseno: string
  predeterminada?: boolean
}
