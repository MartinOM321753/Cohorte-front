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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pacienteCreateSchema, pacienteEditSchema, type PacienteFormData, CURP_REGEX } from '../schemas/paciente.schema'
import { useCreatePaciente, useUpdatePaciente } from '../hooks/useCreatePaciente'
import {
  TIPO_RECLUTAMIENTO_LABELS,
  ESTADO_CONTACTO_LABELS,
  MEDIO_CONTACTO_LABELS,
  type Paciente,
  type PacienteRequestDTO,
} from '@/types/api'
import { BirthDatePicker, DatePicker } from '@/components/ui/date-time-picker'

interface PacienteFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paciente?: Paciente | null
}

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
] as const

const TIPO_RECLUTAMIENTO_OPTIONS = (
  Object.entries(TIPO_RECLUTAMIENTO_LABELS) as [keyof typeof TIPO_RECLUTAMIENTO_LABELS, string][]
).map(([value, label]) => ({ value, label }))

const ESTADO_CONTACTO_OPTIONS = (
  Object.entries(ESTADO_CONTACTO_LABELS) as [keyof typeof ESTADO_CONTACTO_LABELS, string][]
).map(([value, label]) => ({ value, label }))

// "OTRO" se excluye intencionalmente de las opciones seleccionables: el medio
// de contacto debe quedar siempre claramente identificado para fines de seguimiento.
const MEDIO_CONTACTO_OPTIONS = (
  Object.entries(MEDIO_CONTACTO_LABELS) as [keyof typeof MEDIO_CONTACTO_LABELS, string][]
).filter(([value]) => value !== 'OTRO')
  .map(([value, label]) => ({ value, label }))

