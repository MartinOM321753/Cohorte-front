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
import { pacienteFormSchema, type PacienteFormData } from '../schemas/paciente.schema'
import { useCreatePaciente, useUpdatePaciente } from '../hooks/useCreatePaciente'
import type { Paciente, PacienteRequestDTO } from '@/types/api'
import { BirthDatePicker } from '@/components/ui/date-time-picker'

interface PacienteFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paciente?: Paciente | null
}

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
] as const

const DEFAULT_VALUES: PacienteFormData = {
  folio: '',
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  sexo: 'M',
}

export function PacienteFormModal({ open, onOpenChange, paciente }: PacienteFormModalProps) {
  const isEdit = !!paciente
  const createMutation = useCreatePaciente()
  const updateMutation = useUpdatePaciente()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      if (paciente) {
        reset({
          folio: paciente.folio,
          nombre: paciente.persona.nombre,
          apellidoPaterno: paciente.persona.apellidoPaterno,
          apellidoMaterno: paciente.persona.apellidoMaterno ?? '',
          email: paciente.persona.email ?? '',
          telefono: paciente.persona.telefono ?? '',
          fechaNacimiento: paciente.persona.fechaNacimiento?.slice(0, 10) ?? '',
          sexo: paciente.persona.sexo ?? 'M',
        })
      } else {
        reset(DEFAULT_VALUES)
      }
    }
  }, [open, paciente, reset])

  const onSubmit = async (formData: PacienteFormData) => {
    const payload: PacienteRequestDTO = {
      folio: formData.folio,
      persona: {
        nombre: formData.nombre,
        apellidoPaterno: formData.apellidoPaterno,
        apellidoMaterno: formData.apellidoMaterno || undefined,
        email: formData.email || undefined,
        telefono: formData.telefono || undefined,
        fechaNacimiento: formData.fechaNacimiento,
        sexo: formData.sexo,
      },
    }

    if (isEdit && paciente) {
      await updateMutation.mutateAsync({ id: paciente.id, data: payload })
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
            {isEdit ? 'Editar paciente' : 'Registrar nuevo paciente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Sección: Datos del expediente */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos del expediente
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="folio" className="text-[13px]">
                Folio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="folio"
                {...register('folio')}
                sanitize="folio"
                placeholder="ej. C-00184"
                className="h-9 font-mono text-[13px]"
              />
              {errors.folio && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.folio.message}
                </p>
              )}
            </div>
          </div>

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
                  {...register('nombre')}
                  sanitize="nombre"
                  placeholder="ej. Juan Carlos"
                  className="h-9 text-[13px]"
                />
                {errors.nombre && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.nombre.message}
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
                  {...register('apellidoPaterno')}
                  sanitize="apellido"
                  placeholder="ej. Pérez"
                  className="h-9 text-[13px]"
                />
                {errors.apellidoPaterno && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.apellidoPaterno.message}
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
                  {...register('apellidoMaterno')}
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
                  name="fechaNacimiento"
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
                {errors.fechaNacimiento && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.fechaNacimiento.message}
                  </p>
                )}
              </div>

              {/* Sexo */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Sexo <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="sexo"
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
                {errors.sexo && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.sexo.message}
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
                  {...register('telefono')}
                  sanitize="telefono"
                  placeholder="10 dígitos"
                  maxLength={10}
                  className="h-9 text-[13px]"
                />
                {errors.telefono && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.telefono.message}
                  </p>
                )}
              </div>
            </div>

            {/* Correo — ancho completo */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="ej. paciente@correo.com"
                className="h-9 text-[13px]"
              />
              {errors.email && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.email.message}
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
                  : 'Registrar paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
