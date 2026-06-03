import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { CoberturaItemDTO } from '../types/cobertura.types'

interface Props {
  data:        CoberturaItemDTO[]
  selectedId:  number | null
  onSelect:    (id: number) => void
  tipoWord:    string
}

export function CoberturaBarras({ data, selectedId, onSelect, tipoWord }: Props) {
  // Ordenar por pct DESC para mostrar los más cubiertos primero en la barra
  const sorted = [...data].sort((a, b) => b.pct - a.pct)

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Cobertura por {tipoWord}
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Pacientes con {tipoWord} registrado
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          Clic en una fila para ver quiénes faltan
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin tipos de {tipoWord} activos.
          </p>
        ) : (
          <div className="space-y-0 max-h-[360px] overflow-y-auto -mx-2">
            {sorted.map(item => {
              const isSelected = selectedId === item.tipoId
              const barColor =
                item.pct >= 80 ? 'bg-[var(--status-success-fg)]' :
                item.pct >= 50 ? 'bg-[var(--status-warning-fg)]' :
                'bg-destructive'
              const textColor =
                item.pct >= 80 ? 'text-[var(--status-success-fg)]' :
                item.pct >= 50 ? 'text-[var(--status-warning-fg)]' :
                'text-destructive'

              return (
                <button
                  key={item.tipoId}
                  type="button"
                  onClick={() => onSelect(item.tipoId)}
                  className={[
                    'w-full text-left px-2 py-2 rounded-md transition-colors',
                    isSelected
                      ? 'bg-[var(--imss-green-50)] dark:bg-primary/10'
                      : 'hover:bg-muted/40',
                  ].join(' ')}
                >
                  <div className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr 2fr 100px' }}>
                    {/* Nombre */}
                    <span
                      className="text-[12px] text-muted-foreground truncate"
                      title={item.nombre}
                    >
                      {item.nombre}
                    </span>
                    {/* Barra de progreso */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    {/* Cifra */}
                    <span className={`text-[12px] font-mono font-semibold text-right ${textColor}`}>
                      {item.conRegistro}/{item.pacientesActivos} {item.pct}%
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
