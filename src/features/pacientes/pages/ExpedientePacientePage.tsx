import { useLocation, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Download,
  Eye,
  History,
  LayoutList,
  Paperclip,
  Pencil,
  Plus,
  Rows3,
  Scale,
  Stethoscope,
  TestTube2,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getFullName, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSectionAccess } from '@/hooks/useSectionAccess'

// ── Feature hooks ──────────────────────────────────────────────────────────────
import { useGetPacienteByUUID, useMiPacienteUuid } from '../hooks/useGetPacientes'
import { useLatestSomatometria, useSomatometriaByPaciente } from '@/features/somatometria/hooks/useSomatometria'
import { useCitasResumenByPaciente } from '@/features/citas/hooks/useCitas'
import {
  useGetEstudiosByPaciente,
  useGetEstudioById,
  useGetParametrosByTipo,
  useUpdateEstudio,
} from '@/features/estudios/hooks/useEstudios'
import { useGetResultadosByPacienteUUID, useCountResultadosByPacienteUUID } from '@/features/estudios/hooks/useExamenes'
import { useCountMuestrasByPaciente } from '@/features/biobanco/hooks/useBiobanco'
import { useDocumentosPacienteTipo } from '@/features/documentos/hooks/useDocumentos'

// ── Feature components ─────────────────────────────────────────────────────────
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import { PacienteFormModal } from '../components/PacienteFormModal'
import { CitaIlamyEventForm } from '@/features/citas/components/CitaIlamyEventForm'
import {
  SomatometriaFormModal,
  SomatometriaHistorialDialog,
} from '@/features/somatometria/components/SomatometriaFormModal'
import { DocumentoUploader } from '@/features/documentos/components/DocumentoUploader'
import { DocumentoList } from '@/features/documentos/components/DocumentoList'
import { CrearEtiquetaButton } from '@/features/documentos/components/CrearEtiquetaButton'
import { SedeBadge } from '@/components/common/SedeBadge'

// ── Types ──────────────────────────────────────────────────────────────────────
import type {
  CitaResumen,
  ResultadoExamen,
  EstudioListDTO,
  DocumentoResponseDTO,
  Somatometria,
  EstudioMedicoRequestDTO,
  ResultadoEstudioRequestDTO,
  ResultadoEstudioResponse,
  ParametroEstudio,
} from '@/types/api'
import { ESTADO_CONTACTO_LABELS, MEDIO_CONTACTO_LABELS } from '@/types/api'

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcAge(fechaNac?: string | null): string {
  if (!fechaNac) return '—'
  const today = new Date()
  const birth = new Date(fechaNac + 'T12:00:00')
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age} años`
}

function imcClassification(imc?: number | null): { label: string; tone: string } {
  if (!imc) return { label: '—', tone: 'neutral' }
  if (imc < 18.5) return { label: 'Bajo peso', tone: 'warning' }
  if (imc < 25)   return { label: 'Normal', tone: 'success' }
  if (imc < 30)   return { label: 'Sobrepeso', tone: 'warning' }
  return { label: 'Obesidad', tone: 'danger' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
        <span className="text-[14px] font-semibold text-[var(--imss-ink-900)]">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
      {children}
    </p>
  )
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-4">
      <EyebrowLabel>{label}</EyebrowLabel>
      <div className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-[var(--imss-ink-900)]">
        {value}
      </div>
      {sub && <p className="mt-1 text-[12px] text-[var(--imss-ink-300)]">{sub}</p>}
    </div>
  )
}

// ── Helpers de gráficas ───────────────────────────────────────────────────────

/** Genera hasta 5 gridlines con valores "redondos" para un rango dado. */
function niceGridLines(yMin: number, yMax: number): number[] {
  const range = Math.max(yMax - yMin, 0.001)
  const roughStep = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const candidates = [1, 2, 2.5, 5, 10].map(s => s * mag)
  const step = candidates.find(s => range / s <= 5) ?? roughStep
  const start = Math.ceil(yMin / step) * step
  const lines: number[] = []
  for (let v = start; v <= yMax + step * 0.01; v = parseFloat((v + step).toFixed(10))) {
    lines.push(parseFloat(v.toFixed(8)))
  }
  return lines.slice(0, 6)
}

/**
 * Gráfica de línea reutilizable para Somatometría.
 * Muestra valor en cada punto, fechas en X, gridlines con etiquetas en Y.
 */
function SomaTrendChart({
  series,
  dates,
  unit,
  refMin,
  refMax,
}: {
  series: Array<{ values: number[]; color: string; label?: string; dash?: boolean }>
  dates: string[]
  unit?: string
  refMin?: number
  refMax?: number
}) {
  const n = dates.length
  const allVals = series.flatMap(s => s.values).filter(isFinite)
  if (allVals.length === 0 || n === 0) return null

  // H aumentado a 240 → en un rail de 280px se renderiza a 280×(240/600*280)=112px,
  // y en la columna derecha (~700px) a 700×280px. Sin height fijo el SVG escala
  // proporcionalmente (no aplica preserveAspectRatio que encogía el contenido).
  const W = 600, H = 240
  const PX = 52, PR = 8, PT = 24
  // Extra bottom padding when legend is needed
  const PB = series.length > 1 ? 60 : 44
  const chartW = W - PX - PR
  const chartH = H - PT - PB

  const dataMin = Math.min(...allVals, ...(refMin != null ? [refMin] : []))
  const dataMax = Math.max(...allVals, ...(refMax != null ? [refMax] : []))
  const spread = Math.max(dataMax - dataMin, 0.001)
  const yMin = dataMin - spread * 0.14
  const yMax = dataMax + spread * 0.14

  const cx = (i: number) => PX + chartW * (i / Math.max(n - 1, 1))
  const cy = (v: number) => PT + chartH * (1 - (v - yMin) / (yMax - yMin))

  const grid = niceGridLines(yMin, yMax)
  const fmtVal = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1)

  // SVG sin height explícito → el aspecto se mantiene por CSS (evita el
  // preserveAspectRatio que encogía el contenido a ~80px en contenedores estrechos)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block' }}
      aria-label="Gráfica de tendencia"
    >
      {/* Gridlines */}
      {grid.map((v, i) => (
        <g key={i}>
          <line x1={PX} y1={cy(v)} x2={W - PR} y2={cy(v)}
            stroke="#e5e7eb" strokeWidth="0.8" />
          <text x={PX - 5} y={cy(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
            {fmtVal(v)}
          </text>
        </g>
      ))}
      {/* Unidad */}
      {unit && (
        <text x={PX - 5} y={PT - 6} textAnchor="end" fontSize="9" fill="#d1d5db">{unit}</text>
      )}
      {/* Banda de referencia (ej. IMC normal) — colores hardcodeados para SVG */}
      {refMin != null && refMax != null && (
        <>
          <rect x={PX} y={cy(refMax)} width={chartW}
            height={Math.max(cy(refMin) - cy(refMax), 1)}
            fill="#22c55e" opacity="0.12" />
          <line x1={PX} y1={cy(refMin)} x2={W - PR} y2={cy(refMin)}
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
          <line x1={PX} y1={cy(refMax)} x2={W - PR} y2={cy(refMax)}
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
        </>
      )}
      {/* Eje base */}
      <line x1={PX} y1={PT + chartH} x2={W - PR} y2={PT + chartH}
        stroke="#e5e7eb" strokeWidth="1" />
      {/* Series */}
      {series.map((s, si) => {
        let path = ''
        s.values.forEach((v, i) => {
          path += (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + cy(v).toFixed(1) + ' '
        })
        return (
          <g key={si}>
            <path d={path} fill="none" stroke={s.color} strokeWidth="2"
              strokeDasharray={s.dash ? '4 3' : undefined} strokeLinejoin="round" />
            {s.values.map((v, i) => {
              const isLast = i === s.values.length - 1
              const px = cx(i), pcy = cy(v)
              return (
                <g key={i}>
                  {/* Tick */}
                  <line x1={px} y1={PT + chartH} x2={px} y2={PT + chartH + 6}
                    stroke="#e5e7eb" strokeWidth="1" />
                  <circle cx={px} cy={pcy} r={isLast ? 4.5 : 3.5}
                    fill="white" stroke={s.color} strokeWidth="1.75" />
                  <text x={px} y={pcy - 9} textAnchor="middle"
                    fontSize={isLast ? '11' : '10'} fontWeight={isLast ? '700' : '400'} fill={s.color}>
                    {fmtVal(v)}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
      {/* Fechas en eje X */}
      {dates.map((fecha, i) => (
        <text key={i} x={cx(i)} y={PT + chartH + 22} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {formatDate(fecha, 'dd/MM')}
        </text>
      ))}
      {/* Leyenda (sólo si hay más de una serie) */}
      {series.length > 1 && series.map((s, i) =>
        s.label ? (
          <g key={i} transform={`translate(${PX + 8 + i * 110}, ${PT + chartH + 40})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={s.color} strokeWidth="2"
              strokeDasharray={s.dash ? '4 3' : undefined} />
            <text x={24} y={4} fontSize="10" fill="#6b7280">{s.label}</text>
          </g>
        ) : null
      )}
    </svg>
  )
}

// ── Tipos para datos de somatometría ─────────────────────────────────────────
type SomaWeightPoint = { fecha: string; peso: number }
type SomaImcPoint    = { fecha: string; v: number }
type SomaPresPoint   = { fecha: string; sis: number; dia: number }
type SomaChartTab    = 'peso' | 'imc' | 'presion' | 'all'

