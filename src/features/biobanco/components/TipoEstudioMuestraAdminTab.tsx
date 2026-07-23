/**
 * TipoEstudioMuestraAdminTab
 * Catálogo de tipos y parámetros de estudios de muestras.
 * Espejo de TiposEstudioTab (estudios médicos) pero para muestras.
 */
import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  AlertCircle, ChevronDown, ChevronRight,
  Pencil, Plus, Trash2, ToggleLeft, ToggleRight, X, Check, Loader2,
} from 'lucide-react'

import type { TipoParametro, TipoEstudioMuestra, ParametroEstudioMuestra } from '@/types/api'
import {
  useGetTodosLosTiposEstudioMuestra,
  useCreateTipoEstudioMuestra,
  useUpdateTipoEstudioMuestra,
  useToggleTipoEstudioMuestra,
  useDeleteTipoEstudioMuestra,
  useCreateParametroEstudioMuestra,
  useUpdateParametroEstudioMuestra,
  useDeleteParametroEstudioMuestra,
} from '../hooks/useEstudiosMuestra'
import { UnidadSelect } from '@/components/forms/UnidadSelect'

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

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoParametro, string> = {
  NUMERICO: 'Numérico',
  TEXTO: 'Texto libre',
  BOOLEANO: 'Sí/No',
  TEXTO_OPCIONES: 'Selección',
}

const TIPO_COLORS: Record<TipoParametro, string> = {
  NUMERICO: 'bg-blue-100 text-blue-700 border-blue-200',
  TEXTO: 'bg-slate-100 text-slate-700 border-slate-200',
  BOOLEANO: 'bg-green-100 text-green-700 border-green-200',
  TEXTO_OPCIONES: 'bg-purple-100 text-purple-700 border-purple-200',
}

// ─── Local state types ────────────────────────────────────────────────────────

interface PendingParametro {
  key: string
  nombre: string
  unidad: string
  tipo: TipoParametro
  valorMinimo?: string
  valorMaximo?: string
  opciones?: string[]
}

interface ParametroFormState {
  nombre: string
  unidad: string
  tipo: TipoParametro
  valorMinimo: string
  valorMaximo: string
  opciones: string[]
  opcionInput: string
}

const emptyParamForm = (): ParametroFormState => ({
  nombre: '',
  unidad: '',
  tipo: 'NUMERICO',
  valorMinimo: '',
  valorMaximo: '',
  opciones: [],
  opcionInput: '',
})

// ─── TipoBadge ────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: TipoParametro }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-normal', TIPO_COLORS[tipo])}>
      {TIPO_LABELS[tipo]}
    </Badge>
  )
}

// ─── ParametroFormFields ─────────────────────────────────────────────────────

interface ParametroFormFieldsProps {
  form: ParametroFormState
  onChange: (f: ParametroFormState) => void
  error?: string
}

