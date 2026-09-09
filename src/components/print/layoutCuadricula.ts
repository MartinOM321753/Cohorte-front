/**
 * Maquetado de una etiqueta dividida en cuadrícula.
 *
 * Es el caso de las etiquetas que salen de un archivo externo. El área útil se
 * parte en filas y columnas, y cada dato ocupa una celda —o varias, si se unen—
 * de modo que dos valores puedan ir uno al lado del otro. Apilar todo en
 * renglones completos, que es lo que se hacía antes, desperdicia la mitad de una
 * etiqueta ancha y baja el tamaño de letra sin necesidad.
 *
 * Una cuadrícula de N filas por 1 columna es exactamente el apilado de antes, así
 * que no hay dos motores: hay uno, y el apilado es su caso particular.
 *
 * Comparte con `layoutEtiqueta` el área útil, que es literalmente la misma regla.
 * No comparte la cascada del símbolo, que es del código de barras y aquí no hay
 * ninguno.
 *
 * La restricción que manda es el ANCHO. En el maquetado con código el texto se
 * contenía solo y el que no cabía era el símbolo; aquí el texto viene de celdas
 * ajenas, de longitud desconocida, y `.elemento-texto` recorta con puntos
 * suspensivos. Un valor recortado en silencio es peor que una etiqueta que avisa.
 */

import { areaUtilDe, type AreaUtil, type ConfigArea } from './layoutEtiqueta'

export type Alineacion = 'IZQUIERDA' | 'CENTRO' | 'DERECHA'

/**
 * Por debajo de esto el texto deja de leerse en papel.
 *
 * Es más alto que el mínimo del maquetado con código (8 dots, unos 2.8 pt a
 * 203 dpi) a propósito: allí la letra chica acompañaba a un símbolo que la
 * lectora sí podía leer, y aquí el texto es lo único que hay.
 */
export const MIN_FUENTE_PT = 5

/** Cuánto se baja el tamaño en cada intento de la cascada. */
const PASO_PT = 0.25

/** Separación entre renglones de una misma celda, como fracción del tamaño. */
const INTERLINEA_RELATIVA = 0.18

/** Nunca más de esto dentro de una celda, aunque el alto diera para más. */
const MAX_RENGLONES_CELDA = 3

export function ptToMm(pt: number): number {
  return (pt / 72) * 25.4
}

/**
 * Mide el ancho de un texto en milímetros al tamaño y peso de letra dados.
 *
 * Se recibe de fuera porque medir texto necesita el navegador y este módulo es
 * puro; así puede probarse sin DOM, igual que el maquetado con código recibe su
 * medidor de símbolos.
 *
 * El peso es un parámetro y no un detalle: la negrita ensancha el texto entre un
 * 3 y un 6 %, y medir en peso normal lo que se dibuja en negrita hace que quepa
 * en la cuenta y se recorte en el papel — con el agravante de que el maquetado
 * lo da por bueno y no avisa.
 */
export type MedirTexto = (texto: string, fontPt: number, negrita?: boolean) => number

export interface ConfigCuadricula extends ConfigArea {
  filas: number
  columnas: number
  /** Separación entre celdas, en milímetros. */
  espacioColumnaMm: number
  espacioFilaMm: number
}

/** Un dato colocado en la cuadrícula. */
export interface CeldaContenido {
  /** Columna del archivo de la que sale; sirve para señalar el problema. */
  clave: string
  texto: string
  fila: number
  columna: number
  /** Cuántas columnas de la cuadrícula ocupa. Unir celdas es lo que permite
   *  que un dato largo cruce la etiqueta mientras otros dos van a la par. */
  columnaSpan: number
  filaSpan: number
  alineacion: Alineacion
  fontPt: number
  negrita: boolean
}

export interface RenglonMaquetado {
  texto: string
  topMm: number
  leftMm: number
  anchoMm: number
  altoMm: number
  fontPt: number
  alineacion: Alineacion
  negrita: boolean
}

export interface CeldaMaquetada {
  clave: string
  fila: number
  columna: number
  /** Recuadro de la celda, para poder dibujar guías en la vista previa. */
  rect: { leftMm: number; topMm: number; anchoMm: number; altoMm: number }
  renglones: RenglonMaquetado[]
  /** Ni al tamaño mínimo cabe: se va a recortar al imprimir. */
  recortado: boolean
  /** Tuvo que bajarse el tamaño respecto al pedido. */
  reducido: boolean
}

