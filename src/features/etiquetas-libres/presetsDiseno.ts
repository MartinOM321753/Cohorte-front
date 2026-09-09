import type { Alineacion } from '@/components/print/layoutCuadricula'
import type { ConfiguracionEtiquetaResponse } from '@/types/api'

import type { TablaEtiquetas } from './api/etiquetasLibres.api'
import {
  fontPtInicial,
  MAX_COLUMNAS,
  MAX_FILAS,
  type CeldaDiseno,
  type DisenoEtiqueta,
} from './disenoEtiqueta'

/**
 * Diseños de partida, armados según cuántas columnas trae el archivo.
 *
 * No son plantillas guardadas ni configuración: se generan en el momento para el
 * archivo que se acaba de subir, con sus columnas reales colocadas. Existen
 * porque diseñar una cuadrícula desde cero para cada archivo es trabajo que casi
 * siempre termina en uno de estos acomodos, y elegir uno y retocarlo es más
 * rápido que construirlo.
 *
 * Cada uno es un `DisenoEtiqueta` normal y corriente. Aplicar uno no bloquea
 * nada: se sigue pudiendo mover cualquier celda después, y también se puede
 * mandar a imprimir sin tocar el diseñador.
 */

export interface PresetDiseno {
  id: string
  nombre: string
  descripcion: string
  diseno: DisenoEtiqueta
}

function celda(
  fila: number,
  columna: number,
  columnaArchivo: number | null,
  extra: Partial<CeldaDiseno> = {},
): CeldaDiseno {
  return {
    fila,
    columna,
    columnaArchivo,
    columnaSpan: 1,
    alineacion: 'CENTRO',
    negrita: false,
    conEncabezado: false,
    ...extra,
  }
}

/** Todo en un renglón por dato, centrado. Es el acomodo de siempre. */
function apilado(n: number, fontPt: number): DisenoEtiqueta | null {
  if (n > MAX_FILAS) return null
  return {
    filas: n,
    columnas: 1,
    fontPt,
    celdas: Array.from({ length: n }, (_, i) => celda(i, 0, i)),
  }
}

/** Un renglón por dato, con el nombre de la columna delante y alineado a la izquierda. */
function etiquetado(n: number, fontPt: number): DisenoEtiqueta | null {
  if (n > MAX_FILAS) return null
  return {
    filas: n,
    columnas: 1,
    fontPt,
    celdas: Array.from({ length: n }, (_, i) =>
      celda(i, 0, i, { conEncabezado: true, alineacion: 'IZQUIERDA' }),
    ),
  }
}

/**
 * El primer dato como título, a lo ancho y en negrita; el resto apilado.
 *
 * Sirve cuando una de las columnas es la que identifica la etiqueta de un
 * vistazo y las demás son detalle.
 */
function tituloYApilado(n: number, fontPt: number): DisenoEtiqueta | null {
  if (n < 2 || n > MAX_FILAS) return null
  return {
    filas: n,
    columnas: 1,
    fontPt,
    celdas: [
      celda(0, 0, 0, { negrita: true }),
      ...Array.from({ length: n - 1 }, (_, i) => celda(i + 1, 0, i + 1)),
    ],
  }
}

/**
 * Dos datos por renglón, el de la izquierda pegado a la izquierda y el de la
 * derecha a la derecha.
 *
 * Es el que aprovecha una etiqueta ancha: donde antes cabían tres renglones
 * legibles ahora entran seis datos.
 */
function dosPorRenglon(n: number, fontPt: number): DisenoEtiqueta | null {
  const filas = Math.ceil(n / 2)
  if (n < 2 || filas > MAX_FILAS || MAX_COLUMNAS < 2) return null

  const celdas: CeldaDiseno[] = []
  for (let i = 0; i < n; i++) {
    const fila = Math.floor(i / 2)
    const columna = i % 2
    const alineacion: Alineacion = columna === 0 ? 'IZQUIERDA' : 'DERECHA'
    // Un dato impar al final se queda solo en su renglón: se une a lo ancho para
    // que no quede colgando de un lado con medio renglón vacío al otro.
    const solo = i === n - 1 && columna === 0
    celdas.push(
      celda(fila, columna, i, {
        alineacion: solo ? 'CENTRO' : alineacion,
        columnaSpan: solo ? 2 : 1,
      }),
    )
  }

  return { filas, columnas: 2, fontPt, celdas }
}

