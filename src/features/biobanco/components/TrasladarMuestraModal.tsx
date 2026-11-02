import { useEffect, useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  ArrowRightFromLine, Building2, Check, ChevronDown, ChevronUp,
  ChevronsUpDown, HandHelping, Loader2, Plus, User, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getInstitucionesActivas } from '../../instituciones/api/instituciones.api'
import { useIniciarPrestamo } from '../hooks/useBiobanco'
import { useGetDestinatariosEntrega, useEntregarMuestras } from '../hooks/useEntregas'
import { MuestraDetalleDTO } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { ColaboradorFormModal } from './ColaboradorFormModal'

type Modo = 'TRANSFERENCIA' | 'PRESTAMO'

interface MuestraExtra {
  motivo: string
  observaciones: string
  fechaLimite: string
}

// ── Combobox genérico ─────────────────────────────────────────────────────────

interface ComboboxProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
}

function Combobox({
  value, onChange, options,
  placeholder = 'Selecciona…', searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados', disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled}
          className={cn('w-full justify-between font-normal h-9 text-sm', !selected && 'text-muted-foreground')}>
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
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false) }}>
                  <Check className={cn('mr-2 h-4 w-4', value === o.value ? 'opacity-100' : 'opacity-0')} />
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

// ── Modal unificado: transferir a institución o prestar a persona ─────────────

interface TrasladarMuestraModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestras: MuestraDetalleDTO[]
  /** Pestaña inicial. Por omisión, transferencia. */
  defaultModo?: Modo
}

