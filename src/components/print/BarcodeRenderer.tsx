import { useMemo } from 'react'
import { generarSimbolo } from './codigoSimbolo'
import type { TipoCodigo } from '@/types/api'

interface BarcodeRendererProps {
  data: string
  tipo: TipoCodigo
  modulo: number
  /**
   * Escala del símbolo en dots, ya resuelta por el maquetado. No es la
   * configurada: si el símbolo no cabía en la etiqueta, el maquetado la redujo
   * hasta que cupiera. Dibujar con la configurada sacaría el código del recuadro.
   */
  escalaDots: number
  /** Puntos por pulgada de la configuración; convierte los dots a milímetros. */
  dpi: number
}

/**
 * Dibuja el símbolo al tamaño exacto que el maquetado le asignó.
 *
 * El contenedor lleva medidas explícitas en milímetros en vez de dejar que el
 * padre lo acomode: así el símbolo mide en pantalla lo mismo que en el papel, y
 * la vista previa sirve para juzgar si se lee.
 */
export function BarcodeRenderer({ data, tipo, modulo, escalaDots, dpi }: BarcodeRendererProps) {
  const codigo = useMemo(
    () => generarSimbolo(data, tipo, modulo, escalaDots, dpi),
    [data, tipo, modulo, escalaDots, dpi],
  )

  if (!codigo) {
    return <span className="text-xs text-destructive">[código inválido]</span>
  }

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: codigo.svg }}
    />
  )
}
