/**
 * Generación y medida del símbolo de código de barras.
 *
 * Vive aparte del componente que lo dibuja porque el maquetado necesita medirlo
 * antes de decidir dónde va: para encontrar la escala más grande que cabe en la
 * etiqueta hay que probar varias, y cada prueba es una generación completa. El
 * resultado se memoriza para que esa búsqueda no cueste.
 */

import bwipjs from 'bwip-js/browser'
import type { TipoCodigo } from '@/types/api'
import type { MedirCodigo } from './layoutEtiqueta'

const BCID_MAP: Record<TipoCodigo, string> = {
  DATAMATRIX: 'datamatrix',
  CODE_128: 'code128',
  QR_CODE: 'qrcode',
}

/**
 * Píxeles que bwip-js dibuja por módulo y por unidad de `scale`.
 *
 * No es el mismo para todas las simbologías: los códigos de dos dimensiones usan
 * 2 y Code 128 usa 1. Medido contra símbolos de tamaño conocido — por ejemplo
 * `AAAA` en Code 128 son 11*(1+4+1)+13 = 79 módulos, y su viewBox con escala 2
 * mide 158 px.
 */
const PX_POR_MODULO: Record<TipoCodigo, number> = {
  DATAMATRIX: 2,
  QR_CODE: 2,
  CODE_128: 1,
}

export interface CodigoSimbolo {
  svg: string
  anchoMm: number
  altoMm: number
}

/**
 * Tamaño real del símbolo, en dots de impresora.
 *
 * Se mide en lugar de estimarse: el tamaño de un DataMatrix o un QR depende de
 * cuánto texto lleve dentro, y suponer un tamaño fijo dejaba un hueco muerto
 * debajo del código que no correspondía a ningún espaciado configurado.
 */
function medirDots(
  svg: string,
  tipo: TipoCodigo,
  modulo: number,
): { ancho: number; alto: number } | null {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  if (!m) return null

  const factor = PX_POR_MODULO[tipo] ?? 2
  const ancho = parseFloat(m[1]) / factor
  const alto = parseFloat(m[2]) / factor
  if (!isFinite(ancho) || !isFinite(alto) || ancho <= 0 || alto <= 0) return null

  // En Code 128 la altura no la decide el símbolo sino el módulo configurado,
  // igual que en la impresora.
  return { ancho, alto: tipo === 'CODE_128' ? modulo * 10 : alto }
}

const cache = new Map<string, CodigoSimbolo | null>()

/**
 * Símbolo a una escala dada, en dots. En los códigos de dos dimensiones la
 * escala es el módulo; en Code 128 es el ancho de la barra angosta.
 */
export function generarSimbolo(
  data: string,
  tipo: TipoCodigo,
  modulo: number,
  escalaDots: number,
  dpi: number,
): CodigoSimbolo | null {
  const clave = `${tipo}|${modulo}|${escalaDots}|${dpi}|${data}`
  const enCache = cache.get(clave)
  if (enCache !== undefined) return enCache

  let resultado: CodigoSimbolo | null = null
  try {
    const svg = bwipjs.toSVG({
      bcid: BCID_MAP[tipo],
      text: data,
      scale: Math.max(1, Math.round(escalaDots)),
      includetext: false,
    })
    const dots = medirDots(svg, tipo, modulo)
    if (dots) {
      resultado = {
        // El símbolo se estira al recuadro que se acaba de calcular, que es su
        // tamaño verdadero: no hay deformación, solo se fija la escala.
        svg: svg.replace(
          '<svg',
          '<svg preserveAspectRatio="none" style="display:block;width:100%;height:100%"',
        ),
        anchoMm: (dots.ancho * 25.4) / dpi,
        altoMm: (dots.alto * 25.4) / dpi,
      }
    }
  } catch {
    resultado = null
  }

  cache.set(clave, resultado)
  return resultado
}

/** Medidor que el maquetado usa para probar escalas. */
export function crearMedidor(
  data: string,
  tipo: TipoCodigo,
  modulo: number,
  dpi: number,
): MedirCodigo {
  return (escalaDots) => {
    const s = generarSimbolo(data, tipo, modulo, escalaDots, dpi)
    return s ? { anchoMm: s.anchoMm, altoMm: s.altoMm } : null
  }
}
