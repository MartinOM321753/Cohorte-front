import { Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface SedeBadgeProps {
  /** Unos módulos identifican la sede por id y otros por uuid; sirve cualquiera. */
  idInstitucion?: number | null
  uuidInstitucion?: string | null
  nombreInstitucion?: string | null
  className?: string
}

/**
 * Indica la sede que hizo un registro clínico, y solo cuando no es la del usuario.
 *
 * Desde que una institución puede atender a los participantes de otra, el historial
 * de un participante mezcla sedes en la misma lista. Sin esto no habría forma de
 * saber quién hizo qué. Se omite en los registros propios —que son la mayoría—
 * para que la etiqueta signifique algo cuando aparece.
 */
export function SedeBadge({ idInstitucion, uuidInstitucion, nombreInstitucion, className }: SedeBadgeProps) {
  const propia = useAuthStore((s) => s.user?.institucion)

  if (!nombreInstitucion) return null
  if (idInstitucion != null && propia?.id != null && idInstitucion === propia.id) return null
  if (uuidInstitucion && propia?.uuid && uuidInstitucion === propia.uuid) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700',
        className,
      )}
      title={`Registrado por ${nombreInstitucion}`}
    >
      <Building2 className="h-2.5 w-2.5" strokeWidth={2} />
      {nombreInstitucion}
    </span>
  )
}
