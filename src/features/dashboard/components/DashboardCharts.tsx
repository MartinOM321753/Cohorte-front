/**
 * Gráficas y sub-componentes del Dashboard.
 *
 * REGLA: ningún color hex hardcodeado — todos provienen de useChartColors()
 * o de CSS vars directamente, para que los 6 temas funcionen correctamente.
 */

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Clock, CalendarX } from 'lucide-react'
import { useChartColors } from '@/lib/chartTheme'
import {
  useSomatometriaGlobal,
  useExamenesGlobal,
  type SomatometriaGlobalPoint,
  type ExamenResultGlobalPoint,
  type ExamenesCalidadDTO,
  type RefrigeradorOcupacionDTO,
  type PisoResumenDTO,
  type CajaOcupacionDTO,
  type AgendaHoyItem,
} from '../hooks/useDashboard'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
//  Utilidades SVG
// ─────────────────────────────────────────────────────────────────────────────

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

function monthLabel(isoDate: string) {
  try {
    const [y, m] = isoDate.split('-')
    const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`
  } catch {
    return isoDate.slice(0, 7)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TrendLine — gráfica de línea SVG
// ─────────────────────────────────────────────────────────────────────────────

function TrendLine({
  values,
  dates,
  color,
  unit,
  refMin,
  refMax,
  bandColor,
  gridColor,
  inkColor,
}: {
  values:    number[]
  dates:     string[]
  color:     string
  unit?:     string
  refMin?:   number
  refMax?:   number
  bandColor: string
  gridColor: string
  inkColor:  string
}) {
  const n = dates.length
  if (n < 1 || values.length < 1) {
    return (
      <p className="py-4 text-center text-[11px] text-muted-foreground">
        Sin datos disponibles para esta métrica.
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
        <text x={PX - 4} y={PT - 5} textAnchor="end" fontSize="9" fill={inkColor}>
          {unit}
        </text>
      )}
      {grid.map((v, i) => (
        <g key={i}>
          <line x1={PX} y1={cy(v)} x2={W - PR} y2={cy(v)} stroke={gridColor} strokeWidth="0.8" />
          <text x={PX - 4} y={cy(v) + 4} textAnchor="end" fontSize="10" fill={inkColor}>
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
            fill={bandColor}
            opacity="0.5"
          />
          <line x1={PX} y1={cy(refMin)} x2={W - PR} y2={cy(refMin)} stroke={color} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.55" />
          <line x1={PX} y1={cy(refMax)} x2={W - PR} y2={cy(refMax)} stroke={color} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.55" />
        </>
      )}
      <line x1={PX} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke={gridColor} strokeWidth="1" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const isLast = i === values.length - 1
        return (
          <g key={i}>
            <line x1={cx(i)} y1={PT + chartH} x2={cx(i)} y2={PT + chartH + 5} stroke={gridColor} strokeWidth="1" />
            <circle cx={cx(i)} cy={cy(v)} r={isLast ? 4.5 : 3} fill="white" stroke={color} strokeWidth="1.75" />
            {isLast && (
              <text x={cx(i)} y={cy(v) - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
                {fmtVal(v)}
              </text>
            )}
            {(i === 0 || i === values.length - 1 || i % Math.max(1, Math.floor(n / 5)) === 0) && (
              <text
                x={cx(i)}
                y={PT + chartH + 18}
                textAnchor="middle"
                fontSize="9"
                fill={inkColor}
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

// ─────────────────────────────────────────────────────────────────────────────
//  BarChart horizontal — SVG
// ─────────────────────────────────────────────────────────────────────────────

function BarChart({ items, inkColor }: { items: { label: string; value: number; color: string }[]; inkColor: string }) {
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
            <text x={PX - 6} y={y + rowH / 2 + 4} textAnchor="end" fontSize="11" fill={inkColor}>
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

// ─────────────────────────────────────────────────────────────────────────────
//  SomatometriaGlobalCharts — gráficas de tendencia mensual
// ─────────────────────────────────────────────────────────────────────────────

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

type SomaTab = 'imc' | 'peso' | 'presion'

export function SomatometriaGlobalCharts() {
  const { data = [], isLoading } = useSomatometriaGlobal()
  const agg     = useSomaMonthlyAverages(data)
  const colors  = useChartColors()
  const hasData = data.length > 0
  const [activeTab, setActiveTab] = useState<SomaTab>('imc')

  const TABS: { key: SomaTab; label: string }[] = [
    { key: 'imc',     label: 'IMC'     },
    { key: 'peso',    label: 'Peso'    },
    { key: 'presion', label: 'Presión' },
  ]

  function renderChart() {
    switch (activeTab) {
      case 'imc': {
        const vals  = agg.imc.filter((v): v is number => v !== null)
        const dates = agg.dates.filter((_, i) => agg.imc[i] !== null)
        return (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
              IMC promedio mensual · banda = rango normal (18.5–24.9)
            </p>
            <TrendLine values={vals} dates={dates} color={colors.line2}
              refMin={18.5} refMax={24.9}
              bandColor={colors.band} gridColor={colors.grid} inkColor={colors.ink300} />
          </>
        )
      }
      case 'peso': {
        const vals  = agg.peso.filter((v): v is number => v !== null)
        const dates = agg.dates.filter((_, i) => agg.peso[i] !== null)
        return (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
              Peso promedio mensual · kg
            </p>
            <TrendLine values={vals} dates={dates} color={colors.line}
              unit="kg"
              bandColor={colors.band} gridColor={colors.grid} inkColor={colors.ink300} />
          </>
        )
      }
      case 'presion': {
        const vals  = agg.sis.filter((v): v is number => v !== null)
        const dates = agg.dates.filter((_, i) => agg.sis[i] !== null)
        return (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
              Presión sistólica promedio · banda verde = rango normal (90–120)
            </p>
            <TrendLine values={vals} dates={dates} color={colors.line3}
              unit="mmHg" refMin={90} refMax={120}
              bandColor={colors.band} gridColor={colors.grid} inkColor={colors.ink300} />
          </>
        )
      }
    }
  }

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
              Salud poblacional
            </div>
            <div className="mt-0.5 text-[13px] font-medium text-foreground">
              Somatometría · promedios mensuales
            </div>
            {!isLoading && hasData && (
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {data.length} medición{data.length !== 1 ? 'es' : ''} · todos los participantes
              </div>
            )}
          </div>

          {/* Tab toggle — solo visible cuando hay datos */}
          {!isLoading && hasData && (
            <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
              {TABS.map((tab, i) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'px-3 py-1.5 text-[12px] font-medium transition-colors',
                    i > 0 ? 'border-l border-border' : '',
                    activeTab === tab.key
                      ? 'bg-foreground text-background'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <Skeleton className="h-44 w-full rounded-md" />
        ) : !hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin registros de somatometría todavía.
          </p>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  ExamenesGlobalCharts — barras + mini tendencias
// ─────────────────────────────────────────────────────────────────────────────

interface ExamenAgregado {
  nombre:   string
  unidad:   string | null
  total:    number
  fechas:   string[]
  valores:  number[]
  avgValor: number
  refMinH:  number | null
  refMaxH:  number | null
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
        })
      }
      const ag = map.get(nombre)!
      ag.total++
      ag.valores.push(r.valorObtenido)
      ag.fechas.push(r.fecha?.slice(0, 10) ?? '')
    }
    for (const ag of map.values()) {
      ag.avgValor = ag.valores.length
        ? ag.valores.reduce((a, b) => a + b, 0) / ag.valores.length
        : 0
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  }, [data])
}

export function ExamenesGlobalCharts() {
  const { data = [], isLoading } = useExamenesGlobal()
  const agregados = useExamenesAgregados(data)
  const colors = useChartColors()
  const EXAM_COLORS = [colors.line, colors.line2, colors.line3, colors.line4, colors.muted]
  const hasData = data.length > 0

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Resultados de exámenes de laboratorio
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Distribución global · todos los participantes
        </div>
        {!isLoading && hasData && (
          <div className="text-[12px] text-muted-foreground">
            {data.length} resultado{data.length !== 1 ? 's' : ''} · top {Math.min(5, agregados.length)} exámenes
          </div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-md" />
        ) : !hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin resultados de exámenes registrados todavía.
          </p>
        ) : (
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
                Resultados por examen (top 5)
              </p>
              <BarChart
                inkColor={colors.ink300}
                items={agregados.map((ag, i) => ({
                  label: `${ag.nombre}${ag.unidad ? ` (${ag.unidad})` : ''}`,
                  value: ag.total,
                  color: EXAM_COLORS[i % EXAM_COLORS.length],
                }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {agregados.map((ag, i) =>
                ag.valores.length >= 2 ? (
                  <div key={ag.nombre}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)] truncate">
                      {ag.nombre}{ag.unidad ? ` · ${ag.unidad}` : ''}
                    </p>
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      Avg: {fmtVal(ag.avgValor)}{ag.unidad ? ` ${ag.unidad}` : ''} · {ag.total} resultados
                    </p>
                    <TrendLine
                      values={ag.valores}
                      dates={ag.fechas.map((f) => {
                        try { const [, m, d] = f.split('-'); return `${d}/${m}` } catch { return f.slice(5) }
                      })}
                      color={EXAM_COLORS[i % EXAM_COLORS.length]}
                      unit={ag.unidad ?? undefined}
                      refMin={ag.refMinH ?? undefined}
                      refMax={ag.refMaxH ?? undefined}
                      bandColor={colors.band}
                      gridColor={colors.grid}
                      inkColor={colors.ink300}
                    />
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  ExamenesCalidadDonut — donut SVG "en rango / fuera / sin referencia"
// ─────────────────────────────────────────────────────────────────────────────

export function ExamenesCalidadDonut({ data }: { data?: ExamenesCalidadDTO }) {
  const colors = useChartColors()

  if (!data) {
    return (
      <Card className="border border-border shadow-none">
        <CardContent className="flex items-center justify-center h-48">
          <Skeleton className="h-32 w-32 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  const total = data.enRango + data.fueraDeRango + data.sinReferencia
  const pctEnRango = total > 0 ? Math.round((data.enRango / total) * 100) : 0

  // SVG donut: cx=60, cy=60, r=48, strokeWidth=20
  const R = 48, CX = 70, CY = 70, SW = 20
  const circ = 2 * Math.PI * R

  function segmentDash(value: number, offset: number) {
    const frac = total > 0 ? value / total : 0
    return { dash: frac * circ, offset: -offset * circ }
  }

  let cumFrac = 0
  const segs = [
    { value: data.enRango,       color: colors.success, label: 'En rango' },
    { value: data.fueraDeRango,  color: colors.danger,  label: 'Fuera de rango' },
    { value: data.sinReferencia, color: colors.muted,   label: 'Sin referencia' },
  ].map((s) => {
    const { dash, offset } = segmentDash(s.value, cumFrac)
    cumFrac += total > 0 ? s.value / total : 0
    return { ...s, dash, offset }
  })

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Calidad de resultados
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">
          Exámenes en rango vs. fuera de rango
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados registrados.</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Donut SVG */}
            <svg width="140" height="140" viewBox="0 0 140 140">
              {/* Track */}
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={SW} />
              {segs.map((s, i) =>
                s.value > 0 ? (
                  <circle
                    key={i}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={SW}
                    strokeDasharray={`${s.dash} ${circ - s.dash}`}
                    strokeDashoffset={s.offset}
                    transform={`rotate(-90 ${CX} ${CY})`}
                  />
                ) : null
              )}
              {/* Centro */}
              <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--foreground)">
                {pctEnRango}%
              </text>
              <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
                en rango
              </text>
            </svg>
            {/* Leyenda */}
            <div className="w-full space-y-2">
              {segs.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  BiobancoCapacity — barras de ocupación por refrigerador
// ─────────────────────────────────────────────────────────────────────────────

type BiobancoTab = 'refrigeradores' | 'cajas'

export function BiobancoCapacity({
  refrigeradores,
  cajas,
}: {
  refrigeradores: RefrigeradorOcupacionDTO[]
  cajas:          CajaOcupacionDTO[]
}) {
  const colors = useChartColors()
  const [activeTab, setActiveTab] = useState<BiobancoTab>('refrigeradores')

  function OcupacionBar({ pct, label, sublabel }: { pct: number; label: string; sublabel: string }) {
    const barColor = pct >= 90 ? colors.danger : pct > 75 ? colors.warning : colors.primary
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-foreground truncate max-w-[60%]">{label}</span>
          <div className="flex items-center gap-2">
            {pct >= 90 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 bg-red-50">
                Casi lleno
              </Badge>
            )}
            <span className="tabular-nums font-semibold" style={{ color: barColor }}>{pct}%</span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <p className="text-[11px] text-muted-foreground">{sublabel}</p>
      </div>
    )
  }

  const TABS: { key: BiobancoTab; label: string }[] = [
    { key: 'refrigeradores', label: 'Refrigeradores' },
    { key: 'cajas',          label: 'Cajas'          },
  ]

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
              Biobanco · ocupación
            </div>
            <div className="mt-0.5 text-[13px] font-medium text-foreground">
              {activeTab === 'refrigeradores' ? 'Posiciones por refrigerador' : 'Posiciones por caja'}
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                  i > 0 ? 'border-l border-border' : '',
                  activeTab === tab.key
                    ? 'bg-foreground text-background'
                    : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {activeTab === 'refrigeradores' ? (
          refrigeradores.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin refrigeradores activos.</p>
          ) : (
            <div className="space-y-5">
              {refrigeradores.map((ref) => {
                const refColor = ref.pct >= 90 ? colors.danger : ref.pct > 75 ? colors.warning : colors.primary
                return (
                  <div key={ref.refrigeradorId} className="space-y-2">
                    {/* Barra total del refrigerador */}
                    <OcupacionBar
                      pct={ref.pct}
                      label={ref.nombre}
                      sublabel={`${ref.ocupadas} / ${ref.totalPosiciones} posiciones totales`}
                    />

                    {/* Pisos — indentados debajo */}
                    {ref.pisos && ref.pisos.length > 0 && (
                      <div className="ml-3 space-y-1.5 border-l-2 pl-3" style={{ borderColor: refColor + '55' }}>
                        {ref.pisos.map((piso: PisoResumenDTO) => {
                          const pisoColor = piso.pct >= 90 ? colors.danger : piso.pct > 75 ? colors.warning : colors.primary
                          return (
                            <div key={piso.pisoId} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">
                                  Piso {piso.numeroPiso}
                                </span>
                                <span className="tabular-nums font-medium" style={{ color: pisoColor }}>
                                  {piso.pct}% · {piso.ocupadas}/{piso.total}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${piso.pct}%`, backgroundColor: pisoColor }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          cajas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin cajas criogénicas activas.</p>
          ) : (
            <div className="space-y-4">
              {cajas.map((caja) => (
                <OcupacionBar
                  key={caja.cajaId}
                  pct={caja.pct}
                  label={`${caja.codigo}${caja.tipoCaja ? ` · ${caja.tipoCaja}` : ''}`}
                  sublabel={`${caja.ocupadas} / ${caja.totalPosiciones} posiciones`}
                />
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  FeatureKPI — tarjeta protagonista de pacientes activos
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardStatsMinimal {
  pacientesActivos: number
  deltasPacientes:  number
}

export function FeatureKPI({ stats, isLoading }: { stats?: DashboardStatsMinimal; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-full min-h-[140px] rounded-xl" />
  }

  const delta = stats?.deltasPacientes ?? 0
  const deltaStr = delta === 0 ? 'Sin cambios esta semana' : delta > 0 ? `+${delta} esta semana` : `${delta} esta semana`

  return (
    <Card
      className="border-0 shadow-none text-white overflow-hidden"
      style={{ background: 'var(--imss-green-900, #1e4e3a)' }}
    >
      <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] opacity-70">
          Participantes activos
        </div>
        <div>
          <div
            className="tabular-nums leading-none"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '48px', fontWeight: 500, fontStyle: 'italic' }}
          >
            {stats?.pacientesActivos ?? 0}
          </div>
          <div className="mt-1 text-[13px] opacity-70">{deltaStr}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  SupportKPI — tarjeta de apoyo (cifra + ícono)
// ─────────────────────────────────────────────────────────────────────────────

export function SupportKPI({
  label,
  value,
  icon: Icon,
  delta,
  deltaVariant,
  isLoading,
}: {
  label:         string
  value?:        number
  icon:          React.FC<{ className?: string }>
  delta?:        string
  deltaVariant?: 'warning' | 'default'
  isLoading?:    boolean
}) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
              {label}
            </div>
            <div className="mt-2">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="tabular-nums text-[28px] font-semibold leading-none text-foreground">
                  {value ?? 0}
                </div>
              )}
            </div>
            {delta && (
              <div
                className={[
                  'mt-1.5 text-[11px] font-medium',
                  deltaVariant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                ].join(' ')}
              >
                {delta}
              </div>
            )}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--imss-green-50)] text-[var(--primary)]">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  MiniStatStrip — tira de 4 stats compactos
