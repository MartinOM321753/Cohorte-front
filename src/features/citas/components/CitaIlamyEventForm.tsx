import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import type { CalendarEvent, EventFormProps } from '@ilamy/calendar'

import type { Cita } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'
import { useCreateCita, useUpdateCita } from '../hooks/useCitas'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { cn } from '@/lib/utils'

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

function getPacienteUUID(p: any): string {
  return p.UUID || p.uuid || ''
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
  const currentUserUuid = user?.uuid ?? ''
  const timezone = useMemo(() => safeTimeZone(), [])

  const createCita = useCreateCita()
  const updateCita = useUpdateCita()

  const [openPaciente, setOpenPaciente] = useState(false)

  // isEditing se calcula antes del hook para evitar la query innecesaria al editar
  const isEditingEarly = Boolean((selectedEvent?.data as any)?.cita?.uuid)

  const { data: pacientesRaw } = useGetPacientes({ activos: true }, { enabled: open && !isEditingEarly })
  const pacientes = Array.isArray(pacientesRaw)
    ? pacientesRaw
    : (pacientesRaw as any)?.data ?? []

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

    const start = selectedEvent?.start
    if (!start) return

    // CalendarEvent.start es Dayjs, pero guardamos compatibilidad con otros tipos
    const startDayjs = dayjs.isDayjs(start)
      ? (start as dayjs.Dayjs)
      : dayjs(start as string | Date)
    const dow = startDayjs.day() // 0=Dom, 6=Sáb
    const isWeekend = dow === 0 || dow === 6
    const isPastSlot = startDayjs.isBefore(dayjs())

    if (isWeekend) {
      guardFiredRef.current = true
      toast.warning('No es posible agendar citas los sábados o domingos.')
      onClose()
      return
    }

    if (isPastSlot) {
      guardFiredRef.current = true
      toast.warning('No es posible agendar citas en fechas u horas pasadas.')
      onClose()
    }
  }, [open, isEditing, selectedEvent, onClose])

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = (data: CitaFormData) => {
    if (!isEditing && !data.pacienteUUID) {
      setError('pacienteUUID', { message: 'Paciente obligatorio' })
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
              : 'Selecciona el paciente, la fecha y la duración.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">

          {/* ── PACIENTE (solo en crear, o read-only en editar) ── */}
          {isEditing ? (
            <div className="rounded-md border border-[var(--imss-ink-100)] px-3 py-2 space-y-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
                  Paciente
                </span>
                <span className="text-[13px] text-[var(--imss-ink-900)]">
                  {cita?.paciente?.nombreCompleto || '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Paciente <span className="text-red-500">*</span>
              </Label>
              <Popover open={openPaciente} onOpenChange={setOpenPaciente} >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-9 text-[13px]"
                  >
                    <span className="truncate">
                      {watchedPacienteUUID
                        ? (() => {
                            const found = pacientes.find(
                              (p: any) => getPacienteUUID(p) === watchedPacienteUUID,
                            )
                            if (!found) return 'Paciente seleccionado'
                            const nombre = found.persona
                              ? [
                                  found.persona.nombre,
                                  found.persona.apellidoPaterno,
                                  found.persona.apellidoMaterno,
                                ]
                                  .filter(Boolean)
                                  .join(' ')
                              : found.nombreCompleto ?? 'Paciente'
                            return `${found.folio ?? ''} — ${nombre}`.trim()
                          })()
                        : 'Buscar paciente…'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(96vw,400px)] p-0" align="start">
                  <Command 
                    filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                  >
                    <CommandInput placeholder="Buscar paciente…" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No se encontró el paciente.</CommandEmpty>
                      <CommandGroup>
                        {pacientes.map((p: any) => {
                          const uuid = getPacienteUUID(p)
                          const nombre = p.persona
                            ? [
                                p.persona.nombre,
                                p.persona.apellidoPaterno,
                                p.persona.apellidoMaterno,
                              ]
                                .filter(Boolean)
                                .join(' ')
                            : p.nombreCompleto ?? 'Paciente'
                          return (
                            <CommandItem
                              key={uuid || p.folio}
                              value={`${p.folio ?? ''} ${nombre}`}
                              onSelect={() => {
                                setValue('pacienteUUID', uuid)
                                setOpenPaciente(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  watchedPacienteUUID === uuid ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="truncate text-[13px]">
                                {`${p.folio ?? ''} — ${nombre}`.trim()}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              
              </Popover>
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
          <div className="grid grid-cols-1 gap-30 sm:grid-cols-2">
            <div className="space-y-1.5 ">
              <Label className="text-[13px]">
                Fecha y hora <span className="text-red-500">*</span>
              </Label>
              <DateTimePicker
                value={watch('fechaCita')}
                onChange={(v) => setValue('fechaCita', v)}
                disabled={isPast}
                minDate={isEditing ? undefined : new Date()}
                minHour={8}
                maxHour={17}
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
            {(!isPast || isEditing) && (
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