/**
 * Título a lo ancho arriba y el resto en dos columnas debajo.
 *
 * `centrado` decide cómo se apoyan los pares. Pegarlos a los bordes separa los
 * dos valores lo más posible y se leen como dos datos distintos; centrarlos los
 * deja equilibrados dentro de su mitad, que se ve más ordenado cuando los
 * valores son cortos y de largo parecido. Ninguna de las dos es mejor siempre,
 * así que se ofrecen las dos.
 */
function tituloYDos(n: number, fontPt: number, centrado: boolean): DisenoEtiqueta | null {
  const restantes = n - 1
  const filas = 1 + Math.ceil(restantes / 2)
  if (n < 3 || filas > MAX_FILAS || MAX_COLUMNAS < 2) return null

  const celdas: CeldaDiseno[] = [celda(0, 0, 0, { negrita: true, columnaSpan: 2 })]
  for (let i = 0; i < restantes; i++) {
    const fila = 1 + Math.floor(i / 2)
    const columna = i % 2
    // Un dato impar al final se queda solo en su renglón: se une a lo ancho para
    // que no quede colgando de un lado con medio renglón vacío al otro.
    const solo = i === restantes - 1 && columna === 0
    const alineacion: Alineacion =
      solo || centrado ? 'CENTRO' : columna === 0 ? 'IZQUIERDA' : 'DERECHA'
    celdas.push(
      celda(fila, columna, i + 1, { alineacion, columnaSpan: solo ? 2 : 1 }),
    )
  }

  return { filas, columnas: 2, fontPt, celdas }
}

interface Receta {
  id: string
  nombre: string
  descripcion: string
  construir: (n: number, fontPt: number) => DisenoEtiqueta | null
}

const RECETAS: Receta[] = [
  {
    id: 'apilado',
    nombre: 'Apilado',
    descripcion: 'Un dato por renglón, centrado.',
    construir: apilado,
  },
  {
    id: 'dos-por-renglon',
    nombre: 'Dos por renglón',
    descripcion: 'Dos datos a la par. Aprovecha el ancho de la etiqueta.',
    construir: dosPorRenglon,
  },
  {
    id: 'titulo-y-dos',
    nombre: 'Título y pares',
    descripcion: 'El primer dato cruza arriba; el resto, de dos en dos, apoyados en los bordes.',
    construir: (n, fontPt) => tituloYDos(n, fontPt, false),
  },
  {
    id: 'titulo-y-dos-centrado',
    nombre: 'Título y pares centrados',
    descripcion: 'Igual que el anterior, pero cada dato centrado en su mitad.',
    construir: (n, fontPt) => tituloYDos(n, fontPt, true),
  },
  {
    id: 'titulo-y-apilado',
    nombre: 'Título y lista',
    descripcion: 'El primer dato destacado y los demás debajo.',
    construir: tituloYApilado,
  },
  {
    id: 'etiquetado',
    nombre: 'Con nombre de columna',
    descripcion: 'Cada renglón dice «Columna: valor».',
    construir: etiquetado,
  },
]

/**
 * Los diseños que tienen sentido para este archivo.
 *
 * Se descartan los que no caben —un acomodo de dos columnas no existe con un
 * solo dato, y nada puede pasar del máximo de filas—, de modo que lo que se
 * muestra siempre es aplicable. Ofrecer una opción que al pulsarla no hace nada
 * es peor que no ofrecerla.
 */
export function presetsPara(
  tabla: TablaEtiquetas,
  config: ConfiguracionEtiquetaResponse,
): PresetDiseno[] {
  const n = tabla.encabezados.length
  const fontPt = fontPtInicial(config)

  return RECETAS.flatMap((receta) => {
    const diseno = receta.construir(n, fontPt)
    if (!diseno) return []
    return [{ id: receta.id, nombre: receta.nombre, descripcion: receta.descripcion, diseno }]
  })
}

/**
 * ¿El diseño actual es exactamente este preset?
 *
 * Se compara el contenido y no una marca guardada aparte: si el usuario mueve
 * una celda, deja de serlo, y la galería tiene que dejar de señalarlo como
 * elegido. Guardar «cuál se eligió» mentiría en cuanto se retocara algo.
 */
export function esElMismoDiseno(a: DisenoEtiqueta, b: DisenoEtiqueta): boolean {
  if (a.filas !== b.filas || a.columnas !== b.columnas || a.fontPt !== b.fontPt) return false

  const clave = (d: DisenoEtiqueta) =>
    d.celdas
      .filter((c) => c.columnaArchivo !== null)
      .map((c) =>
        [c.fila, c.columna, c.columnaArchivo, c.columnaSpan, c.alineacion, c.negrita, c.conEncabezado].join('·'),
      )
      .sort()
      .join('|')

  return clave(a) === clave(b)
}
