/**
 * El catálogo de iconos.
 *
 * <p>Los nombres y códigos <b>no viven aquí</b>, sino en
 * `public/iconos/material-symbols.txt`, y se piden cuando hacen falta. La primera
 * versión los traía incrustados en este archivo como una cadena de 78 000
 * caracteres, y el editor tardaba <b>treinta segundos</b> en abrir: no por leer el
 * dato —eso son cinco milisegundos— sino porque el empaquetador tiene que
 * transformar el módulo, y una línea de ese tamaño lo pone de rodillas. Un catálogo
 * es dato, no código.</p>
 *
 * <p>Además así solo se descarga si alguien abre el selector de iconos, que no es
 * la mayoría de las veces que se abre el editor.</p>
 *
 * <p>El archivo se genera cruzando la lista de nombres de Google con el `cmap` real
 * de `public/fonts/MaterialSymbolsOutlined.ttf`, de modo que solo contiene iconos
 * que esa tipografía sabe dibujar. Sin ese cruce, el buscador ofrecería nombres que
 * acabarían saliendo como un hueco en el papel.</p>
 *
 * <p>Tipografía: Material Symbols Outlined (Google) — Apache License 2.0.</p>
 */

const RUTA = '/iconos/material-symbols.txt'

export interface IconoCatalogo {
  /** Como lo llama Google: `home`, `favorite`, `local_hospital`… */
  nombre: string
  /** El código del glifo, en hexadecimal. Es lo que se guarda en el diseño. */
  codigo: string
}

/**
 * La descarga en curso o ya hecha.
 *
 * Se guarda la promesa y no el resultado: si dos partes de la pantalla piden el
 * catálogo a la vez —el selector y la vista de propiedades— comparten la misma
 * petición en vez de lanzar dos.
 */
let pendiente: Promise<IconoCatalogo[]> | null = null

export function cargarIconos(): Promise<IconoCatalogo[]> {
  if (!pendiente) {
    pendiente = fetch(RUTA)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo leer el catálogo de iconos (${r.status})`)
        return r.text()
      })
      .then((texto) => texto
        .split('\n')
        .map((linea) => linea.trim())
        .filter(Boolean)
        .map((linea) => {
          const [nombre, codigo] = linea.split(' ')
          return { nombre, codigo }
        }))
      .catch((e) => {
        // Se olvida el fallo para que el siguiente intento vuelva a pedirlo; si se
        // guardara la promesa rota, el selector quedaría vacío para siempre.
        pendiente = null
        throw e
      })
  }
  return pendiente
}

/** El carácter que hay que pintar para ese código. No necesita el catálogo. */
export function caracterDeIcono(codigo: string): string {
  const n = parseInt(codigo, 16)
  return Number.isFinite(n) ? String.fromCodePoint(n) : ''
}