// ── Modal de gráfica de Somatometría ──────────────────────────────────────────
function SomaTrendChartModal({
  open,
  onClose,
  initialChart,
  onPin,
  weightData,
  imcData,
  presData,
}: {
  open: boolean
  onClose: () => void
  initialChart: SomaChartTab
  onPin: () => void
  weightData: SomaWeightPoint[]
  imcData: SomaImcPoint[]
  presData: SomaPresPoint[]
}) {
  const [tab, setTab] = useState<SomaChartTab>(initialChart)

  // Sincronizar tab cuando se abre el modal con una gráfica distinta
  useEffect(() => {
    if (open) setTab(initialChart)
  }, [open, initialChart])

  const TAB_LABELS: Record<SomaChartTab, string> = {
    peso: 'Peso',
    imc: 'IMC',
    presion: 'Presión',
    all: 'Las 3',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[88vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-[var(--border)] px-6 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-[15px]">Tendencias · Somatometría</DialogTitle>
            <button
              onClick={() => { onPin(); onClose() }}
              className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
              title="Fijar en el panel derecho"
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              Panel derecho
            </button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="shrink-0 flex flex-wrap gap-1.5 px-6 pt-4">
          {(Object.keys(TAB_LABELS) as SomaChartTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full border px-3 py-0.5 text-[12px] font-medium transition-colors',
                tab === t
                  ? 'border-[var(--imss-ink-900)] bg-[var(--imss-ink-900)] text-white'
                  : 'border-transparent bg-[var(--muted)] text-[var(--imss-ink-400)] hover:border-[var(--border)] hover:text-[var(--imss-ink-700)]'
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Charts — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
          {(tab === 'peso' || tab === 'all') && weightData.length >= 2 && (
            <div>
              <EyebrowLabel>Peso · kg</EyebrowLabel>
              <div className="mt-2">
                <SomaTrendChart
                  series={[{ values: weightData.map(d => d.peso), color: '#16a34a' }]}
                  dates={weightData.map(d => d.fecha)}
                  unit="kg"
                />
              </div>
            </div>
          )}
          {(tab === 'imc' || tab === 'all') && imcData.length >= 2 && (
            <div>
              <EyebrowLabel>
                IMC ·&nbsp;
                <span className="normal-case font-normal text-[var(--imss-ink-200)]">
                  banda verde = rango normal 18.5–24.9
                </span>
              </EyebrowLabel>
              <div className="mt-2">
                <SomaTrendChart
                  series={[{ values: imcData.map(d => d.v), color: '#d97706' }]}
                  dates={imcData.map(d => d.fecha)}
                  refMin={18.5}
                  refMax={24.9}
                />
              </div>
            </div>
          )}
          {(tab === 'presion' || tab === 'all') && presData.length >= 2 && (
            <div>
              <EyebrowLabel>Presión arterial · mmHg</EyebrowLabel>
              <div className="mt-2">
                <SomaTrendChart
                  series={[
                    { values: presData.map(d => d.sis), color: '#dc2626', label: 'Sistólica' },
                    { values: presData.map(d => d.dia), color: '#2563eb', label: 'Diastólica', dash: true },
                  ]}
                  dates={presData.map(d => d.fecha)}
                  unit="mmHg"
                />
              </div>
            </div>
          )}
          {/* Mensaje si no hay datos para la tab seleccionada */}
          {(
            (tab === 'peso' && weightData.length < 2) ||
            (tab === 'imc' && imcData.length < 2) ||
            (tab === 'presion' && presData.length < 2) ||
            (tab === 'all' && weightData.length < 2 && imcData.length < 2 && presData.length < 2)
          ) && (
            <p className="text-[13px] italic text-[var(--imss-ink-300)] py-4 text-center">
              Se necesitan al menos 2 registros para mostrar la tendencia.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Card de tendencias Somatometría fijada al panel derecho ───────────────────
function SomaTrendsPinnedCard({
  pacienteUUID,
  onUnpin,
}: {
  pacienteUUID: string
  onUnpin: () => void
}) {
  const canSee = useSectionAccess('somatometria')
  const { data: historial = [] } = useSomatometriaByPaciente(pacienteUUID, { enabled: canSee })

  const weightData: SomaWeightPoint[] = historial.slice(0, 10).reverse()
    .filter(s => s.pesoKg != null)
    .map(s => ({ fecha: s.fechaMedicion, peso: Number(s.pesoKg) }))
  const imcData: SomaImcPoint[] = historial.slice(0, 10).reverse()
    .filter(s => s.imc != null)
    .map(s => ({ fecha: s.fechaMedicion, v: Number(s.imc) }))
  const presData: SomaPresPoint[] = historial.slice(0, 10).reverse()
    .filter(s => s.presionSistolica != null && s.presionDiastolica != null)
    .map(s => ({ fecha: s.fechaMedicion, sis: Number(s.presionSistolica), dia: Number(s.presionDiastolica) }))

  if (!canSee) return null
  if (weightData.length < 2 && imcData.length < 2 && presData.length < 2) return null

  return (
    <SectionCard
      title="Tendencias · Somatometría"
      action={
        <button
          onClick={onUnpin}
          className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--imss-ink-400)] hover:bg-[var(--muted)]"
          title="Volver al panel izquierdo"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
          Cerrar panel
        </button>
      }
    >
      <div className="divide-y divide-[var(--border)]">
        {weightData.length >= 2 && (
          <div className="px-5 py-4">
            <EyebrowLabel>Peso · kg</EyebrowLabel>
            <div className="mt-2">
              <SomaTrendChart
                series={[{ values: weightData.map(d => d.peso), color: '#16a34a' }]}
                dates={weightData.map(d => d.fecha)}
                unit="kg"
              />
            </div>
          </div>
        )}
        {imcData.length >= 2 && (
          <div className="px-5 py-4">
            <EyebrowLabel>
              IMC ·&nbsp;
              <span className="normal-case font-normal text-[var(--imss-ink-200)]">
                banda verde = rango normal 18.5–24.9
              </span>
            </EyebrowLabel>
            <div className="mt-2">
              <SomaTrendChart
                series={[{ values: imcData.map(d => d.v), color: '#d97706' }]}
                dates={imcData.map(d => d.fecha)}
                refMin={18.5}
                refMax={24.9}
              />
            </div>
          </div>
        )}
        {presData.length >= 2 && (
          <div className="px-5 py-4">
            <EyebrowLabel>Presión arterial · mmHg</EyebrowLabel>
            <div className="mt-2">
              <SomaTrendChart
                series={[
                  { values: presData.map(d => d.sis), color: '#dc2626', label: 'Sistólica' },
                  { values: presData.map(d => d.dia), color: '#2563eb', label: 'Diastólica', dash: true },
                ]}
                dates={presData.map(d => d.fecha)}
                unit="mmHg"
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ── Single examen chart ───────────────────────────────────────────────────────
function ExamenChart({
  nombre,
  datos,
  sexo,
  showTitle = true,
}: {
  nombre: string
  datos: ResultadoExamen[]
  sexo?: 'M' | 'F' | null
  showTitle?: boolean
}) {
  const sorted = [...datos].sort((a, b) => a.fechaResultado.localeCompare(b.fechaResultado))
  const examenRef = sorted[0]?.examen
  const s = sexo ?? 'M'
  const minRef = s === 'F' ? examenRef?.valorMinMujeres : examenRef?.valorMinHombres
  const maxRef = s === 'F' ? examenRef?.valorMaxMujeres : examenRef?.valorMaxHombres

  // Dimensiones amplias. Sin height fijo → el SVG escala por CSS aspectRatio,
  // igual que SomaTrendChart (evita preserveAspectRatio que lo encogía).
  // PX=64 da 64px de margen izquierdo para los labels Y sin que rocen la línea.
  const W = 600, H = 280
  const PX = 64   // izquierda — etiquetas Y (más holgura = no se pegan al chart)
  const PR = 12   // derecha
  const PT = 36   // arriba — espacio para la etiqueta del valor encima del punto
  const PB = 72   // abajo — fechas
  const chartW = W - PX - PR
  const chartH = H - PT - PB

  const vals = sorted.map(r => r.valorObtenido)
  const allVals = [...vals]
  if (minRef != null) allVals.push(minRef)
  if (maxRef != null) allVals.push(maxRef)
  const spread = Math.max(Math.max(...allVals) - Math.min(...allVals), 1)
  const lo = Math.min(...allVals) - spread * 0.15
  const hi = Math.max(...allVals) + spread * 0.15

  const cx = (i: number) => PX + chartW * (i / Math.max(sorted.length - 1, 1))
  const cy = (v: number) => PT + chartH * (1 - (v - lo) / (hi - lo))

  let linePath = ''
  vals.forEach((v, i) => { linePath += (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + cy(v).toFixed(1) + ' ' })

  // Gridlines con valores "redondos" — nunca parten desde lo exacto
  const gridVals = niceGridLines(lo, hi)

  return (
    <div>
      {showTitle && (
        <p className="px-4 pt-3 text-[13px] font-semibold text-[var(--imss-ink-900)]">
          {nombre}
          {examenRef?.unidad && (
            <span className="ml-1.5 text-[11px] font-normal text-[var(--imss-ink-300)]">
              · {examenRef.unidad}
              {minRef != null && maxRef != null && ` · banda verde = rango de referencia (${minRef}–${maxRef})`}
            </span>
          )}
        </p>
      )}
      <div className="px-4 pb-3 pt-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block' }}
          aria-label={`Tendencia de ${nombre}`}
        >
          {/* Gridlines — colores hex para compatibilidad SVG */}
          {gridVals.map((v, i) => (
            <g key={i}>
              <line x1={PX} y1={cy(v)} x2={W - PR} y2={cy(v)}
                stroke="#e5e7eb" strokeWidth="0.8" />
              {/* Label Y: anclado al borde derecho de la zona de padding (PX-10),
                  lejos del área de chart (que empieza en PX) */}
              <text x={PX - 10} y={cy(v) + 4} textAnchor="end" fontSize="11" fill="#9ca3af">
                {Number.isInteger(v) ? String(v) : v.toFixed(1)}
              </text>
            </g>
          ))}
          {/* Banda de referencia */}
          {minRef != null && maxRef != null && (
            <rect x={PX} y={cy(maxRef)} width={chartW}
              height={Math.max(cy(minRef) - cy(maxRef), 1)}
              fill="#22c55e" opacity="0.10" />
          )}
          {minRef != null && (
            <line x1={PX} y1={cy(minRef)} x2={W - PR} y2={cy(minRef)}
              stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
          )}
          {maxRef != null && (
            <line x1={PX} y1={cy(maxRef)} x2={W - PR} y2={cy(maxRef)}
              stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
          )}
          {/* Eje base */}
          <line x1={PX} y1={PT + chartH} x2={W - PR} y2={PT + chartH}
            stroke="#e5e7eb" strokeWidth="1" />
          {/* Línea de datos */}
          <path d={linePath} fill="none" stroke="#15803d" strokeWidth="2" strokeLinejoin="round" />
          {/* Puntos + etiquetas de valor */}
          {sorted.map((r, i) => {
            const isLast = i === sorted.length - 1
            const inRange = minRef != null && maxRef != null
              ? r.valorObtenido >= minRef && r.valorObtenido <= maxRef
              : true
            const color = inRange ? '#15803d' : '#dc2626'
            const px = cx(i), pcy = cy(r.valorObtenido)
            return (
              <g key={r.id}>
                <circle cx={px} cy={pcy} r={isLast ? 5.5 : 4.5}
                  fill="white" stroke={color} strokeWidth="2" />
                {/* Valor encima del punto */}
                <text x={px} y={pcy - 11} textAnchor="middle"
                  fontSize="11" fontWeight={isLast ? '700' : '500'} fill={color}>
                  {r.valorObtenido}
                </text>
                {/* Tick vertical */}
                <line x1={px} y1={PT + chartH} x2={px} y2={PT + chartH + 6}
                  stroke="#e5e7eb" strokeWidth="1" />
                {/* Fecha */}
                <text x={px} y={PT + chartH + 22} textAnchor="middle" fontSize="11" fill="#9ca3af">
                  {formatDate(r.fechaResultado, 'dd/MM/yy')}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Tendencia de resultados card (dual mode) ──────────────────────────────────
function TendenciaResultadosCard({
  resultados,
  pacienteSexo,
}: {
  resultados: ResultadoExamen[]
  pacienteSexo?: 'M' | 'F' | null
}) {
  const canSee = useSectionAccess('tendenciaResultados')
  const [modo, setModo] = useState<'selector' | 'expandido'>('selector')
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Hooks must all be called before any conditional return
  const eligibleEntries = useMemo(() => {
    if (!canSee) return []
    const map = new Map<string, ResultadoExamen[]>()
    for (const r of resultados) {
      const key = r.examen.nombreExamen
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return [...map.entries()].filter(([, list]) => list.length >= 2)
  }, [resultados, canSee])

  if (!canSee || eligibleEntries.length === 0) return null

  const safeIdx = Math.min(selectedIdx, eligibleEntries.length - 1)
  const [currentNombre, currentDatos] = eligibleEntries[safeIdx]

  return (
    <SectionCard
      title="Tendencia de resultados de laboratorio"
      action={
        <div className="flex items-center gap-0.5 rounded-md border border-[var(--border)] p-0.5">
          <button
            onClick={() => setModo('selector')}
            title="Vista selector"
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded transition-colors',
              modo === 'selector'
                ? 'bg-[var(--imss-green-500)] text-white'
                : 'text-[var(--imss-ink-400)] hover:bg-[var(--muted)]'
            )}
          >
            <LayoutList className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setModo('expandido')}
            title="Vista expandida"
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded transition-colors',
              modo === 'expandido'
                ? 'bg-[var(--imss-green-500)] text-white'
                : 'text-[var(--imss-ink-400)] hover:bg-[var(--muted)]'
            )}
          >
            <Rows3 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      }
    >
      {modo === 'selector' ? (
        <div>
          {/* Pills selector */}
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {eligibleEntries.map(([nombre], idx) => (
              <button
                key={nombre}
                onClick={() => setSelectedIdx(idx)}
                className={cn(
                  'rounded-full border px-3 py-0.5 text-[12px] font-medium transition-colors',
                  idx === safeIdx
                    ? 'border-[var(--imss-ink-900)] bg-card text-[var(--imss-ink-900)]'
                    : 'border-transparent bg-[var(--muted)] text-[var(--imss-ink-400)] hover:border-[var(--border)] hover:text-[var(--imss-ink-700)]'
                )}
              >
                {nombre}
              </button>
            ))}
          </div>
          <ExamenChart
            key={currentNombre}
            nombre={currentNombre}
            datos={currentDatos}
            sexo={pacienteSexo}
            showTitle={false}
          />
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {eligibleEntries.map(([nombre, datos]) => (
            <ExamenChart key={nombre} nombre={nombre} datos={datos} sexo={pacienteSexo} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ── Somatometría card ─────────────────────────────────────────────────────────
function SomatometriaCard({
  pacienteUUID,
  onRegistrar,
  onHistorial,
  onPin,
  pinned,
}: {
  pacienteUUID: string
  onRegistrar: () => void
  onHistorial: () => void
  onPin?: () => void
  pinned?: boolean
}) {
  const canSee = useSectionAccess('somatometria')
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('SOMATOMETRIA_CREAR')
  const { data: latest, isLoading } = useLatestSomatometria(pacienteUUID, { enabled: canSee })
  const { data: historial = [] } = useSomatometriaByPaciente(pacienteUUID, { enabled: canSee })

  // Estado del modal de gráficas
  const [chartModal, setChartModal] = useState<SomaChartTab | null>(null)

  if (!canSee) return null

  // Pre-computar datos para el modal y las mini-gráficas
  const weightData: SomaWeightPoint[] = historial.slice(0, 10).reverse()
    .filter(s => s.pesoKg != null)
    .map(s => ({ fecha: s.fechaMedicion, peso: Number(s.pesoKg) }))

  const imcData: SomaImcPoint[] = historial.slice(0, 10).reverse()
    .filter(s => s.imc != null)
    .map(s => ({ fecha: s.fechaMedicion, v: Number(s.imc) }))

  const presData: SomaPresPoint[] = historial.slice(0, 10).reverse()
    .filter(s => s.presionSistolica != null && s.presionDiastolica != null)
    .map(s => ({ fecha: s.fechaMedicion, sis: Number(s.presionSistolica), dia: Number(s.presionDiastolica) }))

  const imcInfo = imcClassification(latest?.imc)

  /** Wrapper clickeable para cada mini-gráfica */
  function ChartClickable({ chart, children }: { chart: SomaChartTab; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onClick={() => setChartModal(chart)}
        className="w-full text-left rounded-md hover:ring-2 hover:ring-[var(--imss-green-200)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--imss-green-400)] transition-all cursor-zoom-in"
        title="Clic para ver en grande"
      >
        {children}
      </button>
    )
  }

  return (
    <>
      <SectionCard
        title="Somatometría"
        action={
          <div className="flex items-center gap-0.5">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
              onClick={onHistorial}
              title="Ver historial"
            >
              <History className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            {puedeCrear && (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                onClick={onRegistrar}
                title="Registrar medición"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        }
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : latest ? (
          <div className="p-4 space-y-4">
            {/* Valores actuales */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <EyebrowLabel>Peso</EyebrowLabel>
                <div className="mt-0.5 text-[20px] font-semibold text-[var(--imss-ink-900)]">
                  {latest.pesoKg != null ? `${latest.pesoKg}` : '—'}
                  <span className="ml-1 text-[12px] font-normal text-[var(--imss-ink-300)]">kg</span>
                </div>
              </div>
              <div>
                <EyebrowLabel>Talla</EyebrowLabel>
                <div className="mt-0.5 text-[20px] font-semibold text-[var(--imss-ink-900)]">
                  {latest.tallaM != null ? `${latest.tallaM}` : '—'}
                  <span className="ml-1 text-[12px] font-normal text-[var(--imss-ink-300)]">m</span>
                </div>
              </div>
              <div>
                <EyebrowLabel>IMC</EyebrowLabel>
                <div className="mt-0.5 text-[20px] font-semibold text-[var(--imss-ink-900)]">
                  {latest.imc != null ? Number(latest.imc).toFixed(1) : '—'}
                </div>
                {latest.imc != null && (
                  <span className={cn(
                    'mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    imcInfo.tone === 'success' && 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
                    imcInfo.tone === 'warning' && 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]',
                    imcInfo.tone === 'danger'  && 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
                  )}>
                    {imcInfo.label}
                  </span>
                )}
              </div>
              <div>
                <EyebrowLabel>Presión arterial</EyebrowLabel>
                <div className="mt-0.5 text-[20px] font-semibold text-[var(--imss-ink-900)]">
                  {latest.presionSistolica && latest.presionDiastolica
                    ? `${latest.presionSistolica}/${latest.presionDiastolica}`
                    : '—'}
                </div>
                <span className="text-[11px] text-[var(--imss-ink-300)]">mmHg</span>
              </div>
            </div>

            {/* Gráficas de tendencia — clickeables para abrir modal */}
            {!pinned ? (
              <>
                {weightData.length >= 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <EyebrowLabel>Peso · últimos {weightData.length} registros</EyebrowLabel>
                      <span className="text-[9px] text-[var(--imss-ink-200)]">↗ clic para ampliar</span>
                    </div>
                    <ChartClickable chart="peso">
                      <SomaTrendChart
                        series={[{ values: weightData.map(d => d.peso), color: '#16a34a' }]}
                        dates={weightData.map(d => d.fecha)}
                        unit="kg"
                      />
                    </ChartClickable>
                  </div>
                )}

                {imcData.length >= 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <EyebrowLabel>IMC · tendencia</EyebrowLabel>
                      <span className="text-[9px] text-[var(--imss-ink-200)]">↗ clic para ampliar</span>
                    </div>
                    <ChartClickable chart="imc">
                      <SomaTrendChart
                        series={[{ values: imcData.map(d => d.v), color: '#d97706' }]}
                        dates={imcData.map(d => d.fecha)}
                        refMin={18.5}
                        refMax={24.9}
                      />
                    </ChartClickable>
                  </div>
                )}

                {presData.length >= 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <EyebrowLabel>Presión arterial · tendencia</EyebrowLabel>
                      <span className="text-[9px] text-[var(--imss-ink-200)]">↗ clic para ampliar</span>
                    </div>
                    <ChartClickable chart="presion">
                      <SomaTrendChart
                        series={[
                          { values: presData.map(d => d.sis), color: '#dc2626', label: 'Sistólica' },
                          { values: presData.map(d => d.dia), color: '#2563eb', label: 'Diastólica', dash: true },
                        ]}
                        dates={presData.map(d => d.fecha)}
                        unit="mmHg"
                      />
                    </ChartClickable>
                  </div>
                )}
              </>
            ) : (
              /* Pinned — charts están en el panel derecho */
              <div className="flex items-center gap-2 rounded-md bg-[var(--muted)] px-3 py-2.5 text-[12px] text-[var(--imss-ink-400)]">
                <TrendingUp className="h-4 w-4 shrink-0 opacity-50" strokeWidth={1.75} />
                <span>Las tendencias están en el panel derecho</span>
              </div>
            )}

            <p className="text-[11px] text-[var(--imss-ink-300)]">
              Medición del {formatDate(latest.fechaMedicion, 'dd/MM/yyyy')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-[var(--imss-ink-300)]">
            <Scale className="h-8 w-8 opacity-30" strokeWidth={1.5} />
            <p className="text-[13px]">Sin mediciones registradas</p>
            <Button variant="outline" size="sm" className="gap-1.5 text-[12px]" onClick={onRegistrar}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Registrar primera medición
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Modal de gráficas */}
      <SomaTrendChartModal
        open={chartModal !== null}
        onClose={() => setChartModal(null)}
        initialChart={chartModal ?? 'peso'}
        onPin={() => { onPin?.() }}
        weightData={weightData}
        imcData={imcData}
        presData={presData}
      />
    </>
  )
}

// ── Citas card ────────────────────────────────────────────────────────────────
function CitasCard({
  pacienteUUID,
  onAgendar,
}: {
  pacienteUUID: string
  onAgendar: () => void
}) {
  const canSee = useSectionAccess('citas')
  const { hasPermiso } = useAuthStore()
  const canEdit = hasPermiso('CITAS_EDITAR')
  const navigate = useNavigate()
  const { data: citas = [], isLoading } = useCitasResumenByPaciente(pacienteUUID, {
    enabled: canSee && !!pacienteUUID,
  })
  const [detalle, setDetalle] = useState<CitaResumen | null>(null)

  if (!canSee) return null

  const list = Array.isArray(citas) ? (citas as CitaResumen[]) : []

  function estadoTone(estado: string): 'success' | 'danger' | 'info' | 'neutral' {
    switch (estado) {
      case 'Completada': return 'success'
      case 'Cancelada':  return 'danger'
      case 'No_Asistio': return 'neutral'
      default:           return 'info'
    }
  }

  return (
    <>
      <SectionCard
        title="Citas"
        action={canEdit ? (
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
            onClick={onAgendar}
            title="Agendar cita"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : undefined}
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-[var(--imss-ink-300)]">
            <CalendarDays className="h-8 w-8 opacity-30" strokeWidth={1.5} />
            <p className="text-[13px]">Sin citas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Hora</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Profesional</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Estado</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 8).map((cita, idx) => {
                  const tone = estadoTone(cita.estado)
                  return (
                    <tr key={cita.citaUuid ?? idx} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--imss-green-50)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--imss-ink-900)]">
                        {cita.fecha ? formatDate(cita.fecha, 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--imss-ink-500)]">
                        {cita.fecha ? formatDate(cita.fecha, 'HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-[var(--imss-ink-900)]">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {cita.tipo || <span className="italic text-[var(--imss-ink-300)]">Cita médica</span>}
                          <SedeBadge
                            uuidInstitucion={cita.institucionUuid}
                            nombreInstitucion={cita.institucionNombre}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-[var(--imss-ink-500)]">
                        {cita.profesional || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                          tone === 'success' && 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
                          tone === 'danger'  && 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
                          tone === 'info'    && 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
                          tone === 'neutral' && 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]',
                        )}>
                          {cita.estado === 'No_Asistio' ? 'No asistió' : cita.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetalle(cita)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                            title="Ver detalle"
                          >
                            <Eye className="h-3 w-3" strokeWidth={1.75} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => navigate('/citas')}
                              className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                              title="Editar en calendario"
                            >
                              <Pencil className="h-3 w-3" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Detalle dialog */}
      <Dialog open={detalle !== null} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalle de cita</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="divide-y divide-[var(--imss-ink-100)]">
              {[
                { label: 'Fecha',       value: detalle.fecha ? formatDate(detalle.fecha, 'dd/MM/yyyy') : '—' },
                { label: 'Hora',        value: detalle.fecha ? formatDate(detalle.fecha, 'HH:mm') : '—' },
                { label: 'Tipo',        value: detalle.tipo || 'Cita médica' },
                { label: 'Profesional', value: detalle.profesional || '—' },
                { label: 'Estado',      value: detalle.estado === 'No_Asistio' ? 'No asistió' : detalle.estado },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <span className="text-[12px] text-[var(--imss-ink-300)]">{row.label}</span>
                  <span className="text-[13px] font-medium text-[var(--imss-ink-900)]">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Estudio detail / edit dialog
// ─────────────────────────────────────────────────────────────────────────────

interface ExpedienteGrupo {
  grupoCodigo: string
  grupoEtiqueta: string
  orden: number
  valores: Record<number, string | number | boolean>
}

function EstudioDetalleDialog({
  estudioId,
  open,
  initialMode,
  onClose,
  canEdit,
  userUuid,
}: {
  estudioId: number | null
  open: boolean
  initialMode: 'view' | 'edit'
  onClose: () => void
  canEdit: boolean
  userUuid: string
}) {
  // ── All hooks first (unconditionally) ──────────────────────────────────────
  const [mode, setMode]               = useState<'view' | 'edit'>('view')
  const [docsOpen, setDocsOpen]       = useState(false)
  const [editFecha, setEditFecha]     = useState('')
  const [editObs, setEditObs]         = useState('')
  const [editValores, setEditValores] = useState<Record<number, string | number | boolean>>({})
  const [editGrupos, setEditGrupos]   = useState<ExpedienteGrupo[]>([])
  const [editModo, setEditModo]       = useState<'NORMAL' | 'GRUPOS'>('NORMAL')

  const { data: estudio, isLoading } = useGetEstudioById(open && estudioId != null ? estudioId : null)
  const tipoId     = estudio?.tipoEstudio?.id ?? null
  const { data: parametros }           = useGetParametrosByTipo(tipoId)
  const updateMutation                 = useUpdateEstudio(estudioId ?? 0)
  const canDeleteDocs = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_ELIMINAR'))
  const canUpload     = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_SUBIR'))

  const parametrosList: ParametroEstudio[] = parametros ?? []

  // Sync view/edit mode when dialog opens
  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  // Pre-fill base fields
  useEffect(() => {
    if (!estudio || !open) return
    // 16 caracteres, no 10: fechaEstudio es un LocalDateTime y recortarlo a la
    // fecha dejaba fuera la hora. Al guardar se enviaba "2026-08-07" y el backend
    // no podia deserializarlo, asi que editar un resultado desde aqui fallaba
    // aunque no se tocara la fecha.
    setEditFecha(String(estudio.fechaEstudio ?? '').slice(0, 16))
    setEditObs(estudio.observaciones ?? '')
  }, [estudio, open])

  // Pre-fill result values once parameters are loaded
  useEffect(() => {
    if (!estudio || !parametrosList.length || !open) return
    const resultados = estudio.resultados ?? []
    const conGrupo   = resultados.filter((r) => r.grupoCodigo && r.grupoCodigo !== 'ROOT')

    if (conGrupo.length > 0) {
      setEditModo('GRUPOS')
      const gruposMap = new Map<string, ExpedienteGrupo>()
      for (const r of conGrupo) {
        const code = r.grupoCodigo!
        if (!gruposMap.has(code)) {
          gruposMap.set(code, {
            grupoCodigo: code,
            grupoEtiqueta: r.grupoEtiqueta ?? code,
            orden: r.orden ?? gruposMap.size + 1,
            valores: {},
          })
        }
        const param = parametrosList.find((p) => p.nombre === r.parametro)
        if (!param) continue
        const val =
          param.tipo === 'NUMERICO' ? (r.valorNumerico ?? '') :
          param.tipo === 'TEXTO'    ? (r.valorTexto    ?? '') :
                                      (r.valorBooleano ?? false)
        gruposMap.get(code)!.valores[param.id] = val
      }
      setEditGrupos([...gruposMap.values()].sort((a, b) => a.orden - b.orden))
    } else {
      setEditModo('NORMAL')
      const vals: Record<number, string | number | boolean> = {}
      for (const r of resultados) {
        const param = parametrosList.find((p) => p.nombre === r.parametro)
        if (!param) continue
        vals[param.id] =
          param.tipo === 'NUMERICO' ? (r.valorNumerico ?? '') :
          param.tipo === 'TEXTO'    ? (r.valorTexto    ?? '') :
                                      (r.valorBooleano ?? false)
      }
      setEditValores(vals)
    }
  }, [estudio, parametrosList, open])

  // ── Build grouped view for read-only mode ──────────────────────────────────
  const resultadosPorGrupo = useMemo(() => {
    if (!estudio) return [] as Array<{
      code: string | null; label: string | null; orden: number
      items: ResultadoEstudioResponse[]
    }>
    const results   = estudio.resultados ?? []
    const hasGroups = results.some((r) => r.grupoCodigo && r.grupoCodigo !== 'ROOT')

    if (!hasGroups) return [{ code: null, label: null, orden: 0, items: results }]

    const map = new Map<string, { code: string; label: string; orden: number; items: ResultadoEstudioResponse[] }>()
    for (const r of results) {
      const code = r.grupoCodigo ?? 'ROOT'
      if (!map.has(code)) {
        map.set(code, { code, label: r.grupoEtiqueta ?? code, orden: r.orden ?? 0, items: [] })
      }
      map.get(code)!.items.push(r)
    }
    return [...map.values()].sort((a, b) => a.orden - b.orden)
  }, [estudio])

  // ── Save handler ───────────────────────────────────────────────────────────
  function handleSave() {
    if (!estudio) return

    const resultados: ResultadoEstudioRequestDTO[] =
      editModo === 'NORMAL'
        ? parametrosList.flatMap((p) => {
            const val = editValores[p.id]
            if (val === undefined || val === null || val === '') return []
            return [{
              idParametro:   p.id,
              valorNumerico: p.tipo === 'NUMERICO' ? Number(val)  : undefined,
              valorTexto:    p.tipo === 'TEXTO'    ? String(val)  : undefined,
              valorBooleano: p.tipo === 'BOOLEANO' ? Boolean(val) : undefined,
            }]
          })
        : editGrupos.flatMap((grupo) =>
            parametrosList.flatMap((p) => {
              const val = grupo.valores[p.id]
              if (val === undefined || val === null || val === '') return []
              return [{
                idParametro:   p.id,
                valorNumerico: p.tipo === 'NUMERICO' ? Number(val)  : undefined,
                valorTexto:    p.tipo === 'TEXTO'    ? String(val)  : undefined,
                valorBooleano: p.tipo === 'BOOLEANO' ? Boolean(val) : undefined,
                grupoCodigo:   grupo.grupoCodigo,
                grupoEtiqueta: grupo.grupoEtiqueta,
                orden:         grupo.orden,
              }]
            })
          )

    // Guarda: fechaEstudio es un LocalDateTime en el backend, asi que un valor sin
    // hora se rechaza al deserializar. Ya paso una vez —el campo se cargaba
    // recortado a 10 caracteres— y el usuario solo veia un error del servidor sin
    // saber que corregir. Mas vale detenerlo aqui con un motivo legible.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(editFecha)) {
      toast.error('La fecha del estudio debe incluir la hora. Vuelve a seleccionarla.')
      return
    }

    const payload: EstudioMedicoRequestDTO = {
      pacienteUUID:      estudio.paciente?.uuid ?? '',
      usuarioRealizaUUID: estudio.usuarioRealiza?.uuid ?? userUuid,
      idTipoEstudio:     estudio.tipoEstudio?.id ?? 0,
      fechaEstudio:      editFecha,
      observaciones:     editObs.trim() || undefined,
      resultados,
    }

    updateMutation.mutate(payload, { onSuccess: () => setMode('view') })
  }

  // ── Helper: display a result value as string ───────────────────────────────
  function displayVal(r: ResultadoEstudioResponse): string {
    if (r.valorNumerico != null) return String(r.valorNumerico)
    if (r.valorTexto    != null) return r.valorTexto
    if (r.valorBooleano != null) return r.valorBooleano ? 'Sí' : 'No'
    return '—'
  }

  const hasGroups = (estudio?.resultados ?? []).some(
    (r) => r.grupoCodigo && r.grupoCodigo !== 'ROOT'
  )

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85vh] overflow-hidden p-0">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-[var(--border)] px-6 pt-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-[15px] truncate">
                  {isLoading ? 'Cargando…' : (estudio?.tipoEstudio?.nombre ?? 'Estudio médico')}
                </DialogTitle>
                {estudio && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-[var(--imss-ink-400)]">
                    <span>
                      Fecha:&nbsp;
                      <span className="font-mono text-[var(--imss-ink-900)]">
                        {formatDate(estudio.fechaEstudio, 'dd/MM/yyyy')}
                      </span>
                    </span>
                    <span>
                      Realizó:&nbsp;
                      <span className="text-[var(--imss-ink-900)]">
                        {estudio.usuarioRealiza?.nombreCompleto ?? '—'}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons on header */}
              {mode === 'view' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {estudioId != null && (
                    <button
                      onClick={() => setDocsOpen(true)}
                      className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--border)] px-2 text-[12px] text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                      title="Ver documentos adjuntos"
                    >
                      <Paperclip className="h-3 w-3" strokeWidth={1.75} />
                      Documentos
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setMode('edit')}
                      className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--border)] px-2 text-[12px] text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.75} />
                      Editar
                    </button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !estudio ? null : mode === 'view' ? (
              /* ── VIEW MODE ── */
              <div className="space-y-4">
                {estudio.observaciones && (
                  <div className="rounded-md bg-[var(--muted)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)] mb-1">
                      Observaciones
                    </p>
                    <p className="text-[13px] text-[var(--imss-ink-700)]">{estudio.observaciones}</p>
                  </div>
                )}

                {(estudio.resultados ?? []).length === 0 ? (
                  <p className="text-[13px] italic text-[var(--imss-ink-300)]">
                    Sin resultados registrados
                  </p>
                ) : hasGroups ? (
                  /* Grouped */
                  <div className="space-y-3">
                    {resultadosPorGrupo.map((grupo) => (
                      <div key={grupo.code ?? 'root'} className="rounded-md border border-[var(--border)] overflow-hidden">
                        {grupo.label && (
                          <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
                            <span className="text-[12px] font-semibold text-[var(--imss-ink-700)]">
                              {grupo.label}
                            </span>
                          </div>
                        )}
                        <table className="w-full border-collapse">
                          <tbody>
                            {grupo.items.map((r) => (
                              <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                                <td className="px-4 py-2 text-[13px] text-[var(--imss-ink-500)] w-1/2">
                                  {r.parametro}
                                </td>
                                <td className="px-4 py-2 text-[13px] font-semibold text-[var(--imss-ink-900)] text-right">
                                  {displayVal(r)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Flat */
                  <div className="rounded-md border border-[var(--border)] overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                            Parámetro
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">
                            Resultado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(estudio.resultados ?? []).map((r) => (
                          <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--imss-green-50)]">
                            <td className="px-4 py-2.5 text-[13px] text-[var(--imss-ink-700)]">{r.parametro}</td>
                            <td className="px-4 py-2.5 text-[13px] font-semibold text-[var(--imss-ink-900)] text-right">
                              {displayVal(r)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* ── EDIT MODE ── */
              <div className="space-y-4">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--imss-ink-700)]">
                    Fecha y hora del estudio
                  </label>
                  <Input
                    type="datetime-local"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                    className="h-8 text-[13px]"
                  />
                </div>

                {/* Observaciones */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--imss-ink-700)]">
                    Observaciones
                  </label>
                  <Textarea
                    value={editObs}
                    onChange={(e) => setEditObs(e.target.value)}
                    placeholder="Notas clínicas…"
                    rows={2}
                    className="text-[13px] resize-none"
                  />
                </div>

                <Separator />

                {/* Parameters */}
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--imss-ink-300)]">
                  Resultados{editModo === 'GRUPOS' ? ' por grupos' : ''}
                </p>

                {parametrosList.length === 0 ? (
                  <p className="text-[12px] italic text-[var(--imss-ink-300)]">
                    Sin parámetros disponibles.
                  </p>
                ) : editModo === 'NORMAL' ? (
                  <div className="space-y-3">
                    {parametrosList.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="flex-1 text-[13px] text-[var(--imss-ink-700)]">
                          {p.nombre}{p.unidad ? ` (${p.unidad})` : ''}
                        </span>
                        {p.tipo === 'BOOLEANO' ? (
                          <Switch
                            checked={Boolean(editValores[p.id] ?? false)}
                            onCheckedChange={(v) =>
                              setEditValores((prev) => ({ ...prev, [p.id]: v }))
                            }
                          />
                        ) : (
                          <Input
                            type={p.tipo === 'NUMERICO' ? 'number' : 'text'}
                            step="any"
                            value={(editValores[p.id] as string | number) ?? ''}
                            onChange={(e) =>
                              setEditValores((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="w-36 h-8 text-[13px]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* GRUPOS */
                  <div className="space-y-3">
                    {editGrupos.map((grupo, gIdx) => (
                      <div key={grupo.grupoCodigo} className="rounded-md border border-[var(--border)] overflow-hidden">
                        <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-2">
                          <span className="text-[12px] font-semibold text-[var(--imss-ink-700)]">
                            {grupo.grupoEtiqueta}
                          </span>
                        </div>
                        <div className="space-y-3 px-4 py-3">
                          {parametrosList.map((p) => (
                            <div key={p.id} className="flex items-center gap-3">
                              <span className="flex-1 text-[13px] text-[var(--imss-ink-700)]">
                                {p.nombre}{p.unidad ? ` (${p.unidad})` : ''}
                              </span>
                              {p.tipo === 'BOOLEANO' ? (
                                <Switch
                                  checked={Boolean(grupo.valores[p.id] ?? false)}
                                  onCheckedChange={(v) =>
                                    setEditGrupos((prev) =>
                                      prev.map((g, i) =>
                                        i === gIdx
                                          ? { ...g, valores: { ...g.valores, [p.id]: v } }
                                          : g
                                      )
                                    )
                                  }
                                />
                              ) : (
                                <Input
                                  type={p.tipo === 'NUMERICO' ? 'number' : 'text'}
                                  step="any"
                                  value={(grupo.valores[p.id] as string | number) ?? ''}
                                  onChange={(e) =>
                                    setEditGrupos((prev) =>
                                      prev.map((g, i) =>
                                        i === gIdx
                                          ? { ...g, valores: { ...g.valores, [p.id]: e.target.value } }
                                          : g
                                      )
                                    )
                                  }
                                  className="w-36 h-8 text-[13px]"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit action footer */}
                <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode('view')}
                    disabled={updateMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <><Spinner className="mr-2 h-3.5 w-3.5" />Guardando…</>
                    ) : (
                      'Guardar cambios'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Documentos del estudio */}
      {estudioId != null && (
        <DocumentosDialog
          open={docsOpen}
          onOpenChange={setDocsOpen}
          entidad="estudio"
          estudioId={estudioId}
          titulo="Documentos del estudio"
          descripcion="Sube y consulta los archivos adjuntos a este estudio médico."
          usuarioUUID={userUuid}
          canDelete={canDeleteDocs}
          canUpload={canUpload}
        />
      )}
    </>
  )
}

// ── Estudios card ─────────────────────────────────────────────────────────────
function EstudiosCard({ pacienteUUID, userUuid }: { pacienteUUID: string; userUuid: string }) {
  const canSee = useSectionAccess('estudios')
  const { hasPermiso } = useAuthStore()
  const canEdit       = hasPermiso('ESTUDIOS_EDITAR')
  const canUpload     = hasPermiso('DOCUMENTOS_SUBIR')
  const canDeleteDocs = hasPermiso('DOCUMENTOS_ELIMINAR')
  const navigate    = useNavigate()
  const { data: estudios = [], isLoading } = useGetEstudiosByPaciente(canSee ? pacienteUUID : null)

  // Dialog state
  const [viewingId,  setViewingId]  = useState<number | null>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view')
  const [docsId,     setDocsId]     = useState<number | null>(null)

  if (!canSee) return null

  const list = Array.isArray(estudios) ? (estudios as EstudioListDTO[]) : []

  function openView(id: number) {
    setViewingId(id)
    setDialogMode('view')
  }

  function openEdit(id: number) {
    setViewingId(id)
    setDialogMode('edit')
  }

  return (
    <>
      <SectionCard
        title="Estudios médicos"
        action={canEdit ? (
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
            onClick={() => navigate('/estudios')}
            title="Registrar nuevo estudio"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : undefined}
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-[var(--imss-ink-300)]">
            <Stethoscope className="h-8 w-8 opacity-30" strokeWidth={1.5} />
            <p className="text-[13px]">Sin estudios registrados</p>
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1.5 text-[12px]" onClick={() => navigate('/estudios')}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                Registrar primer estudio
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Realizó</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Parámetros</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Adjuntos</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((estudio) => (
                  <tr key={estudio.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--imss-green-50)]">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--imss-ink-900)]">
                      {estudio.fechaEstudio ? formatDate(estudio.fechaEstudio, 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] font-medium text-[var(--imss-ink-900)]">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {estudio.tipoEstudio}
                        <SedeBadge
                          idInstitucion={estudio.institucionId}
                          nombreInstitucion={estudio.institucionNombre}
                        />
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-[var(--imss-ink-500)] max-w-[140px] truncate">{estudio.usuarioRealiza}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[var(--muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--imss-ink-500)]">
                        {estudio.cantidadResultados ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[var(--muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--imss-ink-500)]">
                        {estudio.cantidadAdjuntos ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openView(estudio.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                          title="Ver resultados"
                        >
                          <Eye className="h-3 w-3" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => setDocsId(estudio.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                          title="Ver documentos adjuntos"
                        >
                          <Paperclip className="h-3 w-3" strokeWidth={1.75} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEdit(estudio.id)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                            title="Editar estudio"
                          >
                            <Pencil className="h-3 w-3" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <EstudioDetalleDialog
        estudioId={viewingId}
        open={viewingId !== null}
        initialMode={dialogMode}
        onClose={() => setViewingId(null)}
        canEdit={canEdit}
        userUuid={userUuid}
      />

      {docsId !== null && (
        <DocumentosDialog
          open={docsId !== null}
          onOpenChange={(o) => !o && setDocsId(null)}
          entidad="estudio"
          estudioId={docsId}
          titulo="Documentos del estudio"
          descripcion="Archivos adjuntos al estudio médico."
          usuarioUUID={userUuid}
          canDelete={canDeleteDocs}
          canUpload={canUpload}
        />
      )}
    </>
  )
}

// ── Exámenes de laboratorio card ───────────────────────────────────────────────
function ExamenesCard({
  pacienteUUID,
  pacienteSexo,
}: {
  pacienteUUID: string
  pacienteSexo?: 'M' | 'F' | null
}) {
  const canSee = useSectionAccess('examenes')
  const { hasPermiso } = useAuthStore()
  const canEdit = hasPermiso('EXAMENES_EDITAR')
  const navigate = useNavigate()
  const { data: resultados = [], isLoading } = useGetResultadosByPacienteUUID(canSee ? pacienteUUID : null)
  const [detalle, setDetalle] = useState<ResultadoExamen | null>(null)

  if (!canSee) return null

  const list = Array.isArray(resultados) ? (resultados as ResultadoExamen[]) : []
  const s = pacienteSexo ?? 'M'
  const sexColLabel = s === 'F' ? 'F' : 'M'

  function rangeStatus(r: ResultadoExamen): 'success' | 'danger' | 'neutral' {
    const min = s === 'F' ? r.examen.valorMinMujeres : r.examen.valorMinHombres
    const max = s === 'F' ? r.examen.valorMaxMujeres : r.examen.valorMaxHombres
    if (min == null || max == null) return 'neutral'
    return r.valorObtenido >= min && r.valorObtenido <= max ? 'success' : 'danger'
  }

  function rangeLabel(r: ResultadoExamen): string {
    const min = s === 'F' ? r.examen.valorMinMujeres : r.examen.valorMinHombres
    const max = s === 'F' ? r.examen.valorMaxMujeres : r.examen.valorMaxHombres
    if (min == null || max == null) return '—'
    return `${min} – ${max}`
  }

  return (
    <>
      <SectionCard
        title="Exámenes de laboratorio"
        action={canEdit ? (
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
            onClick={() => navigate('/examenes')}
            title="Registrar resultado"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : undefined}
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-[var(--imss-ink-300)]">
            <TestTube2 className="h-8 w-8 opacity-30" strokeWidth={1.5} />
            <p className="text-[13px]">Sin resultados de laboratorio</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Examen</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Resultado</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Unidad</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Rango ref. ({sexColLabel})</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Estado</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const tone = rangeStatus(r)
                  return (
                    <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--imss-green-50)]">
                      <td className="px-4 py-2.5 text-[13px] font-medium text-[var(--imss-ink-900)]">{r.examen.nombreExamen}</td>
                      <td className={cn(
                        'px-4 py-2.5 font-mono text-[13px] font-semibold',
                        tone === 'success' ? 'text-[var(--status-success-fg)]'
                          : tone === 'danger' ? 'text-[var(--status-danger-fg)]'
                          : 'text-[var(--imss-ink-900)]'
                      )}>
                        {r.valorObtenido}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[var(--imss-ink-400)]">
                        {r.examen.unidad || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--imss-ink-500)]">
                        {rangeLabel(r)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                          tone === 'success' && 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
                          tone === 'danger'  && 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
                          tone === 'neutral' && 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]',
                        )}>
                          {tone === 'success' ? 'En rango' : tone === 'danger' ? 'Fuera de rango' : 'Sin referencia'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--imss-ink-500)]">
                        {r.fechaResultado ? formatDate(r.fechaResultado, 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetalle(r)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[var(--imss-ink-400)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                            title="Ver detalle"
                          >
                            <Eye className="h-3 w-3" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Examen detail dialog */}
      <Dialog open={detalle !== null} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalle de resultado</DialogTitle>
          </DialogHeader>
          {detalle && (() => {
            const tone = rangeStatus(detalle)
            return (
              <div className="divide-y divide-[var(--imss-ink-100)]">
                {[
                  { label: 'Examen',    value: detalle.examen.nombreExamen },
                  { label: 'Resultado', value: `${detalle.valorObtenido} ${detalle.examen.unidad ?? ''}`.trim() },
                  { label: `Rango ref. (${sexColLabel})`, value: rangeLabel(detalle) },
                  { label: 'Estado', value: (
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      tone === 'success' && 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
                      tone === 'danger'  && 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
                      tone === 'neutral' && 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]',
                    )}>
                      {tone === 'success' ? 'En rango' : tone === 'danger' ? 'Fuera de rango' : 'Sin referencia'}
                    </span>
                  )},
                  { label: 'Observaciones', value: detalle.observaciones || '—' },
                  { label: 'Fecha',    value: formatDate(detalle.fechaResultado, 'dd/MM/yyyy') },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 gap-2">
                    <span className="text-[12px] text-[var(--imss-ink-300)] shrink-0">{row.label}</span>
                    <span className="text-[13px] font-medium text-[var(--imss-ink-900)] text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Perfil de laboratorio card ────────────────────────────────────────────────
function PerfilLaboratorioCard({
  resultados,
  pacienteSexo,
}: {
  resultados: ResultadoExamen[]
  pacienteSexo?: 'M' | 'F' | null
}) {
  const canSee = useSectionAccess('examenes')

  const latestByExam = useMemo(() => {
    if (!canSee) return []
    const sorted = [...resultados].sort((a, b) =>
      b.fechaResultado.localeCompare(a.fechaResultado)
    )
    const map = new Map<string, ResultadoExamen>()
    for (const r of sorted) {
      if (!map.has(r.examen.nombreExamen)) map.set(r.examen.nombreExamen, r)
    }
    return [...map.values()]
  }, [resultados, canSee])

  if (!canSee || latestByExam.length === 0) return null

  const s = pacienteSexo ?? 'M'
  const sexLabel = s === 'F' ? 'Femenino' : 'Masculino'

  // Date of the most recent result overall
  const latestFecha = latestByExam.reduce(
    (best, r) => (r.fechaResultado > best ? r.fechaResultado : best),
    ''
  )

  return (
    <SectionCard title="Último perfil de laboratorio vs rango de referencia">
      <div className="px-5 pt-2 pb-1">
        <p className="text-[11px] text-[var(--imss-ink-300)]">
          Toma del {formatDate(latestFecha, 'dd/MM/yyyy')} · rangos para sexo {sexLabel}
        </p>
      </div>
      <div className="px-5 pb-5 pt-3 space-y-4">
        {latestByExam.map((r) => {
          const minRef = s === 'F' ? r.examen.valorMinMujeres : r.examen.valorMinHombres
          const maxRef = s === 'F' ? r.examen.valorMaxMujeres : r.examen.valorMaxHombres
          const hasRange = minRef != null && maxRef != null

          // Gauge scale: include ref range + actual value with comfortable padding
          const allNums = [r.valorObtenido, ...(hasRange ? [minRef!, maxRef!] : [])]
          const dataMin = Math.min(...allNums)
          const dataMax = Math.max(...allNums)
          const pad = (dataMax - dataMin) * 0.25 || dataMax * 0.2 || 10
          const gaugeMin = Math.max(0, dataMin - pad)
          const gaugeMax = dataMax + pad
          const span = gaugeMax - gaugeMin || 1

          const toPercent = (v: number) =>
            Math.max(0, Math.min(100, ((v - gaugeMin) / span) * 100))

          const dotPct = toPercent(r.valorObtenido)
          const bandMinPct = hasRange ? toPercent(minRef!) : null
          const bandMaxPct = hasRange ? toPercent(maxRef!) : null

          const inRange = hasRange
            ? r.valorObtenido >= minRef! && r.valorObtenido <= maxRef!
            : null
          const dotColor =
            inRange === true
              ? '#1a5e3e'
              : inRange === false
              ? 'var(--status-danger-fg)'
              : 'var(--imss-ink-400)'

          return (
            <div key={r.id} className="flex items-center gap-3">
              {/* Exam name */}
              <div className="w-36 shrink-0">
                <p className="truncate text-[12px] font-medium text-[var(--imss-ink-900)]" title={r.examen.nombreExamen}>
                  {r.examen.nombreExamen}
                </p>
                {hasRange && (
                  <p className="text-[10px] text-[var(--imss-ink-300)]">
                    {minRef} – {maxRef}
                    {r.examen.unidad ? ` ${r.examen.unidad}` : ''}
                  </p>
                )}
              </div>

              {/* Gauge bar */}
              <div className="relative flex-1">
                <div className="relative h-2 w-full overflow-visible rounded-full bg-[var(--muted)]">
                  {/* Reference band */}
                  {hasRange && bandMinPct != null && bandMaxPct != null && (
                    <div
                      className="absolute h-full rounded-full"
                      style={{
                        left: `${Math.max(0, bandMinPct)}%`,
                        width: `${Math.min(100, bandMaxPct) - Math.max(0, bandMinPct)}%`,
                        backgroundColor: '#1a5e3e',
                        opacity: 0.18,
                      }}
                    />
                  )}
                  {/* Dot marker */}
                  <div
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                    style={{
                      left: `${Math.max(3, Math.min(97, dotPct))}%`,
                      borderColor: dotColor,
                    }}
                  />
                </div>
              </div>

              {/* Value */}
              <div className="w-20 shrink-0 text-right">
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: dotColor }}
                >
                  {r.valorObtenido}
                </span>
                {r.examen.unidad && (
                  <span className="ml-1 text-[11px] text-[var(--imss-ink-300)]">
                    {r.examen.unidad}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ── Documentos card ───────────────────────────────────────────────────────────
function DocumentosCard({
  pacienteUUID,
  onSubir,
}: {
  pacienteUUID: string
  onSubir: () => void
}) {
  const canSee = useSectionAccess('documentos')
  const { hasPermiso } = useAuthStore()
  const canEdit = hasPermiso('DOCUMENTOS_SUBIR')
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''

  const { data: consentimientos = [], isLoading: loadingCons } = useDocumentosPacienteTipo(
    pacienteUUID, 'CONSENTIMIENTO', { enabled: canSee && !!pacienteUUID }
  )
  const { data: cuestGeneral = [], isLoading: loadingCuestG } = useDocumentosPacienteTipo(
    pacienteUUID, 'CUESTIONARIO_GENERAL', { enabled: canSee && !!pacienteUUID }
  )
  const { data: cuestMinimental = [], isLoading: loadingCuestM } = useDocumentosPacienteTipo(
    pacienteUUID, 'CUESTIONARIO_MINIMENTAL', { enabled: canSee && !!pacienteUUID }
  )
  const { data: cuestAfluencia = [], isLoading: loadingCuestA } = useDocumentosPacienteTipo(
    pacienteUUID, 'CUESTIONARIO_AFLUENCIA_VERBAL', { enabled: canSee && !!pacienteUUID }
  )
  const { data: cuestAges = [], isLoading: loadingCuestG2 } = useDocumentosPacienteTipo(
    pacienteUUID, 'CUESTIONARIO_AGES', { enabled: canSee && !!pacienteUUID }
  )
  const { data: generales = [], isLoading: loadingGen } = useDocumentosPacienteTipo(
    pacienteUUID, 'GENERAL', { enabled: canSee && !!pacienteUUID }
  )

  if (!canSee) return null

  const allDocs: DocumentoResponseDTO[] = [
    ...consentimientos, ...cuestGeneral, ...cuestMinimental, ...cuestAfluencia, ...cuestAges, ...generales,
  ]
  const isLoading = loadingCons || loadingCuestG || loadingCuestM || loadingCuestA || loadingCuestG2 || loadingGen

  return (
    <SectionCard
      title="Documentos del expediente"
      action={canEdit ? (
        <div className="flex items-center gap-1">
          <CrearEtiquetaButton
            pacienteUUID={pacienteUUID}
            usuarioUUID={userUuid}
            tipos={[
              'CONSENTIMIENTO',
              'CUESTIONARIO_GENERAL',
              'CUESTIONARIO_MINIMENTAL',
              'CUESTIONARIO_AFLUENCIA_VERBAL',
              'CUESTIONARIO_AGES',
            ]}
            trigger={(open) => (
              <button
                className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                onClick={open}
                title="Crear etiqueta sin archivo"
              >
                <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.75} />
                Etiqueta
              </button>
            )}
          />
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
            onClick={onSubir}
            title="Subir documento"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="p-4">
          <DocumentoList
            documentos={allDocs}
            showTipoBadge
            canDelete={false}
            emptyMessage="Sin documentos registrados"
          />
        </div>
      )}
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ExpedientePacientePage() {
  const location = useLocation()
  const navigate = useNavigate()
  // UUID llega por location.state (nunca por URL) para que no se vea en la barra del navegador.
  // Staff llega siempre con state (navega desde la tabla de pacientes). El rol PACIENTE
  // llega sin state (aterriza aquí tras login) — en ese caso resolvemos su propio UUID
  // vía /pacientes/mi-uuid, reutilizando esta MISMA página en modo lectura (los botones
  // de edición ya se ocultan solos porque PACIENTE no tiene los permisos *_EDITAR).
  const stateUuid: string = (location.state as { uuid?: string } | null)?.uuid ?? ''
  const { hasPermiso } = useAuthStore()
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''

  const puedeVerCualquierPaciente = hasPermiso('PACIENTES_ACCEDER') || hasPermiso('PACIENTES_LOOKUP')
  const necesitaUuidPropio = !stateUuid && !puedeVerCualquierPaciente
  const { data: miUuid, isLoading: resolviendoUuidPropio } = useMiPacienteUuid({ enabled: necesitaUuidPropio })
  const uuid: string = stateUuid || miUuid || ''

  const { data: paciente, isLoading, isError } = useGetPacienteByUUID(uuid)

  const nombreCompleto = useMemo(
    () => (paciente ? getFullName(paciente.persona) : ''),
    [paciente]
  )

  const initials = useMemo(
    () => nombreCompleto.split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase(),
    [nombreCompleto]
  )

  // ── Modal states ──────────────────────────────────────────────────────────
  const [citaModalOpen, setCitaModalOpen] = useState(false)
  const [somaFormOpen, setSomaFormOpen] = useState(false)
  const [somaHistorialOpen, setSomaHistorialOpen] = useState(false)
  const [somaEditar, setSomaEditar] = useState<Somatometria | null>(null)
  const [docUploaderOpen, setDocUploaderOpen] = useState(false)
  const [pacienteFormOpen, setPacienteFormOpen] = useState(false)
  // Controla si las gráficas de tendencias de somatometría están "fijadas" al panel derecho
  const [somaTrendsPinned, setSomaTrendsPinned] = useState(false)

  // ── Stat tiles counts (solo si el rol tiene acceso) ───────────────────────
  const canSeeCitas      = useSectionAccess('citas')
  const canSeeEstudios   = useSectionAccess('estudios')
  const canSeeDocs       = useSectionAccess('documentos')
  const canSeeExamenes   = useSectionAccess('examenes')
  const canSeeMuestras   = useSectionAccess('muestrasBiobanco')

  const { data: citas = [] }    = useCitasResumenByPaciente(uuid || '', { enabled: canSeeCitas && !!uuid })
  const { data: estudios = [] } = useGetEstudiosByPaciente(canSeeEstudios ? uuid : null)
  const { data: docsC = [] }    = useDocumentosPacienteTipo(uuid, 'CONSENTIMIENTO', { enabled: canSeeDocs && !!uuid })
  const { data: docsQ1 = [] }   = useDocumentosPacienteTipo(uuid, 'CUESTIONARIO_GENERAL', { enabled: canSeeDocs && !!uuid })
  const { data: docsQ2 = [] }   = useDocumentosPacienteTipo(uuid, 'CUESTIONARIO_MINIMENTAL', { enabled: canSeeDocs && !!uuid })
  const { data: docsQ3 = [] }   = useDocumentosPacienteTipo(uuid, 'CUESTIONARIO_AFLUENCIA_VERBAL', { enabled: canSeeDocs && !!uuid })
  const { data: docsQ4 = [] }   = useDocumentosPacienteTipo(uuid, 'CUESTIONARIO_AGES', { enabled: canSeeDocs && !!uuid })
  const { data: docsG = [] }    = useDocumentosPacienteTipo(uuid, 'GENERAL',        { enabled: canSeeDocs && !!uuid })
  const { data: resultados = [] } = useGetResultadosByPacienteUUID(uuid || null)

  // Counts via lean endpoints — no need to load all data again
  const { data: examenesCount = 0 } = useCountResultadosByPacienteUUID(
    uuid || null,
    { enabled: canSeeExamenes && !!uuid }
  )
  const { data: muestrasCount = 0 } = useCountMuestrasByPaciente(
    uuid,
    { enabled: canSeeMuestras && !!uuid }
  )

  const citasCount    = Array.isArray(citas)    ? (citas as any[]).length    : 0
  const estudiosCount = Array.isArray(estudios) ? (estudios as any[]).length : 0
  const docsCount     = [docsC, docsQ1, docsQ2, docsQ3, docsQ4, docsG]
    .reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)

  // Resolviendo el UUID propio del participante (rol PACIENTE, llega sin state)
  if (!uuid && resolviendoUuidPropio) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    )
  }

  // Sin UUID (acceso directo sin state, p.ej. refresh, o sin expediente propio vinculado) → volver a la lista
  if (!uuid) {
    navigate('/pacientes', { replace: true })
    return null
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (isError || !paciente) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <p className="text-[15px] font-medium text-[var(--imss-ink-900)]">Participante no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/pacientes')}>Regresar</Button>
      </div>
    )
  }

  const canEdit = hasPermiso('PACIENTES_EDITAR')

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-[var(--imss-ink-300)]">
        <Link to="/pacientes" className="hover:text-[var(--imss-ink-900)]">Participantes</Link>
        <span>›</span>
        <span className="text-[var(--imss-ink-900)] font-medium">Expediente</span>
      </nav>

      {/* Patient identity header */}
      <div className="rounded-lg border border-[var(--border)] bg-card px-6 py-5">
        <div className="flex flex-wrap items-start gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--imss-green-100)] text-[var(--imss-green-700)]">
            <span className="text-[22px] font-semibold">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[220px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-[var(--imss-ink-900)]">
                {nombreCompleto}
              </h1>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                paciente.activo
                  ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
                  : 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]'
              )}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {paciente.activo ? 'Activo' : 'Inactivo'}
              </span>
              {paciente.persona.sexo && (
                <span className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  paciente.persona.sexo === 'F'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]'
                )}>
                  {paciente.persona.sexo === 'F' ? 'Femenino' : 'Masculino'}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-[var(--imss-ink-500)]">
              <span>Folio <span className="font-mono text-[var(--imss-ink-900)]">{paciente.folio}</span></span>
              {paciente.persona.fechaNacimiento && (
                <>
                  <span className="h-1 w-1 rounded-full bg-[var(--imss-ink-300)]" />
                  <span>{calcAge(paciente.persona.fechaNacimiento)}</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--imss-ink-300)]" />
                  <span className="font-mono">
                    {formatDate(paciente.persona.fechaNacimiento, 'dd/MM/yyyy')}
                  </span>
                </>
              )}
              {paciente.persona.telefono && (
                <>
                  <span className="h-1 w-1 rounded-full bg-[var(--imss-ink-300)]" />
                  <span className="font-mono">{paciente.persona.telefono}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[13px]"
              onClick={() => window.print()}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {canSeeCitas      && <StatTile label="Citas"           value={citasCount}     sub="programadas y completadas" />}
        {canSeeEstudios   && <StatTile label="Estudios"        value={estudiosCount}  sub="médicos registrados" />}
        {canSeeExamenes   && <StatTile label="Exámenes lab"    value={examenesCount}  sub="resultados registrados" />}
        {canSeeMuestras   && <StatTile label="Muestras"        value={muestrasCount}  sub="en biobanco" />}
        {canSeeDocs       && <StatTile label="Documentos"      value={docsCount}      sub="en el expediente" />}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* Left rail */}
        <div className="flex flex-col gap-5">
          {/* Datos personales */}
          <SectionCard
            title="Datos personales"
            action={canEdit ? (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--imss-ink-500)] hover:bg-[var(--imss-green-50)] hover:text-[var(--imss-green-700)]"
                onClick={() => setPacienteFormOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            ) : undefined}
          >
            <div className="divide-y divide-[var(--imss-ink-100)] px-4">
              {[
                { label: 'Nombre completo', value: nombreCompleto },
                { label: 'Fecha de nacimiento',
                  value: paciente.persona.fechaNacimiento
                    ? formatDate(paciente.persona.fechaNacimiento, 'dd/MM/yyyy')
                    : undefined },
                { label: 'Correo', value: paciente.persona.email },
                { label: 'Teléfono', value: paciente.persona.telefono },
                { label: 'Folio', value: paciente.folio, mono: true },
                { label: 'Registro',
                  value: paciente.fechaRegistro
                    ? formatDate(paciente.fechaRegistro, 'dd/MM/yyyy')
                    : undefined },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <span className="text-[12px] text-[var(--imss-ink-300)]">{row.label}</span>
                  <span className={cn('text-[13px] font-medium text-[var(--imss-ink-900)]', row.mono && 'font-mono text-[12px]')}>
                    {row.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Reclutamiento */}
          {paciente.reclutamiento && (
            <SectionCard title="Reclutamiento">
              <div className="px-4 pb-3 pt-1">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  paciente.reclutamiento.tipoReclutamiento === 'RETORNO'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]'
                )}>
                  {paciente.reclutamiento.tipoReclutamiento === 'RETORNO' ? 'Retorno' : 'Nuevo'}
                </span>
              </div>
              <div className="divide-y divide-[var(--imss-ink-100)] px-4">
                {[
                  { label: 'Institución', value: paciente.reclutamiento.institucionReclutamiento?.nombre },
                  { label: 'Estado de contacto',
                    value: paciente.reclutamiento.estadoContacto
                      ? ESTADO_CONTACTO_LABELS[paciente.reclutamiento.estadoContacto]
                      : undefined },
                  { label: 'Medio de contacto',
                    value: paciente.reclutamiento.medioContacto
                      ? MEDIO_CONTACTO_LABELS[paciente.reclutamiento.medioContacto]
                      : undefined },
                  { label: 'Fecha de contacto',
                    value: paciente.reclutamiento.fechaContacto
                      ? formatDate(paciente.reclutamiento.fechaContacto, 'dd/MM/yyyy')
                      : undefined },
                  { label: 'Reclutó', value: paciente.reclutamiento.usuarioRecluta?.nombreCompleto },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-[var(--imss-ink-300)]">{row.label}</span>
                    <span className="text-[13px] font-medium text-[var(--imss-ink-900)] text-right">
                      {row.value || '—'}
                    </span>
                  </div>
                ))}
                {paciente.reclutamiento.observaciones && (
                  <div className="py-2.5">
                    <span className="text-[12px] text-[var(--imss-ink-300)]">Observaciones</span>
                    <p className="mt-1 text-[13px] text-[var(--imss-ink-900)]">
                      {paciente.reclutamiento.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Somatometría */}
          <SomatometriaCard
            pacienteUUID={uuid}
            onRegistrar={() => { setSomaEditar(null); setSomaFormOpen(true) }}
            onHistorial={() => setSomaHistorialOpen(true)}
            onPin={() => setSomaTrendsPinned(true)}
            pinned={somaTrendsPinned}
          />
        </div>

        {/* Right content */}
        <div className="flex flex-col gap-5">
          {/* Tendencias Somatometría fijadas al panel derecho */}
          {somaTrendsPinned && (
            <SomaTrendsPinnedCard
              pacienteUUID={uuid}
              onUnpin={() => setSomaTrendsPinned(false)}
            />
          )}
           <TendenciaResultadosCard
            resultados={Array.isArray(resultados) ? (resultados as ResultadoExamen[]) : []}
            pacienteSexo={paciente.persona.sexo}
          />
           <PerfilLaboratorioCard
            resultados={Array.isArray(resultados) ? (resultados as ResultadoExamen[]) : []}
            pacienteSexo={paciente.persona.sexo}
          />
          <CitasCard    pacienteUUID={uuid} onAgendar={() => setCitaModalOpen(true)} />
          <EstudiosCard pacienteUUID={uuid} userUuid={userUuid} />
          <ExamenesCard pacienteUUID={uuid} pacienteSexo={paciente.persona.sexo} />
         
         
          <DocumentosCard
            pacienteUUID={uuid}
            onSubir={() => setDocUploaderOpen(true)}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      <CitaIlamyEventForm
        open={citaModalOpen}
        onClose={() => setCitaModalOpen(false)}
        selectedEvent={null}
        initialPacienteUUID={uuid}
      />
      <SomatometriaFormModal
        open={somaFormOpen}
        onOpenChange={(o) => {
          setSomaFormOpen(o)
          if (!o) setSomaEditar(null)
        }}
        pacienteUUID={uuid}
        usuarioRegistraUUID={userUuid}
        somatometria={somaEditar}
      />
      <SomatometriaHistorialDialog
        open={somaHistorialOpen}
        onOpenChange={setSomaHistorialOpen}
        pacienteUUID={uuid}
        onEditar={(s) => { setSomaEditar(s); setSomaFormOpen(true) }}
      />
      {canSeeDocs && (
        <Dialog open={docUploaderOpen} onOpenChange={setDocUploaderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir documento</DialogTitle>
            </DialogHeader>
            <DocumentoUploader
              entidad="paciente"
              pacienteUUID={uuid}
              tipoDoc="GENERAL"
              usuarioUUID={userUuid}
              accept="application/pdf,image/*,.doc,.docx"
              showDescripcion
            />
          </DialogContent>
        </Dialog>
      )}
      <PacienteFormModal
        open={pacienteFormOpen}
        onOpenChange={setPacienteFormOpen}
        paciente={paciente}
      />
    </div>
  )
}
