import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TipoCodigo } from '@/types/api'
import type { ContenidoCodigo } from '../api/documentos.api'

interface Props {
  /** Tipo de código de la configuración elegida; decide si hay algo que elegir. */
  tipoCodigo?: TipoCodigo
  value: ContenidoCodigo
  onChange: (v: ContenidoCodigo) => void
}

/**
 * Elige qué se codifica en el símbolo de una etiqueta de documento.
 *
 * Con Code 128 no hay elección: el enlace daría un código de más de 100 mm de
 * ancho, así que siempre lleva el código de la etiqueta. Se dice en pantalla en
 * lugar de mostrar un desplegable que no haría nada.
 */
export function SelectorContenidoCodigo({ tipoCodigo, value, onChange }: Props) {
  if (tipoCodigo === 'CODE_128') {
    return (
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Code 128 lleva siempre el <strong>código de la etiqueta</strong>. El enlace para abrir
          el documento no cabe en un código lineal; para que la etiqueta abra el documento al
          escanearla, usa una configuración con DataMatrix o QR.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] text-muted-foreground">Contenido del código</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v as ContenidoCodigo)}>
        <SelectTrigger className="h-9 text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ENLACE">Enlace para abrir el documento</SelectItem>
          <SelectItem value="CODIGO">Solo el código de la etiqueta</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        {value === 'ENLACE'
          ? 'Al escanearla se abre el documento. El código sale más grande porque lleva la dirección completa.'
          : 'Solo el código impreso en la etiqueta. Sale más compacto, pero al escanearlo no abre nada.'}
      </p>
    </div>
  )
}
