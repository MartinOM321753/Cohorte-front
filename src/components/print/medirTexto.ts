/**
 * Medida del ancho de un texto, en milímetros.
 *
 * Vive aparte del maquetado por la misma razón que `codigoSimbolo`: el maquetado
 * necesita medir varias veces mientras busca el tamaño que cabe, y medir texto
 * necesita el navegador. Manteniéndolo fuera, el maquetado se puede probar sin
 * DOM y aquí queda un solo lugar donde acertar con la fuente.
 */

import type { MedirTexto } from './layoutCuadricula'

/**
 * La fuente con que se mide tiene que ser la misma con que se dibuja.
 *
 * Si no coinciden, la medida sobra o falta y el ajuste al ancho deja de servir:
 * el texto se recortaría igual, solo que ahora sin avisar. Esta constante es la
 * que la hoja aplica a los renglones de texto libre.
 */
export const FUENTE_ETIQUETA = 'system-ui, -apple-system, sans-serif'

/**
 * Crea un medidor con memoria.
 *
 * El maquetado mide la misma cadena a varios tamaños mientras busca el que cabe,
 * y una etiqueta con veinte filas repite las mismas medidas veinte veces. El
 * canvas se crea una sola vez porque construirlo por medida cuesta mucho más que
 * la medida misma.
 */
export function crearMedidorTexto(fuente: string = FUENTE_ETIQUETA): MedirTexto {
  const cache = new Map<string, number>()

  let contexto: CanvasRenderingContext2D | null = null
  try {
    contexto = document.createElement('canvas').getContext('2d')
  } catch {
    contexto = null
  }

  return (texto: string, fontPt: number, negrita = false): number => {
    if (!texto) return 0

    const clave = `${fontPt}|${negrita ? 'b' : 'n'}|${texto}`
    const memorizado = cache.get(clave)
    if (memorizado !== undefined) return memorizado

    // El mismo peso con que la etiqueta lo dibuja. La negrita ensancha el texto
    // lo bastante como para que un valor «que cabía» salga con puntos
    // suspensivos, y el maquetado ni se entera porque midió el peso normal.
    const peso = negrita ? 600 : 400

    let anchoMm: number

    if (contexto) {
      // La fuente se pide en puntos —que es la unidad del maquetado— pero
      // `measureText` siempre responde en píxeles CSS, que son 96 por pulgada
      // independientemente del zoom de la vista previa. De ahí el 96 y no el 72:
      // convertir con 72 daría un tercio de más y encogería la letra sin motivo.
      contexto.font = `${peso} ${fontPt}pt ${fuente}`
      const anchoPx = contexto.measureText(texto).width
      anchoMm = (anchoPx / 96) * 25.4
    } else {
      // Sin canvas —un entorno sin DOM, o un navegador que lo bloquea— se estima
      // por número de caracteres. Es peor, pero deja el maquetado funcionando en
      // vez de dar cero, que haría creer que todo cabe.
      anchoMm = texto.length * (fontPt / 72) * 25.4 * (negrita ? 0.58 : 0.55)
    }

    cache.set(clave, anchoMm)
    return anchoMm
  }
}
