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
  idTipoEstudio?: number | null
  tipoEstudioNombre?: string | null
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
  /** Opcional: liga la plantilla a un tipo de estudio para poder elegir parámetros. */
  idTipoEstudio?: number
  diseno: string
  predeterminada?: boolean
}

/** Un dato insertable, tal como lo describe el servidor. */
export interface CampoReporte {
  clave: string
  rotulo: string
  grupo: string
  /** CAMPO se mete dentro de un texto; BLOQUE ocupa su propia caja. */
  clase: 'CAMPO' | 'BLOQUE'
  ayuda?: string | null
  /** Solo para bloques: si permite elegir qué filas se muestran. */
  seleccionable: boolean
}
