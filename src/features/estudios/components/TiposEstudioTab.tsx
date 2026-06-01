import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Hash,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

import { TipoParametro, TipoEstudioRequestDTO } from '@/types/api'
import { tipoEstudioSchema, type TipoEstudioFormData } from '../schemas/estudio.schema'
import {
  useCreateParametroEstudio,
  useCreateTipoEstudio,
  useDeleteParametroEstudio,
  useGetTodosLosTipos,
  useToggleTipoEstudio,
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
import { cn } from '@/lib/utils'
import { UnidadSelect } from '@/components/forms/UnidadSelect'

interface PendingParametro {
  key: string
  nombre: string
  unidad: string
  tipo: TipoParametro
}

const TIPO_LABELS: Record<TipoParametro, string> = {
  NUMERICO: 'Numérico',
  TEXTO: 'Texto',
  BOOLEANO: 'Booleano',
}

const DEFAULT_TIPO: TipoEstudioFormData = { nombre: '', descripcion: '' }

export function TiposEstudioTab() {
  const { data: tipos, isLoading, isError } = useGetTodosLosTipos()
  const createTipo = useCreateTipoEstudio()
  const toggleTipo = useToggleTipoEstudio()
  const createParametro = useCreateParametroEstudio()
  const deleteParametro = useDeleteParametroEstudio()

  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Pending parameters before submitting the new tipo
  const [pending, setPending] = useState<PendingParametro[]>([])
  const [paramNombre, setParamNombre] = useState('')
  const [paramUnidad, setParamUnidad] = useState('')
  const [paramTipo, setParamTipo] = useState<TipoParametro>('NUMERICO')
  const [paramError, setParamError] = useState('')
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
    setParamError('')
    setParamListError('')
    setPending((prev) => [
      ...prev,
      { key: crypto.randomUUID(), nombre: trimmed, unidad: paramUnidad.trim(), tipo: paramTipo },
    ])
    setParamNombre('')
    setParamUnidad('')
    setParamTipo('NUMERICO')
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
      <Card className="lg:col-span-3">
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
                  onDeleteParametro={(id) => deleteParametro.mutate(id)}
                  isDeletingParametro={deleteParametro.isPending}
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
                      onDeleteParametro={(id) => deleteParametro.mutate(id)}
                      isDeletingParametro={deleteParametro.isPending}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {/* RIGHT — create new tipo + pending params */}
      <Card className="lg:col-span-2">
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
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input
                  placeholder="Nombre del parámetro"
                  value={paramNombre}
                  onChange={(e) => { setParamNombre(e.target.value); setParamError('') }}
                  className={cn(paramError && 'border-destructive')}
                />
                {paramError && <p className="mt-1 text-xs text-destructive">{paramError}</p>}
              </div>
              <Select value={paramTipo} onValueChange={(v) => setParamTipo(v as TipoParametro)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMERICO">Numérico</SelectItem>
                  <SelectItem value="TEXTO">Texto</SelectItem>
                  <SelectItem value="BOOLEANO">Booleano</SelectItem>
                </SelectContent>
              </Select>
              <UnidadSelect
                value={paramUnidad}
                onChange={setParamUnidad}
                placeholder="Unidad (opcional)"
                compact
              />
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
      </Card>
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
  onDeleteParametro,
  isDeletingParametro,
}: {
  tipo: import('@/types/api').TipoEstudio
  expandedId: number | null
  onToggleExpand: (id: number | null) => void
  onToggleActivo: () => void
  isTogglingActivo: boolean
  onDeleteParametro: (id: number) => void
  isDeletingParametro: boolean
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
          {tipo.descripcion && (
            <span className="truncate text-xs text-muted-foreground">{tipo.descripcion}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {parametros.length} param.
          </Badge>
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
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3">
          {parametros.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin parámetros definidos.</p>
          ) : (
            <div className="space-y-1.5">
              {parametros.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                    <span className="font-medium">{p.nombre}</span>
                    {p.unidad && (
                      <span className="font-mono text-xs text-muted-foreground">({p.unidad})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {TIPO_LABELS[p.tipo]}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDeleteParametro(p.id)}
                      disabled={isDeletingParametro}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Only allow adding params to active tipos */}
          {tipo.activo && <AddParametroInline tipoId={tipo.id} />}
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

/** Inline add-parameter form rendered inside an expanded tipo row */
function AddParametroInline({ tipoId }: { tipoId: number }) {
  const createParametro = useCreateParametroEstudio()
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('')
  const [tipo, setTipo] = useState<TipoParametro>('NUMERICO')
  const [error, setError] = useState('')

  function handleAdd() {
    const trimmed = nombre.trim()
    if (!trimmed) { setError('Requerido'); return }
    setError('')
    createParametro.mutate(
      { idTipoEstudio: tipoId, nombre: trimmed, unidad: unidad.trim() || undefined, tipo },
      { onSuccess: () => { setNombre(''); setUnidad(''); setTipo('NUMERICO') } }
    )
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Agregar parámetro</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input
            placeholder="Nombre del parámetro"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setError('') }}
            className={cn('h-8 text-sm', error && 'border-destructive')}
          />
          {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
        </div>
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoParametro)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NUMERICO">Numérico</SelectItem>
            <SelectItem value="TEXTO">Texto</SelectItem>
            <SelectItem value="BOOLEANO">Booleano</SelectItem>
          </SelectContent>
        </Select>
        <UnidadSelect
          value={unidad}
          onChange={setUnidad}
          placeholder="Unidad"
          compact
        />
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
