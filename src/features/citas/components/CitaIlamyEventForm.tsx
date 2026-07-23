import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import type { CalendarEvent, EventFormProps } from '@ilamy/calendar'

import type { Cita } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useCreateCita, useUpdateCita } from '../hooks/useCitas'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'
import { citaFormSchema, ESTADOS_CITA, type CitaFormData } from '../schemas/cita.schema'
import { getCitaDurationMinutes, getCitaStartDate } from '../lib/citaUtils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/date-time-picker'

// ─── Utilidades ────────────────────────────────────────────────────────────────

function safeTimeZone(): string {
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

/**
 * La API devuelve estadoCita como texto capitalizado en español
 * ("Programada", "Completada", "Cancelada", "No asistió").
 * Esta función lo normaliza al enum que usa el formulario y el schema Zod.
 */
function normalizeEstadoCita(raw: unknown): CitaFormData['estadoCita'] {
  if (!raw || typeof raw !== 'string') return undefined
  const s = raw
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
  const valid = ['PROGRAMADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'NO_ASISTIO'] as const
  return valid.find((v) => v === s)
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CitaIlamyEventFormProps extends EventFormProps {
  /** UUID del paciente pre-seleccionado (p. ej. al agendar desde PacientesPage) */
  initialPacienteUUID?: string
}

// ─── buildDefaults ─────────────────────────────────────────────────────────────

function buildDefaults(args: {
  selectedEvent: CalendarEvent | null | undefined
  initialPacienteUUID?: string
}): CitaFormData {
  const cita = (args.selectedEvent?.data as any)?.cita as Cita | undefined
  const start = args.selectedEvent?.start?.toDate?.()
    ? args.selectedEvent.start.toDate()
    : cita
      ? getCitaStartDate(cita)
      : null

  return {
    pacienteUUID: cita?.pacienteUUID || cita?.paciente?.uuid || args.initialPacienteUUID || '',
    fechaCita: start ? toLocalDateTimeInput(start) : toLocalDateTimeInput(new Date()),
    duracionMinutos: cita ? getCitaDurationMinutes(cita) : 60,
    colorHex: cita?.colorHex || '#3b82f6',
    observaciones: cita?.observaciones ?? '',
    estadoCita: normalizeEstadoCita(cita?.estadoCita),
  }
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function CitaIlamyEventForm({
  open,
  selectedEvent,
  onClose,
  initialPacienteUUID,
}: CitaIlamyEventFormProps) {
  const user = useAuthStore((s) => s.user)
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const currentUserUuid = user?.uuid ?? ''
  const timezone = useMemo(() => safeTimeZone(), [])

  const { data: horarioActivo, isLoading: horarioLoading } = useGetConfiguracionHorarioActiva()
  const createCita = useCreateCita()
  const updateCita = useUpdateCita()

  // isEditing se calcula antes del hook para evitar la query innecesaria al editar
  const isEditingEarly = Boolean((selectedEvent?.data as any)?.cita?.uuid)

  const defaults = useMemo(
    () => buildDefaults({ selectedEvent, initialPacienteUUID }),
    [selectedEvent, initialPacienteUUID],
  )

  const {
    handleSubmit,
    register,
    setValue,
    reset,
    watch,
    control,
    setError,
    formState: { errors },
  } = useForm<CitaFormData>({
    resolver: zodResolver(citaFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, reset, defaults])

  const watchedPacienteUUID = watch('pacienteUUID')

  const cita = (selectedEvent?.data as any)?.cita as Cita | undefined
  const isEditing = isEditingEarly
  const puedeCrear = hasPermiso('CITAS_CREAR')
  const puedeEditar = hasPermiso('CITAS_EDITAR')
  const readOnly = isEditing ? !puedeEditar : !puedeCrear

  const isPast = useMemo(() => {
    if (!isEditing) return false
    const d = getCitaStartDate(cita!)
    return !!d && d < new Date()
  }, [isEditing, cita])

  // ── Guard: bloquear apertura del formulario en slots pasados o fin de semana ──
  // Solo aplica al crear una nueva cita (no al editar).
  // Usamos una ref para disparar el toast solo una vez por apertura.
  const guardFiredRef = useRef(false)
  useEffect(() => {
    if (!open || isEditing) {
      guardFiredRef.current = false
      return
    }
    if (guardFiredRef.current) return

    if (!horarioLoading && horarioActivo === null) {
      guardFiredRef.current = true
      toast.warning('No hay un horario de citas configurado. Contacta al administrador.')
      onClose()
      return
    }
    if (horarioLoading) return

    const start = selectedEvent?.start
    if (!start) return

    // CalendarEvent.start es Dayjs, pero guardamos compatibilidad con otros tipos
    const startDayjs = dayjs.isDayjs(start)
      ? (start as dayjs.Dayjs)
      : dayjs(start as string | Date)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = dayNames[startDayjs.day()]
    const businessDays = horarioActivo
      ? [
          horarioActivo.lunes && 'monday',
          horarioActivo.martes && 'tuesday',
          horarioActivo.miercoles && 'wednesday',
          horarioActivo.jueves && 'thursday',
          horarioActivo.viernes && 'friday',
          horarioActivo.sabado && 'saturday',
          horarioActivo.domingo && 'sunday',
        ].filter(Boolean)
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const isDayDisabled = !businessDays.includes(targetDay)
    const isPastSlot = startDayjs.isBefore(dayjs())

    if (isDayDisabled) {
      guardFiredRef.current = true
      toast.warning('No es posible agendar citas en un día no habilitado.')
      onClose()
      return
    }

    if (isPastSlot) {
      guardFiredRef.current = true
      toast.warning('No es posible agendar citas en fechas u horas pasadas.')
      onClose()
    }
  }, [open, isEditing, selectedEvent, onClose, horarioActivo, horarioLoading])

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = (data: CitaFormData) => {
    if (!isEditing && !data.pacienteUUID) {
      setError('pacienteUUID', { message: 'Participante obligatorio' })
      return
    }

    if (!currentUserUuid) {
      toast.error('No hay usuario autenticado.')
      return
    }

    if (isEditing) {
      updateCita.mutate(
        {
          uuid: cita!.uuid,
          data: isPast
            ? {
                // Cita pasada: el backend bloquea startAtLocal/timezone/durationMinutes
                estadoCita:   data.estadoCita,
                colorHex:     data.colorHex,
                observaciones: data.observaciones,
              }
            : {
                startAtLocal:    data.fechaCita,
                timezone,
                durationMinutes: data.duracionMinutos,
                colorHex:        data.colorHex,
                estadoCita:      data.estadoCita,
                observaciones:   data.observaciones,
              },
        },
        { onSuccess: onClose },
      )
      return
    }

    createCita.mutate(
      {
        pacienteUUID: data.pacienteUUID,
        usuarioAgendaUUID: currentUserUuid,   // siempre del usuario logueado
        startAtLocal: data.fechaCita,
        timezone,
        durationMinutes: data.duracionMinutos,
        colorHex: data.colorHex,
        observaciones: data.observaciones,
      },
      { onSuccess: onClose },
    )
  }

  const isPending = createCita.isPending || updateCita.isPending

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="w-[min(96vw,640px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--imss-ink-900)]">
            {isEditing ? 'Editar cita' : 'Agendar cita'}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--imss-ink-300)]">
            {isEditing
              ? 'Actualiza el estado, fecha u observaciones de la cita.'
              : 'Selecciona el participante, la fecha y la duración.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">

          {/* ── PACIENTE (solo en crear, o read-only en editar) ── */}
          {isEditing ? (
            <div className="rounded-md border border-[var(--imss-ink-100)] px-3 py-2 space-y-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
                  Participante
                </span>
                <span className="text-[13px] text-[var(--imss-ink-900)]">
                  {cita?.paciente?.nombreCompleto || '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Participante <span className="text-red-500">*</span>
              </Label>
              <PacienteSearchCombobox
                value={watchedPacienteUUID}
                onChange={(uuid) => setValue('pacienteUUID', uuid)}
              />
              {errors.pacienteUUID ? (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.pacienteUUID.message}
                </p>
              ) : null}
            </div>
          )}

          {/* ── ESTADO DE CITA (solo en editar) ── */}
          {isEditing && (
            <div className="space-y-1.5">
              <Label className="text-[13px]">Estado de la cita</Label>
              <Controller
                name="estadoCita"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
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
              {errors.estadoCita ? (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.estadoCita.message}
                </p>
              ) : null}
            </div>
          )}

          {/* ── FECHA Y DURACIÓN ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 ">
              <Label className="text-[13px]">
                Fecha y hora <span className="text-red-500">*</span>
              </Label>
              <DateTimePicker
                value={watch('fechaCita')}
                onChange={(v) => setValue('fechaCita', v)}
                disabled={isPast}
                minDate={isEditing ? undefined : new Date()}
                minHour={horarioActivo?.horaInicio ?? 8}
                maxHour={(horarioActivo?.horaFin ?? 17) - 1}
                disabledDaysOfWeek={(() => {
                  if (!horarioActivo) return [0, 6]
                  const disabled: number[] = []
                  if (!horarioActivo.domingo) disabled.push(0)
                  if (!horarioActivo.lunes) disabled.push(1)
                  if (!horarioActivo.martes) disabled.push(2)
                  if (!horarioActivo.miercoles) disabled.push(3)
                  if (!horarioActivo.jueves) disabled.push(4)
                  if (!horarioActivo.viernes) disabled.push(5)
                  if (!horarioActivo.sabado) disabled.push(6)
                  return disabled
                })()}
              />
              {errors.fechaCita ? (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.fechaCita.message}
                </p>
              ) : null}
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
                {...register('duracionMinutos')}
                className="h-9 text-[13px]"
              />
              {errors.duracionMinutos ? (
                <p className="text-[11px] text-[var(--status-danger-fg)]">
                  {errors.duracionMinutos.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* ── COLOR ── */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                className="h-9 w-14 p-1"
                disabled={isPast}
                value={watch('colorHex') || '#3b82f6'}
                onChange={(e) => setValue('colorHex', e.target.value)}
              />
              <Input
                className="h-9 font-mono text-[13px]"
                disabled={isPast}
                placeholder="#3b82f6"
                {...register('colorHex')}
              />
            </div>
            {errors.colorHex ? (
              <p className="text-[11px] text-[var(--status-danger-fg)]">
                {errors.colorHex.message}
              </p>
            ) : null}
          </div>

          {/* ── OBSERVACIONES ── */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">Observaciones</Label>
            <Textarea
              rows={3}
              // disabled={isPast}
              placeholder="Notas adicionales…"
              className="resize-none text-[13px]"
              sanitize="descripcion"
              {...register('observaciones')}
            />
            {errors.observaciones ? (
              <p className="text-[11px] text-[var(--status-danger-fg)]">
                {errors.observaciones.message}
              </p>
            ) : null}
          </div>

          {/* ── ACCIONES ── */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="text-[13px]"
            >
              Cancelar
            </Button>
            {(!isPast || isEditing) && !readOnly && (
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
              >
                {isPending
                  ? isEditing
                    ? 'Guardando…'
                    : 'Agendando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Agendar cita'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
