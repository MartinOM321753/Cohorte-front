/**
 * Tipos del Módulo de Análisis. Reflejan la capa semántica del backend
 * (imss.gob.mx.cohorte.modules.analisis): una Métrica es la unidad analizable
 * común a estudios médicos, exámenes y somatometría.
 */

export type FuenteMetrica = 'ESTUDIO_MEDICO' | 'ESTUDIO_MUESTRA' | 'EXAMEN' | 'SOMATOMETRIA'

export type TipoMetrica = 'NUMERICO' | 'CATEGORICO'

export interface Metrica {
  clave: string
  fuente: FuenteMetrica
  etiqueta: string
  /** Estudio/examen al que pertenece, para agrupar en la UI. */
  grupo: string
  unidad: string | null
  tipo: TipoMetrica
  refMinHombres: number | null
  refMaxHombres: number | null
  refMinMujeres: number | null
  refMaxMujeres: number | null
  origenId: number | null
  institucionId: number | null
}

/** Etiquetas legibles por fuente, para encabezados y chips. */
export const FUENTE_LABEL: Record<FuenteMetrica, string> = {
  ESTUDIO_MEDICO: 'Estudios médicos',
  ESTUDIO_MUESTRA: 'Estudios de muestra',
  EXAMEN: 'Exámenes de laboratorio',
  SOMATOMETRIA: 'Somatometría',
}

// ── Agregación ────────────────────────────────────────────────────────────────

export type Agregacion =
  | 'RESUMEN'
  | 'DISTRIBUCION'
  | 'FUERA_DE_RANGO'
  | 'FRECUENCIA'
  | 'TEMPORAL'
  | 'MAPA_CALOR'
  | 'CORRELACION'
  | 'DISPERSION_TEMPORAL'
export type Dimension = 'institucion' | 'sexo' | 'rango_edad'
export type Granularidad = 'MES' | 'TRIMESTRE' | 'ANIO'

export interface InstitucionAlcance {
  id: number
  nombre: string
}

/** Configuración serializada de una vista guardada. */
export interface ConfigVista {
  metricaClave: string
  dimensiones: Dimension[]
  agregacion: Agregacion
  filtros: FiltrosAnalisis
  /** Granularidad del eje temporal (vistas TEMPORAL). */
  granularidad?: Granularidad
  /** Segunda métrica (vistas CORRELACION). */
  metricaY?: string | null
}

export interface VistaAnalisis {
  uuid: string
  nombre: string
  configuracion: string
  fechaActualizacion: string | null
}

export interface FiltrosAnalisis {
  instituciones?: number[]
  sexos?: ('M' | 'F')[]
  edadMin?: number | null
  edadMax?: number | null
  /** Cortes de edad definidos por el analista (R3): pares [min, max] inclusivos. */
  rangosEdad?: [number, number][]
  fechaDesde?: string | null
  fechaHasta?: string | null
  valorMin?: number | null
  valorMax?: number | null
  bins?: number | null
}

export interface AgregadoRequest {
  metricas: string[]
  dimensiones: Dimension[]
  agregacion: Agregacion
  /** Granularidad del eje temporal (solo agregacion TEMPORAL). */
  granularidad?: Granularidad
  filtros: FiltrosAnalisis
}

// ── Correlación entre dos métricas ──────────────────────────────────────────────

export interface CorrelacionRequest {
  metricaX: string
  metricaY: string
  /** Dimensión opcional para colorear la nube. */
  grupo?: Dimension | null
  filtros: FiltrosAnalisis
}

export interface PuntoCorrelacion {
  x: number
  y: number
  grupo: string
}

export interface Correlacion {
  metricaXClave: string
  metricaXEtiqueta: string
  unidadX: string | null
  metricaYClave: string
  metricaYEtiqueta: string
  unidadY: string | null
  grupo: string | null
  n: number
  nSuprimido: number
  pendiente: number | null
  intercepto: number | null
  r2: number | null
  mediaX: number | null
  mediaY: number | null
  minX: number | null
  maxX: number | null
  /** true si el backend incluyó los puntos individuales (permiso de export crudo). */
  puntosIncluidos: boolean
  puntos: PuntoCorrelacion[]
}

// ── Dispersión temporal (nube de puntos + línea de tendencia) ────────────────────

export interface DispersionTemporalRequest {
  metrica: string
  /** Dimensión opcional para separar en series. */
  grupo?: Dimension | null
  granularidad?: Granularidad
  filtros: FiltrosAnalisis
}

export interface PuntoDispersion {
  corte: string
  valor: number
}

export interface PuntoTendencia {
  corte: string
  media: number
}

export interface SerieDispersion {
  grupo: string
  puntos: PuntoDispersion[]
  tendencia: PuntoTendencia[]
}

export interface DispersionTemporal {
  metricaClave: string
  metricaEtiqueta: string
  unidad: string | null
  grupo: string | null
  /** Cortes de seguimiento ordenados (eje X). */
  cortes: string[]
  series: SerieDispersion[]
  n: number
  nSuprimido: number
  /** true si el backend incluyó los puntos individuales (permiso de export crudo). */
  puntosIncluidos: boolean
}

export interface BinHistograma {
  desde: number
  hasta: number
  conteo: number
}

export interface CategoriaConteo {
  categoria: string
  conteo: number
  proporcion: number
}

export interface CeldaAgregada {
  dimensiones: Record<string, string>
  n: number
  media: number | null
  mediana: number | null
  p25: number | null
  p75: number | null
  min: number | null
  max: number | null
  desv: number | null
  enRango: number | null
  fueraDeRango: number | null
  sinReferencia: number | null
  histograma: BinHistograma[] | null
  categorias: CategoriaConteo[] | null
}

export interface SerieAgregada {
  metricaClave: string
  metricaEtiqueta: string
  grupo: string
  unidad: string | null
  tipo: TipoMetrica
  agregacion: Agregacion
  dimensiones: string[]
  celdas: CeldaAgregada[]
  nTotal: number
  nSuprimido: number
  kAnonimo: number
}
