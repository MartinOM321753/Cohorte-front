import { dotsToPt } from '@/components/print/layoutEtiqueta'
import type {
  Alineacion,
  CeldaContenido,
  ConfigCuadricula,
} from '@/components/print/layoutCuadricula'
import type { ConfiguracionEtiquetaResponse } from '@/types/api'

import type { TablaEtiquetas } from './api/etiquetasLibres.api'

/**
 * El diseño de la etiqueta: qué dato va en cada celda de la cuadrícula.
 *
 * Se guarda por celda y no como una lista ordenada de columnas porque el orden
 * ya no basta: dos datos pueden estar a la misma altura, uno puede ocupar el
 * ancho completo y una celda puede quedarse vacía a propósito.
 *
 * Este módulo es el único sitio donde se decide qué se imprime, y por eso lo
 * usan tanto la vista previa como la revisión de filas con problema. Si cada una
 * armara su contenido por su cuenta, la advertencia podría no corresponder a lo
 * que sale en el papel, que es la peor forma de fallar.
 */

export interface CeldaDiseno {
  fila: number
  columna: number
  /** Índice de la columna del archivo, o `null` si la celda va vacía. */
  columnaArchivo: number | null
  /** Cuántas columnas de la cuadrícula ocupa; unir es lo que deja un dato cruzar. */
  columnaSpan: number
  alineacion: Alineacion
  negrita: boolean
  /** Antepone el nombre de la columna al valor, solo en esta celda. */
  conEncabezado: boolean
}

export interface DisenoEtiqueta {
  filas: number
  columnas: number
  /** Tamaño base; cada celda lo baja por su cuenta si no le alcanza. */
  fontPt: number
  celdas: CeldaDiseno[]
}

export const MAX_FILAS = 8
export const MAX_COLUMNAS = 4

export function claveCelda(fila: number, columna: number): string {
  return `${fila}:${columna}`
}

export function celdaEn(diseno: DisenoEtiqueta, fila: number, columna: number) {
  return diseno.celdas.find((c) => c.fila === fila && c.columna === columna)
}

/**
 * ¿Esta posición está tapada por una celda de su izquierda que se unió con ella?
 *
 * Hay que saberlo para no dibujar dos controles sobre el mismo espacio ni dejar
 * colocar un dato donde ya hay otro.
 */
export function estaCubierta(diseno: DisenoEtiqueta, fila: number, columna: number): boolean {
  return diseno.celdas.some(
    (c) =>
      c.fila === fila &&
      c.columna < columna &&
      c.columna + c.columnaSpan > columna,
  )
}

/** Tamaño de partida: el que la configuración ya usa para el nombre. */
export function fontPtInicial(config: ConfiguracionEtiquetaResponse): number {
  return Math.round(dotsToPt(config.tamanoFuenteNombre, config.dpi) * 2) / 2
}

/**
 * Diseño de arranque: una fila por columna del archivo, en una sola columna.
 *
 * Es exactamente el apilado de antes. Se empieza así a propósito: quien solo
 * quiera imprimir su archivo no tiene que diseñar nada, y quien necesite poner
 * dos datos juntos sube el número de columnas y los mueve.
 */
export function disenoInicial(
  tabla: TablaEtiquetas,
  config: ConfiguracionEtiquetaResponse,
): DisenoEtiqueta {
  const filas = Math.min(MAX_FILAS, Math.max(1, tabla.encabezados.length))

  return {
    filas,
    columnas: 1,
    fontPt: fontPtInicial(config),
    celdas: Array.from({ length: filas }, (_, i) => ({
      fila: i,
      columna: 0,
      columnaArchivo: i < tabla.encabezados.length ? i : null,
      columnaSpan: 1,
      alineacion: 'CENTRO' as Alineacion,
      negrita: false,
      conEncabezado: false,
    })),
  }
}

