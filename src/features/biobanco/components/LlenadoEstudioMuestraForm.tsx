/**
 * LlenadoEstudioMuestraForm
 * Formulario para registrar un nuevo EstudioMuestra.
 */
import { useEffect, useState } from 'react'
import { AlertCircle, Check, ChevronsUpDown, Loader2, Save } from 'lucide-react'

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
import { UnidadSelect } from '@/components/forms/UnidadSelect'
import { DatePicker } from '@/components/ui/date-time-picker'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Devuelve la fecha de hoy como "YYYY-MM-DD" usando la zona horaria local. */
function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

  const [idTipo, setIdTipo] = useState<number | null>(null)
  const [openTipo, setOpenTipo] = useState(false)
  // Fecha inicial: hoy en zona horaria local (no UTC)
  const [fechaEstudio, setFechaEstudio] = useState(() => localDateString())
  const [observaciones, setObservaciones] = useState('')
  const [cantidadConsumida, setCantidadConsumida] = useState('')
  const [unidadConsumida, setUnidadConsumida] = useState('')
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
    if (!fechaEstudio) { setError('Selecciona una fecha'); return }
    if (!user?.uuid) { setError('Usuario no autenticado'); return }
    setError('')

    crearEstudio({
      idTipoEstudioMuestra: idTipo,
      usuarioRealizaUUID: user.uuid,
      fechaEstudio,
      observaciones: observaciones || undefined,
      cantidadConsumida: cantidadConsumida !== '' ? Number(cantidadConsumida) : null,
      unidadConsumida: cantidadConsumida !== '' ? unidadConsumida : null,
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

      {/* Fecha del estudio */}
      <div className="space-y-1">
        <Label className="text-xs">Fecha del estudio *</Label>
        <DatePicker
          value={fechaEstudio}
          onChange={setFechaEstudio}
          placeholder="Selecciona fecha del estudio"
          maxDate={new Date()}
        />
      </div>

      {/* Consumo de muestra */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Cantidad consumida</Label>
          <Input
            type="number"
            step="any"
            min="0"
            value={cantidadConsumida}
            onChange={e => setCantidadConsumida(e.target.value)}
            placeholder="0"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidad consumida</Label>
          <UnidadSelect
            value={unidadConsumida}
            onChange={setUnidadConsumida}
            placeholder="Selecciona…"
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
          className="text-sm resize-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={submit} disabled={creando} className="w-full gap-2">
        {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {creando ? 'Guardando…' : 'Guardar estudio'}
      </Button>
    </div>
  )
}
