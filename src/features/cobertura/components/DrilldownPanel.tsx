import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import type { PacientePendienteDTO } from '../types/cobertura.types'

interface Props {
  data:            PacientePendienteDTO[]
  isLoading:       boolean
  selTipoNombre?:  string          // nombre del tipo seleccionado (modo pendientes)
  selBucket?:      number | null   // k del bucket seleccionado (modo grupo)
  totalTipos:      number
  tipoWord:        string
  onClear:         () => void
}

export function DrilldownPanel({
  data, isLoading, selTipoNombre, selBucket, totalTipos, tipoWord, onClear,
}: Props) {
  const navigate = useNavigate()
  const hasSelection = selTipoNombre !== undefined || (selBucket !== null && selBucket !== undefined)

  const eyebrow = hasSelection
    ? selTipoNombre
      ? `Pendientes · ${selTipoNombre}`
      : `Grupo · ${selBucket} de ${totalTipos} ${tipoWord}s`
    : 'Prioridad de captura'

  const title = hasSelection
    ? `${data.length} paciente${data.length !== 1 ? 's' : ''}`
    : 'Pacientes con menor cobertura'

  return (
    <Card className="border border-border shadow-none overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)] truncate">
              {eyebrow}
            </div>
            <div className="mt-0.5 text-[13px] font-medium text-foreground">
              {title}
            </div>
          </div>
          {hasSelection && (
            <Button variant="outline" size="sm" onClick={onClear} className="shrink-0 text-[12px] h-7">
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-[420px]">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Users className="h-8 w-8 text-[var(--status-success-fg)] opacity-60" />
            <p className="text-sm text-[var(--status-success-fg)] font-medium text-center px-4">
              {hasSelection && selTipoNombre
                ? `Todos los pacientes tienen este ${tipoWord} registrado.`
                : 'No hay pacientes en este grupo.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Folio</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Sx</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Cob.</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.map(p => {
                const cobColor =
                  p.coberturaTotal === p.totalTipos ? 'text-[var(--status-success-fg)]' :
                  p.coberturaTotal === 0            ? 'text-destructive' :
                  'text-foreground'
                return (
                  <tr key={p.folio} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">{p.folio}</td>
                    <td className="px-4 py-2 font-medium text-foreground max-w-[180px] truncate" title={p.nombreCompleto}>
                      {p.nombreCompleto}
                    </td>
                    <td className="px-2 py-2 text-center text-muted-foreground">{p.sexo}</td>
                    <td className={`px-2 py-2 text-center font-mono font-semibold ${cobColor}`}>
                      {p.coberturaTotal}/{p.totalTipos}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => navigate(`/pacientes/${p.folio}`)}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
