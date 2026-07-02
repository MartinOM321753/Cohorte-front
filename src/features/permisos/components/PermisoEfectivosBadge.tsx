import { Badge } from '@/components/ui/badge'
import type { PermisoEfectivoDTO } from '../types/permiso.types'

const ORIGIN_STYLES: Record<string, string> = {
  ROL_HEREDADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONCESION_INDIVIDUAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TEMPORAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESTRICCION: 'bg-red-100 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400',
}

const ORIGIN_LABELS: Record<string, string> = {
  ROL_HEREDADO: 'Heredado',
  CONCESION_INDIVIDUAL: 'Concedido',
  TEMPORAL: 'Temporal',
  RESTRICCION: 'Restringido',
}

interface Props {
  permiso: PermisoEfectivoDTO
  compact?: boolean
}

export function PermisoEfectivoBadge({ permiso, compact }: Props) {
  const style = ORIGIN_STYLES[permiso.origen] ?? 'bg-muted text-muted-foreground'
  const label = ORIGIN_LABELS[permiso.origen] ?? permiso.origen

  return (
    <div className="flex items-center gap-2 py-0.5">
      <Badge className={style + ' text-[10px] shrink-0'}>
        {label}
      </Badge>
      <span className={`text-[12px] font-mono ${permiso.origen === 'RESTRICCION' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {permiso.codigo}
      </span>
      {!compact && permiso.detalleOrigen && (
        <span className="text-[11px] text-muted-foreground truncate">({permiso.detalleOrigen})</span>
      )}
    </div>
  )
}
