/**
 * Geometría y estilos de la hoja, compartidos por todo lo que se imprime.
 *
 * Vive aparte para que la vista de etiquetas y la hoja de calibración usen
 * literalmente las mismas reglas y la misma cuenta de posiciones. Si cada una
 * tuviera su copia, la calibración mediría una hoja distinta de la que después
 * se imprime y no serviría de nada — que es el error que ya se había cometido
 * cuando la ventana de impresión inyectaba estilos propios.
 */

import type { ConfiguracionEtiquetaResponse } from '@/types/api'

/** Medidas de la hoja carta, por si la configuración viene de una API anterior. */
export const HOJA_CARTA = { anchoMm: 215.9, altoMm: 279.4 }

/**
 * Estilos de la hoja y de las etiquetas. Se usan tal cual en la pantalla y en el
 * documento que se manda a imprimir, de modo que la vista previa sea una
 * referencia fiable de lo que va a salir en el papel.
 */
export const ESTILOS_HOJA = `
.hoja-zoom {
  overflow: hidden;
  width: calc(var(--hoja-ancho) * var(--escala));
  height: calc(var(--hoja-alto) * var(--escala));
}
.hoja {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  width: var(--hoja-ancho);
  height: var(--hoja-alto);
  transform: scale(var(--escala));
  transform-origin: top left;
  background: #fff;
  color: #000;
}
/* La casilla es el recuadro de la etiqueta. Recorta lo que sobresalga: nada de
   lo que lleve dentro puede invadir la etiqueta vecina. */
.casilla {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
  background: #fff;
}
.elemento {
  position: absolute;
  box-sizing: border-box;
}
.elemento-texto {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.elemento-mono { font-family: monospace; }
.elemento svg { display: block; width: 100%; height: 100%; }
`

/**
 * Lo que cambia entre ver y imprimir: se quitan las ayudas visuales y el zoom.
 * Nada de esto toca posiciones ni tamaños.
 */
export function estilosImpresion(anchoHojaMm: number, altoHojaMm: number): string {
  return `
@page { size: ${anchoHojaMm}mm ${altoHojaMm}mm; margin: 0; }
body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; }
.hoja-zoom { --escala: 1 !important; overflow: visible; margin: 0 !important; }
.hoja { break-after: page; page-break-after: always; }
.hoja-zoom:last-child .hoja { break-after: auto; page-break-after: auto; }
.casilla { border: none !important; outline: none !important; opacity: 1 !important; }
/* El marco de calibración sí se imprime: es el que se compara contra el troquel
   de la hoja para ver dónde cae cada recuadro. Va después de la regla que quita
   los bordes, y con dos clases gana en especificidad.
   Se dibuja con outline y no con border a propósito: el borde forma parte de la
   caja y correría el contenido un cuarto de milímetro hacia dentro, que es
   precisamente la clase de desfase que este marco sirve para medir. El offset
   negativo lo mete justo sobre el límite del recuadro en vez de por fuera. */
.casilla.con-marco {
  outline: 0.25mm solid #000 !important;
  outline-offset: -0.25mm !important;
}
.solo-pantalla { display: none !important; }
`
}

export interface GeometriaHoja {
  hojaAnchoMm: number
  hojaAltoMm: number
  pasoHorizontalMm: number
  pasoVerticalMm: number
  cols: number
  rows: number
  origenXMm: number
  origenYMm: number
  desbordaAncho: boolean
  desbordaAlto: boolean
  anchoOcupadoMm: number
  altoOcupadoMm: number
}

/**
 * Acomodo de la cuadrícula sobre la hoja, en milímetros.
 *
 * La posición de cada casilla se calcula desde el origen de la hoja, como
 * `margen + índice * paso`. Antes las filas se apilaban una tras otra sumando
 * alto y separación, y cualquier diferencia entre esa suma y el paso real de la
 * hoja se multiplicaba por el número de fila: la primera salía en su sitio y la
 * décima caía varios milímetros abajo. Calculando desde el origen, el error de
 * una fila no puede heredarse a la siguiente.
 */
export function resolverGeometria(config: ConfiguracionEtiquetaResponse): GeometriaHoja {
  const hojaAnchoMm = config.hojaAnchoMm || HOJA_CARTA.anchoMm
  const hojaAltoMm = config.hojaAltoMm || HOJA_CARTA.altoMm

  // Se usa el paso ya resuelto por el backend, no el crudo: el crudo vale cero
  // mientras nadie lo capture, y ahí el acomodo se deduce del tamaño más la
  // separación. El respaldo cubre respuestas de una versión anterior de la API.
  const pasoHorizontalMm =
    config.pasoHorizontalEfectivoMm ||
    config.pasoHorizontalMm ||
    config.anchoMm + config.espacioHorizontalMm
  const pasoVerticalMm =
    config.pasoVerticalEfectivoMm ||
    config.pasoVerticalMm ||
    config.altoMm + config.espacioVerticalMm

  const cols = Math.max(1, config.etiquetasPorFila)
  const rows = Math.max(1, config.filasPorPagina)

  const origenXMm = (config.ajusteXMm || 0) + config.margenPaginaIzquierdoMm
  const origenYMm = (config.ajusteYMm || 0) + config.margenPaginaSuperiorMm

  // Hasta dónde llega la última etiqueta de la hoja. Si se pasa del papel, la
  // cuadrícula está mal descrita y conviene decirlo antes de gastar una hoja.
  const anchoOcupadoMm = origenXMm + (cols - 1) * pasoHorizontalMm + config.anchoMm
  const altoOcupadoMm = origenYMm + (rows - 1) * pasoVerticalMm + config.altoMm

  return {
    hojaAnchoMm,
    hojaAltoMm,
    pasoHorizontalMm,
    pasoVerticalMm,
    cols,
    rows,
    origenXMm,
    origenYMm,
    desbordaAncho: anchoOcupadoMm > hojaAnchoMm + 0.01,
    desbordaAlto: altoOcupadoMm > hojaAltoMm + 0.01,
    anchoOcupadoMm,
    altoOcupadoMm,
  }
}

/**
 * Manda a imprimir un fragmento de hoja en una ventana aparte.
 *
 * El contenido se acompaña siempre de los mismos estilos con los que se vio en
 * pantalla, más los ajustes de impresión.
 */
export function imprimirHoja(
  contenidoHtml: string,
  anchoHojaMm: number,
  altoHojaMm: number,
  titulo = 'Etiquetas',
  estilosExtra = '',
): void {
  const ventana = window.open('', '_blank')
  if (!ventana) return

  ventana.document.open()
  ventana.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titulo}</title>` +
      `<style>${ESTILOS_HOJA}${estilosExtra}${estilosImpresion(anchoHojaMm, altoHojaMm)}</style>` +
      `</head><body>${contenidoHtml}</body></html>`,
  )
  ventana.document.close()

  ventana.addEventListener('afterprint', () => ventana.close())
  setTimeout(() => {
    ventana.focus()
    ventana.print()
  }, 250)
}
