import { useState, useMemo } from 'react'
import {
  AlertCircle, ChevronDown, ChevronRight,
  Pencil, Plus, Trash2, ToggleLeft, ToggleRight, X, Check, Loader2,
} from 'lucide-react'

import type { TipoMuestra, TuboMuestra, TuboMuestraRequestDTO } from '@/types/api'
import {
  useGetTiposMuestra,
  useCreateTipoMuestra,
  useUpdateTipoMuestra,
  useToggleTipoMuestra,
  useDeleteTipoMuestra,
  useAddTuboMuestra,
  useUpdateTuboMuestra,
  useDeleteTuboMuestra,
} from '@/features/biobanco/hooks/useBiobanco'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TipoForm {
  nombre: string
  descripcion: string
  temperaturaAlmacenamiento: string
}

interface TuboForm {
  nombre: string
  prefijoCodigo: string
  numeroAlicuotas: number
  volumenAlicuota: string
  /** Volumen individual de cada alícuota (una entrada por slot). */
  volumenesAlicuota: string[]
  unidadVolumen: string
  destinoSugerido: string
  orden: number
}

const EMPTY_TIPO: TipoForm = { nombre: '', descripcion: '', temperaturaAlmacenamiento: '' }
const EMPTY_TUBO: TuboForm = {
  nombre: '', prefijoCodigo: '', numeroAlicuotas: 0,
  volumenAlicuota: '', volumenesAlicuota: [], unidadVolumen: 'mL', destinoSugerido: '', orden: 0,
}

const UNIDADES_VOLUMEN = ['mL', 'µL', 'mg', 'g', 'UI']