function ParametroFormFields({ form, onChange, error }: ParametroFormFieldsProps) {
  const set = (key: keyof ParametroFormState, value: string | string[]) =>
    onChange({ ...form, [key]: value })

  const addOpcion = () => {
    const v = form.opcionInput.trim()
    if (!v || form.opciones.includes(v)) return
    onChange({ ...form, opciones: [...form.opciones, v], opcionInput: '' })
  }

  return (
    <div className="space-y-3">
      {/* Nombre */}
      <div className="space-y-1">
        <Label className="text-xs">Nombre *</Label>
        <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej. Concentración DNA" />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <Label className="text-xs">Tipo *</Label>
        <Select value={form.tipo} onValueChange={v => set('tipo', v as TipoParametro)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TIPO_LABELS) as TipoParametro[]).map(t => (
              <SelectItem key={t} value={t} className="text-xs">{TIPO_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unidad */}
      {(form.tipo === 'NUMERICO' || form.tipo === 'TEXTO') && (
        <div className="space-y-1">
          <Label className="text-xs">Unidad</Label>
          <UnidadSelect
            value={form.unidad}
            onChange={v => set('unidad', v)}
            compact
            placeholder="ng/µL, mL, U/L…"
          />
        </div>
      )}

      {/* Rango de referencia */}
      {form.tipo === 'NUMERICO' && (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mín. referencia</Label>
              <Input type="number" step="any" value={form.valorMinimo}
                onChange={e => set('valorMinimo', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Máx. referencia</Label>
              <Input type="number" step="any" value={form.valorMaximo}
                onChange={e => set('valorMaximo', e.target.value)} placeholder="100" />
            </div>
          </div>
          {form.valorMinimo !== '' && form.valorMaximo !== '' &&
            Number(form.valorMaximo) < Number(form.valorMinimo) && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                El máximo no puede ser menor que el mínimo
              </p>
            )}
        </div>
      )}

      {/* Opciones para TEXTO_OPCIONES */}
      {form.tipo === 'TEXTO_OPCIONES' && (
        <div className="space-y-1">
          <Label className="text-xs">Opciones válidas</Label>
          <div className="flex gap-1">
            <Input
              value={form.opcionInput}
              onChange={e => set('opcionInput', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOpcion() } }}
              placeholder="Escribir opción…"
              className="h-7 text-xs"
            />
            <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={addOpcion}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {form.opciones.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {form.opciones.map(op => (
                <Badge key={op} variant="secondary" className="text-xs gap-1">
                  {op}
                  <button onClick={() => onChange({ ...form, opciones: form.opciones.filter(o => o !== op) })}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ParametroRow ─────────────────────────────────────────────────────────────

interface ParametroRowProps {
  parametro: ParametroEstudioMuestra
  idTipo: number
  onDelete: (id: number) => void
  puedeEditar: boolean
}

function ParametroRow({ parametro, idTipo, onDelete, puedeEditar }: ParametroRowProps) {
  const updateMutation = useUpdateParametroEstudioMuestra()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ParametroFormState>(emptyParamForm())
  const [error, setError] = useState('')

  function startEdit() {
    setForm({
      nombre: parametro.nombre,
      unidad: parametro.unidad ?? '',
      tipo: parametro.tipo,
      valorMinimo: parametro.valorMinimo != null ? String(parametro.valorMinimo) : '',
      valorMaximo: parametro.valorMaximo != null ? String(parametro.valorMaximo) : '',
      opciones: parametro.opciones ?? [],
      opcionInput: '',
    })
    setEditing(true)
    setError('')
  }

  function save() {
    const nombre = form.nombre.trim()
    if (!nombre) { setError('El nombre es requerido'); return }
    if (form.tipo === 'TEXTO_OPCIONES' && form.opciones.length === 0) {
      setError('Agrega al menos una opción'); return
    }
    if (form.tipo === 'NUMERICO' && form.valorMinimo !== '' && form.valorMaximo !== '' &&
        Number(form.valorMaximo) < Number(form.valorMinimo)) {
      setError('El máximo no puede ser menor que el mínimo'); return
    }
    updateMutation.mutate({
      id: parametro.id,
      data: {
        idTipoEstudioMuestra: idTipo,
        nombre,
        unidad: form.unidad || undefined,
        tipo: form.tipo,
        valorMinimo: form.tipo === 'NUMERICO' && form.valorMinimo !== '' ? Number(form.valorMinimo) : null,
        valorMaximo: form.tipo === 'NUMERICO' && form.valorMaximo !== '' ? Number(form.valorMaximo) : null,
        opciones: form.tipo === 'TEXTO_OPCIONES' ? form.opciones : [],
      },
    }, { onSuccess: () => setEditing(false) })
  }

  if (editing) {
    return (
      <div className="p-3 border rounded-md bg-muted/30 space-y-3">
        <ParametroFormFields form={form} onChange={setForm} error={error} />
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs gap-1" onClick={save} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Spinner className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            Guardar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancelar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start justify-between py-1.5 px-2 rounded hover:bg-muted/40">
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{parametro.nombre}</span>
          {parametro.unidad && <span className="text-xs text-muted-foreground">({parametro.unidad})</span>}
          <TipoBadge tipo={parametro.tipo} />
        </div>
        {parametro.tipo === 'NUMERICO' && (parametro.valorMinimo != null || parametro.valorMaximo != null) && (
          <p className="text-xs text-muted-foreground">
            Ref: {parametro.valorMinimo ?? '–'} – {parametro.valorMaximo ?? '–'}{parametro.unidad ? ` ${parametro.unidad}` : ''}
          </p>
        )}
        {parametro.tipo === 'TEXTO_OPCIONES' && parametro.opciones && parametro.opciones.length > 0 && (
          <p className="text-xs text-muted-foreground">{parametro.opciones.join(' · ')}</p>
        )}
      </div>
      {puedeEditar && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={startEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(parametro.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── TipoRow ─────────────────────────────────────────────────────────────────

interface TipoRowProps {
  tipo: TipoEstudioMuestra
  expanded: boolean
  onToggleExpand: () => void
  puedeEditar: boolean
  puedeEliminar: boolean
}

function TipoRow({ tipo, expanded, onToggleExpand, puedeEditar, puedeEliminar }: TipoRowProps) {
  const toggleMutation = useToggleTipoEstudioMuestra()
  const deleteTipoMutation = useDeleteTipoEstudioMuestra()
  const createParam = useCreateParametroEstudioMuestra()
  const deleteParam = useDeleteParametroEstudioMuestra()
  const updateTipo = useUpdateTipoEstudioMuestra()

  const [addingParam, setAddingParam] = useState(false)
  const [paramForm, setParamForm] = useState<ParametroFormState>(emptyParamForm())
  const [paramError, setParamError] = useState('')
  const [editingTipo, setEditingTipo] = useState(false)
  const [tipoNombre, setTipoNombre] = useState(tipo.nombre)
  const [tipoDesc, setTipoDesc] = useState(tipo.descripcion ?? '')

  function addParam() {
    const nombre = paramForm.nombre.trim()
    if (!nombre) { setParamError('El nombre es requerido'); return }
    if (paramForm.tipo === 'TEXTO_OPCIONES' && paramForm.opciones.length === 0) {
      setParamError('Agrega al menos una opción'); return
    }
    if (paramForm.tipo === 'NUMERICO' && paramForm.valorMinimo !== '' && paramForm.valorMaximo !== '' &&
        Number(paramForm.valorMaximo) < Number(paramForm.valorMinimo)) {
      setParamError('El máximo no puede ser menor que el mínimo'); return
    }
    createParam.mutate({
      idTipoEstudioMuestra: tipo.id,
      nombre,
      unidad: paramForm.unidad || undefined,
      tipo: paramForm.tipo,
      valorMinimo: paramForm.tipo === 'NUMERICO' && paramForm.valorMinimo !== '' ? Number(paramForm.valorMinimo) : null,
      valorMaximo: paramForm.tipo === 'NUMERICO' && paramForm.valorMaximo !== '' ? Number(paramForm.valorMaximo) : null,
      opciones: paramForm.tipo === 'TEXTO_OPCIONES' ? paramForm.opciones : [],
    }, { onSuccess: () => { setAddingParam(false); setParamForm(emptyParamForm()) } })
  }

  function saveTipo() {
    if (!tipoNombre.trim()) return
    updateTipo.mutate({ id: tipo.id, data: { nombre: tipoNombre.trim(), descripcion: tipoDesc || undefined } },
      { onSuccess: () => setEditingTipo(false) })
  }

  const parametros = tipo.parametros ?? []

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/20">
        <button onClick={onToggleExpand} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className={cn('font-medium truncate', !tipo.activo && 'text-muted-foreground')}>
            {tipo.nombre}
          </span>
          {!tipo.activo && <Badge variant="outline" className="text-xs shrink-0">Inactivo</Badge>}
          <Badge variant="secondary" className="text-xs shrink-0">{parametros.length} param.</Badge>
        </button>
        {puedeEditar && (
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTipo(v => !v)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => toggleMutation.mutate(tipo.id)}
              disabled={toggleMutation.isPending}>
              {tipo.activo
                ? <ToggleRight className="h-4 w-4 text-green-600" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
            {puedeEliminar && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={deleteTipoMutation.isPending}
                    title="Eliminar tipo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar tipo "{tipo.nombre}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán todos sus parámetros. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTipoMutation.mutate(tipo.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {/* Edit tipo */}
      {editingTipo && (
        <div className="px-3 py-2 border-t bg-muted/10 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={tipoNombre} onChange={e => setTipoNombre(e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Input value={tipoDesc} onChange={e => setTipoDesc(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={saveTipo} disabled={updateTipo.isPending}>
              {updateTipo.isPending ? <Spinner className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              Guardar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingTipo(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 py-2 border-t space-y-1">
          {parametros.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">Sin parámetros. Agrega el primero.</p>
          )}
          {parametros.map(p => (
            <ParametroRow key={p.id} parametro={p} idTipo={tipo.id}
              onDelete={(id) => deleteParam.mutate(id)} puedeEditar={puedeEditar} />
          ))}

          {/* Add param form */}
          {tipo.activo && puedeEditar && (
            <>
              {addingParam ? (
                <div className="mt-2 p-3 border rounded-md bg-muted/20 space-y-3">
                  <p className="text-xs font-medium">Nuevo parámetro</p>
                  <ParametroFormFields form={paramForm} onChange={setParamForm} error={paramError} />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={addParam} disabled={createParam.isPending}>
                      {createParam.isPending ? <Spinner className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      Agregar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => { setAddingParam(false); setParamForm(emptyParamForm()); setParamError('') }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 mt-1"
                  onClick={() => setAddingParam(true)}>
                  <Plus className="h-3 w-3" /> Agregar parámetro
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TipoEstudioMuestraAdminTab() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('ESTUDIOS_MUESTRA_CREAR')
  const puedeEditar = hasPermiso('ESTUDIOS_MUESTRA_EDITAR')
  const puedeEliminar = hasPermiso('ESTUDIOS_MUESTRA_ELIMINAR')
  const { data: tipos, isLoading, isError } = useGetTodosLosTiposEstudioMuestra()
  const createTipo = useCreateTipoEstudioMuestra()
  const createParam = useCreateParametroEstudioMuestra()

  const [expandedId, setExpandedId] = useState<number | null>(null)

  // New tipo form
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [pending, setPending] = useState<PendingParametro[]>([])
  const [paramForm, setParamForm] = useState<ParametroFormState>(emptyParamForm())
  const [paramError, setParamError] = useState('')
  const [tipoError, setTipoError] = useState('')

  // Edit pending param inline
  const [pendingEditKey, setPendingEditKey] = useState<string | null>(null)
  const [pendingEditForm, setPendingEditForm] = useState<ParametroFormState>(emptyParamForm())
  const [pendingEditError, setPendingEditError] = useState('')

  const tiposActivos = useMemo(
    () => [...(tipos ?? [])].filter(t => t.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [tipos]
  )
  const tiposInactivos = useMemo(
    () => [...(tipos ?? [])].filter(t => !t.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [tipos]
  )

  function addPending() {
    const n = paramForm.nombre.trim()
    if (!n) { setParamError('El nombre es requerido'); return }
    if (paramForm.tipo === 'TEXTO_OPCIONES' && paramForm.opciones.length === 0) {
      setParamError('Agrega al menos una opción'); return
    }
    if (paramForm.tipo === 'NUMERICO' && paramForm.valorMinimo !== '' && paramForm.valorMaximo !== '' &&
        Number(paramForm.valorMaximo) < Number(paramForm.valorMinimo)) {
      setParamError('El máximo no puede ser menor que el mínimo'); return
    }
    if (pending.some(p => p.nombre.toLowerCase() === n.toLowerCase())) {
      setParamError('Ya existe un parámetro con ese nombre'); return
    }
    setPending(prev => [...prev, {
      key: crypto.randomUUID(),
      nombre: n,
      unidad: paramForm.unidad,
      tipo: paramForm.tipo,
      valorMinimo: paramForm.valorMinimo,
      valorMaximo: paramForm.valorMaximo,
      opciones: paramForm.tipo === 'TEXTO_OPCIONES' ? paramForm.opciones : [],
    }])
    setParamForm(emptyParamForm())
    setParamError('')
  }

  function startEditPending(p: PendingParametro) {
    setPendingEditKey(p.key)
    setPendingEditForm({
      nombre: p.nombre,
      unidad: p.unidad ?? '',
      tipo: p.tipo,
      valorMinimo: p.valorMinimo ?? '',
      valorMaximo: p.valorMaximo ?? '',
      opciones: p.opciones ?? [],
      opcionInput: '',
    })
    setPendingEditError('')
  }

  function savePendingEdit() {
    const n = pendingEditForm.nombre.trim()
    if (!n) { setPendingEditError('El nombre es requerido'); return }
    if (pendingEditForm.tipo === 'TEXTO_OPCIONES' && pendingEditForm.opciones.length === 0) {
      setPendingEditError('Agrega al menos una opción'); return
    }
    if (pendingEditForm.tipo === 'NUMERICO' && pendingEditForm.valorMinimo !== '' && pendingEditForm.valorMaximo !== '' &&
        Number(pendingEditForm.valorMaximo) < Number(pendingEditForm.valorMinimo)) {
      setPendingEditError('El máximo no puede ser menor que el mínimo'); return
    }
    const conflicto = pending.some(p => p.key !== pendingEditKey && p.nombre.toLowerCase() === n.toLowerCase())
    if (conflicto) { setPendingEditError('Ya existe un parámetro con ese nombre'); return }
    setPending(prev => prev.map(x => x.key !== pendingEditKey ? x : {
      ...x,
      nombre: n,
      unidad: pendingEditForm.unidad,
      tipo: pendingEditForm.tipo,
      valorMinimo: pendingEditForm.valorMinimo,
      valorMaximo: pendingEditForm.valorMaximo,
      opciones: pendingEditForm.tipo === 'TEXTO_OPCIONES' ? pendingEditForm.opciones : [],
    }))
    setPendingEditKey(null)
    setPendingEditError('')
  }

  const isSubmitting = createTipo.isPending || createParam.isPending

  async function submitTipo() {
    const n = nombre.trim()
    if (!n) { setTipoError('El nombre es requerido'); return }
    if (pending.length === 0) { setTipoError('Agrega al menos un parámetro'); return }
    setTipoError('')
    try {
      const tipo = await createTipo.mutateAsync({ nombre: n, descripcion: descripcion || undefined })
      // Guardar todos los parámetros pendientes
      for (const p of pending) {
        await createParam.mutateAsync({
          idTipoEstudioMuestra: tipo.id,
          nombre: p.nombre,
          unidad: p.unidad || undefined,
          tipo: p.tipo,
          valorMinimo: p.tipo === 'NUMERICO' && p.valorMinimo !== '' ? Number(p.valorMinimo) : null,
          valorMaximo: p.tipo === 'NUMERICO' && p.valorMaximo !== '' ? Number(p.valorMaximo) : null,
          opciones: p.tipo === 'TEXTO_OPCIONES' ? (p.opciones ?? []) : [],
        })
      }
      setNombre('')
      setDescripcion('')
      setPending([])
      setPendingEditKey(null)
    } catch {
      // error handled by hook toast
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center">
        <Spinner className="h-4 w-4" /> Cargando tipos de estudio de muestra…
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar el catálogo.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* ── Lista de tipos ── */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Tipos de estudio de muestra</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada tipo define los parámetros que se capturan al realizar un estudio en una muestra biológica.
          </p>
        </div>

        {tiposActivos.length === 0 && tiposInactivos.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay tipos configurados. Crea el primero →
          </p>
        )}

        {tiposActivos.map(t => (
          <TipoRow key={t.id} tipo={t}
            expanded={expandedId === t.id}
            onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
            puedeEditar={puedeEditar}
            puedeEliminar={puedeEliminar} />
        ))}

        {tiposInactivos.length > 0 && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Inactivos</p>
            {tiposInactivos.map(t => (
              <TipoRow key={t.id} tipo={t}
                expanded={expandedId === t.id}
                onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
                puedeEditar={puedeEditar}
                puedeEliminar={puedeEliminar} />
            ))}
          </>
        )}
      </div>

      {/* ── Crear nuevo tipo ── */}
      {puedeCrear && <Card className="p-4 h-fit space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Nuevo tipo de estudio</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Nombre + sus parámetros de captura.</p>
        </div>

        <div className="space-y-3">
          {/* Nombre */}
          <div className="space-y-1">
            <Label className="text-xs">Nombre *</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="ej. Cuantificación de DNA" />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción del tipo de estudio…" rows={2} className="text-sm resize-none" />
          </div>

          {/* Parámetros pendientes */}
          {pending.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Parámetros a agregar ({pending.length})</Label>
              {pending.map(p => (
                <div key={p.key}>
                  {pendingEditKey === p.key ? (
                    /* Modo edición inline */
                    <div className="p-3 border rounded-md bg-muted/20 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Editando parámetro</p>
                      <ParametroFormFields form={pendingEditForm} onChange={setPendingEditForm} error={pendingEditError} />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={savePendingEdit}>
                          <Check className="h-3 w-3" /> Guardar cambios
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => { setPendingEditKey(null); setPendingEditError('') }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Vista normal */
                    <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/40 text-xs group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{p.nombre}</span>
                        <TipoBadge tipo={p.tipo} />
                        {p.unidad && <span className="text-muted-foreground">({p.unidad})</span>}
                        {p.tipo === 'NUMERICO' && p.valorMinimo !== '' && p.valorMaximo !== '' && (
                          <span className="text-muted-foreground">ref: {p.valorMinimo}–{p.valorMaximo}</span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditPending(p)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setPending(prev => prev.filter(x => x.key !== p.key))}
                          className="text-destructive hover:text-destructive/80 p-0.5 rounded"
                          title="Eliminar"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar parámetro */}
          <Separator />
          <p className="text-xs font-medium">Agregar parámetro</p>
          <ParametroFormFields form={paramForm} onChange={setParamForm} error={paramError} />
          <Button type="button" size="sm" variant="outline" className="w-full gap-1 h-7 text-xs" onClick={addPending}>
            <Plus className="h-3 w-3" /> Agregar a la lista
          </Button>

          {tipoError && (
            <p className="text-xs text-destructive">{tipoError}</p>
          )}

          <Button className="w-full" size="sm" onClick={submitTipo} disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Creando…</>
              : 'Crear tipo de estudio'
            }
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Los parámetros adicionales se pueden agregar después expandiendo el tipo en la lista.
          </AlertDescription>
        </Alert>
      </Card>}
    </div>
  )
}
