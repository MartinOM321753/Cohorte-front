/**
 * Catálogo de hojas de etiquetas.
 *
 * Cada entrada trae el **paso** —la distancia de un borde de etiqueta al mismo
 * borde de la siguiente— y no la separación entre etiquetas. Es el dato que
 * publican los fabricantes y el único que posiciona bien una cuadrícula:
 * deducirlo de tamaño más separación acumula el error de ambos campos fila tras
 * fila, que es lo que hacía que la primera etiqueta saliera en su sitio y la
 * décima cayera varios milímetros fuera.
 *
 * Todas las medidas están verificadas contra el cierre de la hoja carta: márgenes
 * simétricos y `2·margen + (n−1)·paso + tamaño` igual a 215.9 y 279.4 al
 * centésimo de milímetro. Si algún preset no cerrara, estaría mal transcrito.
 */

import type { TamanoHoja } from '@/types/api'

export interface PresetHoja {
  id: string
  nombre: string
  /** Referencia comercial, para reconocer la caja en la papelería. */
  equivalencias: string
  tamanoHoja: TamanoHoja
  anchoMm: number
  altoMm: number
  columnas: number
  filas: number
  margenPaginaIzquierdoMm: number
  margenPaginaSuperiorMm: number
  pasoHorizontalMm: number
  pasoVerticalMm: number
}

const IN = 25.4
const r = (pulgadas: number) => Math.round(pulgadas * IN * 10000) / 10000

export const PRESETS_HOJA: PresetHoja[] = [
  {
    id: 'avery-5160',
    nombre: 'Direcciones 25.4 × 66.7 mm — 30 por hoja',
    equivalencias: 'Avery 5160 / 8160 / 5960',
    tamanoHoja: 'CARTA',
    anchoMm: r(2.625), altoMm: r(1),
    columnas: 3, filas: 10,
    margenPaginaIzquierdoMm: r(0.1875), margenPaginaSuperiorMm: r(0.5),
    pasoHorizontalMm: r(2.75), pasoVerticalMm: r(1),
  },
  {
    id: 'avery-5161',
    nombre: 'Direcciones 25.4 × 101.6 mm — 20 por hoja',
    equivalencias: 'Avery 5161 / 8161',
    tamanoHoja: 'CARTA',
    anchoMm: r(4), altoMm: r(1),
    columnas: 2, filas: 10,
    margenPaginaIzquierdoMm: r(0.125), margenPaginaSuperiorMm: r(0.5),
    pasoHorizontalMm: r(4.25), pasoVerticalMm: r(1),
  },
  {
    id: 'avery-5162',
    nombre: 'Direcciones 33.9 × 101.6 mm — 14 por hoja',
    equivalencias: 'Avery 5162 / 8162',
    tamanoHoja: 'CARTA',
    anchoMm: r(4), altoMm: r(4 / 3),
    columnas: 2, filas: 7,
    margenPaginaIzquierdoMm: r(0.125), margenPaginaSuperiorMm: r(5 / 6),
    pasoHorizontalMm: r(4.25), pasoVerticalMm: r(4 / 3),
  },
  {
    id: 'avery-5163',
    nombre: 'Envíos 50.8 × 101.6 mm — 10 por hoja',
    equivalencias: 'Avery 5163 / 8163',
    tamanoHoja: 'CARTA',
    anchoMm: r(4), altoMm: r(2),
    columnas: 2, filas: 5,
    margenPaginaIzquierdoMm: r(0.125), margenPaginaSuperiorMm: r(0.5),
    pasoHorizontalMm: r(4.25), pasoVerticalMm: r(2),
  },
  {
    id: 'avery-5164',
    nombre: 'Envíos 84.7 × 101.6 mm — 6 por hoja',
    equivalencias: 'Avery 5164 / 8164',
    tamanoHoja: 'CARTA',
    anchoMm: r(4), altoMm: r(10 / 3),
    columnas: 2, filas: 3,
    margenPaginaIzquierdoMm: r(0.125), margenPaginaSuperiorMm: r(0.5),
    pasoHorizontalMm: r(4.25), pasoVerticalMm: r(10 / 3),
  },
  {
    id: 'avery-5167',
    nombre: 'Remitente 12.7 × 44.45 mm — 80 por hoja',
    equivalencias: 'Avery 5167 / 8167 · Office Depot 64415',
    tamanoHoja: 'CARTA',
    anchoMm: r(1.75), altoMm: r(0.5),
    columnas: 4, filas: 20,
    margenPaginaIzquierdoMm: r(0.28125), margenPaginaSuperiorMm: r(0.5),
    pasoHorizontalMm: r(2.0625), pasoVerticalMm: r(0.5),
  },
]

/** Medidas de la hoja, para comprobar que un preset cierra contra el papel. */
const HOJAS: Record<TamanoHoja, { anchoMm: number; altoMm: number }> = {
  CARTA: { anchoMm: 215.9, altoMm: 279.4 },
  A4: { anchoMm: 210, altoMm: 297 },
}

export interface CierrePreset {
  margenDerechoMm: number
  margenInferiorMm: number
  simetrico: boolean
}

/**
 * Cuánto sobra a la derecha y abajo con un acomodo dado.
 *
 * Sirve de comprobación al vuelo mientras se captura: una hoja de etiquetas se
 * troquela simétrica, así que si los sobrantes no coinciden con los márgenes
 * capturados, algún dato está mal. Es la misma verificación que descubrió que
 * varias medidas tomadas con regla eran incompatibles entre sí.
 */
export function calcularCierre(
  tamanoHoja: TamanoHoja,
  anchoMm: number,
  altoMm: number,
  columnas: number,
  filas: number,
  margenIzquierdoMm: number,
  margenSuperiorMm: number,
  pasoHorizontalMm: number,
  pasoVerticalMm: number,
): CierrePreset {
  const hoja = HOJAS[tamanoHoja] ?? HOJAS.CARTA
  const derecho = hoja.anchoMm - (margenIzquierdoMm + Math.max(0, columnas - 1) * pasoHorizontalMm + anchoMm)
  const inferior = hoja.altoMm - (margenSuperiorMm + Math.max(0, filas - 1) * pasoVerticalMm + altoMm)
  return {
    margenDerechoMm: Math.round(derecho * 100) / 100,
    margenInferiorMm: Math.round(inferior * 100) / 100,
    simetrico:
      Math.abs(derecho - margenIzquierdoMm) < 0.5 && Math.abs(inferior - margenSuperiorMm) < 0.5,
  }
}