/** Si el tubo tiene volúmenes por slot que no son todos iguales entre sí. */
function tieneVolumenVariable(tubo: TuboMuestra): boolean {
  const v = tubo.volumenesAlicuota
  if (!v || v.length < 2) return false
  return v.some((x) => x !== v[0])
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TipoMuestraAdminPanel() {
  const { data: tipos = [], isLoading, isError } = useGetTiposMuestra()
  const createTipo = useCreateTipoMuestra()
  const updateTipo = useUpdateTipoMuestra()
  const toggleTipo = useToggleTipoMuestra()
  const deleteTipo = useDeleteTipoMuestra()
  const addTubo = useAddTuboMuestra()
  const updateTubo = useUpdateTuboMuestra()
  const deleteTubo = useDeleteTuboMuestra()

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showCreateTipo, setShowCreateTipo] = useState(false)
  const [editingTipoId, setEditingTipoId] = useState<number | null>(null)
  const [tipoForm, setTipoForm] = useState<TipoForm>(EMPTY_TIPO)

  const [showCreateTubo, setShowCreateTubo] = useState(false)
  const [editingTuboId, setEditingTuboId] = useState<number | null>(null)
  const [tuboForm, setTuboForm] = useState<TuboForm>(EMPTY_TUBO)

  const sorted = useMemo(
    () => [...tipos].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre)),
    [tipos],
  )

  // ── Tipo CRUD ───────────────────

  function openCreateTipo() {
    setTipoForm(EMPTY_TIPO)
    setShowCreateTipo(true)
    setEditingTipoId(null)
  }

  function openEditTipo(t: TipoMuestra) {
    setTipoForm({
      nombre: t.nombre,
      descripcion: t.descripcion ?? '',
      temperaturaAlmacenamiento: t.temperaturaAlmacenamiento ?? '',
    })
    setEditingTipoId(t.id)
    setShowCreateTipo(false)
  }

  function cancelTipoForm() {
    setShowCreateTipo(false)
    setEditingTipoId(null)
    setTipoForm(EMPTY_TIPO)
  }

  function submitTipo() {
    const trimmed = tipoForm.nombre.trim()
    if (!trimmed) return
    const payload = {
      nombre: trimmed,
      descripcion: tipoForm.descripcion.trim() || undefined,
      temperaturaAlmacenamiento: tipoForm.temperaturaAlmacenamiento.trim() || undefined,
    }
    if (editingTipoId) {
      updateTipo.mutate({ id: editingTipoId, data: payload }, { onSuccess: cancelTipoForm })
    } else {
      createTipo.mutate(payload, { onSuccess: cancelTipoForm })
    }
  }

  // ── Tubo CRUD ───────────────────

  function openCreateTubo(tipoId: number) {
    setExpandedId(tipoId)
    setTuboForm({ ...EMPTY_TUBO, orden: (tipos.find(t => t.id === tipoId)?.tubos.length ?? 0) + 1 })
    setShowCreateTubo(true)
    setEditingTuboId(null)
  }

  function openEditTubo(tubo: TuboMuestra) {
    const general = tubo.volumenAlicuota != null ? String(tubo.volumenAlicuota) : ''
    const porSlot = tubo.volumenesAlicuota && tubo.volumenesAlicuota.length > 0
      ? tubo.volumenesAlicuota.map((v) => (v != null ? String(v) : general))
      : Array.from({ length: tubo.numeroAlicuotas }, () => general)
    setTuboForm({
      nombre: tubo.nombre,
      prefijoCodigo: tubo.prefijoCodigo ?? '',
      numeroAlicuotas: tubo.numeroAlicuotas,
      volumenAlicuota: general,
      volumenesAlicuota: porSlot,
      unidadVolumen: tubo.unidadVolumen ?? 'mL',
      destinoSugerido: tubo.destinoSugerido ?? '',
      orden: tubo.orden,
    })
    setEditingTuboId(tubo.id)
    setShowCreateTubo(false)
  }

  function cancelTuboForm() {
    setShowCreateTubo(false)
    setEditingTuboId(null)
    setTuboForm(EMPTY_TUBO)
  }

  function submitTubo(tipoId: number) {
    const trimmed = tuboForm.nombre.trim()
    if (!trimmed) return
    const general = tuboForm.volumenAlicuota ? Number(tuboForm.volumenAlicuota) : undefined
    // Un volumen por slot: cada casilla vacía cae al general. Solo se envía la
    // lista si TODOS los slots resuelven a un número válido; si no, se omite y el
    // backend conserva/valida con el general (misma regla que el tubo uniforme).
    let volumenesAlicuota: number[] | undefined
    if (tuboForm.numeroAlicuotas > 0) {
      const resueltos = Array.from({ length: tuboForm.numeroAlicuotas }, (_, i) => {
        const raw = tuboForm.volumenesAlicuota[i]
        return raw !== undefined && raw !== '' ? Number(raw) : general
      })
      if (resueltos.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) {
        volumenesAlicuota = resueltos as number[]
      }
    }
    const payload: TuboMuestraRequestDTO = {
      nombre: trimmed,
      prefijoCodigo: tuboForm.prefijoCodigo.trim() || undefined,
      numeroAlicuotas: tuboForm.numeroAlicuotas,
      volumenAlicuota: general,
      volumenesAlicuota,
      unidadVolumen: tuboForm.unidadVolumen || undefined,
      destinoSugerido: tuboForm.destinoSugerido.trim() || undefined,
      orden: tuboForm.orden,
    }
    if (editingTuboId) {
      updateTubo.mutate({ id: editingTuboId, data: payload }, { onSuccess: cancelTuboForm })
    } else {
      addTubo.mutate({ idTipo: tipoId, data: payload }, { onSuccess: cancelTuboForm })
    }
  }

  // ── Loading/Error ───────────────

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> Cargando tipos de muestra…
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No se pudieron cargar los tipos de muestra.</AlertDescription>
      </Alert>
    )
  }

  // ── Render ──────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Tipos de Muestra</h3>
          <p className="text-sm text-muted-foreground">
            Defina tipos de muestra y los tubos/alícuotas que los componen.
          </p>
        </div>
        <Button size="sm" onClick={openCreateTipo} disabled={showCreateTipo}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo tipo
        </Button>
      </div>

      {/* ── Formulario crear tipo ── */}
      {showCreateTipo && (
        <Card className="p-4 space-y-3 border-dashed border-primary/40">
          <p className="text-sm font-medium">Nuevo tipo de muestra</p>
          <TipoFormFields form={tipoForm} onChange={setTipoForm} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={cancelTipoForm}><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>
            <Button size="sm" onClick={submitTipo} disabled={!tipoForm.nombre.trim() || createTipo.isPending}>
              {createTipo.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              Crear
            </Button>
          </div>
        </Card>
      )}

      {sorted.length === 0 && !showCreateTipo && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin tipos de muestra registrados. Crea el primero.
        </p>
      )}

      {/* ── Lista de tipos ── */}
      {sorted.map((tipo) => {
        const isExpanded = expandedId === tipo.id
        const isEditing = editingTipoId === tipo.id

        return (
          <Card key={tipo.id} className={cn('overflow-hidden', !tipo.activo && 'opacity-60')}>
            {/* Header */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : tipo.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{tipo.nombre}</span>
                {tipo.temperaturaAlmacenamiento && (
                  <span className="ml-2 text-xs text-muted-foreground">({tipo.temperaturaAlmacenamiento})</span>
                )}
              </div>
              <Badge variant={tipo.activo ? 'default' : 'outline'} className="text-[11px] shrink-0">
                {tipo.activo ? 'Activo' : 'Inactivo'}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">{tipo.tubos.length} tubo(s)</span>
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTipo(tipo)} title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => toggleTipo.mutate(tipo.id)}
                  disabled={toggleTipo.isPending}
                  title={tipo.activo ? 'Desactivar' : 'Activar'}
                >
                  {tipo.activo ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                </Button>
                {/* Eliminar: solo si el tipo no tiene tubos. Con tubos, el botón
                    queda deshabilitado y se ofrece desactivar en su lugar. */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={tipo.tubos.length > 0 || deleteTipo.isPending}
                      title={tipo.tubos.length > 0
                        ? 'Solo se puede eliminar un tipo sin tubos. Elimine sus tubos o desactívelo.'
                        : 'Eliminar tipo'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar tipo "{tipo.nombre}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Solo puede eliminarse un tipo de muestra que no tenga tubos configurados.
                        Esta acción no se puede deshacer. Para conservar el historial, mejor desactívalo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTipo.mutate(tipo.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </button>

            {/* Edit tipo form */}
            {isEditing && (
              <div className="px-4 pb-3 space-y-3 border-t bg-muted/30">
                <p className="text-sm font-medium pt-3">Editar tipo</p>
                <TipoFormFields form={tipoForm} onChange={setTipoForm} />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={cancelTipoForm}><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>
                  <Button size="sm" onClick={submitTipo} disabled={!tipoForm.nombre.trim() || updateTipo.isPending}>
                    {updateTipo.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            {/* Expanded content — tubos */}
            {isExpanded && (
              <div className="border-t">
                <div className="px-4 py-3 flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tubos / Alícuotas</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCreateTubo(tipo.id)} disabled={showCreateTubo}>
                    <Plus className="mr-1 h-3 w-3" /> Agregar tubo
                  </Button>
                </div>

                {/* Create tubo form */}
                {showCreateTubo && expandedId === tipo.id && (
                  <div className="px-4 py-3 space-y-3 border-b bg-muted/10">
                    <TuboFormFields form={tuboForm} onChange={setTuboForm} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={cancelTuboForm}><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>
                      <Button size="sm" onClick={() => submitTubo(tipo.id)} disabled={!tuboForm.nombre.trim() || addTubo.isPending}>
                        {addTubo.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                )}

                {tipo.tubos.length === 0 && !showCreateTubo && (
                  <p className="px-4 py-4 text-center text-xs text-muted-foreground">Sin tubos definidos.</p>
                )}

                {tipo.tubos.map((tubo) => (
                  <div key={tubo.id} className={cn('px-4 py-2 border-b last:border-b-0', !tubo.activo && 'opacity-50')}>
                    {editingTuboId === tubo.id ? (
                      <div className="space-y-3 py-1">
                        <TuboFormFields form={tuboForm} onChange={setTuboForm} />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={cancelTuboForm}><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>
                          <Button size="sm" onClick={() => submitTubo(tipo.id)} disabled={!tuboForm.nombre.trim() || updateTubo.isPending}>
                            {updateTubo.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-mono text-xs text-muted-foreground w-6 text-right shrink-0">#{tubo.orden}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{tubo.nombre}</span>
                          {tubo.prefijoCodigo && (
                            <Badge variant="outline" className="ml-2 text-[10px] font-mono">{tubo.prefijoCodigo}</Badge>
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {tubo.numeroAlicuotas > 0
                              ? tieneVolumenVariable(tubo)
                                ? `${tubo.numeroAlicuotas} alíc. × vol. variable ${tubo.unidadVolumen ?? ''}`
                                : `${tubo.numeroAlicuotas} alíc.${tubo.volumenAlicuota ? ` × ${tubo.volumenAlicuota} ${tubo.unidadVolumen ?? ''}` : ''}`
                              : 'Tubo directo'}
                          </span>
                          {tubo.destinoSugerido && (
                            <span className="ml-2 text-xs text-muted-foreground">→ {tubo.destinoSugerido}</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditTubo(tubo)} title="Editar tubo">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {/* Misma confirmacion que en Biobanco: es una accion
                              destructiva y aqui se ejecutaba con un solo clic. */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                disabled={deleteTubo.isPending}
                                title="Eliminar tubo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar tubo "{tubo.nombre}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Solo puede eliminarse un tubo que todavía no tenga muestras ni alícuotas registradas.
                                  Si ya las tiene, la operación será rechazada y el tubo se conservará. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTubo.mutate(tubo.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TipoFormFields({ form, onChange }: { form: TipoForm; onChange: (f: TipoForm) => void }) {
  return (
    <div className="grid grid-cols-1 @sm:grid-cols-3 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Nombre *</Label>
        <Input
          placeholder="Ej. Sangre venosa"
          maxLength={100}
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Temperatura almacenamiento</Label>
        <Input
          placeholder="Ej. -80°C"
          maxLength={30}
          value={form.temperaturaAlmacenamiento}
          onChange={(e) => onChange({ ...form, temperaturaAlmacenamiento: e.target.value })}
        />
      </div>
      <div className="space-y-1 sm:col-span-1">
        <Label className="text-xs">Descripción</Label>
        <Input
          placeholder="Descripción breve"
          maxLength={500}
          value={form.descripcion}
          onChange={(e) => onChange({ ...form, descripcion: e.target.value })}
        />
      </div>
    </div>
  )
}

function TuboFormFields({ form, onChange }: { form: TuboForm; onChange: (f: TuboForm) => void }) {
  // Al cambiar el número de alícuotas se ajusta la lista por slot: los nuevos
  // huecos nacen con el volumen general, y recortar no borra los de más abajo.
  function cambiarNumeroAlicuotas(nuevoN: number) {
    const arr = [...form.volumenesAlicuota]
    if (nuevoN > arr.length) {
      while (arr.length < nuevoN) arr.push(form.volumenAlicuota)
    } else {
      arr.splice(nuevoN)
    }
    onChange({ ...form, numeroAlicuotas: nuevoN, volumenesAlicuota: arr })
  }

  function aplicarGeneralATodas() {
    onChange({
      ...form,
      volumenesAlicuota: Array.from({ length: form.numeroAlicuotas }, () => form.volumenAlicuota),
    })
  }

  function cambiarSlot(i: number, valor: string) {
    const arr = [...form.volumenesAlicuota]
    arr[i] = valor
    onChange({ ...form, volumenesAlicuota: arr })
  }

  const hayAlicuotas = form.numeroAlicuotas > 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 @sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre del tubo *</Label>
          <Input
            placeholder="Ej. EDTA"
            maxLength={100}
            value={form.nombre}
            onChange={(e) => onChange({ ...form, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prefijo código</Label>
          <Input
            placeholder="Ej. S, H, EDTA"
            maxLength={20}
            value={form.prefijoCodigo}
            onChange={(e) => onChange({ ...form, prefijoCodigo: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">N° alícuotas</Label>
          <Input
            type="number"
            min={0}
            placeholder="0 = directo"
            value={form.numeroAlicuotas}
            onChange={(e) => cambiarNumeroAlicuotas(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Orden</Label>
          <Input
            type="number"
            min={0}
            value={form.orden}
            onChange={(e) => onChange({ ...form, orden: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Volumen general</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.5"
            value={form.volumenAlicuota}
            onChange={(e) => onChange({ ...form, volumenAlicuota: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidad volumen</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={form.unidadVolumen}
            onChange={(e) => onChange({ ...form, unidadVolumen: e.target.value })}
          >
            {UNIDADES_VOLUMEN.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Destino sugerido</Label>
          <Input
            placeholder="Ej. INMEGEN, Biobanco local"
            maxLength={100}
            value={form.destinoSugerido}
            onChange={(e) => onChange({ ...form, destinoSugerido: e.target.value })}
          />
        </div>
      </div>

      {/* Volumen individual por alícuota. Cada casilla arranca del volumen
          general y puede editarse; al generar la muestra cada vial nace con el
          suyo. Una casilla vacía cae al general. */}
      {hayAlicuotas && (
        <div className="rounded-md border border-dashed p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium">
              Volumen por alícuota ({form.numeroAlicuotas})
            </Label>
            <button
              type="button"
              className="text-[11px] text-primary underline-offset-2 hover:underline disabled:opacity-40"
              disabled={!form.volumenAlicuota}
              onClick={aplicarGeneralATodas}
            >
              Aplicar general a todas
            </button>
          </div>
          <div className="grid grid-cols-2 @sm:grid-cols-4 gap-2">
            {Array.from({ length: form.numeroAlicuotas }, (_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-10 shrink-0 text-[11px] text-muted-foreground text-right">
                  #{i + 1}
                </span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={form.volumenAlicuota || '0.5'}
                  value={form.volumenesAlicuota[i] ?? ''}
                  onChange={(e) => cambiarSlot(i, e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cada casilla vacía toma el volumen general ({form.volumenAlicuota || '—'} {form.unidadVolumen}).
            Al generar, cada alícuota nace con su volumen; una parcial puede bajar de ahí, nunca pasarse.
          </p>
        </div>
      )}
    </div>
  )
}
