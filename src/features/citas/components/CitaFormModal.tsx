import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { citaFormSchema, ESTADOS_CITA, type CitaFormData } from '../schemas/cita.schema'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'
import { useGetUsuarios } from '@/features/users/hooks/useGetUsuarios'
import { useCreateCita, useUpdateCita } from '../hooks/useCitas'
import { getCitaStartDate, getCitaDurationMinutes } from '../lib/citaUtils'
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
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getFullName } from '@/lib/utils'
import type { Cita, Paciente, Usuario } from '@/types/api'

interface CitaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPacienteUUID?: string
  initialFechaCita?: string
  initialDuracionMinutos?: number
  initialObservaciones?: string
  cita?: Cita | null
}

function safeTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function toLocalDateTimeInput(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

function getPacienteUUID(p: Paciente): string {
  return p.UUID || (p as any).uuid || ''
}

function getUsuarioNombreCompleto(u: Usuario): string {
  const p = u.persona
  if (p?.nombre) {
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')
  }
  return u.username
}

export function CitaFormModal({
  open,
  onOpenChange,
  initialPacienteUUID,
  initialFechaCita,
  initialDuracionMinutos,
  initialObservaciones,
  cita,
}: CitaFormModalProps) {
  const isEdit = !!cita

  const { data: pacientesRaw, isLoading: pacientesLoading } = useGetPacientes({ activos: true })
  const { data: usuariosRaw, isLoading: usuariosLoading } = useGetUsuarios({ activo: true })

  const createCita = useCreateCita()
  const updateCita = useUpdateCita()

  const pacientes: Paciente[] = useMemo(
    () => (Array.isArray(pacientesRaw) ? pacientesRaw : []),
    [pacientesRaw],
  )

  const medicos: Usuario[] = useMemo(() => {
    const all: Usuario[] = Array.isArray(usuariosRaw) ? usuariosRaw : []
    return all.filter((u) => {
      const rolNombre =
        typeof u?.rol === 'string'
          ? u.rol
          : typeof (u?.rol as any)?.nombre === 'string'
            ? (u?.rol as any).nombre
            : ''
      return String(rolNombre).toUpperCase().includes('MEDICO')
    })
  }, [usuariosRaw])

  const isPast = useMemo(() => {
    if (!isEdit || !cita) return false
    const start = getCitaStartDate(cita)
    return !!start && start < new Date()
  }, [isEdit, cita])

  const defaultValues = useMemo((): CitaFormData => {
    if (isEdit && cita) {
      const start = getCitaStartDate(cita)
      return {
        pacienteUUID: cita.pacienteUUID || cita.paciente?.uuid || '',
        usuarioAgendaUUID: cita.usuarioAgendaUUID || cita.usuarioAgenda?.uuid || '',
        fechaCita: start ? toLocalDateTimeInput(start) : '',
        duracionMinutos: getCitaDurationMinutes(cita),
        observaciones: cita.observaciones ?? '',
        estadoCita: cita.estadoCita,
      }
    }
    return {
      pacienteUUID: initialPacienteUUID ?? '',
      usuarioAgendaUUID: '',
      fechaCita: initialFechaCita ?? '',
      duracionMinutos: initialDuracionMinutos ?? 60,
      observaciones: initialObservaciones ?? '',
      estadoCita: undefined,
    }
  }, [isEdit, cita, initialPacienteUUID, initialFechaCita, initialDuracionMinutos, initialObservaciones])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CitaFormData>({
    resolver: zodResolver(citaFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) reset(defaultValues)
  }, [open, reset, defaultValues])

  const onSubmit = (data: CitaFormData) => {
    const timezone = safeTimezone()

    if (isEdit && cita) {
      updateCita.mutate(
        {
          uuid: cita.uuid,
          data: {
            startAtLocal: data.fechaCita || undefined,
            timezone,
            durationMinutes: data.duracionMinutos,
            estadoCita: data.estadoCita,
            observaciones: data.observaciones?.trim() || undefined,
          },
        },
        { onSuccess: () => onOpenChange(false) },
      )
      return
    }

    createCita.mutate(
      {
        pacienteUUID: data.pacienteUUID,
        usuarioAgendaUUID: data.usuarioAgendaUUID,
        startAtLocal: data.fechaCita,
        timezone,
        durationMinutes: data.duracionMinutos,
        observaciones: data.observaciones?.trim() || undefined,
      },
      {
        onSuccess: () => {
          reset(defaultValues)
          onOpenChange(false)
        },
      },
    )
  }

  const isPending = createCita.isPending || updateCita.isPending || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--imss-ink-900)]">
            {isEdit ? 'Editar cita' : 'Agendar cita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {isEdit ? (
            /* EDIT MODE — read-only info + estadoCita */
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                Información de la cita
              </p>
              <div className="rounded-md border border-[var(--imss-ink-100)] px-3 py-2 space-y-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
                    Paciente
                  </span>
                  <span className="text-[13px] text-[var(--imss-ink-900)]">
                    {cita?.paciente?.nombreCompleto || '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
                    Especialista
                  </span>
                  <span className="text-[13px] text-[var(--imss-ink-900)]">
                    {cita?.usuarioAgenda?.nombreCompleto || '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Estado de la cita <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="estadoCita"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_CITA.map((e) => (
                          <SelectItem key={e.value} value={e.value} className="text-[13px]">
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.estadoCita && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.estadoCita.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* CREATE MODE — paciente + especialista */
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                Participantes
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">
                    Paciente <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="pacienteUUID"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={pacientesLoading}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {pacientes.map((p) => {
                            const uuid = getPacienteUUID(p)
                            return (
                              <SelectItem
                                key={uuid || p.folio}
                                value={uuid}
                                className="text-[13px]"
                              >
                                {p.folio} — {getFullName(p.persona)}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.pacienteUUID && (
                    <p className="text-[11px] text-[var(--status-danger-fg)]">
                      {errors.pacienteUUID.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px]">
                    Especialista <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="usuarioAgendaUUID"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={usuariosLoading}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar especialista" />
                        </SelectTrigger>
                        <SelectContent>
                          {medicos.map((u) => (
                            <SelectItem key={u.uuid} value={u.uuid} className="text-[13px]">
                              {getUsuarioNombreCompleto(u)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.usuarioAgendaUUID && (
                    <p className="text-[11px] text-[var(--status-danger-fg)]">
                      {errors.usuarioAgendaUUID.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-[var(--imss-ink-100)]" />

          {/* Fecha, duración y observaciones */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos de la cita
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Fecha y hora <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="fechaCita"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPast}
                    />
                  )}
                />
                {errors.fechaCita && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.fechaCita.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">
                  Duración (min) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  disabled={isPast}
                  {...register('duracionMinutos', { valueAsNumber: true })}
                  className="h-9 text-[13px]"
                />
                {errors.duracionMinutos && (
                  <p className="text-[11px] text-[var(--status-danger-fg)]">
                    {errors.duracionMinutos.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Observaciones</Label>
              <Textarea
                {...register('observaciones')}
                placeholder="Notas adicionales sobre la cita"
                rows={3}
                className="resize-none text-[13px]"
              />
              {errors.observaciones && (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.observaciones.message}
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
              disabled={isPending || (isEdit && isPast)}
              className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            >
              {isPending
                ? isEdit
                  ? 'Guardando...'
                  : 'Agendando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Agendar cita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
