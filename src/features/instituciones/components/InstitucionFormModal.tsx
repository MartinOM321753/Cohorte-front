import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
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
import { Switch } from '@/components/ui/switch'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Building2, Check, ChevronsUpDown, Loader2, MapPin, MapPinned, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ESTADOS_MX, getMunicipiosByEstado } from '@/data/mexico-estados'
import {
  useCreateInstitucion,
  useUpdateInstitucion,
  useGetInstitucionesActivas,
  useGetTiposInstitucionActivas,
} from '../hooks/useInstituciones'
import { useGetAdministradoresDisponibles } from '@/features/usuarios/hooks/useGetUsuarios'
import { UsuarioFormModal } from '@/features/usuarios/components/UsuarioFormModal'
import { useAuthStore } from '@/stores/authStore'
import { Institucion } from '@/types/api'
import type { Usuario } from '@/features/usuarios/types/usuario.types'

const MapLocationPicker = lazy(() =>
  import('./MapLocationPicker').then(m => ({ default: m.MapLocationPicker })),
)

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre:           z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  idTipoInstitucion:z.number({ invalid_type_error: 'Selecciona un tipo de institución' }).int().positive('Selecciona un tipo de institución'),
  idInstitucionPadre: z.number().int().positive().nullable().optional(),
  estado:           z.string().trim().min(1, 'El estado es obligatorio').max(60, 'Máximo 60 caracteres'),
  ciudad:           z.string().trim().min(1, 'La ciudad es obligatoria').max(60, 'Máximo 60 caracteres'),
  direccion:        z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  responsable:      z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  telefono:         z.string().trim().max(20, 'Máximo 20 caracteres').optional(),
  latitud:          z.union([z.number(), z.null()]).optional()
    .refine(v => v == null || (v >= -90 && v <= 90), 'Latitud entre -90 y 90'),
  longitud:         z.union([z.number(), z.null()]).optional()
    .refine(v => v == null || (v >= -180 && v <= 180), 'Longitud entre -180 y 180'),
  uuidEncargado:    z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

interface InstitucionFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  institucion: Institucion | null
}

