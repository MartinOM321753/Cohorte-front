import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronsUpDown, Lock, Mail } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { cn } from '@/lib/utils'
import { usuarioSchema, type UsuarioFormData } from '../schemas/usuario.schema'
import { type Usuario, ROL_LABELS } from '../types/usuario.types'
import { useCreateUsuario, useUpdateUsuario } from '../hooks/useMutateUsuario'
import { useGetRoles } from '../hooks/useGetRoles'
import { useGetInstitucionesActivas } from '@/features/instituciones/hooks/useInstituciones'
import { BirthDatePicker } from '@/components/ui/date-time-picker'

// ── Combobox buscable de instituciones (carga completa + filtro cliente) ─────
// Solo se muestran nombre y tipo; el valor real enviado es el UUID (oculto).

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
            'w-full justify-between font-normal h-9 text-[13px]',
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

interface UsuarioFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: Usuario | null
  /**
   * Cuando se provee, el campo de rol se pre-selecciona con este nombre
   * (e.g. "ADMINISTRADOR") y queda bloqueado para el usuario.
   * Solo aplica en creación — al editar siempre se permite cambiar el rol.
   */
  lockedRolNombre?: string
  /**
   * Cuando se provee, el campo de institución se pre-selecciona con este UUID
   * y queda bloqueado (solo lectura). Solo aplica en creación.
   * Útil al crear un admin provisional desde el formulario de institución.
   */
  lockedInstitucionUuid?: string
  /**
   * Callback opcional que se invoca con el usuario recién creado.
   * Permite que el componente padre reaccione (ej. auto-seleccionar el UUID en un combobox).
   */
  onUsuarioCreado?: (usuario: Usuario) => void
}

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
] as const

