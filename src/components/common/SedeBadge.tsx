import { Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface SedeBadgeProps {
  /** Unos módulos identifican la sede por id y otros por uuid; sirve cualquiera. */
  idInstitucion?: number | null
  uuidInstitucion?: string | null
  nombreInstitucion?: string | null
  /**
   * Muestra la sede también cuando es la propia.
   *
   * Se usa donde conviven registros de varias sedes y hace falta distinguirlos
   * uno a uno: una muestra padre puede tener alícuotas generadas por cada
   * institución por la que ha pasado, y ocultar las propias las vuelve
   * indistinguibles de las ajenas. La sede propia se pinta en gris para que el
   * ámbar siga significando "esto lo hizo alguien más".
   */
  mostrarSiempre?: boolean
  /** Verbo del tooltip. En alícuotas es "Generada por", no "Registrado por". */
  accion?: string
  className?: string
}

/**
 * Indica la sede que hizo un registro clínico.
 *
 * Desde que una institución puede atender a los participantes de otra, el historial
 * de un participante mezcla sedes en la misma lista. Sin esto no habría forma de
 * saber quién hizo qué. Por omisión se omite en los registros propios —que son la
 * mayoría— para que la etiqueta signifique algo cuando aparece.
 */
export function SedeBadge({
  idInstitucion,
  uuidInstitucion,
  nombreInstitucion,
  mostrarSiempre = false,
  accion = 'Registrado por',
  className,
}: SedeBadgeProps) {
  const propia = useAuthStore((s) => s.user?.institucion)

  if (!nombreInstitucion) return null

  const esPropia =
    (idInstitucion != null && propia?.id != null && idInstitucion === propia.id) ||
    (!!uuidInstitucion && !!propia?.uuid && uuidInstitucion === propia.uuid)

  if (esPropia && !mostrarSiempre) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        esPropia
          ? 'bg-muted text-muted-foreground border border-border'
          : 'bg-amber-100 text-amber-700',
        className,
      )}
      title={`${accion} ${nombreInstitucion}`}
    >
      <Building2 className="h-2.5 w-2.5" strokeWidth={2} />
      {nombreInstitucion}
    </span>
  )
}