const DEFAULT_VALUES: PacienteFormData = {
  folio: '',
  nombre: '',
  segundoNombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  curp: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  sexo: 'M',
  tipoReclutamiento: 'NUEVO',
  estadoContacto: null,
  medioContacto: null,
  observaciones: '',
  fechaContacto: '',
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(isEdit ? pacienteEditSchema : pacienteCreateSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const tipoReclutamiento = watch('tipoReclutamiento')
  const curpValue = (watch('curp') ?? '').trim().toUpperCase()
  const curpFormatoValido = curpValue.length > 0 && CURP_REGEX.test(curpValue)
  const curpFormatoInvalido = curpValue.length > 0 && !CURP_REGEX.test(curpValue)

  useEffect(() => {
    if (open) {
      if (paciente) {
        reset({
          folio: paciente.folio,
          nombre: paciente.persona.nombre,
          segundoNombre: paciente.persona.segundoNombre ?? '',
          apellidoPaterno: paciente.persona.apellidoPaterno,
          apellidoMaterno: paciente.persona.apellidoMaterno ?? '',
          curp: paciente.persona.curp ?? '',
          email: paciente.persona.email ?? '',
          telefono: paciente.persona.telefono ?? '',
          fechaNacimiento: paciente.persona.fechaNacimiento?.slice(0, 10) ?? '',
          sexo: paciente.persona.sexo ?? 'M',
          tipoReclutamiento: paciente.reclutamiento?.tipoReclutamiento ?? 'NUEVO',

          estadoContacto: paciente.reclutamiento?.estadoContacto ?? null,
          medioContacto: paciente.reclutamiento?.medioContacto ?? null,
          observaciones: paciente.reclutamiento?.observaciones ?? '',
          fechaContacto: paciente.reclutamiento?.fechaContacto?.slice(0, 10) ?? '',
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
        segundoNombre: formData.segundoNombre || undefined,
        apellidoPaterno: formData.apellidoPaterno,
        apellidoMaterno: formData.apellidoMaterno || undefined,
        curp: formData.curp || undefined,
        email: formData.email || undefined,
        telefono: formData.telefono || undefined,
        fechaNacimiento: formData.fechaNacimiento || undefined,
        sexo: formData.sexo || undefined,
      },
      reclutamiento: {
        tipoReclutamiento: formData.tipoReclutamiento,
        estadoContacto: formData.tipoReclutamiento === 'RETORNO' ? formData.estadoContacto || undefined : undefined,
        medioContacto: formData.medioContacto || undefined,
        observaciones: formData.observaciones || undefined,
        fechaContacto: formData.fechaContacto || undefined,
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
            {isEdit ? 'Editar participante' : 'Registrar nuevo participante'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Sección: Clasificación de reclutamiento (primero, define el origen del registro) */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Clasificación de reclutamiento
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Tipo de reclutamiento */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="tipoReclutamiento"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPO_RECLUTAMIENTO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-[13px]">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipoReclutamiento && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.tipoReclutamiento.message}
                  </p>
                )}
              </div>

              {/* Estado de contacto — solo para RETORNO */}
              {tipoReclutamiento === 'RETORNO' && (
                <div className="space-y-1.5">
                  <Label className="text-[13px]">
                    Resultado del contacto <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="estadoContacto"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADO_CONTACTO_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-[13px]">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.estadoContacto && (
                    <p className="text-[11px] text-[var(--status-danger-fg)]">
                      {errors.estadoContacto.message}
                    </p>
                  )}
                </div>
              )}

              {/* Medio de contacto */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Medio de contacto
                </Label>
                <Controller
                  name="medioContacto"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIO_CONTACTO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-[13px]">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Fecha de contacto */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Fecha de contacto
                </Label>
                <Controller
                  name="fechaContacto"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="DD/MM/AAAA"
                      className="h-9 text-[13px]"
                      maxDate={new Date()}
                    />
                  )}
                />
              </div>
            </div>

            {/* Observaciones — ancho completo */}
            <div className="space-y-1.5">
              <Label htmlFor="observaciones" className="text-[13px]">
                Observaciones
              </Label>
              <Textarea
                id="observaciones"
                {...register('observaciones')}
                sanitize="descripcion"
                placeholder="Notas sobre el reclutamiento o contacto del participante…"
                className="min-h-[72px] text-[13px]"
              />
              {errors.observaciones && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.observaciones.message}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--imss-ink-100)]" />

          {/* Sección: Datos del expediente */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos del expediente
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="folio" className="text-[13px]">
                Folio
              </Label>
              <Input
                id="folio"
                {...register('folio')}
                sanitize="folio"
                placeholder="Déjelo en blanco para asignar automáticamente (ej. 000001)"
                className="h-9 font-mono text-[13px] uppercase placeholder:normal-case placeholder:font-sans"
                style={{ textTransform: 'uppercase' }}
                onInput={(e) => {
                  const input = e.currentTarget
                  const pos = input.selectionStart
                  input.value = input.value.toUpperCase()
                  if (pos !== null) input.setSelectionRange(pos, pos)
                }}
              />
              <p className="text-[11px] text-[var(--imss-ink-300)]">
                Opcional: solo si el participante ya cuenta con un folio de seguimiento previo. Si se deja vacío, el sistema asignará el siguiente folio numérico global disponible (formato 000001).
              </p>
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
                  Primer nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  {...register('nombre')}
                  sanitize="nombre"
                  placeholder="ej. Juan"
                  className="h-9 text-[13px]"
                />
                {errors.nombre && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.nombre.message}
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
                  {...register('segundoNombre')}
                  sanitize="nombre"
                  placeholder="ej. Carlos"
                  className="h-9 text-[13px]"
                />
                {errors.segundoNombre && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.segundoNombre.message}
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

              {/* CURP */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="curp" className="text-[13px]">
                  CURP {isEdit && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="curp"
                  {...register('curp')}
                  placeholder="ej. GARC850101HDFRRL09"
                  maxLength={18}
                  className="h-9 font-mono text-[13px] uppercase"
                  style={{ textTransform: 'uppercase' }}
                  onInput={(e) => {
                    const input = e.currentTarget
                    const pos = input.selectionStart
                    input.value = input.value.toUpperCase()
                    if (pos !== null) input.setSelectionRange(pos, pos)
                  }}
                />
                {!isEdit && (
                  <p className="text-[11px] text-[var(--imss-ink-300)]">
                    Opcional al registrar. Será obligatorio al editar el expediente.
                  </p>
                )}
                {curpFormatoValido && !errors.curp && (
                  <span className="text-[11px] text-green-600">✓ Formato válido</span>
                )}
                {curpFormatoInvalido && !errors.curp && (
                  <span className="text-[11px] text-[var(--status-danger-fg)]">✗ Formato no válido</span>
                )}
                {errors.curp && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.curp.message}
                  </p>
                )}
              </div>

              {/* Fecha de nacimiento */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Fecha de nacimiento {isEdit ? <span className="text-red-500">*</span> : null}
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
                  Sexo {isEdit ? <span className="text-red-500">*</span> : null}
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
                placeholder="ej. participante@correo.com"
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
                  : 'Registrar participante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
