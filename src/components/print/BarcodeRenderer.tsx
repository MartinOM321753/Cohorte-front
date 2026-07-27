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
  sizeMm?: number
}

export function BarcodeRenderer({ data, tipo, modulo, sizeMm }: BarcodeRendererProps) {
  const svg = useMemo(() => {
    try {
      return bwipjs.toSVG({
        bcid: BCID_MAP[tipo],
        text: data,
        scale: modulo,
        includetext: false,
      })
    } catch {
      return null
    }
  }, [data, tipo, modulo])

  if (!svg) {
    return <span className="text-xs text-destructive">[código inválido]</span>
  }

  return (
    <div
      style={sizeMm ? { width: `${sizeMm}mm`, height: `${sizeMm}mm` } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