/**
 * Ajusta el diseño cuando cambia el tamaño de la cuadrícula.
 *
 * Se conserva lo que siga cabiendo. Rehacerlo desde cero al mover un número
 * perdería el trabajo de colocar los datos, que es justo lo que la pantalla
 * viene a permitir.
 */
export function redimensionar(
  diseno: DisenoEtiqueta,
  filas: number,
  columnas: number,
): DisenoEtiqueta {
  const celdas = diseno.celdas
    .filter((c) => c.fila < filas && c.columna < columnas)
    .map((c) => ({
      ...c,
      // Una celda unida no puede sobresalir de la cuadrícula nueva.
      columnaSpan: Math.min(c.columnaSpan, columnas - c.columna),
    }))

  return { ...diseno, filas, columnas, celdas }
}

export function conCelda(diseno: DisenoEtiqueta, celda: CeldaDiseno): DisenoEtiqueta {
  const resto = diseno.celdas.filter(
    (c) => !(c.fila === celda.fila && c.columna === celda.columna),
  )
  return { ...diseno, celdas: [...resto, celda] }
}

export function celdaVacia(fila: number, columna: number): CeldaDiseno {
  return {
    fila,
    columna,
    columnaArchivo: null,
    columnaSpan: 1,
    alineacion: 'CENTRO',
    negrita: false,
    conEncabezado: false,
  }
}

/** Columnas del archivo que el diseño no está usando. */
export function columnasSinColocar(diseno: DisenoEtiqueta, tabla: TablaEtiquetas): number[] {
  const usadas = new Set(
    diseno.celdas.map((c) => c.columnaArchivo).filter((c): c is number => c !== null),
  )
  return tabla.encabezados.map((_, i) => i).filter((i) => !usadas.has(i))
}

/**
 * Traduce la configuración de etiqueta y el diseño a lo que el maquetado
 * necesita.
 *
 * La separación entre celdas se deriva del espaciado ya configurado para el
 * nombre: es una hoja que alguien calibró, y reinventar aquí un valor propio
 * haría que la misma etiqueta se viera distinta según por dónde se imprimiera.
 */
export function configCuadriculaDe(
  config: ConfiguracionEtiquetaResponse,
  diseno: DisenoEtiqueta,
): ConfigCuadricula {
  return {
    anchoMm: config.anchoMm,
    altoMm: config.altoMm,
    margenIzquierdoMm: config.margenIzquierdoMm,
    margenSuperiorMm: config.margenSuperiorMm,
    margenDerechoMm: config.margenDerechoMm,
    margenInferiorMm: config.margenInferiorMm,
    filas: diseno.filas,
    columnas: diseno.columnas,
    // Un hueco horizontal es imprescindible: sin él, dos valores contiguos se
    // tocan y se leen como uno solo.
    espacioColumnaMm: 0.6,
    espacioFilaMm: 0,
  }
}

export function contenidoDeFila(
  tabla: TablaEtiquetas,
  indiceFila: number,
  diseno: DisenoEtiqueta,
): CeldaContenido[] {
  const fila = tabla.filas[indiceFila] ?? []

  return diseno.celdas
    .filter((c) => c.columnaArchivo !== null)
    .map((c) => {
      const indice = c.columnaArchivo as number
      const encabezado = tabla.encabezados[indice] ?? ''
      const valor = fila[indice] ?? ''

      return {
        clave: encabezado,
        texto: c.conEncabezado && valor ? `${encabezado}: ${valor}` : valor,
        fila: c.fila,
        columna: c.columna,
        columnaSpan: c.columnaSpan,
        filaSpan: 1,
        alineacion: c.alineacion,
        fontPt: diseno.fontPt,
        negrita: c.negrita,
      }
    })
}

/** Una fila cuyo contenido no va a salir completo en su etiqueta. */
export interface FilaConProblema {
  indice: number
  /** Fila real dentro del archivo, que es donde el usuario la va a buscar. */
  numeroDeFila: number
  /** Columnas cuyo valor se recorta. */
  columnas: string[]
  /** Columnas colocadas que en esta fila venían vacías. */
  vacias: string[]
}
