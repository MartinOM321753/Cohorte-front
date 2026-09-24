/**
 * Corrección del desfase que mete la impresora al llenar la hoja.
 *
 * El sistema coloca cada columna exactamente a la altura de las demás —se
 * comprobó imprimiendo a PDF con el motor de impresión del navegador: 0.0000 mm
 * de diferencia entre la primera y la última columna en las 20 filas—. Aun así,
 * en papel la columna 3 y la 4 salen más abajo, y cada vez más conforme avanza
 * la hoja. Es la hoja de etiquetas entrando girada o patinándose de un lado, que
 * pasa a menudo porque el respaldo es más grueso que una hoja común.
 *
 * Eso no es un error del código y no se arregla buscándolo: se compensa. Cada
 * etiqueta se sube lo que la impresora la va a bajar.
 *
 * El modelo tiene dos números porque son los dos que se pueden medir con una
 * regla contra el troquel, sin cálculos: cuánto baja la última columna en la
 * primera fila y cuánto en la última. La primera columna es la referencia —es la
 * que sale bien— y todo lo demás se interpola:
 *
 *   bajada(columna, fila) = u · (arriba + (abajo − arriba) · v)
 *
 * con u = 0 en la primera columna y 1 en la última, y v = 0 en la primera fila y
 * 1 en la última. Un giro de la hoja da `arriba = abajo`; un patinado de un lado
 * da `arriba ≈ 0` y `abajo` grande; la mayoría de las impresoras, algo en medio.
 *
 * Es de la impresora, no de la hoja ni del archivo: se guarda por navegador, que
 * en la práctica es por computadora y por lo tanto por impresora.
 */

export interface CorreccionImpresora {
  /** Milímetros que la ÚLTIMA columna sale más abajo que la primera, en la primera fila. */
  arribaMm: number
  /** Lo mismo, en la última fila de la hoja. */
  abajoMm: number
}

export const SIN_CORRECCION: CorreccionImpresora = { arribaMm: 0, abajoMm: 0 }

/** Más que esto no es un desfase de impresora: es otra hoja o otra configuración. */
export const LIMITE_MM = 10

const CLAVE = 'etiquetas-libres:correccion-impresora'

export function esNula(c: CorreccionImpresora): boolean {
  return c.arribaMm === 0 && c.abajoMm === 0
}

function acotar(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(-LIMITE_MM, Math.min(LIMITE_MM, Math.round(n * 100) / 100))
}

export function normalizar(c: Partial<CorreccionImpresora>): CorreccionImpresora {
  return { arribaMm: acotar(c.arribaMm), abajoMm: acotar(c.abajoMm) }
}

/**
 * Desplazamiento vertical que hay que aplicarle a una casilla, en milímetros.
 *
 * Negativo: se sube lo que la impresora baja. `columnas` y `filas` son las de
 * una página, porque cada hoja entra por separado y el defecto empieza de cero.
 */
export function desplazamientoMm(
  c: CorreccionImpresora,
  columna: number,
  fila: number,
  columnas: number,
  filas: number,
): number {
  const u = columnas > 1 ? columna / (columnas - 1) : 0
  const v = filas > 1 ? fila / (filas - 1) : 0
  const bajada = u * (c.arribaMm + (c.abajoMm - c.arribaMm) * v)
  // `0 - 0` da -0, que en un estilo sale como "-0mm". Da igual al imprimir,
  // pero no hay por qué dejar un signo que no significa nada.
  return bajada === 0 ? 0 : -bajada
}

export function leerCorreccion(): CorreccionImpresora {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? normalizar(JSON.parse(crudo)) : SIN_CORRECCION
  } catch {
    return SIN_CORRECCION
  }
}

export function guardarCorreccion(c: CorreccionImpresora): void {
  try {
    if (esNula(c)) localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, JSON.stringify(c))
  } catch {
    // Sin almacenamiento la corrección vale mientras la pantalla esté abierta.
  }
}
