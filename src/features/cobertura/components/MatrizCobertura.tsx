import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { CoberturaPacienteDTO, CatalogoTipo } from '../types/cobertura.types'
import { CeldaDetalleDialog } from './CeldaDetalleDialog'

interface Props {
  data:       CoberturaPacienteDTO[]
  tipoNombre: Record<number, string>   // tipoId → nombre; se resuelve por id, no por posición
  selBucket:  number | null
  selTipoId:  number | null
  tipoWord:   string
  tipo:       CatalogoTipo              // para saber qué detalle abrir al hacer clic en la celda
}

// El header se resuelve por tipoId, no por índice: las celdas llegan en orden
// alfabético y los nombres del catálogo llegan en otro orden (por %), así que
// indexar por posición rotulaba cada columna con el estudio equivocado.
export function MatrizCobertura({ data, tipoNombre, selBucket, selTipoId, tipoWord, tipo }: Props) {
  const MAX_ROWS = 40
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState<
    { uuid: string; tipoId: number; refId: number | null; tipoNombre: string; nombre: string } | null
  >(null)

  // Construir un set de tipoIds para los tipos seleccionados
  const tipoIds = data.length > 0 ? data[0].celdas.map(c => c.tipoId) : []

  // Búsqueda por nombre o folio (en cliente: la matriz ya viene acotada del backend)
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return data
    return data.filter(
      p => p.nombre.toLowerCase().includes(term) || p.folio.toLowerCase().includes(term),
    )
  }, [data, q])

  const visibles = filtrados.slice(0, MAX_ROWS)

  return (
    <Card className="border border-border shadow-none overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Matriz de cobertura
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Participante × {tipoWord} (mostrando {Math.min(visibles.length, MAX_ROWS)} de {filtrados.length} por menor cobertura)
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          Doble clic en el participante abre su expediente · clic en una celda cubierta muestra el detalle
        </div>

        {/* Búsqueda por nombre o folio */}
        <div className="mt-3 relative sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar participante por nombre o folio…"
            className="h-8 pl-8 text-[12px]"
          />
        </div>

        {/* Leyenda */}
        <div className="mt-3 flex items-center gap-4 text-[11px]">
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
        ) : visibles.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Ningún participante coincide con «{q}».
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
                  {tipoIds.map((tid) => {
                    const isDim = selTipoId !== null && selTipoId !== tid
                    const nombre = tipoNombre[tid] ?? `Tipo ${tid}`
                    return (
                      <th
                        key={tid}
                        className={[
                          'border-b border-r border-border px-1 py-1 font-medium text-muted-foreground transition-opacity',
                          isDim ? 'opacity-25' : '',
                        ].join(' ')}
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '80px', verticalAlign: 'bottom' }}
                        title={nombre}
                      >
                        <span className="block truncate max-w-[80px]">
                          {nombre}
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
                {visibles.map(paciente => {
                  const isDimRow = selBucket !== null && paciente.total !== selBucket
                  return (
                    <tr
                      key={paciente.folio}
                      className={['transition-opacity', isDimRow ? 'opacity-25' : ''].join(' ')}
                    >
                      {/* Nombre sticky — doble clic abre el expediente */}
                      <td
                        className="sticky left-0 z-10 bg-background border-b border-r border-border px-3 py-1 whitespace-nowrap cursor-pointer select-none hover:bg-muted/40"
                        onDoubleClick={() => navigate('/pacientes/expediente', { state: { uuid: paciente.uuid } })}
                        title="Doble clic para abrir el expediente"
                      >
                        <div className="font-medium text-foreground truncate max-w-[130px]" title={paciente.nombre}>
                          {paciente.nombre}
                        </div>
                        <div className="font-mono text-muted-foreground">{paciente.folio}</div>
                      </td>
                      {/* Celdas */}
                      {paciente.celdas.map(celda => {
                        const isDimCol = selTipoId !== null && selTipoId !== celda.tipoId
                        const esHecho = celda.estado === 'HECHO'
                        const nombreTipo = tipoNombre[celda.tipoId] ?? `Tipo ${celda.tipoId}`
                        return (
                          <td
                            key={celda.tipoId}
                            className={[
                              'border-b border-r border-border p-1 text-center transition-opacity',
                              isDimCol ? 'opacity-25' : '',
                            ].join(' ')}
                          >
                            <div
                              role={esHecho ? 'button' : undefined}
                              tabIndex={esHecho ? 0 : undefined}
                              title={esHecho ? `Ver detalle · ${nombreTipo}` : undefined}
                              onClick={esHecho
                                ? () => setDetalle({ uuid: paciente.uuid, tipoId: celda.tipoId, refId: celda.refId, tipoNombre: nombreTipo, nombre: paciente.nombre })
                                : undefined}
                              onKeyDown={esHecho
                                ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalle({ uuid: paciente.uuid, tipoId: celda.tipoId, refId: celda.refId, tipoNombre: nombreTipo, nombre: paciente.nombre }) } }
                                : undefined}
                              className={[
                                'h-[18px] w-[18px] rounded-[4px] mx-auto',
                                esHecho
                                  ? 'bg-primary cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary'
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

      <CeldaDetalleDialog
        open={detalle !== null}
        onOpenChange={(v) => { if (!v) setDetalle(null) }}
        catalogoTipo={tipo}
        uuid={detalle?.uuid ?? null}
        tipoId={detalle?.tipoId ?? null}
        refId={detalle?.refId ?? null}
        tipoNombre={detalle?.tipoNombre ?? ''}
        pacienteNombre={detalle?.nombre ?? ''}
      />
    </Card>
  )
}
