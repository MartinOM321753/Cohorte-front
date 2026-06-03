import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { DistribucionBucketDTO } from '../types/cobertura.types'

interface Props {
  data:     DistribucionBucketDTO[]
  selected: number | null
  onSelect: (k: number) => void
}

export function DistribucionHistograma({ data, selected, onSelect }: Props) {
  if (data.length === 0) {
    return (
      <Card className="border border-border shadow-none">
        <CardContent className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Sin datos de distribución.
        </CardContent>
      </Card>
    )
  }

  const maxPac = Math.max(...data.map(d => d.cantidadPacientes), 1)
  const totalTipos = data[0].totalTipos

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Distribución de completitud
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Pacientes por número de tipos cubiertos
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          Clic en una barra para ver quiénes están en ese grupo
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex items-end gap-2 h-40">
          {data.map(bucket => {
            const k = bucket.cantidadTipos
            const barH = Math.max((bucket.cantidadPacientes / maxPac) * 128, 4)
            const isSelected = selected === k

            const barBg =
              k === 0          ? 'bg-destructive' :
              k === totalTipos ? 'bg-[var(--status-success-fg)]' :
              'bg-primary'

            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelect(k)}
                className={[
                  'flex flex-col items-center gap-1 flex-1 min-w-0 group cursor-pointer rounded transition-opacity',
                  isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100',
                ].join(' ')}
                style={isSelected ? {
                  outline: '2px solid var(--imss-ochre-500, #c2870a)',
                  outlineOffset: '2px',
                  borderRadius: '4px',
                } : undefined}
              >
                {/* Conteo encima */}
                <span className="text-[11px] font-bold tabular-nums text-foreground leading-none">
                  {bucket.cantidadPacientes}
                </span>
                {/* Barra */}
                <div
                  className={`w-full rounded-t-sm transition-all ${barBg}`}
                  style={{ height: `${barH}px` }}
                />
                {/* Etiqueta k */}
                <span className="text-[10px] font-mono text-muted-foreground leading-none">
                  {k}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive" />
            0 tipos
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
            Parcial
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--status-success-fg)]" />
            Completo ({totalTipos}/{totalTipos})
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
