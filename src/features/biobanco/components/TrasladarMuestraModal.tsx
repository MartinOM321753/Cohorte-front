import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { AlertCircle, ArrowRightFromLine, Check, ChevronDown, ChevronUp, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getInstitucionesActivas } from '../../instituciones/api/instituciones.api'
import { useIniciarPrestamo } from '../hooks/useBiobanco'
import { MuestraDetalleDTO } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

// ── Schema (solo institución destino) ─────────────────────────────────────────

const schema = z.object({
  idInstitucionDestino: z.string().min(1, 'Debe seleccionar una institución destino'),
})

type FormData = z.infer<typeof schema>

interface MuestraExtra {
  motivo: string
  observaciones: string
  fechaLimite: string
}

// ── Combobox reutilizable ─────────────────────────────────────────────────────

interface ComboboxProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  hasError?: boolean
}

function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  disabled = false,
  hasError = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-sm',
            !selected && 'text-muted-foreground',
            hasError && 'border-destructive',
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === o.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TrasladarMuestraModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestras: MuestraDetalleDTO[]
}

export function TrasladarMuestraModal({ open, onOpenChange, muestras }: TrasladarMuestraModalProps) {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)
  const prestarMutation = useIniciarPrestamo()
  const [submitting, setSubmitting] = useState(false)
  const [progreso, setProgreso] = useState(0)

  const isSingle = muestras.length === 1
  const isMultiple = muestras.length > 1

  // Modo compartido: mismo motivo/obs/fecha para todas (default ON en múltiples)
  const [modoCompartido, setModoCompartido] = useState(true)
  const [motivoCompartido, setMotivoCompartido] = useState('')
  const [obsCompartida, setObsCompartida] = useState('')
  const [fechaCompartida, setFechaCompartida] = useState('')

  // Modo individual: cada muestra con su propio motivo
  const [extras, setExtras] = useState<Record<number, MuestraExtra>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)

  function getExtra(id: number): MuestraExtra {
    return extras[id] ?? { motivo: '', observaciones: '', fechaLimite: '' }
  }

  function setField(id: number, field: keyof MuestraExtra, value: string) {
    setExtras(prev => ({
      ...prev,
      [id]: { ...getExtra(id), [field]: value },
    }))
  }

  const { data: todasInstituciones = [] } = useQuery({
    queryKey: ['instituciones', 'activas'],
    queryFn: getInstitucionesActivas,
    enabled: open,
    staleTime: 1000 * 60 * 5,
  })

  const idsInstitucionesMuestras = new Set(muestras.map(m => m.idInstitucion).filter(Boolean))
  const institucionsConBiobanco = todasInstituciones.filter(
    (i) => i.tieneBiobanco && i.activo
      && i.id !== myInstitucionId
      && !idsInstitucionesMuestras.has(i.id),
  )

  const institucionOptions = institucionsConBiobanco.map((i) => ({
    value: String(i.id),
    label: `${i.nombre}${i.ciudad ? ` — ${i.ciudad}` : ''}${i.estado ? `, ${i.estado}` : ''}`,
  }))

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idInstitucionDestino: '' },
  })

  const handleClose = () => {
    if (submitting) return
    reset()
    setExtras({})
    setExpandedId(null)
    setProgreso(0)
    setMotivoCompartido('')
    setObsCompartida('')
    setFechaCompartida('')
    setModoCompartido(true)
    onOpenChange(false)
  }

  const onSubmit = async (data: FormData) => {
    const idInstDest = parseInt(data.idInstitucionDestino)

    if (isSingle || modoCompartido) {
      // Una muestra o modo compartido: motivo/obs/fecha iguales para todas
      const motivo = isSingle ? getExtra(muestras[0].id).motivo.trim() : motivoCompartido.trim()
      const obs = isSingle ? getExtra(muestras[0].id).observaciones.trim() : obsCompartida.trim()
      const fecha = isSingle ? getExtra(muestras[0].id).fechaLimite : fechaCompartida

      if (!motivo) {
        toast.error('Falta el motivo del préstamo.')
        return
      }

      setSubmitting(true)
      try {
        await prestarMutation.mutateAsync({
          idsMuestras: muestras.map(m => m.id),
          idInstitucionDestino: idInstDest,
          uuidAutoriza: userUuid,
          motivo,
          observaciones: obs || undefined,
          fechaLimite: fecha ? `${fecha}T23:59:59` : undefined,
        })
        handleClose()
      } catch {
        toast.error('Error al iniciar el préstamo')
      }
      setSubmitting(false)
    } else {
      // Modo individual: agrupar por (motivo, observaciones, fechaLimite) para
      // minimizar llamadas al API y que cada grupo genere 1 solo correo.
      const sinMotivo = muestras.filter(m => !getExtra(m.id).motivo.trim())
      if (sinMotivo.length > 0) {
        toast.error(`Falta el motivo en ${sinMotivo.length} muestra(s). Haga clic en cada muestra para completarlo.`)
        if (sinMotivo[0]) setExpandedId(sinMotivo[0].id)
        return
      }

      // Agrupar por combinación única de (motivo, observaciones, fechaLimite)
      const grupos = new Map<string, { ids: number[]; motivo: string; obs: string; fecha: string }>()
      for (const m of muestras) {
        const ex = getExtra(m.id)
        const clave = `${ex.motivo.trim()}||${ex.observaciones.trim()}||${ex.fechaLimite}`
        const grupo = grupos.get(clave)
        if (grupo) {
          grupo.ids.push(m.id)
        } else {
          grupos.set(clave, {
            ids: [m.id],
            motivo: ex.motivo.trim(),
            obs: ex.observaciones.trim(),
            fecha: ex.fechaLimite,
          })
        }
      }

      setSubmitting(true)
      setProgreso(0)
      let ok = 0
      let failed = 0
      let muestrasProcesadas = 0

      for (const grupo of grupos.values()) {
        try {
          await prestarMutation.mutateAsync({
            idsMuestras: grupo.ids,
            idInstitucionDestino: idInstDest,
            uuidAutoriza: userUuid,
            motivo: grupo.motivo,
            observaciones: grupo.obs || undefined,
            fechaLimite: grupo.fecha ? `${grupo.fecha}T23:59:59` : undefined,
          })
          ok += grupo.ids.length
        } catch {
          failed += grupo.ids.length
        }
        muestrasProcesadas += grupo.ids.length
        setProgreso(muestrasProcesadas)
      }

      setSubmitting(false)
      if (failed === 0) {
        toast.success(`${ok} préstamo(s) iniciado(s) exitosamente`)
        handleClose()
      } else {
        toast.error(`${ok} préstamo(s) iniciado(s), ${failed} con error`)
      }
    }
  }

  if (muestras.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn('max-h-[90vh] flex flex-col', isSingle ? 'sm:max-w-[500px]' : 'sm:max-w-[600px]')}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightFromLine className="h-5 w-5" />
            {isSingle ? 'Prestar Muestra' : `Prestar ${muestras.length} Muestras`}
          </DialogTitle>
          <DialogDescription>
            {isSingle ? (
              <>
                Muestra: <span className="font-mono font-semibold">{muestras[0].etiqueta}</span>
                {' — '}Paciente: {muestras[0].paciente?.nombreCompleto}
              </>
            ) : (
              <>Se generará un préstamo individual por cada muestra seleccionada.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">

          {/* Institución destino — compartida */}
          <div className="space-y-2">
            <Label>
              Institución destino <span className="text-destructive">*</span>
            </Label>
            {institucionsConBiobanco.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-input px-3 py-2">
                No hay instituciones con biobanco activas registradas
              </p>
            ) : (
              <Controller
                name="idInstitucionDestino"
                control={control}
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={institucionOptions}
                    placeholder="Seleccione la institución destino"
                    searchPlaceholder="Buscar por nombre, ciudad o estado..."
                    emptyText="Institución no encontrada"
                    hasError={!!errors.idInstitucionDestino}
                    disabled={submitting}
                  />
                )}
              />
            )}
            {errors.idInstitucionDestino && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                {errors.idInstitucionDestino.message}
              </p>
            )}
          </div>

          {/* Toggle modo compartido / individual (solo en múltiples) */}
          {isMultiple && (
            <div className="flex items-center gap-3 rounded-md border border-dashed px-3 py-2">
              <Switch
                checked={modoCompartido}
                onCheckedChange={setModoCompartido}
                disabled={submitting}
              />
              <div className="min-w-0 flex-1">
                <Label className="cursor-pointer text-xs font-medium">
                  Mismo motivo para todas las muestras
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {modoCompartido
                    ? 'Todas las muestras compartirán el mismo motivo, observaciones y fecha límite.'
                    : 'Cada muestra tendrá su propio motivo, observaciones y fecha límite.'}
                </p>
              </div>
            </div>
          )}

          {/* Campos compartidos (modo compartido en múltiples) */}
          {isMultiple && modoCompartido && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Motivo del préstamo <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={motivoCompartido}
                  onChange={e => setMotivoCompartido(e.target.value)}
                  placeholder="Ej: Análisis complementario, estudio externo..."
                  rows={2}
                  maxLength={300}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observaciones</Label>
                <Textarea
                  value={obsCompartida}
                  onChange={e => setObsCompartida(e.target.value)}
                  placeholder="Notas adicionales (opcional)"
                  rows={2}
                  maxLength={500}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha límite de devolución</Label>
                <Input
                  type="date"
                  value={fechaCompartida}
                  onChange={e => setFechaCompartida(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                  disabled={submitting}
                />
                <p className="text-[11px] text-muted-foreground">
                  Si se deja vacío, el retorno queda como indefinido.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <p className="w-full text-[11px] text-muted-foreground">Muestras incluidas:</p>
                {muestras.map(m => (
                  <Badge key={m.id} variant="outline" className="text-[10px] font-mono">
                    {m.etiqueta}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Detalle individual por muestra (1 muestra o modo individual) */}
          {(isSingle || !modoCompartido) && (
            <div className="space-y-2">
              {isMultiple && (
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Detalle por muestra
                </Label>
              )}

              <div className="space-y-2">
                {muestras.map((m) => {
                  const ex = getExtra(m.id)
                  const isOpen = isSingle || expandedId === m.id

                  return (
                    <div key={m.id} className="border rounded-md overflow-hidden">
                      {/* Header — clic para expandir (solo en múltiple) */}
                      {isMultiple && (
                        <button
                          type="button"
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
                            !ex.motivo.trim() && 'bg-amber-50/50',
                          )}
                          onClick={() => setExpandedId(isOpen ? null : m.id)}
                          disabled={submitting}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-medium truncate">{m.etiqueta}</span>
                            {m.paciente?.nombreCompleto && (
                              <span className="text-muted-foreground truncate text-xs">
                                — {m.paciente.nombreCompleto}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ex.motivo.trim() ? (
                              <Badge variant="secondary" className="text-[10px]">Listo</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Pendiente</Badge>
                            )}
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </div>
                        </button>
                      )}

                      {/* Campos — siempre visibles para una muestra, colapsables para múltiples */}
                      {isOpen && (
                        <div className={cn('p-3 space-y-3', isMultiple && 'border-t')}>
                          <div className="space-y-1.5">
                            <Label className="text-xs">
                              Motivo del préstamo <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              value={ex.motivo}
                              onChange={e => setField(m.id, 'motivo', e.target.value)}
                              placeholder="Ej: Análisis complementario, estudio externo..."
                              rows={2}
                              maxLength={300}
                              disabled={submitting}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Observaciones</Label>
                            <Textarea
                              value={ex.observaciones}
                              onChange={e => setField(m.id, 'observaciones', e.target.value)}
                              placeholder="Notas adicionales (opcional)"
                              rows={2}
                              maxLength={500}
                              disabled={submitting}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Fecha límite de devolución</Label>
                            <Input
                              type="date"
                              value={ex.fechaLimite}
                              onChange={e => setField(m.id, 'fechaLimite', e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full"
                              disabled={submitting}
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Si se deja vacío, el retorno queda como indefinido.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            {isSingle
              ? 'La posición de la muestra quedará libre al iniciar el préstamo. La institución destino podrá asignarle una posición en su propio biobanco.'
              : 'Las posiciones de las muestras quedarán libres al iniciar los préstamos. La institución destino podrá asignarles posiciones en su propio biobanco.'}
          </div>

          {submitting && isMultiple && !modoCompartido && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Procesando préstamos…</span>
                <span>{progreso} / {muestras.length}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(progreso / muestras.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || institucionsConBiobanco.length === 0}>
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Registrando…</>
                : isSingle ? 'Iniciar préstamo' : `Iniciar ${muestras.length} préstamos`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
