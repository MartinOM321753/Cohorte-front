import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Hash,
  List,
  Pencil,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'

import { TipoParametro, TipoEstudioRequestDTO } from '@/types/api'
import { tipoEstudioSchema, type TipoEstudioFormData } from '../schemas/estudio.schema'
import {
  useCreateParametroEstudio,
  useCreateTipoEstudio,
  useDeleteParametroEstudio,
  useDeleteTipoEstudio,
  useGetTodosLosTipos,
  useToggleTipoEstudio,
  useUpdateParametroEstudio,
} from '../hooks/useEstudios'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { cn } from '@/lib/utils'
import { UnidadSelect } from '@/components/forms/UnidadSelect'

interface PendingParametro {
  key: string
  nombre: string
  unidad: string
  tipo: TipoParametro
  valorMinMujeres?: string
  valorMaxMujeres?: string
  valorMinHombres?: string
  valorMaxHombres?: string
  opciones?: string[]
}

const TIPO_LABELS: Record<TipoParametro, string> = {
  NUMERICO: 'Numérico',
  TEXTO: 'Texto libre',
  BOOLEANO: 'Sí/No',
  TEXTO_OPCIONES: 'Selección',
}

const DEFAULT_TIPO: TipoEstudioFormData = { nombre: '', descripcion: '' }

/** Valida que mín < máx para un par de campos de rango; null si es válido o están vacíos. */
function validarRango(min: string, max: string): string | null {
  if (min !== '' && max !== '' && Number(min) >= Number(max)) {
    return 'El valor mínimo debe ser menor que el máximo'
  }
  return null
}