export function TrasladarMuestraModal({ open, onOpenChange, muestras, defaultModo = 'TRANSFERENCIA' }: TrasladarMuestraModalProps) {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)
  const puedeCrearColab = useAuthStore((s) => s.hasPermiso('COLABORADORES_CREAR'))
  const prestarMutation = useIniciarPrestamo()
  const entregarMutation = useEntregarMuestras()
  const [submitting, setSubmitting] = useState(false)
  const [progreso, setProgreso] = useState(0)

  const isSingle = muestras.length === 1
  const isMultiple = muestras.length > 1

  const [modo, setModo] = useState<Modo>(defaultModo)
  useEffect(() => { if (open) setModo(defaultModo) }, [open, defaultModo])

  // Destino transferencia
  const [idInstitucionDestino, setIdInstitucionDestino] = useState('')
  // Destino préstamo ("TIPO:id")
  const [destKey, setDestKey] = useState('')
  const [destOpen, setDestOpen] = useState(false)
  const [nuevoColabOpen, setNuevoColabOpen] = useState(false)

  // Motivo/obs/fecha
  const [modoCompartido, setModoCompartido] = useState(true)
  const [motivoCompartido, setMotivoCompartido] = useState('')
  const [obsCompartida, setObsCompartida] = useState('')
  const [fechaCompartida, setFechaCompartida] = useState('')
  const [extras, setExtras] = useState<Record<number, MuestraExtra>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)

  function getExtra(id: number): MuestraExtra {
    return extras[id] ?? { motivo: '', observaciones: '', fechaLimite: '' }
  }
  function setField(id: number, field: keyof MuestraExtra, value: string) {
    setExtras((prev) => ({ ...prev, [id]: { ...getExtra(id), [field]: value } }))
  }

  const { data: todasInstituciones = [] } = useQuery({
    queryKey: ['instituciones', 'activas'],
    queryFn: getInstitucionesActivas,
    enabled: open && modo === 'TRANSFERENCIA',
    staleTime: 1000 * 60 * 5,
  })
  const { data: destinatarios = [] } = useGetDestinatariosEntrega({ enabled: open && modo === 'PRESTAMO' })

  const idsInstitucionesMuestras = new Set(muestras.map((m) => m.idInstitucion).filter(Boolean))
  const institucionOptions = todasInstituciones
    .filter((i) => i.tieneBiobanco && i.activo && i.id !== myInstitucionId && !idsInstitucionesMuestras.has(i.id))
    .map((i) => ({ value: String(i.id), label: `${i.nombre}${i.ciudad ? ` — ${i.ciudad}` : ''}${i.estado ? `, ${i.estado}` : ''}` }))

  const destOpciones = destinatarios.map((d) => ({
    key: `${d.tipo}:${d.id}`, tipo: d.tipo, label: d.nombreCompleto, detalle: d.detalle,
  }))
  const destSeleccionado = destOpciones.find((o) => o.key === destKey)

  const handleClose = () => {
    if (submitting) return
    setIdInstitucionDestino(''); setDestKey('')
    setExtras({}); setExpandedId(null); setProgreso(0)
    setMotivoCompartido(''); setObsCompartida(''); setFechaCompartida(''); setModoCompartido(true)
    onOpenChange(false)
  }

  /** Envía un grupo de muestras con un mismo motivo, según el modo activo. */
  async function enviarGrupo(ids: number[], motivo: string, obs: string, fecha: string) {
    const fechaLimite = fecha ? `${fecha}T23:59:59` : undefined
    if (modo === 'TRANSFERENCIA') {
      await prestarMutation.mutateAsync({
        idsMuestras: ids,
        idInstitucionDestino: parseInt(idInstitucionDestino),
        uuidAutoriza: userUuid,
        motivo, observaciones: obs || undefined, fechaLimite,
      })
    } else {
      const [tipo, idStr] = destKey.split(':')
      const id = parseInt(idStr)
      await entregarMutation.mutateAsync({
        idsMuestras: ids,
        idColaborador: tipo === 'COLABORADOR' ? id : undefined,
        idUsuario: tipo === 'USUARIO' ? id : undefined,
        uuidEntrega: userUuid,
        motivo, observaciones: obs || undefined, fechaLimite,
      })
    }
  }

  const onSubmit = async () => {
    if (modo === 'TRANSFERENCIA' && !idInstitucionDestino) {
      toast.error('Seleccione la institución destino.'); return
    }
    if (modo === 'PRESTAMO' && !destSeleccionado) {
      toast.error('Seleccione un destinatario.'); return
    }

    if (isSingle || modoCompartido) {
      const motivo = isSingle ? getExtra(muestras[0].id).motivo.trim() : motivoCompartido.trim()
      const obs = isSingle ? getExtra(muestras[0].id).observaciones.trim() : obsCompartida.trim()
      const fecha = isSingle ? getExtra(muestras[0].id).fechaLimite : fechaCompartida
      if (!motivo) { toast.error('Falta el motivo.'); return }
      setSubmitting(true)
      try {
        await enviarGrupo(muestras.map((m) => m.id), motivo, obs, fecha)
        handleClose()
      } catch { toast.error(modo === 'TRANSFERENCIA' ? 'Error al iniciar la transferencia' : 'Error al registrar la entrega') }
      setSubmitting(false)
      return
    }

    // Modo individual: agrupar por (motivo, obs, fecha) para minimizar llamadas.
    const sinMotivo = muestras.filter((m) => !getExtra(m.id).motivo.trim())
    if (sinMotivo.length > 0) {
      toast.error(`Falta el motivo en ${sinMotivo.length} muestra(s). Haga clic en cada una para completarlo.`)
      if (sinMotivo[0]) setExpandedId(sinMotivo[0].id)
      return
    }
    const grupos = new Map<string, { ids: number[]; motivo: string; obs: string; fecha: string }>()
    for (const m of muestras) {
      const ex = getExtra(m.id)
      const clave = `${ex.motivo.trim()}||${ex.observaciones.trim()}||${ex.fechaLimite}`
      const g = grupos.get(clave)
      if (g) g.ids.push(m.id)
      else grupos.set(clave, { ids: [m.id], motivo: ex.motivo.trim(), obs: ex.observaciones.trim(), fecha: ex.fechaLimite })
    }
    setSubmitting(true); setProgreso(0)
    let ok = 0, failed = 0, procesadas = 0
    for (const g of grupos.values()) {
      try { await enviarGrupo(g.ids, g.motivo, g.obs, g.fecha); ok += g.ids.length }
      catch { failed += g.ids.length }
      procesadas += g.ids.length; setProgreso(procesadas)
    }
    setSubmitting(false)
    if (failed === 0) { toast.success(`${ok} muestra(s) procesada(s)`); handleClose() }
    else toast.error(`${ok} ok, ${failed} con error`)
  }

  if (muestras.length === 0) return null

  const esTransfer = modo === 'TRANSFERENCIA'
  const verbo = esTransfer ? 'Transferir' : 'Prestar'

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={cn('max-h-[90vh] flex flex-col', isSingle ? 'sm:max-w-[520px]' : 'sm:max-w-[620px]')}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {esTransfer ? <ArrowRightFromLine className="h-5 w-5" /> : <HandHelping className="h-5 w-5" />}
              {isSingle ? `${verbo} muestra` : `${verbo} ${muestras.length} muestras`}
            </DialogTitle>
            <DialogDescription>
              {isSingle ? (
                <>Muestra: <span className="font-mono font-semibold">{muestras[0].etiqueta}</span></>
              ) : esTransfer ? (
                <>Se generará una transferencia por muestra.</>
              ) : (
                <>Se registrará una entrega por muestra, al mismo destinatario.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Pestañas de modo */}
            <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="TRANSFERENCIA" disabled={submitting}>
                  <Building2 className="h-3.5 w-3.5 mr-1.5" /> Transferencia
                </TabsTrigger>
                <TabsTrigger value="PRESTAMO" disabled={submitting}>
                  <HandHelping className="h-3.5 w-3.5 mr-1.5" /> Préstamo
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              {esTransfer
                ? 'Transferencia a otra institución con biobanco (cadena de custodia entre sedes).'
                : 'Préstamo a una persona física: un colaborador o un usuario del sistema.'}
            </p>

            {/* Destino */}
            {esTransfer ? (
              <div className="space-y-2">
                <Label>Institución destino <span className="text-destructive">*</span></Label>
                {institucionOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-md border border-input px-3 py-2">
                    No hay instituciones con biobanco disponibles.
                  </p>
                ) : (
                  <Combobox value={idInstitucionDestino} onChange={setIdInstitucionDestino}
                    options={institucionOptions} placeholder="Seleccione la institución destino"
                    searchPlaceholder="Buscar por nombre, ciudad o estado…" emptyText="Institución no encontrada"
                    disabled={submitting} />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Destinatario <span className="text-destructive">*</span></Label>
                  {puedeCrearColab && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => setNuevoColabOpen(true)} disabled={submitting}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo colaborador
                    </Button>
                  )}
                </div>
                {destOpciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-md border border-input px-3 py-2">
                    No hay destinatarios. Registre un colaborador con «Nuevo colaborador».
                  </p>
                ) : (
                  <Popover open={destOpen} onOpenChange={setDestOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox" aria-expanded={destOpen} disabled={submitting}
                        className={cn('w-full justify-between font-normal h-9 text-sm', !destSeleccionado && 'text-muted-foreground')}>
                        <span className="truncate flex items-center gap-1.5">
                          {destSeleccionado && (destSeleccionado.tipo === 'USUARIO'
                            ? <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            : <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />)}
                          {destSeleccionado ? destSeleccionado.label : 'Seleccione colaborador o usuario'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command filter={(value, search) => {
                        const o = destOpciones.find((x) => x.key === value)
                        return `${o?.label ?? ''} ${o?.detalle ?? ''}`.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                      }}>
                        <CommandInput placeholder="Buscar por nombre o cargo…" className="h-9" />
                        <CommandList>
                          <CommandEmpty>Sin resultados</CommandEmpty>
                          {grupoDest('Colaboradores', 'COLABORADOR', destOpciones, destKey, (k) => { setDestKey(k); setDestOpen(false) })}
                          {grupoDest('Usuarios del sistema', 'USUARIO', destOpciones, destKey, (k) => { setDestKey(k); setDestOpen(false) })}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                {destSeleccionado && (
                  <p className="text-[11px] text-muted-foreground">
                    {destSeleccionado.tipo === 'USUARIO' ? 'Usuario del sistema' : 'Colaborador'}
                    {destSeleccionado.detalle ? ` · ${destSeleccionado.detalle}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Toggle compartido/individual (solo múltiples) */}
            {isMultiple && (
              <div className="flex items-center gap-3 rounded-md border border-dashed px-3 py-2">
                <Switch checked={modoCompartido} onCheckedChange={setModoCompartido} disabled={submitting} />
                <div className="min-w-0 flex-1">
                  <Label className="cursor-pointer text-xs font-medium">Mismo motivo para todas</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {modoCompartido
                      ? 'Todas comparten motivo, observaciones y fecha límite.'
                      : 'Cada muestra con su propio motivo, observaciones y fecha límite.'}
                  </p>
                </div>
              </div>
            )}

            {/* Campos compartidos */}
            {isMultiple && modoCompartido && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo <span className="text-destructive">*</span></Label>
                  <Textarea value={motivoCompartido} onChange={(e) => setMotivoCompartido(e.target.value)}
                    placeholder="Ej: Análisis complementario, estudio externo…" rows={2} maxLength={300} disabled={submitting} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observaciones</Label>
                  <Textarea value={obsCompartida} onChange={(e) => setObsCompartida(e.target.value)}
                    placeholder="Notas adicionales (opcional)" rows={2} maxLength={500} disabled={submitting} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha límite de devolución</Label>
                  <Input type="date" value={fechaCompartida} onChange={(e) => setFechaCompartida(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} className="w-full" disabled={submitting} />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <p className="w-full text-[11px] text-muted-foreground">Muestras incluidas:</p>
                  {muestras.map((m) => (
                    <Badge key={m.id} variant="outline" className="text-[10px] font-mono">{m.etiqueta}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Detalle por muestra */}
            {(isSingle || !modoCompartido) && (
              <div className="space-y-2">
                {isMultiple && (
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Detalle por muestra</Label>
                )}
                <div className="space-y-2">
                  {muestras.map((m) => {
                    const ex = getExtra(m.id)
                    const isOpen = isSingle || expandedId === m.id
                    return (
                      <div key={m.id} className="border rounded-md overflow-hidden">
                        {isMultiple && (
                          <button type="button"
                            className={cn('w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
                              !ex.motivo.trim() && 'bg-amber-50/50')}
                            onClick={() => setExpandedId(isOpen ? null : m.id)} disabled={submitting}>
                            <span className="font-mono font-medium truncate">{m.etiqueta}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {ex.motivo.trim()
                                ? <Badge variant="secondary" className="text-[10px]">Listo</Badge>
                                : <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Pendiente</Badge>}
                              {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </div>
                          </button>
                        )}
                        {isOpen && (
                          <div className={cn('p-3 space-y-3', isMultiple && 'border-t')}>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Motivo <span className="text-destructive">*</span></Label>
                              <Textarea value={ex.motivo} onChange={(e) => setField(m.id, 'motivo', e.target.value)}
                                placeholder="Ej: Análisis complementario, estudio externo…" rows={2} maxLength={300} disabled={submitting} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Observaciones</Label>
                              <Textarea value={ex.observaciones} onChange={(e) => setField(m.id, 'observaciones', e.target.value)}
                                placeholder="Notas adicionales (opcional)" rows={2} maxLength={500} disabled={submitting} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Fecha límite de devolución</Label>
                              <Input type="date" value={ex.fechaLimite} onChange={(e) => setField(m.id, 'fechaLimite', e.target.value)}
                                min={new Date().toISOString().split('T')[0]} className="w-full" disabled={submitting} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {esTransfer
                ? 'La posición en caja se liberará al transferir. La institución destino podrá ubicarla en su biobanco.'
                : 'La posición en caja se liberará al prestar. La muestra sigue siendo de su institución; podrá registrar su devolución o marcarla como consumida.'}
            </div>

            {submitting && isMultiple && !modoCompartido && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Procesando…</span><span>{progreso} / {muestras.length}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(progreso / muestras.length) * 100}%` }} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>Cancelar</Button>
              <Button type="submit"
                disabled={submitting || (esTransfer ? institucionOptions.length === 0 : destOpciones.length === 0)}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Registrando…</>
                  : isSingle ? `${verbo} muestra` : `${verbo} ${muestras.length} muestras`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ColaboradorFormModal open={nuevoColabOpen} onOpenChange={setNuevoColabOpen} />
    </>
  )
}

function grupoDest(
  titulo: string,
  tipo: 'COLABORADOR' | 'USUARIO',
  opciones: { key: string; tipo: string; label: string; detalle?: string | null }[],
  destKey: string,
  onPick: (key: string) => void,
) {
  const items = opciones.filter((o) => o.tipo === tipo)
  if (items.length === 0) return null
  return (
    <CommandGroup heading={titulo}>
      {items.map((o) => (
        <CommandItem key={o.key} value={o.key} onSelect={() => onPick(o.key)}>
          <Check className={cn('mr-2 h-4 w-4', destKey === o.key ? 'opacity-100' : 'opacity-0')} />
          <span className="flex-1 truncate">{o.label}</span>
          {o.detalle && <span className="ml-2 text-xs text-muted-foreground truncate">{o.detalle}</span>}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