// ── Tiny searchable combobox (carga completa + filtro cliente) ───────────────

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

  // No usamos modal={true} aquí porque el Dialog padre ya gestiona el comportamiento
  // modal (scroll lock, focus trap). Usar modal={true} en el Popover hace que el
  // DismissableLayer del Dialog quede con pointer-events:none, lo que rompe la
  // detección de clics internos y hace que onSelect nunca actualice el estado.
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
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o, i) => (
                <CommandItem
                  key={o.value || `__empty-${i}__`}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
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

// ── Component ─────────────────────────────────────────────────────────────────

export function InstitucionFormModal({ open, onOpenChange, institucion }: InstitucionFormModalProps) {
  const isEditing = !!institucion
  const createMutation = useCreateInstitucion()
  const updateMutation = useUpdateInstitucion()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [tieneBiobanco, setTieneBiobanco] = useState(false)
  const [activo, setActivo] = useState(true)
  // Estado del mini-modal para crear un administrador nuevo
  const [showCrearAdmin, setShowCrearAdmin] = useState(false)
  const [showMap, setShowMap] = useState(false)

  // Catálogos para selects (cargar lista activa completa + filtrar en cliente)
  const { data: tipos = [] } = useGetTiposInstitucionActivas({ enabled: open })
  const { data: institucionesActivas = [] } = useGetInstitucionesActivas({ enabled: open })

  // Solo ADMINISTRADORs activos sin asignación de encargado.
  // En modo edición se pasa el UUID de la institución actual para que el encargado
  // ya asignado siga apareciendo en el selector (no quede invisible).
  const {
    data: encargadosDisponibles = [],
    isLoading: loadingEncargados,
    isError: errorEncargados,
  } = useGetAdministradoresDisponibles({
    enabled: open,
    institucionUuid: institucion?.uuid ?? null,
  })

  const padresDisponibles = useMemo(
    () => institucionesActivas.filter(i => !institucion || i.id !== institucion.id),
    [institucionesActivas, institucion],
  )

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
    defaultValues: {
      nombre: '', idTipoInstitucion: undefined as unknown as number, idInstitucionPadre: null,
      estado: '', ciudad: '', direccion: '', responsable: '', telefono: '',
      latitud: null, longitud: null, uuidEncargado: null,
    },
  })

  const estadoSeleccionado = watch('estado')
  const municipios = useMemo(() => getMunicipiosByEstado(estadoSeleccionado ?? ''), [estadoSeleccionado])
  const estadoOptions = useMemo(() => ESTADOS_MX.map(e => ({ value: e.nombre, label: e.nombre })), [])
  const ciudadOptions = useMemo(() => municipios.map(m => ({ value: m.nombre, label: m.nombre })), [municipios])

  const tipoOptions = useMemo(() => tipos.map(t => ({ value: String(t.id), label: t.nombre })), [tipos])
  const padreOptions = useMemo(
    () => [{ value: '', label: 'Ninguna (institución raíz)' }, ...padresDisponibles.map(i => ({ value: String(i.id), label: i.nombre }))],
    [padresDisponibles],
  )
  const encargadoOptions = useMemo(
    () => [
      { value: '', label: 'Sin encargado asignado' },
      ...encargadosDisponibles.map(u => ({
        value: u.UUID,
        label: u.persona
          ? `${[u.persona.nombre, u.persona.segundoNombre, u.persona.apellidoPaterno].filter(Boolean).join(' ')} (@${u.username})`
          : `@${u.username}`,
      })),
    ],
    [encargadosDisponibles],
  )

  // Cuando se crea un nuevo admin desde aquí:
  // 1. Invalida la query de administradores disponibles para que el nuevo aparezca
  // 2. Auto-selecciona el nuevo admin en el campo de encargado
  const handleAdminCreado = (nuevoAdmin: Usuario) => {
    queryClient.invalidateQueries({ queryKey: ['usuarios', 'administradores-disponibles'] })
    setValue('uuidEncargado', nuevoAdmin.UUID || null)
  }

  const latitud = watch('latitud')
  const longitud = watch('longitud')
  const mapsHref = (latitud != null && longitud != null)
    ? `https://www.google.com/maps?q=${latitud},${longitud}`
    : null

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && institucion) {
      reset({
        nombre: institucion.nombre,
        idTipoInstitucion: institucion.tipoInstitucion?.id ?? (undefined as unknown as number),
        idInstitucionPadre: institucion.institucionPadre?.id ?? null,
        estado: institucion.estado,
        ciudad: institucion.ciudad,
        direccion: institucion.direccion ?? '',
        responsable: institucion.responsable ?? '',
        telefono: institucion.telefono ?? '',
        latitud: institucion.latitud ?? null,
        longitud: institucion.longitud ?? null,
        uuidEncargado: institucion.encargado?.uuid ?? null,
      })
      setTieneBiobanco(!!institucion.tieneBiobanco)
      setActivo(institucion.activo)
    } else if (open && !institucion) {
      reset({
        nombre: '', idTipoInstitucion: undefined as unknown as number, idInstitucionPadre: null,
        estado: '', ciudad: '', direccion: '', responsable: '', telefono: '',
        latitud: null, longitud: null, uuidEncargado: null,
      })
      setTieneBiobanco(false)
      setActivo(true)
    }
  }, [open, institucion, reset])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    reset()
    setTieneBiobanco(false)
    setActivo(true)
    setShowMap(false)
    onOpenChange(false)
  }

  const onSubmit = async (data: FormData) => {
    const payload = {
      nombre: data.nombre,
      idTipoInstitucion: data.idTipoInstitucion,
      idInstitucionPadre: data.idInstitucionPadre ?? null,
      latitud: data.latitud ?? null,
      longitud: data.longitud ?? null,
      estado: data.estado,
      ciudad: data.ciudad,
      direccion: data.direccion,
      responsable: data.responsable,
      telefono: data.telefono,
      uuidEncargado: data.uuidEncargado ?? null,
      tieneBiobanco,
      activo,
    }

    try {
      if (isEditing && institucion) {
        await updateMutation.mutateAsync({ id: institucion.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      handleClose()
    } catch (_) {}
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto"
        // Evitar que el Dialog cierre al interactuar con Popovers/Comboboxes
        // que portalean fuera del DOM del Dialog. El Dialog tiene botones X y
        // Cancelar explícitos, por lo que bloquear el cierre por clic externo
        // es la UX correcta para un formulario con campos desplegables.
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? 'Editar Institución' : 'Nueva Institución'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los datos de la institución del catálogo.'
              : 'Registra una nueva institución dentro de la jerarquía del sistema (hospital, unidad, laboratorio, etc.).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Nombre + Tipo ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input {...register('nombre')} sanitize="alfanumerico" placeholder="Ej: Hospital General de Zona No. 1" maxLength={100} />
              {errors.nombre && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.nombre.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo <span className="text-destructive">*</span></Label>
              <Controller
                name="idTipoInstitucion"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className={cn(errors.idTipoInstitucion && 'border-destructive')}>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.idTipoInstitucion && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.idTipoInstitucion.message}
                </p>
              )}
            </div>
          </div>

          {/* Institución padre ───────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Institución superior (jerarquía)</Label>
            <Controller
              name="idInstitucionPadre"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value != null ? String(field.value) : ''}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={padreOptions}
                  placeholder="Selecciona institución superior"
                  searchPlaceholder="Buscar institución..."
                  emptyText="Sin resultados"
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Déjalo vacío si esta institución es de nivel raíz (no depende de otra).
            </p>
          </div>

          {/* Estado + Ciudad ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado <span className="text-destructive">*</span></Label>
              <Controller
                name="estado"
                control={control}
                render={({ field }) => (
                  <Combobox
                    value={field.value ?? ''}
                    onChange={(v) => {
                      if (v !== field.value) setValue('ciudad', '')
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
            <div className="space-y-2">
              <Label>Ciudad / Municipio <span className="text-destructive">*</span></Label>
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
            <Input {...register('direccion')} sanitize="descripcion" placeholder="Calle, número, colonia..." maxLength={200} />
          </div>

          {/* Coordenadas + Mapa ────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Ubicación geográfica (opcional)
            </Label>

            {!showMap && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Latitud (-90 a 90)"
                      {...register('latitud', {
                        setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                      })}
                    />
                    {errors.latitud && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                        {errors.latitud.message as string}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Longitud (-180 a 180)"
                      {...register('longitud', {
                        setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                      })}
                    />
                    {errors.longitud && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                        {errors.longitud.message as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!estadoSeleccionado}
                    onClick={() => setShowMap(true)}
                  >
                    <MapPinned className="h-3.5 w-3.5" />
                    Ubicar en el mapa
                  </Button>
                  {!estadoSeleccionado && (
                    <span className="text-xs text-muted-foreground">Selecciona un estado primero</span>
                  )}
                  {mapsHref && (
                    <a href={mapsHref} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2">
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              </>
            )}

            {showMap && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[350px] rounded-md border bg-muted/30">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <MapLocationPicker
                  estado={estadoSeleccionado ?? ''}
                  ciudad={watch('ciudad') ?? ''}
                  initialLat={latitud ?? null}
                  initialLng={longitud ?? null}
                  onConfirm={(lat, lng) => {
                    setValue('latitud', lat, { shouldValidate: true })
                    setValue('longitud', lng, { shouldValidate: true })
                    setShowMap(false)
                  }}
                  onCancel={() => setShowMap(false)}
                />
              </Suspense>
            )}
          </div>

          {/* Responsable + Teléfono ──────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsable de contacto</Label>
              <Input {...register('responsable')} sanitize="nombre" placeholder="Nombre del contacto" maxLength={100} />
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

          {/* Encargado ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Encargado de la institución</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setShowCrearAdmin(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Crear administrador
              </Button>
            </div>
            <Controller
              name="uuidEncargado"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v || null)}
                  options={encargadoOptions}
                  placeholder={loadingEncargados ? 'Cargando administradores…' : 'Selecciona encargado'}
                  searchPlaceholder="Buscar administrador..."
                  emptyText="Sin administradores disponibles"
                  disabled={loadingEncargados}
                />
              )}
            />
            {errorEncargados ? (
              <p className="text-xs text-destructive">
                Error al cargar administradores — refresca la página e intenta de nuevo.
              </p>
            ) : !loadingEncargados && encargadosDisponibles.length === 0 ? (
              <p className="text-xs text-amber-600">
                No hay administradores activos sin asignación — usa "Crear administrador" para crear uno.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Solo administradores activos sin institución a cargo.
              </p>
            )}
          </div>

          {/* Switches ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Tiene biobanco</p>
                <p className="text-xs text-muted-foreground">Habilita módulos de almacenamiento.</p>
              </div>
              <Switch checked={tieneBiobanco} onCheckedChange={setTieneBiobanco} />
            </div>
            {isEditing && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Activa</p>
                  <p className="text-xs text-muted-foreground">Determina si puede operar en el sistema.</p>
                </div>
                <Switch checked={activo} onCheckedChange={setActivo} />
              </div>
            )}
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

      {/* Mini-modal para crear un administrador directamente desde este formulario.
          El admin se crea con la institución del usuario registrador (provisional);
          al guardar la institución con ese admin como encargado, el backend migra
          automáticamente la institución del admin a la nueva institución. */}
      <UsuarioFormModal
        open={showCrearAdmin}
        onOpenChange={setShowCrearAdmin}
        lockedRolNombre="ADMINISTRADOR"
        lockedInstitucionUuid={user?.institucion?.uuid ?? ''}
        onUsuarioCreado={handleAdminCreado}
      />
    </Dialog>
  )
}
