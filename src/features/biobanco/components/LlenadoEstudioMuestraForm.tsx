/**
 * LlenadoEstudioMuestraForm
 * Formulario para registrar un nuevo EstudioMuestra.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, ChevronsUpDown, Info, Loader2, Save } from 'lucide-react'

import type {
  MuestraDetalleDTO,
  TipoEstudioMuestra,
  ParametroEstudioMuestra,
  ResultadoEstudioMuestraRequestDTO,
} from '@/types/api'
import {
  useGetTiposEstudioMuestra,
  useCreateEstudioMuestra,
} from '../hooks/useEstudiosMuestra'
import { useAuthStore } from '@/stores/authStore'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ValorParametro = string | number | boolean | undefined

// ─── ParametroField ───────────────────────────────────────────────────────────

function ParametroField({
  parametro,
  valor,
  onChange,
}: {
  parametro: ParametroEstudioMuestra
  valor: ValorParametro
  onChange: (val: ValorParametro) => void
}) {
  const label = parametro.unidad
    ? `${parametro.nombre} (${parametro.unidad})`
    : parametro.nombre

  const rangeHint = (() => {
    if (parametro.tipo !== 'NUMERICO') return null
    const { valorMinimo: min, valorMaximo: max, unidad } = parametro
    if (min == null && max == null) return null
    const u = unidad ? ` ${unidad}` : ''
    if (min != null && max != null) return `Ref: ${min} – ${max}${u}`
    if (min != null) return `Ref: ≥ ${min}${u}`
    return `Ref: ≤ ${max}${u}`
  })()

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {rangeHint && <p className="text-xs text-muted-foreground">{rangeHint}</p>}

      {parametro.tipo === 'NUMERICO' && (
        <Input
          type="number"
          step="any"
          placeholder="0"
          value={valor as string ?? ''}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}

      {parametro.tipo === 'TEXTO' && (
        <Input
          type="text"
          placeholder="Ingrese valor…"
          maxLength={255}
          value={valor as string ?? ''}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}

      {parametro.tipo === 'TEXTO_OPCIONES' && (
        <Select value={String(valor ?? '')} onValueChange={v => onChange(v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Seleccione una opción…" />
          </SelectTrigger>
          <SelectContent>
            {(parametro.opciones ?? []).map(op => (
              <SelectItem key={op} value={op}>{op}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {parametro.tipo === 'BOOLEANO' && (
        <div className="flex items-center gap-2 h-9">
          <Switch checked={Boolean(valor)} onCheckedChange={v => onChange(v)} />
          <span className="text-sm text-muted-foreground">{Boolean(valor) ? 'Sí' : 'No'}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface Props {
  muestra: MuestraDetalleDTO
  onSuccess: () => void
}

export function LlenadoEstudioMuestraForm({ muestra, onSuccess }: Props) {
  const { data: tipos = [], isLoading: loadingTipos } = useGetTiposEstudioMuestra()
  const { mutate: crearEstudio, isPending: creando } = useCreateEstudioMuestra(muestra.id)
  const user = useAuthStore(s => s.user)
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

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

  const [idTipo, setIdTipo] = useState<number | null>(null)
  const [openTipo, setOpenTipo] = useState(false)
  // El reloj a secas no vale: fuera del horario activo esa hora no figura en el
  // selector y el error solo aparece al enviar. Ver ultimoMomentoValido().
  const [fechaEstudio, setFechaEstudio] = useState(() => ultimoMomentoValido(horarioActivo))
  const [observaciones, setObservaciones] = useState('')
  const [cantidadConsumida, setCantidadConsumida] = useState('')
  const unidadConsumida = muestra.unidad ?? ''
  const [valores, setValores] = useState<Record<number, ValorParametro>>({})
  const [error, setError] = useState('')

  // Tipo seleccionado y sus parámetros
  const tipoSeleccionado: TipoEstudioMuestra | undefined = tipos.find(t => t.id === idTipo)
  const parametros: ParametroEstudioMuestra[] = tipoSeleccionado?.parametros ?? []

  // Inicializar valores cuando cambia el tipo
  useEffect(() => {
    if (parametros.length === 0) { setValores({}); return }
    const init: Record<number, ValorParametro> = {}
    for (const p of parametros) {
      if (p.tipo === 'NUMERICO') init[p.id] = ''
      else if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') init[p.id] = ''
      else init[p.id] = false
    }
    setValores(init)
  }, [idTipo])

  function buildPayload(): ResultadoEstudioMuestraRequestDTO[] {
    return parametros
      .filter(p => {
        const v = valores[p.id]
        if (p.tipo === 'NUMERICO') return v !== '' && v !== undefined && v !== null
        if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') return typeof v === 'string' && v.trim() !== ''
        return true // BOOLEANO siempre
      })
      .map(p => {
        const v = valores[p.id]
        const dto: ResultadoEstudioMuestraRequestDTO = { idParametro: p.id }
        if (p.tipo === 'NUMERICO') dto.valorNumerico = Number(v)
        else if (p.tipo === 'TEXTO' || p.tipo === 'TEXTO_OPCIONES') dto.valorTexto = String(v)
        else dto.valorBooleano = Boolean(v)
        return dto
      })
  }

  function submit() {
    if (!idTipo) { setError('Selecciona un tipo de estudio'); return }
    if (!fechaEstudio) { setError('Selecciona fecha y hora'); return }
    if (!user?.uuid) { setError('Usuario no autenticado'); return }
    if (cantidadConsumida === '' || Number(cantidadConsumida) <= 0) {
      setError('La cantidad consumida es requerida y debe ser mayor a 0'); return
    }
    const consumo = Number(cantidadConsumida)
    if (muestra.valor != null && consumo > muestra.valor) {
      setError(`La cantidad consumida (${consumo}) excede el valor actual de la muestra (${muestra.valor} ${muestra.unidad})`); return
    }
    setError('')

    crearEstudio({
      idTipoEstudioMuestra: idTipo,
      usuarioRealizaUUID: user.uuid,
      fechaEstudio,
      observaciones: observaciones || undefined,
      cantidadConsumida: consumo,
      unidadConsumida,
      resultados: buildPayload(),
    }, { onSuccess })
  }

  if (loadingTipos) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
        <Spinner className="h-4 w-4" /> Cargando tipos de estudio…
      </div>
    )
  }

  if (tipos.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          No hay tipos de estudio de muestra configurados. Un administrador debe crearlos en la pestaña "Est. Muestras".
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/10">
      <p className="text-sm font-medium">Registrar nuevo estudio</p>

      {/* Tipo de estudio — combobox con buscador */}
      <div className="space-y-1">
        <Label className="text-xs">Tipo de estudio *</Label>
        <Popover open={openTipo} onOpenChange={setOpenTipo}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={openTipo}
              className={cn(
                'w-full h-9 justify-between font-normal text-sm',
                !idTipo && 'text-muted-foreground'
              )}
            >
              <span className="truncate">
                {idTipo ? tipos.find(t => t.id === idTipo)?.nombre : 'Seleccione tipo de estudio…'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar tipo de estudio…" className="h-9" />
              <CommandList>
                <CommandEmpty>No se encontraron tipos.</CommandEmpty>
                <CommandGroup>
                  {tipos.map(t => (
                    <CommandItem
                      key={t.id}
                      value={t.nombre}
                      onSelect={() => { setIdTipo(t.id); setOpenTipo(false) }}
                      className="text-sm"
                    >
                      <Check className={cn('mr-2 h-4 w-4 shrink-0', idTipo === t.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{t.nombre}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Descripción del tipo */}
      {tipoSeleccionado?.descripcion && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
          <span>{tipoSeleccionado.descripcion}</span>
        </div>
      )}

      {/* Fecha y hora del estudio */}
      <div className="space-y-1">
        <Label className="text-xs">Fecha y hora del estudio *</Label>
        <DateTimePicker
          value={fechaEstudio}
          onChange={setFechaEstudio}
          placeholder="Selecciona fecha y hora"
          timeStepMinutes={1}
          maxDateTime={new Date()}
          minHour={horarioActivo?.horaInicio ?? 8}
          maxHour={(horarioActivo?.horaFin ?? 17) - 1}
          disabledDaysOfWeek={disabledDaysOfWeek}
        />
      </div>

      {/* Consumo de muestra */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Cantidad consumida *</Label>
          <Input
            type="number"
            step="any"
            min="0"
            max={muestra.valor ?? undefined}
            value={cantidadConsumida}
            onChange={e => setCantidadConsumida(e.target.value)}
            placeholder="0"
            className="h-9 text-sm"
          />
          {muestra.valor != null && (
            <p className="text-xs text-muted-foreground">Disponible: {muestra.valor} {muestra.unidad}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidad</Label>
          <Input
            type="text"
            value={unidadConsumida}
            disabled
            className="h-9 text-sm bg-muted/50"
          />
        </div>
      </div>

      {/* Parámetros del tipo seleccionado */}
      {idTipo && parametros.length > 0 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parametros.map(p => (
              <ParametroField
                key={p.id}
                parametro={p}
                valor={valores[p.id]}
                onChange={val => setValores(prev => ({ ...prev, [p.id]: val }))}
              />
            ))}
          </div>
        </>
      )}

      {idTipo && parametros.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">Este tipo de estudio no tiene parámetros configurados.</AlertDescription>
        </Alert>
      )}

      {/* Observaciones */}
      <div className="space-y-1">
        <Label className="text-xs">Observaciones</Label>
        <Textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Notas adicionales sobre el estudio…"
          rows={2}
          maxLength={500}
          className="text-sm resize-none"
        />
        {observaciones.length > 400 && (
          <p className="text-[11px] text-muted-foreground text-right">
            {observaciones.length}/500
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={submit} disabled={creando} className="w-full gap-2">
        {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {creando ? 'Guardando…' : 'Guardar estudio'}
      </Button>
    </div>
  )
}
