import React, { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CheckCircle2, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BitacoraAccionItem, PageResponse } from '../types/bitacora.types'
import { TIPO_ACCION_LABELS, TIPO_ACCION_BADGE } from '../types/bitacora.types'

interface Props {
  data: PageResponse<BitacoraAccionItem> | undefined
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

function JsonViewer({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-[var(--imss-ink-200)]">—</span>
  try {
    const parsed = JSON.parse(raw)
    return (
      <pre className="max-h-40 overflow-auto rounded bg-[var(--imss-ink-50)] p-2 text-[11px] leading-relaxed">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    return (
      <pre className="max-h-40 overflow-auto rounded bg-[var(--imss-ink-50)] p-2 text-[11px]">
        {raw}
      </pre>
    )
  }
}

function SqlViewer({ sql }: { sql: string | null }) {
  if (!sql) return <span className="text-[var(--imss-ink-200)]">—</span>
  return (
    <pre className="max-h-40 overflow-auto rounded bg-[#1e1e2e] p-2 text-[11px] leading-relaxed text-[#cdd6f4]">
      {sql}
    </pre>
  )
}

function ExpandedRow({ row }: { row: BitacoraAccionItem }) {
  return (
    <tr>
      <td colSpan={8} className="bg-[var(--imss-ink-50)/60] px-4 py-3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Valores anteriores */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--imss-ink-400)]">
              Valores anteriores
            </span>
            <JsonViewer raw={row.valoresAnteriores} />
          </div>

          {/* Valores nuevos */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--imss-ink-400)]">
              Valores nuevos
            </span>
            <JsonViewer raw={row.valoresNuevos} />
          </div>

          {/* Sentencia SQL */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--imss-ink-400)]">
              Sentencia SQL
            </span>
            <SqlViewer sql={row.sentenciaSql} />
          </div>
        </div>

        {/* Mensaje de error si lo hay */}
        {row.mensajeError && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-[12px] text-red-700">
            <span className="font-semibold">Error: </span>{row.mensajeError}
          </div>
        )}
      </td>
    </tr>
  )
}

export function BitacoraAccionesTable({ data, isLoading, page, onPageChange }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

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

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-[var(--imss-ink-100)] bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--imss-ink-100)] bg-[var(--imss-green-50)]">
              <th className="w-8 px-2 py-2.5" />
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Fecha/Hora</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Usuario</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Endpoint</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Acción</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Entidad</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Duración</th>
              <th className="px-3 py-2.5 text-left font-semibold text-[var(--imss-ink-500)]">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[var(--imss-ink-300)]">
                  Sin registros para los filtros seleccionados
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedId === row.id
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={cn(
                        'border-b border-[var(--imss-ink-50)] transition-colors',
                        isExpanded
                          ? 'bg-[var(--imss-ink-50)/70] border-[var(--imss-ink-100)]'
                          : 'hover:bg-[var(--imss-ink-50)/40]'
                      )}
                    >
                      {/* Expandir */}
                      <td className="px-2 py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleExpand(row.id)}
                          title={isExpanded ? 'Colapsar detalle' : 'Ver detalle'}
                        >
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                          }
                        </Button>
                      </td>

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

                      {/* Endpoint */}
                      <td className="px-3 py-2.5 max-w-[200px]">
                        {row.endpoint ? (
                          <span className="inline-flex items-center gap-1">
                            {row.metodoHttp && (
                              <span className="rounded bg-[var(--imss-green-100)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--imss-green-700)]">
                                {row.metodoHttp}
                              </span>
                            )}
                            <span className="truncate font-mono text-[12px] text-[var(--imss-ink-500)]">
                              {row.endpoint}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--imss-ink-200)]">—</span>
                        )}
                      </td>

                      {/* Tipo acción */}
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            TIPO_ACCION_BADGE[row.tipoAccion]
                          )}
                        >
                          {TIPO_ACCION_LABELS[row.tipoAccion]}
                        </span>
                      </td>

                      {/* Entidad afectada */}
                      <td className="px-3 py-2.5 text-[var(--imss-ink-500)]">
                        {row.entidadAfectada ?? '—'}
                      </td>

                      {/* Duración */}
                      <td className="px-3 py-2.5 text-[var(--imss-ink-500)]">
                        {row.duracionMs != null ? `${row.duracionMs} ms` : '—'}
                      </td>

                      {/* Éxito */}
                      <td className="px-3 py-2.5">
                        {row.exitoso ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                    </tr>

                    {isExpanded && <ExpandedRow row={row} />}
                  </React.Fragment>
                )
              })
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
