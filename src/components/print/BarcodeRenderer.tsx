import { useMemo } from 'react'
import bwipjs from 'bwip-js/browser'
import type { TipoCodigo } from '@/types/api'

const BCID_MAP: Record<TipoCodigo, string> = {
  DATAMATRIX: 'datamatrix',
  CODE_128: 'code128',
  QR_CODE: 'qrcode',
}

interface BarcodeRendererProps {
  data: string
  tipo: TipoCodigo
  modulo: number
  /** Ancho de la barra angosta en dots; solo interviene en Code 128. */
  anchoBarra: number
  /** Puntos por pulgada de la configuración; convierte los dots del símbolo a milímetros. */
  dpi: number
}

/**
 * Ancho de la barra angosta, en dots, tal como lo entiende la impresora.
 *
 * En los códigos de dos dimensiones lo marca el módulo configurado. En Code 128
 * no: el ZPL sale como `^BCN,<modulo*10>` —donde ese número es la ALTURA de las
 * barras— y el ancho lo lleva `^BY`, que es un ajuste aparte.
 */
function anchoBarraDots(tipo: TipoCodigo, modulo: number, anchoBarra: number): number {
  return tipo === 'CODE_128' ? anchoBarra : modulo
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

/**
 * Tamaño real del símbolo, en dots de impresora.
 *
 * Como el símbolo se pide con `scale` igual al ancho de barra en dots, el viewBox
 * mide los dots multiplicados por el factor de la simbología. Se mide en lugar de
 * estimarse: el tamaño de un DataMatrix o un QR depende de cuánto texto lleve
 * dentro, y suponer un tamaño fijo dejaba un hueco muerto debajo del código que no
 * correspondía a ningún espaciado configurado.
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

export function BarcodeRenderer({ data, tipo, modulo, anchoBarra, dpi }: BarcodeRendererProps) {
  const codigo = useMemo(() => {
    try {
      const svg = bwipjs.toSVG({
        bcid: BCID_MAP[tipo],
        text: data,
        scale: anchoBarraDots(tipo, modulo, anchoBarra),
        includetext: false,
      })
      const dots = medirDots(svg, tipo, modulo)
      if (!dots) return null

      return {
        // El símbolo se estira al recuadro que se acaba de calcular, que es su
        // tamaño verdadero: no hay deformación, solo se fija la escala.
        svg: svg.replace(
          '<svg',
          '<svg preserveAspectRatio="none" style="display:block;width:100%;height:100%"',
        ),
        anchoMm: dots.ancho * 25.4 / dpi,
        altoMm: dots.alto * 25.4 / dpi,
      }
    } catch {
      return null
    }
  }, [data, tipo, modulo, anchoBarra, dpi])

  if (!codigo) {
    return <span className="text-xs text-destructive">[código inválido]</span>
  }

  return (
    <div
      style={{
        width: `${codigo.anchoMm}mm`,
        height: `${codigo.altoMm}mm`,
        // Sin esto el contenedor flexible encoge el código hasta que quepa en la
        // etiqueta: se vería bien en pantalla mientras la impresora lo saca a su
        // tamaño real y desbordado. Es preferible que el desborde se vea.
        flexShrink: 0,
      }}
      dangerouslySetInnerHTML={{ __html: codigo.svg }}
    />
  )
}
