/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EL DISEÑO DE UN REPORTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Esto es lo que se guarda en la columna `diseno` de la plantilla, y es el
 * contrato entre el editor —que lo escribe— y el maquetador del servidor —que lo
 * convierte en PDF—. Cualquier cambio de forma aquí hay que reflejarlo allá.
 *
 * Todas las medidas van en MILÍMETROS. No es capricho: el resultado se imprime
 * en papel, y razonar en píxeles obligaría a arrastrar un factor de conversión
 * por todo el código y a redondear en cada paso. El lienzo escala milímetros a
 * pantalla en un único sitio.
 *
 * Nada de esto tiene que ver con el módulo de etiquetas, que va por su cuenta.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Tamaños de hoja disponibles, con sus medidas reales. */
export const TAMANOS_PAGINA = {
  CARTA:  { nombre: 'Carta',  anchoMm: 215.9, altoMm: 279.4 },
  OFICIO: { nombre: 'Oficio', anchoMm: 215.9, altoMm: 355.6 },
  A4:     { nombre: 'A4',     anchoMm: 210,   altoMm: 297 },
} as const

export type TamanoPagina = keyof typeof TAMANOS_PAGINA

export interface Margenes {
  superiorMm: number
  derechoMm: number
  inferiorMm: number
  izquierdoMm: number
}

/** Lo que todo elemento tiene, sea del tipo que sea. */
export interface ElementoBase {
  id: string
  xMm: number
  yMm: number
  anchoMm: number
  altoMm: number
  /** Orden de apilamiento. Mayor queda encima. */
  z: number
  /**
   * Se dibuja igual en todas las páginas. Es como se resuelven membrete y pie
   * sin tener que copiarlos a mano en cada hoja —y sin que se desincronicen
   * cuando alguien corrige uno y olvida el otro—.
   */
  repiteEnTodas?: boolean
  /** Bloqueado: se ve pero no se puede mover ni redimensionar por accidente. */
  bloqueado?: boolean
}

export type AlineacionTexto = 'left' | 'center' | 'right' | 'justify'

export interface ElementoTexto extends ElementoBase {
  tipo: 'texto'
  contenido: string
  tamanoPt: number
  negrita?: boolean
  cursiva?: boolean
  color: string
  alineacion: AlineacionTexto
  /** Interlineado como múltiplo del tamaño de letra. */
  interlineado?: number
}

export interface ElementoImagen extends ElementoBase {
  tipo: 'imagen'
  /** Referencia al archivo. Se guarda la referencia, nunca la imagen. */
  url: string
  /** Texto que describe la imagen, para quien no pueda verla. */
  descripcion?: string
  /** Cómo llena su caja: entera (puede dejar aire) o recortada (la llena). */
  ajuste?: 'contener' | 'cubrir'
}

export type FormaFigura = 'rectangulo' | 'elipse' | 'linea'

export interface ElementoFigura extends ElementoBase {
  tipo: 'figura'
  forma: FormaFigura
  relleno?: string
  colorBorde?: string
  grosorBordeMm?: number
  /** Solo para rectángulos. */
  radioMm?: number
}

/**
 * Marcador de datos. En esta fase solo existe como tipo: el editor todavía no lo
 * ofrece. Se declara desde ya para que el formato guardado no cambie de forma
 * cuando llegue, y las plantillas hechas ahora sigan abriéndose.
 */
export interface ElementoDatos extends ElementoBase {
  tipo: 'datos'
  /** Qué se inserta: un campo suelto o un bloque. */
  clave: string
  /** Qué hacer cuando el contenido no cabe en la caja. */
  desbordamiento: 'crecer' | 'ajustar' | 'recortar'
  /** Para bloques: qué filas se muestran. Vacío o ausente = todas. */
  seleccion?: number[]
}

export type Elemento = ElementoTexto | ElementoImagen | ElementoFigura | ElementoDatos

export interface PaginaDiseno {
  id: string
  elementos: Elemento[]
}

export interface DisenoReporte {
  /** Versión del formato. Permite migrar diseños viejos si esto cambia. */
  version: 1
  tamano: TamanoPagina
  orientacion: 'vertical' | 'horizontal'
  margenes: Margenes
  paginas: PaginaDiseno[]
}

// ── Utilidades del modelo ───────────────────────────────────────────────────

/** Medidas reales de la hoja, ya considerando la orientación. */
export function medidasDe(diseno: Pick<DisenoReporte, 'tamano' | 'orientacion'>) {
  const base = TAMANOS_PAGINA[diseno.tamano]
  return diseno.orientacion === 'horizontal'
    ? { anchoMm: base.altoMm, altoMm: base.anchoMm }
    : { anchoMm: base.anchoMm, altoMm: base.altoMm }
}

export function disenoVacio(): DisenoReporte {
  return {
    version: 1,
    tamano: 'CARTA',
    orientacion: 'vertical',
    margenes: { superiorMm: 18, derechoMm: 15, inferiorMm: 16, izquierdoMm: 15 },
    paginas: [{ id: nuevoId(), elementos: [] }],
  }
}

/**
 * Identificador de un elemento dentro del diseño. No sale de aquí: solo sirve
 * para distinguir elementos entre sí al arrastrarlos y al guardarlos.
 */
export function nuevoId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** El z más alto usado, para colocar lo nuevo encima de lo demás. */
export function zSuperior(elementos: Elemento[]): number {
  return elementos.reduce((max, e) => Math.max(max, e.z), 0)
}
