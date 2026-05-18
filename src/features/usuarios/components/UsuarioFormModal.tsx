import { useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usuarioSchema, type UsuarioFormData } from '../schemas/usuario.schema'
import { type Usuario, ROLES_SISTEMA } from '../types/usuario.types'
import { useCreateUsuario, useUpdateUsuario } from '../hooks/useMutateUsuario'

interface UsuarioFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: Usuario | null
}

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
] as const

export function UsuarioFormModal({ open, onOpenChange, usuario }: UsuarioFormModalProps) {
  const isEdit = !!usuario
  const createMutation = useCreateUsuario()
  const updateMutation = useUpdateUsuario()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      username: '',
      password: '',
      idRol: undefined,
      persona: {
        nombre: '',
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
          username: usuario.username,
          password: '',
          idRol: usuario.rol?.id,
          persona: {
            nombre: usuario.persona.nombre,
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
          username: '',
          password: '',
          idRol: undefined,
          persona: {
            nombre: '',
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

  const onSubmit = async (formData: UsuarioFormData) => {
    const payload = {
      username: formData.username,
      password: formData.password,
      idRol: formData.idRol,
      persona: {
        nombre: formData.persona.nombre,
        apellidoPaterno: formData.persona.apellidoPaterno,
        apellidoMaterno: formData.persona.apellidoMaterno || undefined,
        fechaNacimiento: formData.persona.fechaNacimiento,
        sexo: formData.persona.sexo,
        telefono: formData.persona.telefono || undefined,
        email: formData.persona.email || undefined,
      },
    }

    if (isEdit && usuario) {
      await updateMutation.mutateAsync({ id: usuario.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }

    onOpenChange(false)
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
          {/* Sección: Datos de la cuenta */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos de acceso
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[13px]">
                  Usuario <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="ej. jperez"
                  className="h-9 text-[13px]"
                />
                {errors.username && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="idRol"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES_SISTEMA.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)} className="text-[13px]">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.idRol && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.idRol.message}
                  </p>
                )}
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px]">
                {isEdit ? 'Nueva contraseña' : 'Contraseña'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder={isEdit ? 'Ingrese la nueva contraseña' : 'Mínimo 8 caracteres'}
                className="h-9 text-[13px]"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.password.message}
                </p>
              )}
            </div>
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
                  Nombre(s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  {...register('persona.nombre')}
                  placeholder="ej. Juan Carlos"
                  className="h-9 text-[13px]"
                />
                {errors.persona?.nombre && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.persona.nombre.message}
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
                  placeholder="ej. García"
                  className="h-9 text-[13px]"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div className="space-y-1.5">
                <Label htmlFor="fechaNacimiento" className="text-[13px]">
                  Fecha de nacimiento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  {...register('persona.fechaNacimiento')}
                  className="h-9 text-[13px]"
                  max={new Date().toISOString().slice(0, 10)}
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
                Correo electrónico
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
              disabled={isPending}
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
