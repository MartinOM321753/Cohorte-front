import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  pacientesActivos: number
  pctGlobal:        number
  completos:        number
  cero:             number
  totalTipos:       number
  tipoWord:         string
  isLoading?:       boolean
}

interface TileProps {
  label:     string
  value:     number | string
  sub?:      string
  highlight?: 'success' | 'danger' | 'default'
  isLoading?: boolean
}

function Tile({ label, value, sub, highlight = 'default', isLoading }: TileProps) {
  const numColor =
    highlight === 'success' ? 'text-[var(--status-success-fg)]' :
    highlight === 'danger'  ? 'text-destructive' :
    'text-foreground'

  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          {label}
        </div>
        <div className="mt-2">
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <div className={`tabular-nums text-[32px] font-semibold leading-none ${numColor}`}>
              {value}
            </div>
          )}
        </div>
        {sub && <div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export function CoverturaTiles({
  pacientesActivos, pctGlobal, completos, cero, totalTipos, tipoWord, isLoading,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Tile
        label="Pacientes activos"
        value={pacientesActivos}
        sub="Total en seguimiento"
        isLoading={isLoading}
      />
      <Tile
        label="Cobertura global"
        value={`${pctGlobal}%`}
        sub={`de celdas ${tipoWord} completadas`}
        highlight={pctGlobal >= 80 ? 'success' : pctGlobal >= 50 ? 'default' : 'danger'}
        isLoading={isLoading}
      />
      <Tile
        label={`Completos (${totalTipos}/${totalTipos})`}
        value={completos}
        sub={`con todos los ${tipoWord}s registrados`}
        highlight="success"
        isLoading={isLoading}
      />
      <Tile
        label="Sin ningún registro"
        value={cero}
        sub={`pacientes sin ningún ${tipoWord}`}
        highlight={cero > 0 ? 'danger' : 'success'}
        isLoading={isLoading}
      />
    </div>
  )
}