export function TiposEstudioTab() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('ESTUDIOS_TIPOS_CREAR')
  const puedeEditar = hasPermiso('ESTUDIOS_TIPOS_EDITAR')
  const puedeEliminar = hasPermiso('ESTUDIOS_TIPOS_ELIMINAR')
  const { data: tipos, isLoading, isError } = useGetTodosLosTipos()
  const createTipo = useCreateTipoEstudio()
  const toggleTipo = useToggleTipoEstudio()
  const deleteTipo = useDeleteTipoEstudio()
  const createParametro = useCreateParametroEstudio()
  const deleteParametro = useDeleteParametroEstudio()

  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Pending parameters before submitting the new tipo
  const [pending, setPending] = useState<PendingParametro[]>([])
  const [paramNombre, setParamNombre] = useState('')
  const [paramUnidad, setParamUnidad] = useState('')
  const [paramTipo, setParamTipo] = useState<TipoParametro>('NUMERICO')
  const [paramValorMinMujeres, setParamValorMinMujeres] = useState('')
  const [paramValorMaxMujeres, setParamValorMaxMujeres] = useState('')
  const [paramValorMinHombres, setParamValorMinHombres] = useState('')
  const [paramValorMaxHombres, setParamValorMaxHombres] = useState('')
  const [paramOpciones, setParamOpciones] = useState<string[]>([])
  const [paramOpcionInput, setParamOpcionInput] = useState('')
  const [paramError, setParamError] = useState('')
  const [paramRangoError, setParamRangoError] = useState('')
  const [paramListError, setParamListError] = useState('')

  const tipoForm = useForm<TipoEstudioFormData>({
    resolver: zodResolver(tipoEstudioSchema),
    defaultValues: DEFAULT_TIPO,
  })

  const tiposActivos = useMemo(
    () => [...(tipos || [])].filter((t) => t.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [tipos]
  )
  const tiposInactivos = useMemo(
    () => [...(tipos || [])].filter((t) => !t.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [tipos]
  )

  function addPending() {
    const trimmed = paramNombre.trim()
    if (!trimmed) { setParamError('El nombre es requerido'); return }
    if (pending.some((p) => p.nombre.toLowerCase() === trimmed.toLowerCase())) {
      setParamError('Ya existe un parámetro con ese nombre')
      return
    }
    // Validate min/max range for NUMERICO
    if (paramTipo === 'NUMERICO') {
      const err = validarRango(paramValorMinMujeres, paramValorMaxMujeres) ?? validarRango(paramValorMinHombres, paramValorMaxHombres)
      if (err) { setParamRangoError(err); return }
    }
    setParamError('')
    setParamRangoError('')
    setParamListError('')
    setPending((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        nombre: trimmed,
        unidad: paramUnidad.trim(),
        tipo: paramTipo,
        valorMinMujeres: paramTipo === 'NUMERICO' && paramValorMinMujeres !== '' ? paramValorMinMujeres : undefined,
        valorMaxMujeres: paramTipo === 'NUMERICO' && paramValorMaxMujeres !== '' ? paramValorMaxMujeres : undefined,
        valorMinHombres: paramTipo === 'NUMERICO' && paramValorMinHombres !== '' ? paramValorMinHombres : undefined,
        valorMaxHombres: paramTipo === 'NUMERICO' && paramValorMaxHombres !== '' ? paramValorMaxHombres : undefined,
        opciones: paramTipo === 'TEXTO_OPCIONES' ? [...paramOpciones] : undefined,
      },
    ])
    setParamNombre('')
    setParamUnidad('')
    setParamTipo('NUMERICO')
    setParamValorMinMujeres('')
    setParamValorMaxMujeres('')
    setParamValorMinHombres('')
    setParamValorMaxHombres('')
    setParamOpciones([])
    setParamOpcionInput('')
  }

  function removePending(key: string) {
    setPending((prev) => prev.filter((p) => p.key !== key))
  }

  async function onSubmitTipo(data: TipoEstudioFormData) {
    if (pending.length === 0) {
      setParamListError('Agrega al menos un parámetro antes de guardar.')
      return
    }

    const payload: TipoEstudioRequestDTO = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || undefined,
    }

    createTipo.mutate(payload, {
      onSuccess: async (created) => {
        tipoForm.reset(DEFAULT_TIPO)
        for (const p of pending) {
          await createParametro.mutateAsync({
            idTipoEstudio: created.id,
            nombre: p.nombre,
            unidad: p.unidad || undefined,
            tipo: p.tipo,
            valorMinMujeres: p.valorMinMujeres !== undefined ? Number(p.valorMinMujeres) : undefined,
            valorMaxMujeres: p.valorMaxMujeres !== undefined ? Number(p.valorMaxMujeres) : undefined,
            valorMinHombres: p.valorMinHombres !== undefined ? Number(p.valorMinHombres) : undefined,
            valorMaxHombres: p.valorMaxHombres !== undefined ? Number(p.valorMaxHombres) : undefined,
            opciones: p.tipo === 'TEXTO_OPCIONES' ? (p.opciones ?? []) : undefined,
          })
        }
        setPending([])
        setParamListError('')
      },
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* LEFT — catalog list */}
      <Card className={puedeCrear ? 'lg:col-span-3' : 'lg:col-span-5'}>
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Plantillas de estudio</div>
            <div className="text-xs text-muted-foreground">
              Catálogo de tipos con sus parámetros. Expande para ver o gestionar.
            </div>
          </div>
          <Badge variant="secondary" className="font-mono">{tiposActivos.length + tiposInactivos.length}</Badge>
        </div>

        <div className="divide-y p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Spinner /> Cargando…
            </div>
          ) : isError ? (
            <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>No se pudieron cargar los tipos de estudio.</AlertDescription>
            </Alert>
          ) : tiposActivos.length === 0 && tiposInactivos.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sin plantillas registradas</div>
          ) : (
            <>
              {tiposActivos.map((t) => (
                <TipoRow
                  key={t.id}
                  tipo={t}
                  expandedId={expandedId}
                  onToggleExpand={setExpandedId}
                  onToggleActivo={() => toggleTipo.mutate(t.id)}
                  isTogglingActivo={toggleTipo.isPending}
                  onDeleteTipo={() => deleteTipo.mutate(t.id)}
                  isDeletingTipo={deleteTipo.isPending}
                  onDeleteParametro={(id) => deleteParametro.mutate(id)}
                  isDeletingParametro={deleteParametro.isPending}
                  puedeEditar={puedeEditar}
                  puedeEliminar={puedeEliminar}
                />
              ))}

              {tiposInactivos.length > 0 && (
                <>
                  <div className="flex items-center gap-2 bg-muted/30 px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Inactivos
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {tiposInactivos.length}
                    </Badge>
                  </div>
                  {tiposInactivos.map((t) => (
                    <TipoRow
                      key={t.id}
                      tipo={t}
                      expandedId={expandedId}
                      onToggleExpand={setExpandedId}
                      onToggleActivo={() => toggleTipo.mutate(t.id)}
                      isTogglingActivo={toggleTipo.isPending}
                      onDeleteTipo={() => deleteTipo.mutate(t.id)}
                      isDeletingTipo={deleteTipo.isPending}
                      onDeleteParametro={(id) => deleteParametro.mutate(id)}
                      isDeletingParametro={deleteParametro.isPending}
                      puedeEditar={puedeEditar}
                      puedeEliminar={puedeEliminar}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {/* RIGHT — create new tipo + pending params */}
      {puedeCrear && <Card className="lg:col-span-2">
        <div className="border-b p-4">
          <div className="text-sm font-medium">Nueva plantilla</div>
          <div className="text-xs text-muted-foreground">
            Define el tipo y agrega sus parámetros antes de guardar.
          </div>
        </div>

        <form onSubmit={tipoForm.handleSubmit(onSubmitTipo)} className="space-y-4 p-4">
          <FormField label="Nombre" required error={tipoForm.formState.errors.nombre?.message}>
            <Input
              placeholder="Ej. Biometría hemática"
              sanitize="alfanumerico"
              {...tipoForm.register('nombre')}
            />
          </FormField>
          <FormField label="Descripción" error={tipoForm.formState.errors.descripcion?.message}>
            <Textarea
              placeholder="Opcional…"
              rows={2}
              sanitize="descripcion"
              {...tipoForm.register('descripcion')}
            />
          </FormField>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">
              Parámetros <span className="text-destructive">*</span>
            </Label>
            <div className="text-xs text-muted-foreground">
              Agrega al menos un parámetro. Se guardarán junto con el tipo.
            </div>

            {/* Pending list */}
            {pending.length > 0 && (
              <div className="space-y-1.5">
                {pending.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                      <span className="font-medium">{p.nombre}</span>
                      {p.unidad && (
                        <span className="font-mono text-xs text-muted-foreground">({p.unidad})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{TIPO_LABELS[p.tipo]}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removePending(p.key)}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add pending parametro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input
                  placeholder="Nombre del parámetro"
                  value={paramNombre}
                  onChange={(e) => { setParamNombre(e.target.value); setParamError('') }}
                  className={cn(paramError && 'border-destructive')}
                />
                {paramError && <p className="mt-1 text-xs text-destructive">{paramError}</p>}
              </div>
              <Select value={paramTipo} onValueChange={(v) => { setParamTipo(v as TipoParametro); setParamValorMinMujeres(''); setParamValorMaxMujeres(''); setParamValorMinHombres(''); setParamValorMaxHombres(''); setParamOpciones([]); setParamOpcionInput(''); setParamRangoError('') }}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMERICO">Numérico</SelectItem>
                  <SelectItem value="TEXTO">Texto libre</SelectItem>
                  <SelectItem value="BOOLEANO">Sí/No</SelectItem>
                  <SelectItem value="TEXTO_OPCIONES">Selección</SelectItem>
                </SelectContent>
              </Select>
              <UnidadSelect
                value={paramUnidad}
                onChange={setParamUnidad}
                placeholder="Unidad (opcional)"
                compact
              />
              {/* Rango de referencia — solo para NUMERICO */}
              {paramTipo === 'NUMERICO' && (
                <RangoReferenciaFields
                  valMinMujeres={paramValorMinMujeres} setValMinMujeres={(v) => { setParamValorMinMujeres(v); setParamRangoError('') }}
                  valMaxMujeres={paramValorMaxMujeres} setValMaxMujeres={(v) => { setParamValorMaxMujeres(v); setParamRangoError('') }}
                  valMinHombres={paramValorMinHombres} setValMinHombres={(v) => { setParamValorMinHombres(v); setParamRangoError('') }}
                  valMaxHombres={paramValorMaxHombres} setValMaxHombres={(v) => { setParamValorMaxHombres(v); setParamRangoError('') }}
                  error={paramRangoError}
                />
              )}
              {/* Opciones configurables — solo para TEXTO_OPCIONES */}
              {paramTipo === 'TEXTO_OPCIONES' && (
                <div className="col-span-2 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground font-medium">Opciones válidas</p>
                  {paramOpciones.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {paramOpciones.map((op, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-muted">
                          {op}
                          <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setParamOpciones(prev => prev.filter((_, j) => j !== i))}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Input
                      placeholder="Nueva opción…"
                      value={paramOpcionInput}
                      onChange={(e) => setParamOpcionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const v = paramOpcionInput.trim()
                          if (v && !paramOpciones.includes(v)) setParamOpciones(prev => [...prev, v])
                          setParamOpcionInput('')
                        }
                      }}
                      className="h-7 text-sm flex-1"
                    />
                    <Button
                      type="button" variant="outline" size="sm" className="h-7 px-2 shrink-0"
                      onClick={() => {
                        const v = paramOpcionInput.trim()
                        if (v && !paramOpciones.includes(v)) setParamOpciones(prev => [...prev, v])
                        setParamOpcionInput('')
                      }}
                    ><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addPending}
            >
              <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
              Agregar parámetro
            </Button>

            {paramListError && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-[1px] size-3.5 shrink-0" />
                <span>{paramListError}</span>
              </p>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { tipoForm.reset(DEFAULT_TIPO); setPending([]); setParamListError('') }}
              disabled={createTipo.isPending}
            >
              Limpiar
            </Button>
            <Button type="submit" disabled={createTipo.isPending}>
              {createTipo.isPending ? (
                <><Spinner className="mr-2 h-4 w-4" /> Guardando…</>
              ) : pending.length > 0 ? (
                `Guardar (${pending.length} parámetro${pending.length !== 1 ? 's' : ''})`
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </Card>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Tipo row — reusable for active and inactive sections
// ──────────────────────────────────────────────────────────
function TipoRow({
  tipo,
  expandedId,
  onToggleExpand,
  onToggleActivo,
  isTogglingActivo,
  onDeleteTipo,
  isDeletingTipo,
  onDeleteParametro,
  isDeletingParametro,
  puedeEditar,
  puedeEliminar,
}: {
  tipo: import('@/types/api').TipoEstudio
  expandedId: number | null
  onToggleExpand: (id: number | null) => void
  onToggleActivo: () => void
  isTogglingActivo: boolean
  onDeleteTipo: () => void
  isDeletingTipo: boolean
  onDeleteParametro: (id: number) => void
  isDeletingParametro: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}) {
  const isOpen = expandedId === tipo.id
  const parametros = tipo.parametroEstudios || []

  return (
    <div className={cn(!tipo.activo && 'opacity-70')}>
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
        onClick={() => onToggleExpand(isOpen ? null : tipo.id)}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand(isOpen ? null : tipo.id)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          )}
          <span className="truncate text-sm font-medium">{tipo.nombre}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {parametros.length} param.
          </Badge>
          {puedeEditar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => { e.stopPropagation(); onToggleActivo() }}
              disabled={isTogglingActivo}
              title={tipo.activo ? 'Deshabilitar plantilla' : 'Reactivar plantilla'}
            >
              {tipo.activo ? (
                <ToggleRight className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              )}
            </Button>
          )}
          {puedeEliminar && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isDeletingTipo}
                  title="Eliminar plantilla"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar plantilla "{tipo.nombre}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán todos sus parámetros. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteTipo}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3">
          {parametros.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin parámetros definidos.</p>
          ) : (
            <div className="space-y-1.5">
              {parametros.map((p) => (
                <EditableParametroRow
                  key={p.id}
                  parametro={p}
                  tipoEstudioId={tipo.id}
                  onDelete={() => onDeleteParametro(p.id)}
                  isDeleting={isDeletingParametro}
                  puedeEditar={puedeEditar}
                  puedeEliminar={puedeEliminar}
                />
              ))}
            </div>
          )}

          {/* Only allow adding params to active tipos */}
          {tipo.activo && puedeEditar && <AddParametroInline tipoId={tipo.id} />}
          {!tipo.activo && (
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              Esta plantilla está deshabilitada. Reactívala para agregar más parámetros.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Fila de parámetro con modo de edición inline. */
function EditableParametroRow({
  parametro,
  tipoEstudioId,
  onDelete,
  isDeleting,
  puedeEditar,
  puedeEliminar,
}: {
  parametro: import('@/types/api').ParametroEstudio
  tipoEstudioId: number
  onDelete: () => void
  isDeleting: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}) {
  const updateParametro = useUpdateParametroEstudio(parametro.id)

  const [editing, setEditing]         = useState(false)
  const [nombre, setNombre]           = useState(parametro.nombre)
  const [unidad, setUnidad]           = useState(parametro.unidad ?? '')
  const [tipo,   setTipo]             = useState<TipoParametro>(parametro.tipo as TipoParametro)
  const [valMinMujeres, setValMinMujeres] = useState(parametro.valorMinMujeres != null ? String(parametro.valorMinMujeres) : '')
  const [valMaxMujeres, setValMaxMujeres] = useState(parametro.valorMaxMujeres != null ? String(parametro.valorMaxMujeres) : '')
  const [valMinHombres, setValMinHombres] = useState(parametro.valorMinHombres != null ? String(parametro.valorMinHombres) : '')
  const [valMaxHombres, setValMaxHombres] = useState(parametro.valorMaxHombres != null ? String(parametro.valorMaxHombres) : '')
  const [opciones, setOpciones]       = useState<string[]>(parametro.opciones ?? [])
  const [opcionInput, setOpcionInput] = useState('')
  const [error,  setError]            = useState('')
  const [rangoError, setRangoError]   = useState('')

  function startEdit() {
    setNombre(parametro.nombre)
    setUnidad(parametro.unidad ?? '')
    setTipo(parametro.tipo as TipoParametro)
    setValMinMujeres(parametro.valorMinMujeres != null ? String(parametro.valorMinMujeres) : '')
    setValMaxMujeres(parametro.valorMaxMujeres != null ? String(parametro.valorMaxMujeres) : '')
    setValMinHombres(parametro.valorMinHombres != null ? String(parametro.valorMinHombres) : '')
    setValMaxHombres(parametro.valorMaxHombres != null ? String(parametro.valorMaxHombres) : '')
    setOpciones(parametro.opciones ?? [])
    setOpcionInput('')
    setError('')
    setRangoError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError('')
    setRangoError('')
  }

  function saveEdit() {
    const trimmed = nombre.trim()
    if (!trimmed) { setError('El nombre es requerido'); return }
    if (tipo === 'NUMERICO') {
      const err = validarRango(valMinMujeres, valMaxMujeres) ?? validarRango(valMinHombres, valMaxHombres)
      if (err) { setRangoError(err); return }
    }
    setError('')
    setRangoError('')
    updateParametro.mutate(
      {
        idTipoEstudio: tipoEstudioId,
        nombre: trimmed,
        unidad: unidad.trim() || undefined,
        tipo,
        valorMinMujeres: tipo === 'NUMERICO' && valMinMujeres !== '' ? Number(valMinMujeres) : undefined,
        valorMaxMujeres: tipo === 'NUMERICO' && valMaxMujeres !== '' ? Number(valMaxMujeres) : undefined,
        valorMinHombres: tipo === 'NUMERICO' && valMinHombres !== '' ? Number(valMinHombres) : undefined,
        valorMaxHombres: tipo === 'NUMERICO' && valMaxHombres !== '' ? Number(valMaxHombres) : undefined,
        opciones: tipo === 'TEXTO_OPCIONES' ? opciones : undefined,
      },
      { onSuccess: () => setEditing(false) }
    )
  }

  if (editing) {
    return (
      <div className="rounded-md border bg-background px-3 py-2 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="col-span-2">
            <Input
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError('') }}
              placeholder="Nombre del parámetro"
              className={cn('h-8 text-sm', error && 'border-destructive')}
              autoFocus
            />
            {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
          </div>
          <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoParametro); setValMinMujeres(''); setValMaxMujeres(''); setValMinHombres(''); setValMaxHombres(''); setOpciones([]); setOpcionInput(''); setRangoError('') }}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NUMERICO">Numérico</SelectItem>
              <SelectItem value="TEXTO">Texto libre</SelectItem>
              <SelectItem value="BOOLEANO">Sí/No</SelectItem>
              <SelectItem value="TEXTO_OPCIONES">Selección</SelectItem>
            </SelectContent>
          </Select>
          <UnidadSelect value={unidad} onChange={setUnidad} placeholder="Unidad" compact />
          {/* Reference range — only for NUMERICO */}
          {tipo === 'NUMERICO' && (
            <RangoReferenciaFields
              valMinMujeres={valMinMujeres} setValMinMujeres={(v) => { setValMinMujeres(v); setRangoError('') }}
              valMaxMujeres={valMaxMujeres} setValMaxMujeres={(v) => { setValMaxMujeres(v); setRangoError('') }}
              valMinHombres={valMinHombres} setValMinHombres={(v) => { setValMinHombres(v); setRangoError('') }}
              valMaxHombres={valMaxHombres} setValMaxHombres={(v) => { setValMaxHombres(v); setRangoError('') }}
              error={rangoError}
              compact
            />
          )}
          {/* Opciones — solo para TEXTO_OPCIONES */}
          {tipo === 'TEXTO_OPCIONES' && (
            <div className="col-span-2 space-y-1.5">
              <p className="text-[11px] text-muted-foreground font-medium">Opciones válidas</p>
              {opciones.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {opciones.map((op, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-muted">
                      {op}
                      <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setOpciones(prev => prev.filter((_, j) => j !== i))}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <Input
                  placeholder="Nueva opción…"
                  value={opcionInput}
                  onChange={(e) => setOpcionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = opcionInput.trim()
                      if (v && !opciones.includes(v)) setOpciones(prev => [...prev, v])
                      setOpcionInput('')
                    }
                  }}
                  className="h-7 text-sm flex-1"
                />
                <Button
                  type="button" variant="outline" size="sm" className="h-7 px-2 shrink-0"
                  onClick={() => {
                    const v = opcionInput.trim()
                    if (v && !opciones.includes(v)) setOpciones(prev => [...prev, v])
                    setOpcionInput('')
                  }}
                ><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={cancelEdit}
            disabled={updateParametro.isPending}
          >
            <X className="mr-1 h-3 w-3" strokeWidth={1.75} />
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={saveEdit}
            disabled={updateParametro.isPending}
          >
            {updateParametro.isPending ? (
              <><Spinner className="mr-1 h-3 w-3" /> Guardando…</>
            ) : (
              <><Check className="mr-1 h-3 w-3" strokeWidth={1.75} /> Guardar</>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Reference range display string (mujeres / hombres)
  const rangoLabel = (() => {
    if (parametro.tipo !== 'NUMERICO') return null
    const fmt = (min?: number | null, max?: number | null) => {
      if (min != null && max != null) return `${min}–${max}`
      if (min != null) return `≥${min}`
      if (max != null) return `≤${max}`
      return null
    }
    const m = fmt(parametro.valorMinMujeres, parametro.valorMaxMujeres)
    const h = fmt(parametro.valorMinHombres, parametro.valorMaxHombres)
    if (!m && !h) return null
    if (m && h && m !== h) return `M ${m} · H ${h}`
    return m ?? h
  })()

  return (
    <div className="rounded-md border bg-background px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
          <span className="font-medium">{parametro.nombre}</span>
          {parametro.unidad && (
            <span className="font-mono text-xs text-muted-foreground">({parametro.unidad})</span>
          )}
          {rangoLabel && (
            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ref: {rangoLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {TIPO_LABELS[parametro.tipo as TipoParametro] ?? parametro.tipo}
          </Badge>
          {puedeEditar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={startEdit}
              title="Editar parámetro"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
              title="Eliminar parámetro"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>
      {/* Mostrar opciones configuradas para TEXTO_OPCIONES */}
      {parametro.tipo === 'TEXTO_OPCIONES' && parametro.opciones && parametro.opciones.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <List className="h-3 w-3 text-muted-foreground shrink-0" />
          {parametro.opciones.map((op) => (
            <span key={op} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{op}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Inline add-parameter form rendered inside an expanded tipo row */
function AddParametroInline({ tipoId }: { tipoId: number }) {
  const createParametro = useCreateParametroEstudio()
  const [nombre, setNombre]           = useState('')
  const [unidad, setUnidad]           = useState('')
  const [tipo, setTipo]               = useState<TipoParametro>('NUMERICO')
  const [valMinMujeres, setValMinMujeres] = useState('')
  const [valMaxMujeres, setValMaxMujeres] = useState('')
  const [valMinHombres, setValMinHombres] = useState('')
  const [valMaxHombres, setValMaxHombres] = useState('')
  const [opciones, setOpciones]       = useState<string[]>([])
  const [opcionInput, setOpcionInput] = useState('')
  const [error, setError]             = useState('')
  const [rangoError, setRangoError]   = useState('')

  function handleAdd() {
    const trimmed = nombre.trim()
    if (!trimmed) { setError('Requerido'); return }
    if (tipo === 'NUMERICO') {
      const err = validarRango(valMinMujeres, valMaxMujeres) ?? validarRango(valMinHombres, valMaxHombres)
      if (err) { setRangoError(err); return }
    }
    setError('')
    setRangoError('')
    createParametro.mutate(
      {
        idTipoEstudio: tipoId,
        nombre: trimmed,
        unidad: unidad.trim() || undefined,
        tipo,
        valorMinMujeres: tipo === 'NUMERICO' && valMinMujeres !== '' ? Number(valMinMujeres) : undefined,
        valorMaxMujeres: tipo === 'NUMERICO' && valMaxMujeres !== '' ? Number(valMaxMujeres) : undefined,
        valorMinHombres: tipo === 'NUMERICO' && valMinHombres !== '' ? Number(valMinHombres) : undefined,
        valorMaxHombres: tipo === 'NUMERICO' && valMaxHombres !== '' ? Number(valMaxHombres) : undefined,
        opciones: tipo === 'TEXTO_OPCIONES' ? opciones : undefined,
      },
      { onSuccess: () => { setNombre(''); setUnidad(''); setTipo('NUMERICO'); setValMinMujeres(''); setValMaxMujeres(''); setValMinHombres(''); setValMaxHombres(''); setOpciones([]); setOpcionInput('') } }
    )
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Agregar parámetro</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input
            placeholder="Nombre del parámetro"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setError('') }}
            className={cn('h-8 text-sm', error && 'border-destructive')}
          />
          {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
        </div>
        <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoParametro); setValMinMujeres(''); setValMaxMujeres(''); setValMinHombres(''); setValMaxHombres(''); setOpciones([]); setOpcionInput(''); setRangoError('') }}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NUMERICO">Numérico</SelectItem>
            <SelectItem value="TEXTO">Texto libre</SelectItem>
            <SelectItem value="BOOLEANO">Sí/No</SelectItem>
            <SelectItem value="TEXTO_OPCIONES">Selección</SelectItem>
          </SelectContent>
        </Select>
        <UnidadSelect
          value={unidad}
          onChange={setUnidad}
          placeholder="Unidad"
          compact
        />
        {tipo === 'NUMERICO' && (
          <RangoReferenciaFields
            valMinMujeres={valMinMujeres} setValMinMujeres={(v) => { setValMinMujeres(v); setRangoError('') }}
            valMaxMujeres={valMaxMujeres} setValMaxMujeres={(v) => { setValMaxMujeres(v); setRangoError('') }}
            valMinHombres={valMinHombres} setValMinHombres={(v) => { setValMinHombres(v); setRangoError('') }}
            valMaxHombres={valMaxHombres} setValMaxHombres={(v) => { setValMaxHombres(v); setRangoError('') }}
            error={rangoError}
            compact
          />
        )}
        {tipo === 'TEXTO_OPCIONES' && (
          <div className="col-span-2 space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium">Opciones válidas</p>
            {opciones.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {opciones.map((op, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-muted">
                    {op}
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setOpciones(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <Input
                placeholder="Nueva opción…"
                value={opcionInput}
                onChange={(e) => setOpcionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = opcionInput.trim()
                    if (v && !opciones.includes(v)) setOpciones(prev => [...prev, v])
                    setOpcionInput('')
                  }
                }}
                className="h-7 text-sm flex-1"
              />
              <Button
                type="button" variant="outline" size="sm" className="h-7 px-2 shrink-0"
                onClick={() => {
                  const v = opcionInput.trim()
                  if (v && !opciones.includes(v)) setOpciones(prev => [...prev, v])
                  setOpcionInput('')
                }}
              ><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAdd}
        disabled={createParametro.isPending}
      >
        {createParametro.isPending ? (
          <><Spinner className="mr-2 h-3.5 w-3.5" /> Guardando…</>
        ) : (
          <><Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} /> Agregar</>
        )}
      </Button>
    </div>
  )
}

/** Bloque reutilizable de 4 inputs para el rango de referencia mujeres/hombres de un parámetro NUMERICO */
function RangoReferenciaFields({
  valMinMujeres,
  setValMinMujeres,
  valMaxMujeres,
  setValMaxMujeres,
  valMinHombres,
  setValMinHombres,
  valMaxHombres,
  setValMaxHombres,
  error,
  compact,
}: {
  valMinMujeres: string
  setValMinMujeres: (v: string) => void
  valMaxMujeres: string
  setValMaxMujeres: (v: string) => void
  valMinHombres: string
  setValMinHombres: (v: string) => void
  valMaxHombres: string
  setValMaxHombres: (v: string) => void
  error?: string
  compact?: boolean
}) {
  const inputClass = compact ? 'h-8 text-sm' : 'text-sm'
  return (
    <div className="col-span-2 grid grid-cols-2 gap-2">
      <p className="col-span-2 text-[11px] font-medium text-muted-foreground">Mujeres</p>
      <Input
        type="number" step="any" placeholder="Mín. mujeres"
        value={valMinMujeres}
        onChange={(e) => setValMinMujeres(e.target.value)}
        className={inputClass}
      />
      <Input
        type="number" step="any" placeholder="Máx. mujeres"
        value={valMaxMujeres}
        onChange={(e) => setValMaxMujeres(e.target.value)}
        className={inputClass}
      />
      <p className="col-span-2 text-[11px] font-medium text-muted-foreground">Hombres</p>
      <Input
        type="number" step="any" placeholder="Mín. hombres"
        value={valMinHombres}
        onChange={(e) => setValMinHombres(e.target.value)}
        className={inputClass}
      />
      <Input
        type="number" step="any" placeholder="Máx. hombres"
        value={valMaxHombres}
        onChange={(e) => setValMaxHombres(e.target.value)}
        className={inputClass}
      />
      {error && (
        <p className="col-span-2 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-[1px] size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