export interface MaquetadoCuadricula {
  areaUtil: AreaUtil
  celdas: CeldaMaquetada[]
  desbordado: boolean
  /** Claves de las columnas cuyo valor no cabe. Es lo que se muestra al usuario. */
  clavesConProblema: string[]
}

/**
 * Parte un texto en como mucho `maxRenglones` que quepan a lo ancho.
 *
 * Se corta por palabras. Una palabra sola más ancha que la celda no se parte por
 * la mitad —partir un folio o una clave produce dos cosas que no significan
 * nada— y se deja para que la reducción de letra la resuelva, o para que se
 * reporte como recortada.
 */
export function partirEnRenglones(
  texto: string,
  fontPt: number,
  anchoMm: number,
  maxRenglones: number,
  medir: MedirTexto,
  negrita = false,
): string[] {
  if (maxRenglones <= 1 || medir(texto, fontPt, negrita) <= anchoMm) return [texto]

  const palabras = texto.split(/\s+/).filter(Boolean)
  if (palabras.length <= 1) return [texto]

  const renglones: string[] = []
  let actual = ''

  // Se recorre por índice y no por valor: con `indexOf` una palabra repetida
  // devolvería su primera aparición y el último renglón saldría con texto
  // duplicado. «Tubo de suero de paciente» bastaba para provocarlo.
  for (let i = 0; i < palabras.length; i++) {
    const palabra = palabras[i]
    const propuesta = actual ? `${actual} ${palabra}` : palabra

    if (actual && medir(propuesta, fontPt, negrita) > anchoMm) {
      renglones.push(actual)
      actual = palabra
      // Si ya se llenó el cupo, todo lo que falta se acumula en el último
      // renglón: es preferible un renglón largo que perder palabras.
      if (renglones.length === maxRenglones - 1) {
        renglones.push(palabras.slice(i).join(' '))
        return renglones
      }
    } else {
      actual = propuesta
    }
  }

  if (actual) renglones.push(actual)
  return renglones
}

/** Geometría de la cuadrícula: cuánto mide una celda y dónde empieza cada una. */
export interface Rejilla {
  areaUtil: AreaUtil
  anchoColumnaMm: number
  altoFilaMm: number
}

export function rejillaDe(config: ConfigCuadricula): Rejilla {
  const areaUtil = areaUtilDe(config)
  const columnas = Math.max(1, config.columnas)
  const filas = Math.max(1, config.filas)

  return {
    areaUtil,
    anchoColumnaMm: Math.max(
      0,
      (areaUtil.anchoMm - (columnas - 1) * config.espacioColumnaMm) / columnas,
    ),
    altoFilaMm: Math.max(0, (areaUtil.altoMm - (filas - 1) * config.espacioFilaMm) / filas),
  }
}

/** Recuadro que ocupa una celda, ya contando las que tenga unidas. */
export function rectDeCelda(
  config: ConfigCuadricula,
  rejilla: Rejilla,
  fila: number,
  columna: number,
  filaSpan = 1,
  columnaSpan = 1,
) {
  const { areaUtil, anchoColumnaMm, altoFilaMm } = rejilla
  return {
    leftMm: areaUtil.leftMm + columna * (anchoColumnaMm + config.espacioColumnaMm),
    topMm: areaUtil.topMm + fila * (altoFilaMm + config.espacioFilaMm),
    anchoMm: columnaSpan * anchoColumnaMm + (columnaSpan - 1) * config.espacioColumnaMm,
    altoMm: filaSpan * altoFilaMm + (filaSpan - 1) * config.espacioFilaMm,
  }
}

/**
 * Coloca el contenido de una etiqueta dentro de su cuadrícula.
 *
 * Cada celda se resuelve por su cuenta: la letra se reduce solo donde hace
 * falta. Bajarle el tamaño a toda la etiqueta porque un valor se pasa
 * desperdicia el resto, y es justo lo que hacía el apilado anterior.
 */
