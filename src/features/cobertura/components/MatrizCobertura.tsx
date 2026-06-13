import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { CoberturaPacienteDTO } from '../types/cobertura.types'

interface Props {
  data:       CoberturaPacienteDTO[]
  tipoNames:  string[]          // nombres de tipos en orden (indexados igual que celdas)
  selBucket:  number | null
  selTipoId:  number | null
  tipoWord:   string
}

// Mapa tipoId → nombre para el header (suponemos que los tipos del backend
// están en el mismo orden que tipoNames)
export function MatrizCobertura({ data, tipoNames, selBucket, selTipoId, tipoWord }: Props) {
  const MAX_ROWS = 40

  // Construir un set de tipoIds para los tipos seleccionados
  const tipoIds = data.length > 0 ? data[0].celdas.map(c => c.tipoId) : []

  return (
    <Card className="border border-border shadow-none overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Matriz de cobertura
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Participante × {tipoWord} (primeros {Math.min(data.length, MAX_ROWS)} por menor cobertura)
        </div>
        {/* Leyenda */}
        <div className="mt-2 flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm bg-primary" />
            <span className="text-muted-foreground">Hecho</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm border border-[var(--status-warning-fg)] bg-[var(--status-warning-bg,#fef3c7)]" />
            <span className="text-muted-foreground">En proceso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm border border-border bg-muted" />
            <span className="text-muted-foreground">Falta</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin datos de cobertura.
          </p>
        ) : (
          <div className="overflow-auto max-h-[420px]">
            <table className="text-[11px] border-collapse w-max min-w-full">
              <thead>
                <tr>
                  {/* Sticky: nombre + folio */}
                  <th className="sticky left-0 z-20 bg-background border-b border-r border-border px-3 py-2 text-left font-medium text-muted-foreground min-w-[140px]">
                    Participante
                  </th>
                  {tipoIds.map((tid, i) => {
                    const isDim = selTipoId !== null && selTipoId !== tid
                    return (
                      <th
                        key={tid}
                        className={[
                          'border-b border-r border-border px-1 py-1 font-medium text-muted-foreground transition-opacity',
                          isDim ? 'opacity-25' : '',
                        ].join(' ')}
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '80px', verticalAlign: 'bottom' }}
                        title={tipoNames[i] ?? String(tid)}
                      >
                        <span className="block truncate max-w-[80px]">
                          {tipoNames[i] ?? `Tipo ${tid}`}
                        </span>
                      </th>
                    )
                  })}
                  <th className="border-b border-border px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, MAX_ROWS).map(paciente => {
                  const isDimRow = selBucket !== null && paciente.total !== selBucket
                  return (
                    <tr
                      key={paciente.folio}
                      className={['transition-opacity', isDimRow ? 'opacity-25' : ''].join(' ')}
                    >
                      {/* Nombre sticky */}
                      <td className="sticky left-0 z-10 bg-background border-b border-r border-border px-3 py-1 whitespace-nowrap">
                        <div className="font-medium text-foreground truncate max-w-[130px]" title={paciente.nombre}>
                          {paciente.nombre}
                        </div>
                        <div className="font-mono text-muted-foreground">{paciente.folio}</div>
                      </td>
                      {/* Celdas */}
                      {paciente.celdas.map(celda => {
                        const isDimCol = selTipoId !== null && selTipoId !== celda.tipoId
                        return (
                          <td
                            key={celda.tipoId}
                            className={[
                              'border-b border-r border-border p-1 text-center transition-opacity',
                              isDimCol ? 'opacity-25' : '',
                            ].join(' ')}
                          >
                            <div
                              className={[
                                'h-[18px] w-[18px] rounded-[4px] mx-auto',
                                celda.estado === 'HECHO'
                                  ? 'bg-primary'
                                  : celda.estado === 'PROCESO'
                                  ? 'border border-[var(--status-warning-fg)] bg-[var(--status-warning-bg,#fef3c7)]'
                                  : 'border border-border bg-muted',
                              ].join(' ')}
                            />
                          </td>
                        )
                      })}
                      {/* Total */}
                      <td className="border-b border-border px-3 py-1 text-center whitespace-nowrap">
                        <span
                          className={[
                            'font-mono font-semibold text-[12px]',
                            paciente.total === paciente.totalTipos
                              ? 'text-[var(--status-success-fg)]'
                              : paciente.total === 0
                              ? 'text-destructive'
                              : 'text-foreground',
                          ].join(' ')}
                        >
                          {paciente.total}/{paciente.totalTipos}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
