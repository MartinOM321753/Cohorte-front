/**
 * CapturaRapidaTab v3.1
 *
 * Three-phase rapid capture:
 * 1. SCANNING  — queue samples, preselect study types, set defaults
 * 2. CAPTURING — walk through each sample → study → parameter one at a time
 *    auto-focus, auto-advance (3 s), skip, go back; fecha & consumo per study
 * 3. SUMMARY   — review everything, save all in one shot
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, ArrowRight, Camera, Check, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp, Clock, Droplets, FlaskConical,
  Keyboard, ListChecks, Loader2, Pause, Pencil, Play, Save,
  ScanLine, SkipForward, Trash2, User, Beaker, X, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  TipoEstudioMuestra,
  ParametroEstudioMuestra,
  EstudioMuestraRequestDTO,
  ResultadoEstudioMuestraRequestDTO,
} from '@/types/api'
import type { MuestraEscaneadaDTO } from '../api/biobanco.api'
import { useAuthStore } from '@/stores/authStore'
import { useGetPersonasSeleccionables } from '@/features/usuarios/hooks/useGetUsuarios'
import { useBuscarMuestraPorEtiqueta } from '../hooks/useBiobanco'
import {
  useGetTiposEstudioMuestra,
  useCreateEstudiosMuestraBatch,
} from '../hooks/useEstudiosMuestra'
import { useLectorCodigos } from '../hooks/useLectorCodigos'
import { EscanearEtiquetaModal } from './EscanearEtiquetaModal'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMER_NUMERIC = 2000
const TIMER_TEXT = 2000
const TIMER_SELECT = 2000
const TIMER_BOOL = 2000

type Phase = 'scanning' | 'capturing' | 'summary'
type ValorParametro = string | number | boolean | undefined

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRango(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min} – ${max}`
  if (min != null) return `≥ ${min}`
  return `≤ ${max}`
}

function getRangoForSexo(p: ParametroEstudioMuestra, sexo?: string): string | null {
  if (p.tipo !== 'NUMERICO') return null
  if (sexo === 'F') return formatRango(p.valorMinMujeres, p.valorMaxMujeres)
  if (sexo === 'M') return formatRango(p.valorMinHombres, p.valorMaxHombres)
  const f = formatRango(p.valorMinMujeres, p.valorMaxMujeres)
  const m = formatRango(p.valorMinHombres, p.valorMaxHombres)
  if (f && m) return `M: ${f} · H: ${m}`
  return f || m
}

function checkOutOfRange(value: string, p: ParametroEstudioMuestra, sexo?: string): boolean {
  if (!value) return false
  const num = parseFloat(value)
  if (isNaN(num)) return false
  const min = sexo === 'F' ? p.valorMinMujeres : sexo === 'M' ? p.valorMinHombres
    : (p.valorMinMujeres != null && p.valorMinHombres != null)
      ? Math.min(p.valorMinMujeres, p.valorMinHombres) : (p.valorMinMujeres ?? p.valorMinHombres)
  const max = sexo === 'F' ? p.valorMaxMujeres : sexo === 'M' ? p.valorMaxHombres
    : (p.valorMaxMujeres != null && p.valorMaxHombres != null)
      ? Math.max(p.valorMaxMujeres, p.valorMaxHombres) : (p.valorMaxMujeres ?? p.valorMaxHombres)
  if (min != null && num < min) return true
  if (max != null && num > max) return true
  return false
}

function timerForType(tipo: string): number {
  if (tipo === 'NUMERICO') return TIMER_NUMERIC
  if (tipo === 'TEXTO') return TIMER_TEXT
  if (tipo === 'TEXTO_OPCIONES') return TIMER_SELECT
  if (tipo === 'USUARIO') return TIMER_SELECT
  return TIMER_BOOL
}

function vkey(mId: number, tId: number, pId: number) {
  return `${mId}_${tId}_${pId}`
}

function ekey(mId: number, tId: number) {
  return `${mId}_${tId}`
}

// ─── Inline styles for timer animation ────────────────────────────────────────

const timerKeyframes = `@keyframes timer-fill{from{width:0%}to{width:100%}}`

// ─── Main Component ──────────────────────────────────────────────────────────

export function CapturaRapidaTab() {
  const user = useAuthStore(s => s.user)
  const { data: tipos = [], isLoading: loadingTipos } = useGetTiposEstudioMuestra()
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()
  const buscarMuestra = useBuscarMuestraPorEtiqueta()
  const crearBatch = useCreateEstudiosMuestraBatch()

  const disabledDaysOfWeek = useMemo(() => {
    if (!horarioActivo) return undefined
    const days: number[] = []
    if (!horarioActivo.domingo) days.push(0)
    if (!horarioActivo.lunes) days.push(1)
    if (!horarioActivo.martes) days.push(2)
    if (!horarioActivo.miercoles) days.push(3)
    if (!horarioActivo.jueves) days.push(4)
    if (!horarioActivo.viernes) days.push(5)
    if (!horarioActivo.sabado) days.push(6)
    return days.length > 0 ? days : undefined
  }, [horarioActivo])

  // ── Phase ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('scanning')

  // ── Scanning state ────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<MuestraEscaneadaDTO[]>([])
  const [codigoManual, setCodigoManual] = useState('')
  const [escanerAbierto, setEscanerAbierto] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [fechaDefault, setFechaDefault] = useState(() => ultimoMomentoValido(horarioActivo))
  const [consumoDefault, setConsumoDefault] = useState('0.1')
  const [selectedTipoIds, setSelectedTipoIds] = useState<Set<number>>(new Set())
  const [showEstudiosFilter, setShowEstudiosFilter] = useState(true)
  const scanRef = useRef<HTMLInputElement>(null)

  // Auto-select all types when they load
  useEffect(() => {
    if (tipos.length > 0 && selectedTipoIds.size === 0) {
      setSelectedTipoIds(new Set(tipos.map(t => t.id)))
    }
  }, [tipos]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTipos = useMemo(
    () => tipos.filter(t => selectedTipoIds.has(t.id)),
    [tipos, selectedTipoIds],
  )

  // ── Capturing state ───────────────────────────────────────────────────────
  const [muestraIdx, setMuestraIdx] = useState(0)
  const [estudioIdx, setEstudioIdx] = useState(0)
  const [paramIdx, setParamIdx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionMsg, setTransitionMsg] = useState('')

  // ── Per-study fecha & consumo ─────────────────────────────────────────────
  const [fechaByEstudio, setFechaByEstudio] = useState<Record<string, string>>({})
  const [consumoByEstudio, setConsumoByEstudio] = useState<Record<string, string>>({})

  // ── Values (flat map) ─────────────────────────────────────────────────────
  const [values, setValues] = useState<Record<string, ValorParametro>>({})
  const [skippedStudies, setSkippedStudies] = useState<Set<string>>(new Set())

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timerActive, setTimerActive] = useState(false)
  const [timerDuration, setTimerDuration] = useState(TIMER_NUMERIC)
  const [timerKey, setTimerKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeInputRef = useRef<HTMLInputElement | null>(null)
  const activeCardRef = useRef<HTMLDivElement | null>(null)

  // ── Saving ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentMuestra = queue[muestraIdx]?.muestra
  const currentTipo = selectedTipos[estudioIdx]
  const currentParams = useMemo(() => currentTipo?.parametros ?? [], [currentTipo])
  const currentParam = currentParams[paramIdx]

  const currentValue = currentMuestra && currentTipo && currentParam
    ? values[vkey(currentMuestra.id, currentTipo.id, currentParam.id)]
    : undefined

  const currentEkey = currentMuestra && currentTipo
    ? ekey(currentMuestra.id, currentTipo.id)
    : ''
  const currentFecha = currentEkey ? (fechaByEstudio[currentEkey] ?? fechaDefault) : fechaDefault
  const currentConsumo = currentEkey ? (consumoByEstudio[currentEkey] ?? consumoDefault) : consumoDefault

  // ── Scanner ───────────────────────────────────────────────────────────────
  const handleCodigo = useCallback(async (codigo: string) => {
    setErrorBusqueda(null)
    try {
      const res = await buscarMuestra.mutateAsync(codigo)
      if (res.muestra.valor <= 0) {
        toast.warning(`${res.muestra.etiqueta} tiene volumen 0 — no se puede capturar`)
        setCodigoManual('')
        return
      }
      setQueue(prev => {
        if (prev.some(q => q.muestra.id === res.muestra.id)) {
          toast.info('Esta muestra ya esta en la cola')
          return prev
        }
        return [...prev, res]
      })
      setCodigoManual('')
      toast.success(`${res.muestra.etiqueta} agregada a la cola`)
    } catch (err: any) {
      setErrorBusqueda(err?.response?.data?.message ?? 'No se encontro la muestra')
    }
  }, [buscarMuestra])

  useLectorCodigos({ onLectura: handleCodigo, activo: phase === 'scanning' && !escanerAbierto })

  // ── Timer logic ───────────────────────────────────────────────────────────
  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setTimerActive(false)
  }

  const advanceRef = useRef<() => void>(() => {})

  function startTimer(duration: number) {
    clearTimer()
    setTimerDuration(duration)
    setTimerKey(k => k + 1)
    setTimerActive(true)
    timerRef.current = setTimeout(() => {
      setTimerActive(false)
      advanceRef.current()
    }, duration)
  }

  useEffect(() => () => clearTimer(), [])

  // ── Navigation ────────────────────────────────────────────────────────────
  function showTransition(msg: string, then: () => void) {
    clearTimer()
    setTransitioning(true)
    setTransitionMsg(msg)
    setTimeout(() => {
      then()
      setTransitioning(false)
      setTransitionMsg('')
    }, 800)
  }

  function advance() {
    clearTimer()
    if (paramIdx < currentParams.length - 1) {
      setParamIdx(paramIdx + 1)
    } else if (estudioIdx < selectedTipos.length - 1) {
      showTransition(`✓ ${currentTipo.nombre}`, () => {
        setEstudioIdx(estudioIdx + 1)
        setParamIdx(0)
      })
    } else if (muestraIdx < queue.length - 1) {
      showTransition(`✓ ${currentMuestra?.etiqueta ?? 'Muestra'} completa`, () => {
        setMuestraIdx(muestraIdx + 1)
        setEstudioIdx(0)
        setParamIdx(0)
      })
    } else {
      showTransition('Captura completa', () => setPhase('summary'))
    }
  }
  advanceRef.current = advance

  function goBack() {
    clearTimer()
    if (paramIdx > 0) {
      setParamIdx(paramIdx - 1)
    } else if (estudioIdx > 0) {
      const prevParams = selectedTipos[estudioIdx - 1].parametros ?? []
      setEstudioIdx(estudioIdx - 1)
      setParamIdx(Math.max(0, prevParams.length - 1))
    } else if (muestraIdx > 0) {
      setMuestraIdx(muestraIdx - 1)
      setEstudioIdx(selectedTipos.length - 1)
      const prevParams = selectedTipos[selectedTipos.length - 1].parametros ?? []
      setParamIdx(Math.max(0, prevParams.length - 1))
    }
  }

  function skipEstudio() {
    clearTimer()
    if (currentMuestra && currentTipo) {
      setSkippedStudies(prev => new Set(prev).add(`${currentMuestra.id}_${currentTipo.id}`))
    }
    if (estudioIdx < selectedTipos.length - 1) {
      showTransition(`⏩ ${currentTipo?.nombre} saltado`, () => {
        setEstudioIdx(estudioIdx + 1)
        setParamIdx(0)
      })
    } else if (muestraIdx < queue.length - 1) {
      showTransition(`✓ ${currentMuestra?.etiqueta ?? 'Muestra'} completa`, () => {
        setMuestraIdx(muestraIdx + 1)
        setEstudioIdx(0)
        setParamIdx(0)
      })
    } else {
      showTransition('Captura completa', () => setPhase('summary'))
    }
  }

  // ── Value change with timer ───────────────────────────────────────────────
  function handleValueChange(val: ValorParametro) {
    if (!currentMuestra || !currentTipo || !currentParam) return
    const key = vkey(currentMuestra.id, currentTipo.id, currentParam.id)
    setValues(prev => ({ ...prev, [key]: val }))

    const nonEmpty = val !== '' && val !== undefined
    if (nonEmpty) {
      startTimer(timerForType(currentParam.tipo))
    } else {
      clearTimer()
    }
  }

  // ── Per-study meta changes ────────────────────────────────────────────────
  function handleFechaEstudioChange(fecha: string) {
    if (!currentEkey) return
    setFechaByEstudio(prev => ({ ...prev, [currentEkey]: fecha }))
  }

  function handleConsumoEstudioChange(consumo: string) {
    if (!currentEkey) return
    setConsumoByEstudio(prev => ({ ...prev, [currentEkey]: consumo }))
  }

  // ── Auto-focus active input ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'capturing' || transitioning) return
    const t = setTimeout(() => {
      activeInputRef.current?.focus()
      if (activeInputRef.current instanceof HTMLInputElement) {
        activeInputRef.current.select()
      }
      activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => clearTimeout(t)
  }, [phase, muestraIdx, estudioIdx, paramIdx, transitioning])

  // ── Build payloads for summary save ───────────────────────────────────────
  function buildAllPayloads() {
    if (!user?.uuid) return []

    const result: { muestraId: number; etiqueta: string; estudios: EstudioMuestraRequestDTO[] }[] = []

    for (const qm of queue) {
      const m = qm.muestra
      const estudios: EstudioMuestraRequestDTO[] = []

      for (const tipo of selectedTipos) {
        if (skippedStudies.has(`${m.id}_${tipo.id}`)) continue
        const ek = ekey(m.id, tipo.id)
        const fecha = fechaByEstudio[ek] ?? fechaDefault
        const consumo = parseFloat(consumoByEstudio[ek] ?? consumoDefault)
        if (!fecha || isNaN(consumo) || consumo <= 0) continue

        const params = tipo.parametros ?? []
        const resultados: ResultadoEstudioMuestraRequestDTO[] = []

        for (const p of params) {
          const v = values[vkey(m.id, tipo.id, p.id)]
          if (v === undefined || v === '') continue
          const dto: ResultadoEstudioMuestraRequestDTO = { idParametro: p.id }
          if (p.tipo === 'NUMERICO') dto.valorNumerico = Number(v)
          else if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES' || p.tipo === 'USUARIO') dto.valorTexto = String(v)
          else dto.valorBooleano = Boolean(v)
          resultados.push(dto)
        }

        if (resultados.length === 0) continue

        estudios.push({
          idTipoEstudioMuestra: tipo.id,
          usuarioRealizaUUID: user.uuid,
          fechaEstudio: fecha,
          cantidadConsumida: consumo,
          unidadConsumida: m.unidad,
          resultados,
        })
      }

      if (estudios.length > 0) {
        result.push({ muestraId: m.id, etiqueta: m.etiqueta, estudios })
      }
    }
    return result
  }

  async function guardarTodo() {
    const allPayloads = buildAllPayloads()
    if (allPayloads.length === 0) {
      toast.error('No hay estudios para guardar')
      return
    }

    setSaving(true)
    setSaveProgress(0)
    let saved = 0
    let errors = 0

    for (let i = 0; i < allPayloads.length; i++) {
      const { muestraId, etiqueta, estudios } = allPayloads[i]
      try {
        await crearBatch.mutateAsync({ idMuestra: muestraId, estudios })
        saved += estudios.length
      } catch {
        errors++
        toast.error(`Error al guardar estudios de ${etiqueta}`)
      }
      setSaveProgress(Math.round(((i + 1) / allPayloads.length) * 100))
    }

    setSaving(false)
    if (errors === 0) {
      toast.success(`${saved} estudio(s) guardado(s) en ${allPayloads.length} muestra(s)`)
      resetAll()
    }
  }

  function resetAll() {
    setPhase('scanning')
    setQueue([])
    setValues({})
    setSkippedStudies(new Set())
    setFechaByEstudio({})
    setConsumoByEstudio({})
    setMuestraIdx(0)
    setEstudioIdx(0)
    setParamIdx(0)
    setFechaDefault(ultimoMomentoValido(horarioActivo))
    setTimeout(() => scanRef.current?.focus(), 200)
  }

  const hasProgress = Object.keys(values).length > 0 || skippedStudies.size > 0

  function startCapture() {
    if (queue.length === 0 || selectedTipos.length === 0) return
    if (!hasProgress) {
      setMuestraIdx(0)
      setEstudioIdx(0)
      setParamIdx(0)
    }
    setPhase('capturing')
  }

  function pauseCapture() {
    clearTimer()
    setPhase('scanning')
    toast.info('Captura en pausa — su avance se conserva')
  }

  function cancelCapture() {
    clearTimer()
    setValues({})
    setSkippedStudies(new Set())
    setFechaByEstudio({})
    setConsumoByEstudio({})
    setMuestraIdx(0)
    setEstudioIdx(0)
    setParamIdx(0)
    setPhase('scanning')
    toast.info('Captura cancelada')
  }

  // ── Study selection helpers ───────────────────────────────────────────────
  function toggleTipo(id: number) {
    setSelectedTipoIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllTipos() {
    setSelectedTipoIds(new Set(tipos.map(t => t.id)))
  }

  function deselectAllTipos() {
    setSelectedTipoIds(new Set())
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summaryData = useMemo(() => {
    const data: {
      muestra: MuestraEscaneadaDTO
      estudios: {
        tipo: TipoEstudioMuestra
        params: { param: ParametroEstudioMuestra; value: ValorParametro }[]
        skipped: boolean
        fecha: string
        consumo: string
      }[]
    }[] = []
    for (const qm of queue) {
      const m = qm.muestra
      const estudios: typeof data[0]['estudios'] = []
      for (const tipo of selectedTipos) {
        const sk = skippedStudies.has(`${m.id}_${tipo.id}`)
        const ek = ekey(m.id, tipo.id)
        const fecha = fechaByEstudio[ek] ?? fechaDefault
        const consumo = consumoByEstudio[ek] ?? consumoDefault
        const params: { param: ParametroEstudioMuestra; value: ValorParametro }[] = []
        for (const p of tipo.parametros ?? []) {
          const v = values[vkey(m.id, tipo.id, p.id)]
          if (v !== undefined && v !== '') params.push({ param: p, value: v })
        }
        if (params.length > 0 || sk) estudios.push({ tipo, params, skipped: sk, fecha, consumo })
      }
      if (estudios.length > 0) data.push({ muestra: qm, estudios })
    }
    return data
  }, [queue, selectedTipos, values, skippedStudies, fechaByEstudio, consumoByEstudio, fechaDefault, consumoDefault])

  const totalEstudios = useMemo(() =>
    summaryData.reduce((s, d) => s + d.estudios.filter(e => !e.skipped && e.params.length > 0).length, 0),
    [summaryData],
  )

  // ── Overall progress for capturing ────────────────────────────────────────
  const totalSteps = queue.length * selectedTipos.reduce((s, t) => s + (t.parametros?.length ?? 0), 0)
  const currentStep = useMemo(() => {
    let step = 0
    for (let mi = 0; mi < muestraIdx; mi++) {
      step += selectedTipos.reduce((s, t) => s + (t.parametros?.length ?? 0), 0)
    }
    for (let ei = 0; ei < estudioIdx; ei++) {
      step += (selectedTipos[ei]?.parametros?.length ?? 0)
    }
    step += paramIdx + 1
    return step
  }, [muestraIdx, estudioIdx, paramIdx, selectedTipos, queue.length])

  const progressPct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="@container flex flex-col h-full">
      <style>{timerKeyframes}</style>
      <div className="flex-1 overflow-auto">

        {/* ═══════════ PHASE: SCANNING ═══════════ */}
        {phase === 'scanning' && (
          <div className="mx-auto max-w-2xl space-y-4 p-4 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                <Beaker className="h-5 w-5 text-primary" />
                Captura rapida
              </h2>
              <p className="text-sm text-muted-foreground">
                Escanee muestras, seleccione estudios y configure valores por defecto
              </p>
            </div>

            {/* Scanner */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={scanRef}
                  value={codigoManual}
                  onChange={e => setCodigoManual(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = codigoManual.trim()
                      if (v) handleCodigo(v)
                    }
                  }}
                  placeholder="Escanee o escriba la etiqueta…"
                  className="h-11 pl-9 font-mono text-sm"
                  autoFocus
                  disabled={buscarMuestra.isPending}
                />
                {buscarMuestra.isPending && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setEscanerAbierto(true)}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5 shrink-0" />
              <span>Lector USB detectado automaticamente.</span>
            </div>

            {errorBusqueda && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorBusqueda}</AlertDescription>
              </Alert>
            )}

            {/* Queue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Cola de muestras ({queue.length})</p>
                {queue.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setQueue([])}>
                    <Trash2 className="h-3 w-3 mr-1" /> Vaciar
                  </Button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
                    <ScanLine className="h-6 w-6" />
                  </div>
                  <p className="text-sm">Escanee muestras para agregarlas a la cola</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {queue.map((qm, i) => (
                    <div key={qm.muestra.id}
                      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 animate-in slide-in-from-left duration-200"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                      <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-mono font-medium">{qm.muestra.etiqueta}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {qm.muestra.paciente.nombreCompleto}
                      </span>
                      <span className="text-xs font-medium">{qm.muestra.valor} {qm.muestra.unidad}</span>
                      <button
                        onClick={() => setQueue(prev => prev.filter((_, j) => j !== i))}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Study preselection + Config */}
            {queue.length > 0 && (
              <>
                <Separator />

                {/* Study preselection */}
                <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
                  <button
                    onClick={() => setShowEstudiosFilter(!showEstudiosFilter)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <ListChecks className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold flex-1">
                      Estudios a capturar
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedTipoIds.size} / {tipos.length}
                    </Badge>
                    {showEstudiosFilter
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {!showEstudiosFilter && (
                    <p className="text-xs text-muted-foreground">
                      Desmarque los estudios que no necesite capturar
                    </p>
                  )}

                  {showEstudiosFilter && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-xs text-muted-foreground">
                        Desmarque los estudios que no necesite capturar
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAllTipos}>
                          Todos
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={deselectAllTipos}>
                          Ninguno
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {tipos.map(tipo => (
                          <label
                            key={tipo.id}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm',
                              selectedTipoIds.has(tipo.id)
                                ? 'bg-primary/10 hover:bg-primary/15 font-medium'
                                : 'hover:bg-muted/50 opacity-50',
                            )}
                          >
                            <Checkbox
                              checked={selectedTipoIds.has(tipo.id)}
                              onCheckedChange={() => toggleTipo(tipo.id)}
                            />
                            <span className="truncate">{tipo.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Default fecha + consumo */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Valores por defecto (editables por estudio durante la captura)
                  </p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1 flex-1 min-w-[180px]">
                      <Label className="text-xs">Fecha y hora</Label>
                      <DateTimePicker
                        value={fechaDefault}
                        onChange={setFechaDefault}
                        placeholder="Fecha y hora"
                        timeStepMinutes={1}
                        maxDateTime={new Date()}
                        minHour={horarioActivo?.horaInicio ?? 8}
                        maxHour={(horarioActivo?.horaFin ?? 17) - 1}
                        disabledDaysOfWeek={disabledDaysOfWeek}
                      />
                    </div>
                    <div className="space-y-1 w-32">
                      <Label className="text-xs">Consumo ({queue[0]?.muestra.unidad ?? 'mL'})</Label>
                      <Input
                        type="number" step="any" min="0"
                        value={consumoDefault}
                        onChange={e => setConsumoDefault(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={startCapture}
                  className="w-full gap-2 h-12 text-base"
                  disabled={loadingTipos || selectedTipos.length === 0}
                >
                  <Play className="h-5 w-5" />
                  {hasProgress ? 'Continuar captura' : 'Comenzar captura'} ({queue.length} muestra{queue.length !== 1 ? 's' : ''} · {selectedTipos.length} estudio{selectedTipos.length !== 1 ? 's' : ''})
                </Button>
                {hasProgress && (
                  <Button
                    variant="ghost"
                    onClick={cancelCapture}
                    className="w-full gap-2 text-sm text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                    Descartar avance y empezar de cero
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════ PHASE: CAPTURING ═══════════ */}
        {phase === 'capturing' && (
          <div className="mx-auto max-w-xl p-4 space-y-4 animate-in fade-in duration-200">

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Muestra {muestraIdx + 1} de {queue.length}</span>
                <span>{progressPct}%</span>
                <span>Estudio {estudioIdx + 1} de {selectedTipos.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Current sample info */}
            {currentMuestra && (
              <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-mono font-semibold">{currentMuestra.etiqueta}</span>
                <Separator orientation="vertical" className="h-4" />
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {currentMuestra.paciente.nombreCompleto}
                </span>
              </div>
            )}

            {/* Transition overlay */}
            {transitioning && (
              <div className="flex items-center justify-center py-16 animate-in zoom-in duration-200">
                <div className="text-center space-y-3">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10">
                    {transitionMsg.startsWith('✓')
                      ? <CheckCircle2 className="h-8 w-8 text-green-500" />
                      : transitionMsg.startsWith('⏩')
                        ? <SkipForward className="h-8 w-8 text-muted-foreground" />
                        : <CheckCircle2 className="h-8 w-8 text-primary" />}
                  </div>
                  <p className="text-lg font-semibold">{transitionMsg}</p>
                </div>
              </div>
            )}

            {/* Parameter cards */}
            {!transitioning && currentTipo && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Study header */}
                <div className="text-center space-y-0.5">
                  <h3 className="text-lg font-semibold">{currentTipo.nombre}</h3>
                  {currentTipo.descripcion && (
                    <p className="text-xs text-muted-foreground">{currentTipo.descripcion}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Parametro {paramIdx + 1} de {currentParams.length}
                  </p>
                </div>

                {/* Per-study fecha & consumo — always visible */}
                <div className="rounded-lg border-2 border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Pencil className="h-3.5 w-3.5" />
                    Fecha y consumo de este estudio
                  </div>
                  <div className="grid grid-cols-[1fr,auto] gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Fecha y hora
                      </Label>
                      <DateTimePicker
                        value={currentFecha}
                        onChange={handleFechaEstudioChange}
                        placeholder="Fecha y hora"
                        timeStepMinutes={1}
                        maxDateTime={new Date()}
                        minHour={horarioActivo?.horaInicio ?? 8}
                        maxHour={(horarioActivo?.horaFin ?? 17) - 1}
                        disabledDaysOfWeek={disabledDaysOfWeek}
                      />
                    </div>
                    <div className="space-y-1 w-24">
                      <Label className="text-xs flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> {currentMuestra?.unidad ?? 'mL'}
                      </Label>
                      <Input
                        type="number" step="any" min="0"
                        value={currentConsumo}
                        onChange={e => handleConsumoEstudioChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* All params for current study */}
                <div className="space-y-2">
                  {currentParams.map((param, idx) => {
                    const isActive = idx === paramIdx
                    const val = currentMuestra
                      ? values[vkey(currentMuestra.id, currentTipo.id, param.id)]
                      : undefined
                    const filled = val !== undefined && val !== ''
                    const sexo = currentMuestra?.paciente?.sexo
                    const rango = getRangoForSexo(param, sexo)
                    const outOfRange = param.tipo === 'NUMERICO' && filled
                      ? checkOutOfRange(String(val), param, sexo)
                      : false

                    if (!isActive) {
                      // ── Collapsed param ──
                      return (
                        <button
                          key={param.id}
                          onClick={() => { clearTimer(); setParamIdx(idx) }}
                          className={cn(
                            'flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border text-left transition-all duration-300',
                            filled
                              ? 'bg-green-500/5 border-green-500/20'
                              : 'bg-muted/20 border-transparent',
                            idx < paramIdx ? 'opacity-70' : 'opacity-50',
                          )}
                        >
                          {filled
                            ? <CheckCircle2 className={cn('h-4 w-4 shrink-0', outOfRange ? 'text-amber-500' : 'text-green-500')} />
                            : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                          <span className="text-sm">{param.nombre}</span>
                          {filled && (
                            <span className={cn(
                              'ml-auto text-sm font-medium',
                              outOfRange && 'text-amber-600',
                            )}>
                              {String(val)} {param.unidad ?? ''}
                            </span>
                          )}
                          {!filled && idx > paramIdx && (
                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
                          )}
                        </button>
                      )
                    }

                    // ── Active param (hero card) ──
                    return (
                      <div
                        key={param.id}
                        ref={activeCardRef}
                        className="rounded-xl border-2 border-primary/50 bg-card p-5 shadow-lg transition-all duration-300 animate-in fade-in duration-200"
                      >
                        <div className="space-y-1 mb-4">
                          <Label className="text-base font-semibold">
                            {param.nombre}
                            {param.unidad && (
                              <span className="text-muted-foreground font-normal ml-1">({param.unidad})</span>
                            )}
                          </Label>
                          {rango && (
                            <p className={cn(
                              'text-sm',
                              outOfRange ? 'text-amber-600 font-medium' : 'text-muted-foreground',
                            )}>
                              Referencia: {rango}
                            </p>
                          )}
                        </div>

                        {/* NUMERICO */}
                        {param.tipo === 'NUMERICO' && (
                          <Input
                            ref={el => { activeInputRef.current = el }}
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={String(val ?? '')}
                            onChange={e => handleValueChange(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && val !== '' && val !== undefined) {
                                e.preventDefault(); clearTimer(); advance()
                              }
                            }}
                            placeholder="Ingrese valor…"
                            className={cn(
                              'h-14 text-2xl text-center font-mono',
                              outOfRange && 'border-amber-500 ring-1 ring-amber-500/30',
                            )}
                          />
                        )}

                        {/* TEXTO */}
                        {param.tipo === 'TEXTO' && (
                          <Input
                            ref={el => { activeInputRef.current = el }}
                            type="text"
                            maxLength={255}
                            value={String(val ?? '')}
                            onChange={e => handleValueChange(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && val !== '' && val !== undefined) {
                                e.preventDefault(); clearTimer(); advance()
                              }
                            }}
                            placeholder="Ingrese texto…"
                            className="h-14 text-xl text-center"
                          />
                        )}

                        {/* TEXTO_OPCIONES → clickable chips */}
                        {param.tipo === 'TEXTO_OPCIONES' && (
                          <div className="flex flex-wrap gap-2">
                            {(param.opciones ?? []).map(op => (
                              <button
                                key={op}
                                type="button"
                                onClick={() => handleValueChange(op)}
                                className={cn(
                                  'px-5 py-3 rounded-lg border text-sm font-medium transition-all duration-200',
                                  val === op
                                    ? 'border-primary bg-primary text-primary-foreground scale-105 shadow-md'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                                )}
                              >
                                {val === op && <Check className="inline h-4 w-4 mr-1.5" />}
                                {op}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* USUARIO → clickable chips filtered by search */}
                        {param.tipo === 'USUARIO' && (
                          <UsuarioChips value={val as string ?? ''} onSelect={handleValueChange} />
                        )}

                        {/* BOOLEANO → Sí / No buttons */}
                        {param.tipo === 'BOOLEANO' && (
                          <div className="flex gap-3">
                            {[
                              { label: 'Si', boolVal: true },
                              { label: 'No', boolVal: false },
                            ].map(({ label, boolVal }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleValueChange(boolVal)}
                                className={cn(
                                  'flex-1 py-4 rounded-lg border text-lg font-medium transition-all duration-200',
                                  val === boolVal
                                    ? 'border-primary bg-primary text-primary-foreground scale-105 shadow-md'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timer bar */}
                        {timerActive && (
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-4">
                            <div
                              key={timerKey}
                              className="h-full bg-primary rounded-full"
                              style={{ animation: `timer-fill ${timerDuration}ms linear forwards` }}
                            />
                          </div>
                        )}

                        {outOfRange && (
                          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Valor fuera de rango de referencia
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button variant="ghost" size="sm" onClick={skipEstudio} className="gap-1.5 flex-1 text-muted-foreground">
                    <SkipForward className="h-4 w-4" /> Saltar estudio
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { clearTimer(); advance() }}
                    className="gap-1.5"
                    disabled={currentValue === undefined || currentValue === ''}
                  >
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pauseCapture}
                    className="gap-1.5 flex-1"
                  >
                    <Pause className="h-4 w-4" /> Pausar y volver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelCapture}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" /> Cancelar captura
                  </Button>
                </div>

                <p className="text-[10px] text-center text-muted-foreground">
                  Enter = siguiente · Pausar conserva su avance para continuar despues
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ PHASE: SUMMARY ═══════════ */}
        {phase === 'summary' && (
          <div className="mx-auto max-w-2xl p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center space-y-1">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-500/10 mb-2">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Resumen de captura</h2>
              <p className="text-sm text-muted-foreground">
                {queue.length} muestra{queue.length !== 1 ? 's' : ''} · {totalEstudios} estudio{totalEstudios !== 1 ? 's' : ''} con datos
              </p>
            </div>

            {/* Per-sample breakdown */}
            <div className="space-y-3">
              {summaryData.map(({ muestra: qm, estudios }) => (
                <div key={qm.muestra.id} className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b">
                    <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-mono font-semibold">{qm.muestra.etiqueta}</span>
                    <span className="text-xs text-muted-foreground truncate">{qm.muestra.paciente.nombreCompleto}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {estudios.filter(e => !e.skipped && e.params.length > 0).length} est.
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {estudios.map(({ tipo, params, skipped, fecha, consumo }) => (
                      <div key={tipo.id} className={cn('px-4 py-2', skipped && 'opacity-50')}>
                        <div className="flex items-center gap-2">
                          {skipped
                            ? <SkipForward className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                          <span className="text-sm font-medium">{tipo.nombre}</span>
                          {skipped && <span className="text-xs text-muted-foreground ml-auto">Saltado</span>}
                          {!skipped && params.length > 0 && (
                            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-2">
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Droplets className="h-2.5 w-2.5" />
                                {consumo} {qm.muestra.unidad}
                              </span>
                            </span>
                          )}
                        </div>
                        {!skipped && params.length > 0 && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {params.map(({ param, value }) => (
                              <div key={param.id} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">{param.nombre}:</span>
                                <span className="font-medium">
                                  {param.tipo === 'BOOLEANO' ? (value ? 'Si' : 'No') : String(value)}
                                </span>
                                {param.unidad && <span className="text-muted-foreground">{param.unidad}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {summaryData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No se lleno ningun estudio.</p>
                </div>
              )}
            </div>

            {/* Save progress */}
            {saving && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando… {saveProgress}%
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${saveProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('capturing')
                  setMuestraIdx(0)
                  setEstudioIdx(0)
                  setParamIdx(0)
                }}
                className="gap-2"
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4" /> Volver a editar
              </Button>
              <Button
                onClick={guardarTodo}
                className="flex-1 gap-2 h-12 text-base"
                disabled={saving || totalEstudios === 0}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {saving ? 'Guardando…' : `Guardar todo (${totalEstudios} estudios)`}
              </Button>
            </div>

            <Button variant="ghost" onClick={resetAll} className="w-full text-xs text-muted-foreground" disabled={saving}>
              Descartar y empezar de nuevo
            </Button>
          </div>
        )}
      </div>

      {/* Camera modal */}
      <EscanearEtiquetaModal
        open={escanerAbierto}
        onOpenChange={setEscanerAbierto}
        onCodigo={codigo => {
          setEscanerAbierto(false)
          handleCodigo(codigo)
        }}
        errorBusqueda={errorBusqueda}
        buscando={buscarMuestra.isPending}
      />
    </div>
  )
}

function UsuarioChips({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const [buscar, setBuscar] = useState('')
  const { data: personas = [] } = useGetPersonasSeleccionables()
  const filtradas = useMemo(() => {
    if (!buscar.trim()) return personas
    const q = buscar.toLowerCase()
    return personas.filter(p => p.nombreCompleto.toLowerCase().includes(q))
  }, [personas, buscar])

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar usuario…"
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
        className="h-10"
        autoFocus
      />
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
        {filtradas.map(p => (
          <button
            key={p.nombreCompleto}
            type="button"
            onClick={() => onSelect(p.nombreCompleto)}
            className={cn(
              'px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200',
              value === p.nombreCompleto
                ? 'border-primary bg-primary text-primary-foreground scale-105 shadow-md'
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            {value === p.nombreCompleto && <Check className="inline h-4 w-4 mr-1.5" />}
            {p.nombreCompleto}
          </button>
        ))}
        {filtradas.length === 0 && <span className="text-sm text-muted-foreground py-2">Sin resultados</span>}
      </div>
    </div>
  )
}