// ─────────────────────────────────────────────────────────────────────────────

interface MiniStatItem {
  label:   string
  value:   number
  icon:    ReactNode
  warn?:   boolean
}

export function MiniStatStrip({ stats, isLoading }: { stats?: { muestrasBiobanco: number; examenesLabMes: number; documentosGenerales: number; citasSinActualizar: number }; isLoading: boolean }) {
  const items: MiniStatItem[] = [
    { label: 'Muestras biobanco',   value: stats?.muestrasBiobanco ?? 0,     icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v11.5A3.5 3.5 0 0012.5 18 3.5 3.5 0 0016 14.5V3M9 3h7M9 7h7"/></svg> },
    { label: 'Exámenes este mes',   value: stats?.examenesLabMes ?? 0,        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"/></svg> },
    { label: 'Documentos',          value: stats?.documentosGenerales ?? 0,   icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
    { label: 'Sin actualizar',  value: stats?.citasSinActualizar ?? 0,    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>, warn: (stats?.citasSinActualizar ?? 0) > 0 },
  ]

  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className={[
                'flex items-center gap-3 px-5 py-4',
                item.warn ? 'bg-amber-50 dark:bg-amber-950/20' : '',
              ].join(' ')}
            >
              <div
                className={[
                  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md',
                  item.warn
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-[var(--imss-green-50)] text-[var(--primary)]',
                ].join(' ')}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-5 w-10 mb-1" />
                ) : (
                  <div className="tabular-nums text-[18px] font-bold leading-none text-foreground">
                    {item.value}
                  </div>
                )}
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  AgendaHoyPanel — riel derecho sticky
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Programada: { label: 'Programada',  cls: 'border-slate-300 text-slate-700 bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900' },
    Confirmada: { label: 'Confirmada',  cls: 'border-green-400 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950' },
    Realizada:  { label: 'Realizada',   cls: 'border-blue-400  text-blue-700  bg-blue-50  dark:border-blue-700  dark:text-blue-400  dark:bg-blue-950'  },
    No_Asistio: { label: 'No asistió',  cls: 'border-red-300   text-red-600   bg-red-50   dark:border-red-700   dark:text-red-400   dark:bg-red-950'   },
    Cancelada:  { label: 'Cancelada',   cls: 'border-red-300   text-red-600   bg-red-50   dark:border-red-700   dark:text-red-400   dark:bg-red-950'   },
  }
  const cfg = map[estado] ?? { label: estado, cls: 'border-border text-muted-foreground bg-muted/30' }
  return (
    <Badge variant="outline" className={`text-[10px] ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  )
}

function esCitaVencida(cita: AgendaHoyItem): boolean {
  if (cita.estadoCita !== 'Programada' && cita.estadoCita !== 'PROGRAMADA') return false
  try {
    const now = new Date()
    const [h, m] = cita.horaFin.split(':').map(Number)
    const fin = new Date(now)
    fin.setHours(h, m, 0, 0)
    return fin < now
  } catch {
    return false
  }
}

export function AgendaHoyPanel({
  data,
  isLoading,
  onCitaClick,
}: {
  data:          AgendaHoyItem[]
  isLoading:     boolean
  onCitaClick?:  (uuid: string) => void
}) {
  return (
    <Card className="border border-border shadow-none lg:sticky lg:top-4 overflow-x-hidden">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-500)]">
          Agenda de hoy
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-[13px] font-medium text-foreground">Citas clínicas</span>
          {!isLoading && (
            <span className="text-[12px] text-muted-foreground">
              {data.length === 0 ? 'sin citas' : `${data.length} cita${data.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-220px)]">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <CalendarX className="h-8 w-8 opacity-40" />
            <p className="text-sm">Sin citas para hoy.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((cita) => {
              const vencida = esCitaVencida(cita)
              return (
                <button
                  key={cita.uuid}
                  type="button"
                  onClick={() => onCitaClick?.(cita.uuid)}
                  className={[
                    'flex w-full min-w-0 overflow-hidden items-stretch gap-0 text-left transition-colors hover:bg-muted/30',
                    vencida ? 'bg-red-50 dark:bg-red-950/20' : '',
                  ].join(' ')}
                >
                  {/* Franja de color */}
                  <div
                    className="w-1 shrink-0"
                    style={{ backgroundColor: vencida ? 'var(--destructive)' : (cita.colorHex ?? 'transparent') }}
                  />
                  <div className="flex flex-1 min-w-0 items-start gap-3 px-4 py-3">
                    {/* Hora */}
                    <div className="flex flex-col items-center shrink-0 min-w-[44px]">
                      <span className={['tabular-nums text-[18px] font-bold leading-none', vencida ? 'text-red-600 dark:text-red-400' : 'text-foreground'].join(' ')}>
                        {cita.horaInicio}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                        <Clock className="h-2 w-2" />
                        {cita.horaFin}
                      </span>
                    </div>
                    {/* Separador */}
                    <div className="w-px self-stretch bg-border mx-1" />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold leading-tight truncate">
                        {cita.paciente.nombreCompleto || 'Sin nombre'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                        {cita.paciente.folio}
                      </p>
                      {vencida && (
                        <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-1">
                          Sin actualizar — registrar asistencia
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <EstadoBadge estado={cita.estadoCita} />
                    </div>
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
