import { useEffect, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pacienteCreateSchema, pacienteEditSchema, type PacienteFormData, CURP_REGEX } from '../schemas/paciente.schema'
import { useCreatePaciente, useUpdatePaciente, useCambiarInstitucionPaciente } from '../hooks/useCreatePaciente'
import { useGetInstitucionesParaRegistro, useElegibilidadCambioInstitucion } from '../hooks/useGetPacientes'
import {
  TIPO_RECLUTAMIENTO_LABELS,
  ESTADO_CONTACTO_LABELS,
  MEDIO_CONTACTO_LABELS,
  type Paciente,
  type PacienteRequestDTO,
} from '@/types/api'
import { BirthDatePicker, DateTimePicker } from '@/components/ui/date-time-picker'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'

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
  idInstitucion: null,
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
  const puedeSubmit = useAuthStore((s) => s.hasPermiso(paciente ? 'PACIENTES_EDITAR' : 'PACIENTES_CREAR'))
  const isEdit = !!paciente
  const createMutation = useCreatePaciente()
  const updateMutation = useUpdatePaciente()
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

  const disabledDaysOfWeek = useMemo(() => {
    if (!horarioActivo) return undefined
    const days: number[] = []
    if (!horarioActivo.domingo) days.push(0)
    if (!horarioActivo.lunes) days.push(1)
    if (!horarioActivo.martes) days.push(2)
    if (!horarioActivo.miercoles) days.push(3)
    if (!horarioActivo.jueves) days.push(4)
    if (!horarioActivo.viernes) days.push(5)
    if (!horarioActivo.sabado) days.push(6)
    return days.length > 0 ? days : undefined
  }, [horarioActivo])
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(isEdit ? pacienteEditSchema : pacienteCreateSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const { data: institucionesRegistro = [] } = useGetInstitucionesParaRegistro({ enabled: open })
  const { data: elegibilidad } = useElegibilidadCambioInstitucion(paciente?.uuid, { enabled: open && isEdit })
  const cambiarInstitucionMutation = useCambiarInstitucionPaciente()

  // Al editar, la institución solo se puede tocar mientras nada ate al
  // participante a la actual. Ver ParticipanteTitularidadService.
  const institucionBloqueada = isEdit && !elegibilidad?.puedeCambiar

  const idInstitucion = watch('idInstitucion')
  const institucionSeleccionada = useMemo(
    () => institucionesRegistro.find((i) => i.id === idInstitucion),
    [institucionesRegistro, idInstitucion],
  )

  // La institución del usuario viene preseleccionada. Se hace en efecto y no en
  // los valores por omisión porque la lista llega del servidor después de abrir.
  useEffect(() => {
    if (!open || isEdit || idInstitucion != null || institucionesRegistro.length === 0) return
    const propia = institucionesRegistro.find((i) => i.propia) ?? institucionesRegistro[0]
    setValue('idInstitucion', propia.id)
  }, [open, isEdit, idInstitucion, institucionesRegistro, setValue])

  const tipoReclutamiento = watch('tipoReclutamiento')
  const curpValue = (watch('curp') ?? '').trim().toUpperCase()
  const curpFormatoValido = curpValue.length > 0 && CURP_REGEX.test(curpValue)
  const curpFormatoInvalido = curpValue.length > 0 && !CURP_REGEX.test(curpValue)

  useEffect(() => {
    if (open) {
      if (paciente) {
        reset({
          idInstitucion: paciente.institucionId ?? null,
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
          fechaContacto: paciente.reclutamiento?.fechaContacto?.slice(0, 16) ?? '',
        })
      } else {
        reset(DEFAULT_VALUES)
      }
    }
  }, [open, paciente, reset])

  const onSubmit = async (formData: PacienteFormData) => {
    const payload: PacienteRequestDTO = {
      // Solo al registrar: el backend ignora este campo al actualizar.
      idInstitucion: isEdit ? undefined : formData.idInstitucion ?? undefined,
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
      // El cambio de institución va primero y por su propio endpoint: PUT /pacientes
      // ignora ese campo a propósito. Si está bloqueado, el backend lo rechaza y no
      // se toca nada más — más predecible que dejar los datos guardados a medias.
      const cambioInstitucion =
        formData.idInstitucion != null && formData.idInstitucion !== paciente.institucionId
      if (cambioInstitucion) {
        await cambiarInstitucionMutation.mutateAsync({
          uuid: paciente.uuid,
          idInstitucion: formData.idInstitucion as number,
        })
      }
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
                  Fecha y hora de contacto
                </Label>
                <Controller
                  name="fechaContacto"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Selecciona fecha y hora"
                      timeStepMinutes={1}
                      maxDateTime={new Date()}
                      minHour={horarioActivo?.horaInicio ?? 8}
                      maxHour={(horarioActivo?.horaFin ?? 17) - 1}
                      disabledDaysOfWeek={disabledDaysOfWeek}
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

            {/* Institución. Solo aparece si hay más de una opción: con una sola no
                hay nada que elegir. Al editar se muestra pero no se cambia — mover
                a alguien de sede dejaría su historial en la anterior. */}
            {institucionesRegistro.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-[13px]">Institución</Label>
                <Controller
                  name="idInstitucion"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value != null ? String(field.value) : ''}
                      onValueChange={(v) => v && field.onChange(Number(v))}
                      disabled={institucionBloqueada}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccione la institución" />
                      </SelectTrigger>
                      <SelectContent>
                        {institucionesRegistro.map((op) => (
                          <SelectItem key={op.id} value={String(op.id)}>
                            {op.nombre}{op.propia ? ' (la tuya)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {institucionBloqueada ? (
                  <p className="text-[11px] text-amber-600">
                    {elegibilidad?.motivo ??
                      'No se puede cambiar la institución de este participante.'}{' '}
                    Cambiarla dejaría ese historial en la sede anterior.
                  </p>
                ) : isEdit ? (
                  <p className="text-[11px] text-[var(--imss-ink-300)]">
                    Se puede cambiar: el participante todavía no tiene registros que lo aten a
                    su institución actual.
                  </p>
                ) : institucionSeleccionada && !institucionSeleccionada.visible ? (
                  <p className="text-[11px] text-amber-600">
                    Este participante quedará bajo {institucionSeleccionada.nombre} y no aparecerá
                    en tus listados: puedes registrarlo ahí, pero no ves el padrón de esa sede.
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--imss-ink-300)]">
                    Institución a la que pertenecerá el participante.
                  </p>
                )}
              </div>
            )}

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
              disabled={isPending || !puedeSubmit}
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
