import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BitacoraAccesoItem, PageResponse } from '../types/bitacora.types'
import { TIPO_EVENTO_LABELS, TIPO_EVENTO_BADGE } from '../types/bitacora.types'

interface Props {
  data: PageResponse<BitacoraAccesoItem> | undefined
  isLoading: boolean
  page: number
  onPageChange: (p: number) => void
}

function formatTimestamp(ts: string) {
  try {
    return format(parseISO(ts), "dd/MM/yyyy HH:mm:ss", { locale: es })
  } catch {
    return ts
  }
}

function formatDuracion(secs: number | null) {
  if (secs === null) return '—'
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

export function BitacoraAccesosTable({ data, isLoading, page, onPageChange }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  const rows = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  return (
    <div className="flex flex-col gap-3">
      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-[var(--imss-ink-100)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--imss-ink-100)] bg-[var(--imss-ink-50)]">
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Fecha/Hora</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Usuario</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Rol</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Evento</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">IP</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Ubicación</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Duración sesión</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[var(--imss-ink-300)]">
                  Sin registros para los filtros seleccionados
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--imss-ink-50)] last:border-0 hover:bg-[var(--imss-ink-50)/40] transition-colors"
                >
                  {/* Fecha/Hora */}
                  <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--imss-ink-500)] whitespace-nowrap">
                    {formatTimestamp(row.timestamp)}
                  </td>

                  {/* Usuario */}
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[var(--imss-ink-700)]">
                      {row.nombreCompleto || row.username || '—'}
                    </div>
                    {row.username && row.nombreCompleto && (
                      <div className="text-[11px] text-[var(--imss-ink-300)]">{row.username}</div>
                    )}
                  </td>

                  {/* Rol */}
                  <td className="px-3 py-2.5 text-[var(--imss-ink-500)]">
                    {row.rol ?? '—'}
                  </td>

                  {/* Tipo evento */}
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        TIPO_EVENTO_BADGE[row.tipoEvento]
                      )}
                    >
                      {TIPO_EVENTO_LABELS[row.tipoEvento]}
                    </span>
                  </td>

                  {/* IP */}
                  <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--imss-ink-500)]">
                    {row.ip ?? '—'}
                  </td>

                  {/* Coordenadas → link a Google Maps */}
                  <td className="px-3 py-2.5">
                    {row.latitud != null && row.longitud != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${row.latitud},${row.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-[var(--imss-green-600)] hover:underline"
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        {row.latitud.toFixed(4)}, {row.longitud.toFixed(4)}
                      </a>
                    ) : (
                      <span className="text-[var(--imss-ink-200)]">—</span>
                    )}
                  </td>

                  {/* Duración sesión */}
                  <td className="px-3 py-2.5 text-[var(--imss-ink-500)]">
                    {formatDuracion(row.duracionSesionSeg)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-[12px] text-[var(--imss-ink-400)]">
        <span>
          {totalElements > 0
            ? `${totalElements} registro${totalElements !== 1 ? 's' : ''} encontrado${totalElements !== 1 ? 's' : ''}`
            : 'Sin registros'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2">
            Página {page + 1} de {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
