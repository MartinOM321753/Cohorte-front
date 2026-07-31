import { useEffect, useState, useMemo } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
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
  AlertCircle,
  Building2,
  Search,
  UserPlus,
  X,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { useCreateAlmacen, useUpdateAlmacen, useGetUsuariosByRol } from '../hooks/useBiobanco'
import { Almacen, TipoInstitucion, TIPO_INSTITUCION_LABELS } from '@/types/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UsuarioFormModal } from '@/features/usuarios/components/UsuarioFormModal'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ESTADOS_MX, getMunicipiosByEstado } from '@/data/mexico-estados'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre:     z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  estado:     z.string().trim().min(1, 'El estado es obligatorio').max(60, 'Máximo 60 caracteres'),
  ciudad:     z.string().trim().min(1, 'La ciudad es obligatoria').max(60, 'Máximo 60 caracteres'),
  direccion:  z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  responsable:z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  telefono:   z.string().trim().max(20, 'Máximo 20 caracteres').optional(),
})

type FormData = z.infer<typeof schema>

interface AlmacenFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  almacen: Almacen | null
}

// ── Tiny searchable combobox ──────────────────────────────────────────────────

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
  const selected = options.find(o => o.value === value)

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
              {options.map(o => (
                <CommandItem
                  key={o.value}
                  value={o.label}          /* cmdk filtra por este campo */
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

export function AlmacenFormModal({ open, onOpenChange, almacen }: AlmacenFormModalProps) {
  const isEditing = !!almacen
  const createMutation = useCreateAlmacen()
  const updateMutation = useUpdateAlmacen()
  const queryClient = useQueryClient()

  const [uuidEncargado, setUuidEncargado] = useState<string | null>(null)
  const [encargadoError, setEncargadoError] = useState<string | null>(null)
  const [searchEncargado, setSearchEncargado] = useState('')
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [tipoInstitucion, setTipoInstitucion] = useState<TipoInstitucion>('OTRA')

  const { data: encargados = [] } = useGetUsuariosByRol('ENCARGADO', { enabled: open })

  const filteredEncargados = useMemo(() => {
    if (!searchEncargado.trim()) return encargados
    const q = searchEncargado.toLowerCase()
    return encargados.filter(u => {
      const nombre = [u.persona.nombre, u.persona.segundoNombre, u.persona.apellidoPaterno, u.persona.apellidoMaterno].filter(Boolean).join(' ').toLowerCase()
      return nombre.includes(q) || u.username.toLowerCase().includes(q)
    })
  }, [encargados, searchEncargado])

  const selectedEncargado = encargados.find(u => u.uuid === uuidEncargado) ?? null

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', estado: '', ciudad: '', direccion: '', responsable: '', telefono: '' },
  })

  const estadoSeleccionado = watch('estado')

  // Municipios reactivos al estado elegido
  const municipios = useMemo(
    () => getMunicipiosByEstado(estadoSeleccionado ?? ''),
    [estadoSeleccionado],
  )

  // Opciones para los comboboxes
  const estadoOptions = useMemo(
    () => ESTADOS_MX.map(e => ({ value: e.nombre, label: e.nombre })),
    [],
  )
  const ciudadOptions = useMemo(
    () => municipios.map(m => ({ value: m.nombre, label: m.nombre })),
    [municipios],
  )

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && almacen) {
      reset({
        nombre:      almacen.nombre,
        estado:      almacen.estado,
        ciudad:      almacen.ciudad,
        direccion:   almacen.direccion ?? '',
        responsable: almacen.responsable ?? '',
        telefono:    almacen.telefono ?? '',
      })
      setUuidEncargado(almacen.encargado?.uuid ?? null)
      setTipoInstitucion(almacen.tipo ?? 'OTRA')
    } else if (open && !almacen) {
      reset({ nombre: '', estado: '', ciudad: '', direccion: '', responsable: '', telefono: '' })
      setUuidEncargado(null)
      setTipoInstitucion('OTRA')
    }
    setSearchEncargado('')
    setEncargadoError(null)
  }, [open, almacen, reset])

  // ciudad se limpia solo cuando el usuario cambia estado manualmente (ver onChange del Combobox)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    reset()
    setUuidEncargado(null)
    setSearchEncargado('')
    setEncargadoError(null)
    setTipoInstitucion('OTRA')
    onOpenChange(false)
  }

  const handleSelectEncargado = (uuid: string) => {
    setUuidEncargado(uuid)
    setSearchEncargado('')
    setEncargadoError(null)
  }

  const handleClearEncargado = () => {
    setUuidEncargado(null)
  }

  const onSubmit = async (data: FormData) => {
    if (!uuidEncargado) {
      setEncargadoError('El encargado del almacén es obligatorio')
      return
    }
    setEncargadoError(null)

    try {
      if (isEditing && almacen) {
        await updateMutation.mutateAsync({
          id: almacen.id,
          data: { ...data, activo: almacen.activo, uuidEncargado, tipo: tipoInstitucion, tieneBiobanco: true },
        })
      } else {
        await createMutation.mutateAsync({ ...data, activo: true, uuidEncargado, tipo: tipoInstitucion, tieneBiobanco: true })
      }
      handleClose()
    } catch (_) {}
  }

  const handleUserCreated = () => {
    setShowCreateUser(false)
    queryClient.invalidateQueries({ queryKey: ['usuarios-rol', 'ENCARGADO'] })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isEditing ? 'Editar Institución' : 'Nueva Institución'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Actualiza los datos de la institución externa.'
                : 'Registra una institución externa (INMEGEN, INSP, hospital, laboratorio) a la que se pueden trasladar muestras.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Nombre + Tipo ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-2">
                <Label>
                  Nombre de la institución <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register('nombre')}
                  sanitize="texto"
                  placeholder="Ej: INMEGEN Coahuila"
                  maxLength={100}
                />
                {errors.nombre && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.nombre.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <Select value={tipoInstitucion} onValueChange={(v) => setTipoInstitucion(v as TipoInstitucion)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_INSTITUCION_LABELS) as TipoInstitucion[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_INSTITUCION_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estado + Ciudad ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Estado */}
              <div className="space-y-2">
                <Label>
                  Estado <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="estado"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={(v) => {
                        if (v !== field.value) setValue('ciudad', '') // limpiar ciudad solo al cambiar estado
                        field.onChange(v)
                      }}
                      options={estadoOptions}
                      placeholder="Selecciona estado"
                      searchPlaceholder="Buscar estado..."
                      emptyText="Estado no encontrado"
                      hasError={!!errors.estado}
                    />
                  )}
                />
                {errors.estado && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.estado.message}
                  </p>
                )}
              </div>

              {/* Ciudad (dependiente del estado) */}
              <div className="space-y-2">
                <Label>
                  Ciudad / Municipio <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="ciudad"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={ciudadOptions}
                      placeholder={estadoSeleccionado ? 'Selecciona ciudad' : 'Primero elige estado'}
                      searchPlaceholder="Buscar municipio..."
                      emptyText="Municipio no encontrado"
                      disabled={!estadoSeleccionado}
                      hasError={!!errors.ciudad}
                    />
                  )}
                />
                {errors.ciudad && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.ciudad.message}
                  </p>
                )}
              </div>
            </div>

            {/* Dirección ───────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                {...register('direccion')}
                sanitize="descripcion"
                placeholder="Calle, número, colonia..."
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                Máximo 200 caracteres
              </p>
            </div>

            {/* Responsable + Teléfono ──────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Responsable de contacto</Label>
                <Input
                  {...register('responsable')}
                  sanitize="nombre"
                  placeholder="Nombre del contacto"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  {...register('telefono')}
                  placeholder="10 dígitos"
                  maxLength={10}
                  inputMode="tel"
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.value = el.value.replace(/[^0-9+\-\s()]/g, '')
                  }}
                />
              </div>
            </div>

            {/* Encargado de la institución ────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Encargado de la institución <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setShowCreateUser(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo encargado
                </Button>
              </div>

              {selectedEncargado ? (
                <div className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40',
                  encargadoError && 'border-destructive',
                )}>
                  <div>
                    <p className="text-sm font-medium">
                      {[selectedEncargado.persona.nombre, selectedEncargado.persona.segundoNombre, selectedEncargado.persona.apellidoPaterno].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">@{selectedEncargado.username}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleClearEncargado}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className={cn('rounded-md border', encargadoError && 'border-destructive')}>
                  <div className="relative border-b">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar encargado..."
                      className="border-0 pl-8 h-8 rounded-b-none focus-visible:ring-0"
                      value={searchEncargado}
                      onChange={e => setSearchEncargado(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-[120px]">
                    {filteredEncargados.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {encargados.length === 0 ? 'No hay encargados registrados' : 'Sin resultados'}
                      </p>
                    ) : (
                      filteredEncargados.map(u => (
                        <button
                          key={u.uuid}
                          type="button"
                          onClick={() => handleSelectEncargado(u.uuid)}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
                            uuidEncargado === u.uuid && 'bg-muted',
                          )}
                        >
                          <div className="text-left">
                            <p className="font-medium">
                              {[u.persona.nombre, u.persona.segundoNombre, u.persona.apellidoPaterno].filter(Boolean).join(' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                          {uuidEncargado === u.uuid && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}

              {encargadoError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {encargadoError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Solo usuarios activos con rol ENCARGADO. Campo obligatorio. El encargado podrá gestionar traslados desde la institución.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing ? 'Actualizando...' : 'Creando...'
                  : isEditing ? 'Actualizar' : 'Registrar Institución'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de nuevo encargado con rol ENCARGADO bloqueado */}
      <UsuarioFormModal
        open={showCreateUser}
        onOpenChange={open => { if (!open) handleUserCreated() }}
        lockedRolNombre="ENCARGADO"
      />
    </>
  )
}
