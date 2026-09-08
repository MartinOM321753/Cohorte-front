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
  /** La familia: Participante, Estudios, Exámenes de laboratorio, Totales… */
  grupo: string
  /**
   * Dentro de la familia, de dónde sale el dato: el estudio concreto.
   *
   * Es lo que permite buscar «hemoglobina» y ver a qué estudio pertenece, en vez
   * de encontrar un nombre suelto sin saber de dónde viene.
   */
  subgrupo?: string | null
  /** CAMPO se mete dentro de un texto; BLOQUE ocupa su propia caja. */
  clase: 'CAMPO' | 'BLOQUE'
  ayuda?: string | null
  /** De qué estudio viene, si viene de alguno. */
  idTipoEstudio?: number | null
  /** Solo para bloques: si permite elegir qué filas se muestran. */
  seleccionable: boolean
  /**
   * Las columnas que ese bloque sabe imprimir, clave → rótulo, en orden.
   *
   * Vienen del servidor y no de una lista fija en el editor: cada tabla imprime
   * cosas distintas, y con una lista fija el panel ofrecía marcar columnas que el
   * documento nunca sacaba.
   */
  columnas?: Record<string, string>
}

/**
 * Una imagen de la galería de la institución.
 *
 * El diseño guarda `clave` (`imagen:{id}`), nunca una dirección: una URL firmada
 * caduca y una fija ataría la plantilla al dominio desde el que se guardó.
 */
export interface ImagenReporte {
  id: number
  nombre: string
  contentType: string
  bytes: number
  anchoPx?: number | null
  altoPx?: number | null
  fechaCreacion?: string
  /** Lo que se pone en el elemento del diseño. */
  clave: string
}