export function UsuarioFormModal({ open, onOpenChange, usuario, lockedRolNombre, lockedInstitucionUuid, onUsuarioCreado }: UsuarioFormModalProps) {
  const puedeSubmit = useAuthStore((s) => s.hasPermiso(usuario ? 'USUARIOS_EDITAR' : 'USUARIOS_CREAR'))
  const isEdit = !!usuario
  const createMutation = useCreateUsuario()
  const updateMutation = useUpdateUsuario()
  const { data: roles = [], isLoading: rolesLoading } = useGetRoles()
  const { data: instituciones = [], isLoading: institucionesLoading } = useGetInstitucionesActivas()

  // Combobox de instituciones: solo nombre + tipo visibles, el valor real es el UUID
  const institucionOptions = instituciones.map((inst) => ({
    value: inst.uuid,
    label: inst.tipoInstitucion ? `${inst.nombre} · ${inst.tipoInstitucion.nombre}` : inst.nombre,
  }))

  // Institución bloqueada (solo creación desde modal de institución)
  const lockedInstitucion = (lockedInstitucionUuid && !isEdit)
    ? instituciones.find(i => i.uuid === lockedInstitucionUuid) ?? null
    : null

  // UUID del rol que debe quedar bloqueado (solo aplica en creación)
  const lockedRol = (!isEdit && lockedRolNombre)
    ? roles.find((r) => r.nombre === lockedRolNombre)
    : null

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      rolUuid: '',
      institucionUuid: '',
      persona: {
        nombre: '',
        segundoNombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        fechaNacimiento: '',
        sexo: undefined,
        telefono: '',
        email: '',
      },
    },
  })

  useEffect(() => {
    if (open) {
      if (usuario) {
        reset({
          rolUuid: usuario.rol?.uuid ?? '',
          institucionUuid: usuario.institucion?.uuid ?? '',
          persona: {
            nombre: usuario.persona.nombre,
            segundoNombre: usuario.persona.segundoNombre ?? '',
            apellidoPaterno: usuario.persona.apellidoPaterno,
            apellidoMaterno: usuario.persona.apellidoMaterno ?? '',
            fechaNacimiento: usuario.persona.fechaNacimiento?.slice(0, 10) ?? '',
            sexo: usuario.persona.sexo,
            telefono: usuario.persona.telefono ?? '',
            email: usuario.persona.email ?? '',
          },
        })
      } else {
        reset({
          rolUuid: '',
          institucionUuid: '',
          persona: {
            nombre: '',
            segundoNombre: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            fechaNacimiento: '',
            sexo: undefined,
            telefono: '',
            email: '',
          },
        })
      }
    }
  }, [open, usuario, reset])

  // Pre-seleccionar el rol bloqueado:
  // - Cubre el caso en que los roles aún no estaban cargados al abrir el modal
  //   (lockedRol cambia de null → valor cuando termina la query)
  // - Cubre el caso en que los roles YA estaban cacheados al abrir el modal
  //   (open cambia a true con lockedRol ya presente; sin [open] en deps el effect
  //    no re-dispara porque lockedRol no cambió, y el reset previo deja rolUuid = '')
  useEffect(() => {
    if (lockedRol && open) {
      setValue('rolUuid', lockedRol.uuid)
    }
  }, [lockedRol, open, setValue])

  // Pre-set institución bloqueada cuando las instituciones terminen de cargar
  useEffect(() => {
    if (lockedInstitucionUuid && !isEdit && open) {
      setValue('institucionUuid', lockedInstitucionUuid)
    }
  }, [lockedInstitucionUuid, isEdit, open, setValue])

  const onSubmit = async (formData: UsuarioFormData) => {
    const payload = {
      rolUuid: formData.rolUuid,
      institucionUuid: formData.institucionUuid,
      persona: {
        nombre: formData.persona.nombre,
        segundoNombre: formData.persona.segundoNombre || undefined,
        apellidoPaterno: formData.persona.apellidoPaterno,
        apellidoMaterno: formData.persona.apellidoMaterno || undefined,
        fechaNacimiento: formData.persona.fechaNacimiento,
        sexo: formData.persona.sexo,
        telefono: formData.persona.telefono || undefined,
        email: formData.persona.email || '',
      },
    }

    if (isEdit && usuario) {
      await updateMutation.mutateAsync({ id: usuario.id, data: payload })
      onOpenChange(false)
    } else {
      const created = await createMutation.mutateAsync(payload)
      onUsuarioCreado?.(created)
      onOpenChange(false)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--imss-ink-900)]">
            {isEdit ? 'Editar usuario' : 'Registrar nuevo usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Sección: Datos de acceso */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos de acceso
            </p>

            {/* Rol */}
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Rol <span className="text-red-500">*</span>
              </Label>

              {lockedRol && !isEdit ? (
                /* ── Rol bloqueado (alta desde almacén) ── */
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 h-9">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[13px] flex-1">
                    {ROL_LABELS[lockedRol.nombre] ?? lockedRol.nombre}
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    Asignado automáticamente
                  </Badge>
                  {/* Campo oculto para que react-hook-form capture el valor */}
                  <Controller
                    name="rolUuid"
                    control={control}
                    render={({ field }) => (
                      <input type="hidden" {...field} value={lockedRol.uuid} />
                    )}
                  />
                </div>
              ) : (
                /* ── Select normal ── */
                <Controller
                  name="rolUuid"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={rolesLoading}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder={rolesLoading ? 'Cargando roles…' : 'Seleccione un rol'} />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.uuid} value={r.uuid} className="text-[13px]">
                            {ROL_LABELS[r.nombre] ?? r.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}

              {errors.rolUuid && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.rolUuid.message}
                </p>
              )}
            </div>

            {/* Institución */}
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Institución <span className="text-red-500">*</span>
              </Label>
              {lockedInstitucion ? (
                /* ── Institución bloqueada (alta de admin desde formulario de institución) ── */
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 h-9">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[13px] flex-1 truncate">{lockedInstitucion.nombre}</span>
                  <Badge variant="secondary" className="text-[11px]">Provisional</Badge>
                  <Controller
                    name="institucionUuid"
                    control={control}
                    render={({ field }) => (
                      <input type="hidden" {...field} value={lockedInstitucionUuid} />
                    )}
                  />
                </div>
              ) : (
                /* ── Combobox normal ── */
                <Controller
                  name="institucionUuid"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={institucionOptions}
                      disabled={institucionesLoading}
                      placeholder={institucionesLoading ? 'Cargando instituciones…' : 'Seleccione una institución'}
                      searchPlaceholder="Buscar institución por nombre…"
                      emptyText="Sin instituciones activas"
                      hasError={!!errors.institucionUuid}
                    />
                  )}
                />
              )}
              {errors.institucionUuid && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.institucionUuid.message}
                </p>
              )}
            </div>

            {/* Aviso de cuenta automática (solo al crear) */}
            {!isEdit && (
              <Alert className="border-[var(--imss-green-200)] bg-[var(--imss-green-50)] py-3">
                <Mail className="h-4 w-4 text-[var(--imss-green-600)]" />
                <AlertDescription className="text-[12px] text-[var(--imss-green-700)] ml-1">
                  El sistema generará el nombre de usuario y una contraseña segura,
                  y los enviará automáticamente al correo del usuario.
                  En su primer inicio de sesión deberá cambiar la contraseña.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Separador visual */}
          <div className="border-t border-[var(--imss-ink-100)]" />

          {/* Sección: Datos personales */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos personales
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-[13px]">
                  Primer nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  {...register('persona.nombre')}
                  sanitize="nombre"
                  placeholder="ej. Juan"
                  className="h-9 text-[13px]"
                />
                {errors.persona?.nombre && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.nombre.message}
                  </p>
                )}
              </div>

              {/* Segundo nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="segundoNombre" className="text-[13px]">
                  Segundo nombre
                </Label>
                <Input
                  id="segundoNombre"
                  {...register('persona.segundoNombre')}
                  sanitize="nombre"
                  placeholder="ej. Carlos"
                  className="h-9 text-[13px]"
                />
                {errors.persona?.segundoNombre && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.segundoNombre.message}
                  </p>
                )}
              </div>

              {/* Apellido paterno */}
              <div className="space-y-1.5">
                <Label htmlFor="apellidoPaterno" className="text-[13px]">
                  Apellido paterno <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apellidoPaterno"
                  {...register('persona.apellidoPaterno')}
                  sanitize="apellido"
                  placeholder="ej. Pérez"
                  className="h-9 text-[13px]"
                />
                {errors.persona?.apellidoPaterno && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.apellidoPaterno.message}
                  </p>
                )}
              </div>

              {/* Apellido materno */}
              <div className="space-y-1.5">
                <Label htmlFor="apellidoMaterno" className="text-[13px]">
                  Apellido materno
                </Label>
                <Input
                  id="apellidoMaterno"
                  {...register('persona.apellidoMaterno')}
                  sanitize="apellido"
                  placeholder="ej. García"
                  className="h-9 text-[13px]"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Fecha de nacimiento <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="persona.fechaNacimiento"
                  control={control}
                  render={({ field }) => (
                    <BirthDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="DD/MM/AAAA"
                      className="h-9 text-[13px]"
                    />
                  )}
                />
                {errors.persona?.fechaNacimiento && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.fechaNacimiento.message}
                  </p>
                )}
              </div>

              {/* Sexo */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Sexo <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="persona.sexo"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEXO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-[13px]">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.persona?.sexo && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.sexo.message}
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-[13px]">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  {...register('persona.telefono')}
                  sanitize="telefono"
                  placeholder="10 dígitos"
                  maxLength={10}
                  className="h-9 text-[13px]"
                />
                {errors.persona?.telefono && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.telefono.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email — ancho completo */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">
                Correo electrónico <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('persona.email')}
                placeholder="ej. jperez@imss.gob.mx"
                className="h-9 text-[13px]"
              />
              {errors.persona?.email && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.persona.email.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-[13px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !puedeSubmit}
              className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            >
              {isPending
                ? isEdit
                  ? 'Guardando...'
                  : 'Registrando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Registrar usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
