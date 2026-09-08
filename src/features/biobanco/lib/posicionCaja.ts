/**
 * Cómo se nombra una posición dentro de una caja criogénica.
 *
 * En la base de datos la fila y la columna son dos enteros 1..N; las letras son
 * solo la forma de leerlas. La convención es la de una placa de laboratorio:
 * **la fila es letra y la columna es número** —A1, B7, C12—, que es como vienen
 * rotuladas las cajas físicas.
 *
 * Antes esto estaba repartido por media docena de componentes con tres formatos
 * distintos —`F3 C5`, `3-5`, `Fila 3 Col C`—, y ese último además ponía la letra
 * en la columna, al revés que la caja real. Todo el formateo vive aquí para que
 * cambiar la convención vuelva a ser un solo sitio.
 */

/**
 * Convierte el índice de fila (1-based) en su letra: 1→A, 26→Z, 27→AA.
 *
 * Se recorre en base 26 en vez de un simple `fromCharCode(64 + n)` porque ese
 * atajo produce símbolos sueltos —`[`, `\`— en cuanto una caja pasa de 26 filas.
 */
export function letraFila(fila: number): string {
  if (!Number.isFinite(fila) || fila < 1) return ''
  let n = Math.trunc(fila)
  let etiqueta = ''
  while (n > 0) {
    n--
    etiqueta = String.fromCharCode(65 + (n % 26)) + etiqueta
    n = Math.floor(n / 26)
  }
  return etiqueta
}

/** Etiqueta corta de una posición: fila en letra, columna en número. Ej. `B7`. */
export function etiquetaPosicionCaja(
  fila: number | string | null | undefined,
  columna: number | string | null | undefined,
): string {
  const f = typeof fila === 'string' ? Number(fila) : fila
  const c = typeof columna === 'string' ? Number(columna) : columna
  if (f == null || c == null || !Number.isFinite(f) || !Number.isFinite(c)) return ''
  return `${letraFila(f)}${Math.trunc(c)}`
}

/** Versión hablada, para tooltips y `aria-label`. Ej. `Fila B, columna 7`. */
export function descripcionPosicionCaja(
  fila: number | string | null | undefined,
  columna: number | string | null | undefined,
): string {
  const f = typeof fila === 'string' ? Number(fila) : fila
  const c = typeof columna === 'string' ? Number(columna) : columna
  if (f == null || c == null || !Number.isFinite(f) || !Number.isFinite(c)) return ''
  return `Fila ${letraFila(f)}, columna ${Math.trunc(c)}`
}