export function layoutCuadricula(
  config: ConfigCuadricula,
  contenido: CeldaContenido[],
  medir: MedirTexto,
): MaquetadoCuadricula {
  const rejilla = rejillaDe(config)
  const celdas: CeldaMaquetada[] = []
  const conProblema = new Set<string>()

  for (const c of contenido) {
    if (!c.texto.trim()) continue

    const rect = rectDeCelda(config, rejilla, c.fila, c.columna, c.filaSpan, c.columnaSpan)
    if (rect.anchoMm <= 0 || rect.altoMm <= 0) continue

    // Cuántos renglones admite la celda por su alto. Sin este tope, un valor
    // largo en una celda baja se partiría en renglones que no caben y saldrían
    // pisando la etiqueta de abajo — o, con el recorte de la casilla, se
    // perderían sin dejar rastro.
    const maxPorAlto = Math.max(1, Math.floor(rect.altoMm / ptToMm(c.fontPt)))
    const maxRenglones = Math.min(MAX_RENGLONES_CELDA, maxPorAlto)

    let fontPt = c.fontPt
    let renglones = partirEnRenglones(c.texto, fontPt, rect.anchoMm, maxRenglones, medir, c.negrita)

    const alto = (n: number, pt: number) =>
      n * ptToMm(pt) + (n - 1) * ptToMm(pt) * INTERLINEA_RELATIVA
    const cabe = (lineas: string[], pt: number) =>
      alto(lineas.length, pt) <= rect.altoMm + 1e-9 &&
      lineas.every((t) => medir(t, pt, c.negrita) <= rect.anchoMm + 1e-9)

    // Una sola cascada, contra las dos restricciones a la vez: al bajar el
    // tamaño la celda gana ancho y alto de golpe, y volver a partir con la letra
    // nueva puede además ahorrar un renglón.
    while (!cabe(renglones, fontPt) && fontPt > MIN_FUENTE_PT) {
      fontPt = Math.max(MIN_FUENTE_PT, Math.round((fontPt - PASO_PT) * 100) / 100)
      const maxAhora = Math.min(MAX_RENGLONES_CELDA, Math.max(1, Math.floor(rect.altoMm / ptToMm(fontPt))))
      renglones = partirEnRenglones(c.texto, fontPt, rect.anchoMm, maxAhora, medir, c.negrita)
    }

    const recortado = !cabe(renglones, fontPt)
    if (recortado) conProblema.add(c.clave)

    // Centrado vertical dentro de la celda: con una sola línea es lo que se
    // espera, y con dos deja el bloque equilibrado en vez de pegado arriba.
    const altoBloque = alto(renglones.length, fontPt)
    const altoRenglon = ptToMm(fontPt)
    const salto = altoRenglon * (1 + INTERLINEA_RELATIVA)
    let y = rect.topMm + Math.max(0, (rect.altoMm - altoBloque) / 2)

    const dibujados: RenglonMaquetado[] = renglones.map((texto) => {
      const anchoTexto = Math.min(medir(texto, fontPt, c.negrita), rect.anchoMm)
      const sobra = Math.max(0, rect.anchoMm - anchoTexto)
      const desplazamiento =
        c.alineacion === 'IZQUIERDA' ? 0 : c.alineacion === 'DERECHA' ? sobra : sobra / 2

      const renglon: RenglonMaquetado = {
        texto,
        topMm: y,
        leftMm: rect.leftMm + desplazamiento,
        anchoMm: anchoTexto,
        altoMm: altoRenglon,
        fontPt,
        alineacion: c.alineacion,
        negrita: c.negrita,
      }
      y += salto
      return renglon
    })

    celdas.push({
      clave: c.clave,
      fila: c.fila,
      columna: c.columna,
      rect,
      renglones: dibujados,
      recortado,
      reducido: fontPt < c.fontPt,
    })
  }

  return {
    areaUtil: rejilla.areaUtil,
    celdas,
    desbordado: conProblema.size > 0,
    clavesConProblema: Array.from(conProblema),
  }
}

/**
 * Tamaño de letra al que una celda de esta cuadrícula deja de ser legible.
 *
 * Sirve para avisar al diseñar, que es cuando la decisión se toma, en vez de al
 * ver la hoja, que es cuando ya no se puede hacer nada.
 */
export function fontMaximoPorCelda(config: ConfigCuadricula): number {
  const { altoFilaMm } = rejillaDe(config)
  return (altoFilaMm / 25.4) * 72
}
