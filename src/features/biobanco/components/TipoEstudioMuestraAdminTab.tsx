/**
 * TipoEstudioMuestraAdminTab
 * Catálogo de tipos y parámetros de estudios de muestras.
 * Espejo de TiposEstudioTab (estudios médicos) pero para muestras.
 */
import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  AlertCircle, ArrowUpDown, ChevronDown, ChevronRight,
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
  useReordenarParametrosEstudioMuestra,
} from '../hooks/useEstudiosMuestra'

import { ReordenarParametros } from '@/features/estudios/components/ReordenarParametros'
import { UnidadSelect } from '@/components/forms/UnidadSelect'
import { OpcionesEditor } from '@/components/forms/OpcionesEditor'

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
  valorMinMujeres?: string
  valorMaxMujeres?: string
  valorMinHombres?: string
  valorMaxHombres?: string
  opciones?: string[]
}

interface ParametroFormState {
  nombre: string
  unidad: string
  tipo: TipoParametro
  valorMinMujeres: string
  valorMaxMujeres: string
  valorMinHombres: string
  valorMaxHombres: string
  opciones: string[]
  opcionInput: string
}

const emptyParamForm = (): ParametroFormState => ({
  nombre: '',
  unidad: '',
  tipo: 'NUMERICO',
  valorMinMujeres: '',
  valorMaxMujeres: '',
  valorMinHombres: '',
  valorMaxHombres: '',
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

  return (
    <div className="space-y-3">
      {/* Nombre */}
      <div className="space-y-1">
        <Label className="text-xs">Nombre *</Label>
        <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej. Concentración DNA" maxLength={100} />
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

      {/* Rangos de referencia por sexo */}
      {form.tipo === 'NUMERICO' && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Mujeres</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mín.</Label>
              <Input type="number" step="any" value={form.valorMinMujeres}
                onChange={e => set('valorMinMujeres', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Máx.</Label>
              <Input type="number" step="any" value={form.valorMaxMujeres}
                onChange={e => set('valorMaxMujeres', e.target.value)} placeholder="100" />
            </div>
          </div>
          {form.valorMinMujeres !== '' && form.valorMaxMujeres !== '' &&
            Number(form.valorMaxMujeres) < Number(form.valorMinMujeres) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                El máximo no puede ser menor que el mínimo (mujeres)
              </p>
            )}
          <p className="text-[11px] font-medium text-muted-foreground">Hombres</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mín.</Label>
              <Input type="number" step="any" value={form.valorMinHombres}
                onChange={e => set('valorMinHombres', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Máx.</Label>
              <Input type="number" step="any" value={form.valorMaxHombres}
                onChange={e => set('valorMaxHombres', e.target.value)} placeholder="100" />
            </div>
          </div>
          {form.valorMinHombres !== '' && form.valorMaxHombres !== '' &&
            Number(form.valorMaxHombres) < Number(form.valorMinHombres) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                El máximo no puede ser menor que el mínimo (hombres)
              </p>
            )}
        </div>
      )}

      {/* Opciones para TEXTO_OPCIONES */}
      {form.tipo === 'TEXTO_OPCIONES' && (
        <OpcionesEditor
          opciones={form.opciones}
          onChange={opciones => onChange({ ...form, opciones })}
          placeholder="Escribir opción…"
        />
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
      valorMinMujeres: parametro.valorMinMujeres != null ? String(parametro.valorMinMujeres) : '',
      valorMaxMujeres: parametro.valorMaxMujeres != null ? String(parametro.valorMaxMujeres) : '',
      valorMinHombres: parametro.valorMinHombres != null ? String(parametro.valorMinHombres) : '',
      valorMaxHombres: parametro.valorMaxHombres != null ? String(parametro.valorMaxHombres) : '',
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
      setError('Agregue al menos una opción'); return
    }
    if (form.tipo === 'NUMERICO') {
      if (form.valorMinMujeres !== '' && form.valorMaxMujeres !== '' &&
          Number(form.valorMaxMujeres) < Number(form.valorMinMujeres)) {
        setError('El máximo no puede ser menor que el mínimo (mujeres)'); return
      }
      if (form.valorMinHombres !== '' && form.valorMaxHombres !== '' &&
          Number(form.valorMaxHombres) < Number(form.valorMinHombres)) {
        setError('El máximo no puede ser menor que el mínimo (hombres)'); return
      }
    }
    updateMutation.mutate({
      id: parametro.id,
      data: {
        idTipoEstudioMuestra: idTipo,
        nombre,
        unidad: form.unidad || undefined,
        tipo: form.tipo,
        valorMinMujeres: form.tipo === 'NUMERICO' && form.valorMinMujeres !== '' ? Number(form.valorMinMujeres) : null,
        valorMaxMujeres: form.tipo === 'NUMERICO' && form.valorMaxMujeres !== '' ? Number(form.valorMaxMujeres) : null,
        valorMinHombres: form.tipo === 'NUMERICO' && form.valorMinHombres !== '' ? Number(form.valorMinHombres) : null,
        valorMaxHombres: form.tipo === 'NUMERICO' && form.valorMaxHombres !== '' ? Number(form.valorMaxHombres) : null,
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
        {parametro.tipo === 'NUMERICO' && (parametro.valorMinMujeres != null || parametro.valorMaxMujeres != null ||
          parametro.valorMinHombres != null || parametro.valorMaxHombres != null) && (
          <div className="text-xs text-muted-foreground space-y-0">
            {(parametro.valorMinMujeres != null || parametro.valorMaxMujeres != null) && (
              <p>M: {parametro.valorMinMujeres ?? '–'} – {parametro.valorMaxMujeres ?? '–'}{parametro.unidad ? ` ${parametro.unidad}` : ''}</p>
            )}
            {(parametro.valorMinHombres != null || parametro.valorMaxHombres != null) && (
              <p>H: {parametro.valorMinHombres ?? '–'} – {parametro.valorMaxHombres ?? '–'}{parametro.unidad ? ` ${parametro.unidad}` : ''}</p>
            )}
          </div>
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
  const reordenarParams = useReordenarParametrosEstudioMuestra()
  const [reordenando, setReordenando] = useState(false)
  const updateTipo = useUpdateTipoEstudioMuestra()

  const [addingParam, setAddingParam] = useState(false)
  const [paramForm, setParamForm] = useState<ParametroFormState>(emptyParamForm())
  const [paramError, setParamError] = useState('')
  const [editingTipo, setEditingTipo] = useState(false)
  const [tipoNombre, setTipoNombre] = useState(tipo.nombre)
  const [tipoDesc, setTipoDesc] = useState(tipo.descripcion ?? '')
  const [tipoCaptura, setTipoCaptura] = useState<'NORMAL' | 'GRUPOS'>(
    (tipo.tipoCapturaDefecto as 'NORMAL' | 'GRUPOS') || 'NORMAL'
  )

  function addParam() {
    const nombre = paramForm.nombre.trim()
    if (!nombre) { setParamError('El nombre es requerido'); return }
    if (paramForm.tipo === 'TEXTO_OPCIONES' && paramForm.opciones.length === 0) {
      setParamError('Agregue al menos una opción'); return
    }
    if (paramForm.tipo === 'NUMERICO') {
      if (paramForm.valorMinMujeres !== '' && paramForm.valorMaxMujeres !== '' &&
          Number(paramForm.valorMaxMujeres) < Number(paramForm.valorMinMujeres)) {
        setParamError('El máximo no puede ser menor que el mínimo (mujeres)'); return
      }
      if (paramForm.valorMinHombres !== '' && paramForm.valorMaxHombres !== '' &&
          Number(paramForm.valorMaxHombres) < Number(paramForm.valorMinHombres)) {
        setParamError('El máximo no puede ser menor que el mínimo (hombres)'); return
      }
    }
    createParam.mutate({
      idTipoEstudioMuestra: tipo.id,
      nombre,
      unidad: paramForm.unidad || undefined,
      tipo: paramForm.tipo,
      valorMinMujeres: paramForm.tipo === 'NUMERICO' && paramForm.valorMinMujeres !== '' ? Number(paramForm.valorMinMujeres) : null,
      valorMaxMujeres: paramForm.tipo === 'NUMERICO' && paramForm.valorMaxMujeres !== '' ? Number(paramForm.valorMaxMujeres) : null,
      valorMinHombres: paramForm.tipo === 'NUMERICO' && paramForm.valorMinHombres !== '' ? Number(paramForm.valorMinHombres) : null,
      valorMaxHombres: paramForm.tipo === 'NUMERICO' && paramForm.valorMaxHombres !== '' ? Number(paramForm.valorMaxHombres) : null,
      opciones: paramForm.tipo === 'TEXTO_OPCIONES' ? paramForm.opciones : [],
    }, { onSuccess: () => { setAddingParam(false); setParamForm(emptyParamForm()) } })
  }

  function saveTipo() {
    if (!tipoNombre.trim()) return
    updateTipo.mutate({ id: tipo.id, data: { nombre: tipoNombre.trim(), descripcion: tipoDesc || undefined, tipoCapturaDefecto: tipoCaptura } },
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
          {tipo.tipoCapturaDefecto === 'GRUPOS' && (
            <Badge variant="secondary" className="text-xs shrink-0">Grupos</Badge>
          )}
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
                    disabled={deleteTipoMutation.isPending || !!tipo.tieneResultados}
                    title={tipo.tieneResultados ? 'No se puede eliminar: tiene estudios registrados' : 'Eliminar tipo'}
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
              <Input value={tipoNombre} onChange={e => setTipoNombre(e.target.value)} maxLength={100} className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Modo de captura</Label>
              <Select value={tipoCaptura} onValueChange={v => setTipoCaptura(v as 'NORMAL' | 'GRUPOS')} disabled={!!tipo.tieneResultados}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL" className="text-xs">Normal</SelectItem>
                  <SelectItem value="GRUPOS" className="text-xs">Por grupos</SelectItem>
                </SelectContent>
              </Select>
              {tipo.tieneResultados && (
                <p className="text-[11px] text-muted-foreground">No se puede cambiar: tiene estudios registrados</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={tipoDesc} onChange={e => setTipoDesc(e.target.value)} maxLength={1000} className="text-xs resize-none" placeholder="Opcional" rows={2} />
            {tipoDesc.length > 900 && (
              <p className="text-[11px] text-muted-foreground text-right">{tipoDesc.length}/1000</p>
            )}
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
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px]">
              Modo: {tipo.tipoCapturaDefecto === 'GRUPOS' ? 'Por grupos' : 'Normal'}
            </Badge>
            {tipo.tieneResultados && (
              <Badge variant="secondary" className="text-[10px] text-amber-600">
                Tiene resultados — modo y parámetros bloqueados
              </Badge>
            )}
          </div>
          {parametros.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">Sin parámetros. Agregue el primero.</p>
          )}

          {reordenando ? (
            <ReordenarParametros
              parametros={parametros}
              guardando={reordenarParams.isPending}
              onGuardar={(ids) =>
                reordenarParams.mutate(
                  { idTipo: tipo.id, ids },
                  { onSuccess: () => setReordenando(false) }
                )
              }
              onCancelar={() => setReordenando(false)}
            />
          ) : (
            parametros.map(p => (
              <ParametroRow key={p.id} parametro={p} idTipo={tipo.id}
                onDelete={(id) => deleteParam.mutate(id)} puedeEditar={puedeEditar && !tipo.tieneResultados} />
            ))
          )}

          {/*
            Reordenar sustituye a la lista mientras dura: arrastrar una fila que
            también se abre para editar acaba en una cosa o en la otra según
            cuánto se movió el cursor.
          */}
          {!reordenando && puedeEditar && parametros.length > 1 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mt-2"
              onClick={() => setReordenando(true)}>
              <ArrowUpDown className="h-3.5 w-3.5" /> Reordenar parámetros
            </Button>
          )}

          {/* Add param form */}
          {tipo.activo && puedeEditar && !reordenando && (
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
  const [tipoCapturaDefecto, setTipoCapturaDefecto] = useState<'NORMAL' | 'GRUPOS'>('NORMAL')
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
      setParamError('Agregue al menos una opción'); return
    }
    if (paramForm.tipo === 'NUMERICO') {
      if (paramForm.valorMinMujeres !== '' && paramForm.valorMaxMujeres !== '' &&
          Number(paramForm.valorMaxMujeres) < Number(paramForm.valorMinMujeres)) {
        setParamError('El máximo no puede ser menor que el mínimo (mujeres)'); return
      }
      if (paramForm.valorMinHombres !== '' && paramForm.valorMaxHombres !== '' &&
          Number(paramForm.valorMaxHombres) < Number(paramForm.valorMinHombres)) {
        setParamError('El máximo no puede ser menor que el mínimo (hombres)'); return
      }
    }
    if (pending.some(p => p.nombre.toLowerCase() === n.toLowerCase())) {
      setParamError('Ya existe un parámetro con ese nombre'); return
    }
    setPending(prev => [...prev, {
      key: crypto.randomUUID(),
      nombre: n,
      unidad: paramForm.unidad,
      tipo: paramForm.tipo,
      valorMinMujeres: paramForm.valorMinMujeres,
      valorMaxMujeres: paramForm.valorMaxMujeres,
      valorMinHombres: paramForm.valorMinHombres,
      valorMaxHombres: paramForm.valorMaxHombres,
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
      valorMinMujeres: p.valorMinMujeres ?? '',
      valorMaxMujeres: p.valorMaxMujeres ?? '',
      valorMinHombres: p.valorMinHombres ?? '',
      valorMaxHombres: p.valorMaxHombres ?? '',
      opciones: p.opciones ?? [],
      opcionInput: '',
    })
    setPendingEditError('')
  }

  function savePendingEdit() {
    const n = pendingEditForm.nombre.trim()
    if (!n) { setPendingEditError('El nombre es requerido'); return }
    if (pendingEditForm.tipo === 'TEXTO_OPCIONES' && pendingEditForm.opciones.length === 0) {
      setPendingEditError('Agregue al menos una opción'); return
    }
    if (pendingEditForm.tipo === 'NUMERICO') {
      if (pendingEditForm.valorMinMujeres !== '' && pendingEditForm.valorMaxMujeres !== '' &&
          Number(pendingEditForm.valorMaxMujeres) < Number(pendingEditForm.valorMinMujeres)) {
        setPendingEditError('El máximo no puede ser menor que el mínimo (mujeres)'); return
      }
      if (pendingEditForm.valorMinHombres !== '' && pendingEditForm.valorMaxHombres !== '' &&
          Number(pendingEditForm.valorMaxHombres) < Number(pendingEditForm.valorMinHombres)) {
        setPendingEditError('El máximo no puede ser menor que el mínimo (hombres)'); return
      }
    }
    const conflicto = pending.some(p => p.key !== pendingEditKey && p.nombre.toLowerCase() === n.toLowerCase())
    if (conflicto) { setPendingEditError('Ya existe un parámetro con ese nombre'); return }
    setPending(prev => prev.map(x => x.key !== pendingEditKey ? x : {
      ...x,
      nombre: n,
      unidad: pendingEditForm.unidad,
      tipo: pendingEditForm.tipo,
      valorMinMujeres: pendingEditForm.valorMinMujeres,
      valorMaxMujeres: pendingEditForm.valorMaxMujeres,
      valorMinHombres: pendingEditForm.valorMinHombres,
      valorMaxHombres: pendingEditForm.valorMaxHombres,
      opciones: pendingEditForm.tipo === 'TEXTO_OPCIONES' ? pendingEditForm.opciones : [],
    }))
    setPendingEditKey(null)
    setPendingEditError('')
  }

  const isSubmitting = createTipo.isPending || createParam.isPending

  async function submitTipo() {
    const n = nombre.trim()
    if (!n) { setTipoError('El nombre es requerido'); return }
    if (pending.length === 0) { setTipoError('Agregue al menos un parámetro'); return }
    setTipoError('')
    try {
      const tipo = await createTipo.mutateAsync({ nombre: n, descripcion: descripcion || undefined, tipoCapturaDefecto })
      // Guardar todos los parámetros pendientes
      for (const p of pending) {
        await createParam.mutateAsync({
          idTipoEstudioMuestra: tipo.id,
          nombre: p.nombre,
          unidad: p.unidad || undefined,
          tipo: p.tipo,
          valorMinMujeres: p.tipo === 'NUMERICO' && p.valorMinMujeres !== '' ? Number(p.valorMinMujeres!) : null,
          valorMaxMujeres: p.tipo === 'NUMERICO' && p.valorMaxMujeres !== '' ? Number(p.valorMaxMujeres!) : null,
          valorMinHombres: p.tipo === 'NUMERICO' && p.valorMinHombres !== '' ? Number(p.valorMinHombres!) : null,
          valorMaxHombres: p.tipo === 'NUMERICO' && p.valorMaxHombres !== '' ? Number(p.valorMaxHombres!) : null,
          opciones: p.tipo === 'TEXTO_OPCIONES' ? (p.opciones ?? []) : [],
        })
      }
      setNombre('')
      setDescripcion('')
      setTipoCapturaDefecto('NORMAL')
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
              placeholder="ej. Cuantificación de DNA" maxLength={100} />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción del tipo de estudio…" rows={2} maxLength={1000} className="text-sm resize-none" />
          </div>

          {/* Modo de captura */}
          <div className="space-y-1">
            <Label className="text-xs">Modo de captura predeterminado</Label>
            <Select value={tipoCapturaDefecto} onValueChange={v => setTipoCapturaDefecto(v as 'NORMAL' | 'GRUPOS')}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL" className="text-xs">Normal</SelectItem>
                <SelectItem value="GRUPOS" className="text-xs">Por grupos</SelectItem>
              </SelectContent>
            </Select>
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
                        {p.tipo === 'NUMERICO' && (p.valorMinMujeres !== '' || p.valorMinHombres !== '') && (
                          <span className="text-muted-foreground">
                            {p.valorMinMujeres !== '' && `M: ${p.valorMinMujeres}–${p.valorMaxMujeres}`}
                            {p.valorMinMujeres !== '' && p.valorMinHombres !== '' && ' · '}
                            {p.valorMinHombres !== '' && `H: ${p.valorMinHombres}–${p.valorMaxHombres}`}
                          </span>
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
