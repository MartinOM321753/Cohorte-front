import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, Info,
  Loader2, Upload, X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import { cn } from '@/lib/utils'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'
import { useGetProtocolosActivos } from '../hooks/useBiobanco'
import {
  listarHojasProtocolo, previsualizarCargaProtocolo, confirmarCargaProtocolo,
} from '../api/biobanco.api'
import { descargarPlantillaProtocolo } from '../api/cargaMasivaMuestras.api'
import type { ResultadoCargaProtocolo } from '@/types/api'

function tamano(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Paso = 'archivo' | 'asignar' | 'resultado'

export function CargaMasivaMuestrasTab() {
  const { data: protocolos = [] } = useGetProtocolosActivos()
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [hojas, setHojas] = useState<string[]>([])
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState<'hojas' | 'previa' | 'confirmar' | null>(null)
  const [resultado, setResultado] = useState<ResultadoCargaProtocolo | null>(null)
  const [esConfirmado, setEsConfirmado] = useState(false)
  const [paso, setPaso] = useState<Paso>('archivo')
  const [arrastrando, setArrastrando] = useState(false)

  const [fechaPorOmision, setFechaPorOmision] = useState('')
  useEffect(() => {
    setFechaPorOmision((v) => v || ultimoMomentoValido(horarioActivo))
  }, [horarioActivo])

  const diasDeshabilitados = useMemo(() => {
    if (!horarioActivo) return undefined
    const dias: number[] = []
    if (!horarioActivo.domingo) dias.push(0)
    if (!horarioActivo.lunes) dias.push(1)
    if (!horarioActivo.martes) dias.push(2)
    if (!horarioActivo.miercoles) dias.push(3)
    if (!horarioActivo.jueves) dias.push(4)
    if (!horarioActivo.viernes) dias.push(5)
    if (!horarioActivo.sabado) dias.push(6)
    return dias.length > 0 ? dias : undefined
  }, [horarioActivo])

  // ── Archivo ─────────────────────────────────────────────────────────────

  function elegirArchivo(f: File | undefined) {
    if (!f) return
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.csv', '.xlsx'].includes(ext)) {
      toast.error('Formato no admitido. Suba un CSV o un Excel (.xlsx).')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede pasar de 10 MB.')
      return
    }
    setArchivo(f)
    setResultado(null)
    setEsConfirmado(false)
    setHojas([])
    setAsignaciones({})
    setPaso('archivo')
    detectarHojas(f)
  }

  const soltarArchivo = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegirArchivo(e.dataTransfer.files[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function detectarHojas(file: File) {
    setCargando('hojas')
    try {
      const nombres = await listarHojasProtocolo(file)
      setHojas(nombres)
      const init: Record<string, string> = {}
      for (const n of nombres) init[n] = ''
      setAsignaciones(init)
      setPaso('asignar')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al leer las hojas del archivo')
    } finally { setCargando(null) }
  }

  function reiniciar() {
    setArchivo(null)
    setResultado(null)
    setEsConfirmado(false)
    setHojas([])
    setAsignaciones({})
    setPaso('archivo')
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Opts y acciones ─────────────────────────────────────────────────────

  function buildOpts() {
    const opts: {
      idProtocolo?: number
      hojaProtocolo?: Record<string, number>
      fechaPorOmision?: string
    } = {}
    if (fechaPorOmision) opts.fechaPorOmision = fechaPorOmision

    if (hojas.length <= 1) {
      const primera = hojas[0] ?? ''
      const id = asignaciones[primera]
      if (id) opts.idProtocolo = Number(id)
    } else {
      const mapa: Record<string, number> = {}
      for (const [hoja, id] of Object.entries(asignaciones)) {
        if (id) mapa[hoja] = Number(id)
      }
      opts.hojaProtocolo = mapa
    }
    return opts
  }

  const todasAsignadas = Object.values(asignaciones).every(v => v !== '')
  const listoParaPrevisualizar = archivo != null && todasAsignadas && hojas.length > 0

  async function previsualizar() {
    if (!archivo) return
    setCargando('previa'); setEsConfirmado(false)
    try {
      const r = await previsualizarCargaProtocolo(archivo, buildOpts())
      setResultado(r)
      setPaso('resultado')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al previsualizar')
    } finally { setCargando(null) }
  }

  async function confirmar() {
    if (!archivo) return
    setCargando('confirmar')
    try {
      const r = await confirmarCargaProtocolo(archivo, buildOpts())
      if (r == null) {
        setEsConfirmado(true)
        toast.success(
          'La carga se está procesando en segundo plano. Recibirá un correo con el resumen al finalizar.',
          { duration: 8000 },
        )
      } else {
        setResultado(r); setEsConfirmado(true)
        setPaso('resultado')
        queryClient.invalidateQueries({ queryKey: ['muestras'] })
        toast.success(`Carga confirmada: ${r.alicuotas} alícuota(s) en ${r.lotes} lote(s)`)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al confirmar la carga')
    } finally { setCargando(null) }
  }

  const puedeConfirmar = resultado != null && resultado.errores.length === 0 && !esConfirmado

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Carga masiva por protocolo</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Suba un archivo con las alícuotas y asigne un protocolo a cada hoja.
            Los tubos primarios, lotes y transferencias se generan automáticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button" variant="outline" size="sm"
              className="h-8 gap-1.5 text-[12px]"
              onClick={() => descargarPlantillaProtocolo().catch(() => toast.error('No se pudo descargar la plantilla'))}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla
            </Button>
          </div>

          {/* ── Zona de archivo ─────────────────────────────────────────── */}
          {archivo ? (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{archivo.name}</p>
                <p className="text-[11px] text-muted-foreground">{tamano(archivo.size)}</p>
              </div>
              {cargando === 'hojas' && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
              <Button
                type="button" variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={reiniciar}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              role="button" tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltarArchivo}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
                arrastrando
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-muted/30',
              )}
            >
              <Upload className="h-8 w-8 opacity-50" />
              <div className="text-center text-[13px]">
                <span className="font-medium text-foreground">Haga clic</span> o arrastre el archivo aquí
              </div>
              <p className="text-[11px] opacity-60">CSV o Excel (.xlsx) — máximo 10 MB</p>
              <input
                ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
                onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
          )}

          {/* ── Fecha por omisión ───────────────────────────────────────── */}
          {paso !== 'archivo' && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium">Fecha para las filas que no la traigan</label>
              <DateTimePicker
                value={fechaPorOmision}
                onChange={setFechaPorOmision}
                placeholder="Seleccione la fecha y la hora"
                timeStepMinutes={1}
                minHour={horarioActivo?.horaInicio ?? 8}
                maxHour={horarioActivo?.horaFin != null ? horarioActivo.horaFin - 1 : 17}
                disabledDaysOfWeek={diasDeshabilitados}
              />
              <p className="text-[11px] text-muted-foreground">
                También se usa su <strong>hora</strong> para las filas que traen día pero no hora.
              </p>
            </div>
          )}

          {/* ── Asignación de protocolos ─────────────────────────────────── */}
          {paso !== 'archivo' && hojas.length > 0 && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {hojas.length === 1
                    ? 'Seleccione el protocolo para esta hoja'
                    : `${hojas.length} hojas detectadas — asigne un protocolo a cada una`}
                </span>
              </div>
              <div className="grid gap-2">
                {hojas.map((nombre) => (
                  <div key={nombre} className="flex items-center gap-3">
                    {hojas.length > 1 && (
                      <span className="min-w-[120px] text-sm font-medium truncate" title={nombre}>
                        {nombre}
                      </span>
                    )}
                    <Select
                      value={asignaciones[nombre] ?? ''}
                      onValueChange={(v) => {
                        setAsignaciones(prev => ({ ...prev, [nombre]: v }))
                        setResultado(null); setEsConfirmado(false)
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccione un protocolo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {protocolos.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nombre} · {p.nombreTipoOrigen}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Botones de acción ────────────────────────────────────────── */}
          {paso !== 'archivo' && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                disabled={!listoParaPrevisualizar || cargando != null}
                onClick={previsualizar}
              >
                {cargando === 'previa' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Previsualizar
              </Button>
              <Button
                disabled={!puedeConfirmar || cargando != null}
                onClick={confirmar}
              >
                {cargando === 'confirmar'
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Confirmar carga
              </Button>
              {resultado && (
                <Button variant="ghost" onClick={reiniciar}>
                  <X className="mr-2 h-4 w-4" />Empezar de nuevo
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Resultado ──────────────────────────────────────────────────────── */}
      {resultado && (
        <Card className={esConfirmado ? 'border-emerald-500/40' : resultado.errores.length === 0 ? 'border-emerald-500/40' : 'border-destructive/40'}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {esConfirmado
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Carga confirmada</>
                : resultado.errores.length === 0
                  ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Listo para confirmar</>
                  : <><AlertCircle className="h-4 w-4 text-destructive" /> Hay errores por corregir</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{resultado.procesamientos} procesamiento(s)</Badge>
              <Badge variant="outline">{resultado.padres} tubo(s) primario(s)</Badge>
              <Badge variant="outline">{resultado.lotes} lote(s)</Badge>
              <Badge variant="outline">{resultado.alicuotas} alícuota(s)</Badge>
              <Badge variant="outline">{resultado.ubicadas} con hueco</Badge>
              {resultado.transferencias > 0 && (
                <Badge variant="outline">{resultado.transferencias} transferencia(s)</Badge>
              )}
            </div>
            {resultado.avisos.length > 0 && (
              <div className="space-y-0.5 max-h-32 overflow-auto">
                {resultado.avisos.map((av, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" /> {av}
                  </p>
                ))}
              </div>
            )}
            {resultado.errores.length > 0 && (
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {resultado.errores.map((err, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {err}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
