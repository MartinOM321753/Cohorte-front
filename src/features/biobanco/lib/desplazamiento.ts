/**
 * Quién desplaza de verdad la pantalla.
 *
 * La aplicación no desplaza la ventana: el contenido vive dentro de un `<main>`
 * con desbordamiento propio, así que `window.scrollTo` no mueve nada y
 * `document.documentElement.scrollHeight` mide un alto que nadie recorre. En
 * lugar de nombrar ese elemento —que ataría el listado a la forma actual del
 * armazón— se busca subiendo desde el propio nodo el primer ancestro que
 * realmente pueda desplazarse.
 */
export function contenedorDesplazable(nodo: HTMLElement | null): HTMLElement | null {
  let actual: HTMLElement | null = nodo?.parentElement ?? null

  while (actual) {
    const estilo = getComputedStyle(actual)
    const desborda = /(auto|scroll|overlay)/.test(estilo.overflowY)
    if (desborda && actual.scrollHeight > actual.clientHeight) {
      return actual
    }
    actual = actual.parentElement
  }

  // Sin ancestro con desbordamiento propio, quien desplaza es el documento.
  return (document.scrollingElement as HTMLElement) ?? document.documentElement
}
