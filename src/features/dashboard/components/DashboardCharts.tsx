/**
 * Gráficas del dashboard — versión global (todos los pacientes).
 *
 * Somatometría: promedio mensual de IMC, peso y presión arterial.
 * Exámenes:     top-5 exámenes por número de resultados; mini-gráfica
 *               de tendencia del promedio con banda de referencia.
 *
 * Las gráficas son SVG puro (sin dependencias externas) para mantener
 * coherencia con el estilo del módulo de Expediente.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSomatometriaGlobal,
  useExamenesGlobal,
  type SomatometriaGlobalPoint,
  type ExamenResultGlobalPoint,
} from '../hooks/useDashboard'

// ── utilidades SVG ────────────────────────────────────────────────────────────

function niceGridLines(yMin: number, yMax: number): number[] {
  const range = Math.max(yMax - yMin, 0.001)
  const roughStep = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const candidates = [1, 2, 2.5, 5, 10].map((s) => s * mag)
  const step = candidates.find((s) => range / s <= 5) ?? roughStep
  const start = Math.ceil(yMin / step) * step
  const lines: number[] = []
  for (
    let v = start;
    v <= yMax + step * 0.01;
    v = parseFloat((v + step).toFixed(10))
  ) {
    lines.push(parseFloat(v.toFixed(8)))
  }
  return lines.slice(0, 6)
}

function fmtVal(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Gráfica de línea SVG genérica (igual lógica que en ExpedientePacientePage). */
function TrendLine({
  values,
  dates,
  color,
  unit,
  refMin,
  refMax,
}: {
  values: number[]
  dates: string[]
  color: string
  unit?: string
  refMin?: number
  refMax?: number
}) {
  const n = dates.length
  if (n < 2 || values.length < 2) {
    return (
      <p className="py-4 text-center text-[11px] text-muted-foreground">
        Sin suficientes datos para mostrar tendencia (mín. 2 puntos)
      </p>
    )
  }

  const W = 600, H = 200
  const PX = 46, PR = 8, PT = 20, PB = 44
  const chartW = W - PX - PR
  const chartH = H - PT - PB

  const allVals = [...values, ...(refMin != null ? [refMin] : []), ...(refMax != null ? [refMax] : [])]
  const spread = Math.max(Math.max(...allVals) - Math.min(...allVals), 0.001)
  const yMin = Math.min(...allVals) - spread * 0.15
  const yMax = Math.max(...allVals) + spread * 0.15

  const cx = (i: number) => PX + chartW * (i / Math.max(n - 1, 1))
  const cy = (v: number) => PT + chartH * (1 - (v - yMin) / (yMax - yMin))

  const grid = niceGridLines(yMin, yMax)

  let path = ''
  values.forEach((v, i) => {
    path += (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + cy(v).toFixed(1) + ' '
  })

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block' }}
      aria-label="Gráfica de tendencia"
    >
      {unit && (
        <text x={PX - 4} y={PT - 5} textAnchor="end" fontSize="9" fill="#9ca3af">
          {unit}
        </text>
      )}
      {grid.map((v, i) => (
        <g key={i}>
          <line x1={PX} y1={cy(v)} x2={W - PR} y2={cy(v)} stroke="#e5e7eb" strokeWidth="0.8" />
          <text x={PX - 4} y={cy(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
            {fmtVal(v)}
          </text>
        </g>
      ))}
      {refMin != null && refMax != null && (
        <>
          <rect
            x={PX}
            y={cy(refMax)}
            width={chartW}
            height={Math.max(cy(refMin) - cy(refMax), 1)}
            fill="#22c55e"
            opacity="0.12"
          />
          <line x1={PX} y1={cy(refMin)} x2={W - PR} y2={cy(refMin)} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="5 3" opacity="0.6" />
          <line x1={PX} y1={cy(refMax)} x2={W - PR} y2={cy(refMax)} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="5 3" opacity="0.6" />
        </>
      )}
      <line x1={PX} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="#e5e7eb" strokeWidth="1" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const isLast = i === values.length - 1
        return (
          <g key={i}>
            <line x1={cx(i)} y1={PT + chartH} x2={cx(i)} y2={PT + chartH + 5} stroke="#e5e7eb" strokeWidth="1" />
            <circle cx={cx(i)} cy={cy(v)} r={isLast ? 4.5 : 3} fill="white" stroke={color} strokeWidth="1.75" />
            {isLast && (
              <text x={cx(i)} y={cy(v) - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
                {fmtVal(v)}
              </text>
            )}
            {/* Etiqueta de fecha cada ~6 puntos (o último) para no saturar */}
            {(i === 0 || i === values.length - 1 || i % Math.max(1, Math.floor(n / 5)) === 0) && (
              <text
                x={cx(i)}
                y={PT + chartH + 18}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
                transform={n > 8 ? `rotate(-30, ${cx(i)}, ${PT + chartH + 18})` : undefined}
              >
                {dates[i]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Sección de somatometría global ────────────────────────────────────────────

function monthLabel(isoDate: string) {
  // "2026-01-15" → "Ene 26"
  try {
    const [y, m] = isoDate.split('-')
    const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`
  } catch {
    return isoDate.slice(0, 7)
  }
}

function useSomaMonthlyAverages(data: SomatometriaGlobalPoint[]) {
  return useMemo(() => {
    const map = new Map<string, { peso: number[]; imc: number[]; sis: number[]; dia: number[] }>()
    for (const p of data) {
      const mes = p.fecha?.slice(0, 7) ?? 'unknown'
      if (!map.has(mes)) map.set(mes, { peso: [], imc: [], sis: [], dia: [] })
      const bucket = map.get(mes)!
      if (p.pesoKg != null) bucket.peso.push(p.pesoKg)
      if (p.imc != null) bucket.imc.push(p.imc)
      if (p.presionSistolica != null) bucket.sis.push(p.presionSistolica)
      if (p.presionDiastolica != null) bucket.dia.push(p.presionDiastolica)
    }
    const months = [...map.keys()].sort()
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    return {
      dates: months.map(monthLabel),
      peso: months.map((m) => avg(map.get(m)!.peso)),
      imc:  months.map((m) => avg(map.get(m)!.imc)),
      sis:  months.map((m) => avg(map.get(m)!.sis)),
      dia:  months.map((m) => avg(map.get(m)!.dia)),
    }
  }, [data])
}

export function SomatometriaGlobalCharts() {
  const { data = [], isLoading } = useSomatometriaGlobal()
  const agg = useSomaMonthlyAverages(data)

  const hasData = data.length > 0

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Somatometría global
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Promedios mensuales · todos los pacientes
        </div>
        {!isLoading && hasData && (
          <div className="text-[12px] text-muted-foreground">{data.length} medición{data.length !== 1 ? 'es' : ''} registradas</div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        ) : !hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin registros de somatometría todavía.
          </p>
        ) : (
          <div className="space-y-6">
            {/* IMC */}
            {agg.imc.filter((v) => v !== null).length >= 2 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
                  IMC promedio mensual · banda verde = rango normal (18.5–24.9)
                </p>
                <TrendLine
                  values={agg.imc.filter((v): v is number => v !== null)}
                  dates={agg.dates.filter((_, i) => agg.imc[i] !== null)}
                  color="#d97706"
                  refMin={18.5}
                  refMax={24.9}
                />
              </div>
            )}
            {/* Peso */}
            {agg.peso.filter((v) => v !== null).length >= 2 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
                  Peso promedio mensual · kg
                </p>
                <TrendLine
                  values={agg.peso.filter((v): v is number => v !== null)}
                  dates={agg.dates.filter((_, i) => agg.peso[i] !== null)}
                  color="#16a34a"
                  unit="kg"
                />
              </div>
            )}
            {/* Presión sistólica */}
            {agg.sis.filter((v) => v !== null).length >= 2 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
                  Presión sistólica promedio mensual · mmHg · banda verde = rango normal (90–120)
                </p>
                <TrendLine
                  values={agg.sis.filter((v): v is number => v !== null)}
                  dates={agg.dates.filter((_, i) => agg.sis[i] !== null)}
                  color="#3b82f6"
                  unit="mmHg"
                  refMin={90}
                  refMax={120}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Sección de exámenes global ────────────────────────────────────────────────

interface ExamenAgregado {
  nombre:          string
  unidad:          string | null
  total:           number
  fechas:          string[]
  valores:         number[]
  avgValor:        number
  refMinH:         number | null
  refMaxH:         number | null
  refMinM:         number | null
  refMaxM:         number | null
}

function useExamenesAgregados(data: ExamenResultGlobalPoint[]): ExamenAgregado[] {
  return useMemo(() => {
    const map = new Map<string, ExamenAgregado>()
    for (const r of data) {
      const nombre = r.nombreExamen ?? 'Desconocido'
      if (!map.has(nombre)) {
        map.set(nombre, {
          nombre,
          unidad: r.unidad ?? null,
          total: 0,
          fechas: [],
          valores: [],
          avgValor: 0,
          refMinH: r.valorMinHombres ?? null,
          refMaxH: r.valorMaxHombres ?? null,
          refMinM: r.valorMinMujeres ?? null,
          refMaxM: r.valorMaxMujeres ?? null,
        })
      }
      const ag = map.get(nombre)!
      ag.total++
      ag.valores.push(r.valorObtenido)
      // Fecha corta para eje X
      ag.fechas.push(r.fecha?.slice(0, 10) ?? '')
    }
    for (const ag of map.values()) {
      ag.avgValor =
        ag.valores.length
          ? ag.valores.reduce((a, b) => a + b, 0) / ag.valores.length
          : 0
    }
    // Ordenar por total desc y devolver top 5
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  }, [data])
}

/** Barra horizontal simple SVG para el conteo por examen. */
function BarChart({ items }: { items: { label: string; value: number; color: string }[] }) {
  if (items.length === 0) return null
  const maxV = Math.max(...items.map((i) => i.value), 1)
  const W = 600, rowH = 28, PX = 180, PR = 60, gap = 6
  const H = items.length * (rowH + gap)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block' }}>
      {items.map((item, i) => {
        const y = i * (rowH + gap)
        const barW = ((W - PX - PR) * item.value) / maxV
        return (
          <g key={i}>
            <text x={PX - 6} y={y + rowH / 2 + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {item.label.length > 22 ? item.label.slice(0, 22) + '…' : item.label}
            </text>
            <rect x={PX} y={y + 4} width={Math.max(barW, 2)} height={rowH - 8} rx="3" fill={item.color} opacity="0.85" />
            <text x={PX + barW + 6} y={y + rowH / 2 + 4} fontSize="11" fontWeight="600" fill={item.color}>
              {item.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const EXAM_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

export function ExamenesGlobalCharts() {
  const { data = [], isLoading } = useExamenesGlobal()
  const agregados = useExamenesAgregados(data)

  const hasData = data.length > 0

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Resultados de exámenes de laboratorio
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Distribución global · todos los pacientes
        </div>
        {!isLoading && hasData && (
          <div className="text-[12px] text-muted-foreground">
            {data.length} resultado{data.length !== 1 ? 's' : ''} · top {Math.min(5, agregados.length)} exámenes
          </div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        ) : !hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin resultados de exámenes registrados todavía.
          </p>
        ) : (
          <div className="space-y-8">
            {/* Barra de conteo */}
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
                Resultados por examen (top 5)
              </p>
              <BarChart
                items={agregados.map((ag, i) => ({
                  label: `${ag.nombre}${ag.unidad ? ` (${ag.unidad})` : ''}`,
                  value: ag.total,
                  color: EXAM_COLORS[i % EXAM_COLORS.length],
                }))}
              />
            </div>

            {/* Mini-gráficas de tendencia por examen */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {agregados.map((ag, i) => (
                ag.valores.length >= 2 ? (
                  <div key={ag.nombre}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)] truncate">
                      {ag.nombre}{ag.unidad ? ` · ${ag.unidad}` : ''}
                    </p>
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      Promedio: {fmtVal(ag.avgValor)}{ag.unidad ? ` ${ag.unidad}` : ''} · {ag.total} resultados
                    </p>
                    <TrendLine
                      values={ag.valores}
                      dates={ag.fechas.map((f) => {
                        // Formato corto de fecha "dd/MM"
                        try { const [, m, d] = f.split('-'); return `${d}/${m}` } catch { return f.slice(5) }
                      })}
                      color={EXAM_COLORS[i % EXAM_COLORS.length]}
                      unit={ag.unidad ?? undefined}
                      refMin={ag.refMinH ?? undefined}
                      refMax={ag.refMaxH ?? undefined}
                    />
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
