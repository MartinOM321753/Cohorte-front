import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import type { CalendarEvent, EventFormProps } from '@ilamy/calendar'

import type { Cita, Usuario } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'
import { useGetUsuarios } from '@/features/users/hooks/useGetUsuarios'
import { useCreateCita, useUpdateCita } from '../hooks/useCitas'
import { citaFormSchema, type CitaFormData } from '../schemas/cita.schema'
import { getCitaDurationMinutes, getCitaStartDate } from '../lib/citaUtils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { cn } from '@/lib/utils'

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

function getUsuarioUUID(u: any): string {
  return u.uuid || u.UUID || ''
}

function getUsuarioNombreCompleto(u: Usuario | any): string {
  const persona = (u as any)?.persona
  if (persona?.nombre) {
    return [persona.nombre, persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ').trim()
  }
  return (u as any)?.nombreCompleto || (u as any)?.username || 'Usuario'
}

function buildDefaults(args: {
  selectedEvent: CalendarEvent | null | undefined
  currentUserUuid: string
  currentUserRole: string
}): CitaFormData {
  const cita = (args.selectedEvent?.data as any)?.cita as Cita | undefined
  const start =
    args.selectedEvent?.start?.toDate?.() ? args.selectedEvent.start.toDate() : cita ? getCitaStartDate(cita) : null

  const defaultUsuarioAgendaUUID =
    cita?.usuarioAgendaUUID || cita?.usuarioAgenda?.uuid || (args.currentUserRole === 'MEDICO' ? args.currentUserUuid : '')

  return {
    pacienteUUID: cita?.pacienteUUID || cita?.paciente?.uuid || '',
    usuarioAgendaUUID: defaultUsuarioAgendaUUID,
    fechaCita: start ? toLocalDateTimeInput(start) : toLocalDateTimeInput(new Date()),
    duracionMinutos: cita ? getCitaDurationMinutes(cita) : 60,
    colorHex: cita?.colorHex || '#3b82f6',
    observaciones: cita?.observaciones ?? '',
  }
}

export function CitaIlamyEventForm({ open, selectedEvent, onClose }: EventFormProps) {
  const { user, hasRole } = useAuthStore()
  const currentUserUuid = user?.uuid ?? ''
  const currentUserRole = hasRole('MEDICO') ? 'MEDICO' : ''
  const timezone = useMemo(() => safeTimeZone(), [])

  const createCita = useCreateCita()
  const updateCita = useUpdateCita()

  const [openPaciente, setOpenPaciente] = useState(false)
  const [openUsuarioAgenda, setOpenUsuarioAgenda] = useState(false)

  const { data: pacientesRaw } = useGetPacientes({ activos: true }, { enabled: open })
  const pacientes = Array.isArray(pacientesRaw) ? pacientesRaw : (pacientesRaw as any)?.data ?? []

  const { data: usuariosRaw } = useGetUsuarios({ activo: true }, { enabled: open })
  const usuarios = Array.isArray(usuariosRaw) ? usuariosRaw : (usuariosRaw as any)?.data ?? []

  const medicos = useMemo(() => {
    return (usuarios as any[]).filter((u) => {
      const rolNombre = typeof u?.rol === 'string' ? u.rol : typeof u?.rol?.nombre === 'string' ? u.rol.nombre : ''
      return String(rolNombre).toUpperCase().includes('MEDICO')
    })
  }, [usuarios])

  const defaults = useMemo(
    () => buildDefaults({ selectedEvent, currentUserUuid, currentUserRole }),
    [selectedEvent, currentUserUuid, currentUserRole],
  )

  const {
    handleSubmit,
    register,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CitaFormData>({
    resolver: zodResolver(citaFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, reset, defaults])

  const watchedPacienteUUID = watch('pacienteUUID')
  const watchedUsuarioAgendaUUID = watch('usuarioAgendaUUID')

  const cita = (selectedEvent?.data as any)?.cita as Cita | undefined
  const isEditing = Boolean(cita?.uuid)

  const isPast = useMemo(() => {
    if (!isEditing) return false
    const d = getCitaStartDate(cita!)
    return !!d && d < new Date()
  }, [isEditing, cita])

  const onSubmit = (data: CitaFormData) => {
    if (!currentUserUuid) {
      toast.error('No hay usuario autenticado.')
      return
    }

    if (isPast) {
      toast.error('No se puede modificar una cita pasada.')
      return
    }

    if (isEditing) {
      updateCita.mutate(
        {
          uuid: cita!.uuid,
          data: {
            startAtLocal: data.fechaCita,
            timezone,
            durationMinutes: data.duracionMinutos,
            colorHex: data.colorHex,
            observaciones: data.observaciones,
          },
        },
        { onSuccess: onClose },
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
        colorHex: data.colorHex,
        observaciones: data.observaciones,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="w-[min(96vw,760px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Detalle de cita' : 'Agendar cita'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Consulta la información de la cita.' : 'Selecciona paciente, especialista, fecha y duración.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Popover open={openPaciente} onOpenChange={setOpenPaciente}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between" disabled={isEditing}>
                    <span className="truncate">
                      {watchedPacienteUUID
                        ? (() => {
                            const found = pacientes.find((p: any) => getPacienteUUID(p) === watchedPacienteUUID)
                            if (!found) return 'Paciente seleccionado'
                            const nombre = found.persona
                              ? `${found.persona.nombre} ${found.persona.apellidoPaterno}${
                                  found.persona.apellidoMaterno ? ' ' + found.persona.apellidoMaterno : ''
                                }`
                              : found.nombreCompleto ?? 'Paciente'
                            return `${found.folio ?? ''} — ${nombre}`.trim()
                          })()
                        : 'Buscar paciente…'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(96vw,760px)] p-0" align="start">
                  <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                    <CommandInput placeholder="Buscar paciente…" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No se encontró el paciente.</CommandEmpty>
                      <CommandGroup>
                        {pacientes.map((p: any) => {
                          const uuid = getPacienteUUID(p)
                          const nombre = p.persona
                            ? `${p.persona.nombre} ${p.persona.apellidoPaterno}${p.persona.apellidoMaterno ? ' ' + p.persona.apellidoMaterno : ''}`
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
                              <Check className={cn('mr-2 h-4 w-4', watchedPacienteUUID === uuid ? 'opacity-100' : 'opacity-0')} />
                              <span className="truncate">{`${p.folio ?? ''} — ${nombre}`.trim()}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.pacienteUUID ? <p className="text-xs text-destructive">{errors.pacienteUUID.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Especialista *</Label>
              <Popover open={openUsuarioAgenda} onOpenChange={setOpenUsuarioAgenda}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between" disabled={isEditing}>
                    <span className="truncate">
                      {watchedUsuarioAgendaUUID
                        ? (() => {
                            const found = medicos.find((u: any) => getUsuarioUUID(u) === watchedUsuarioAgendaUUID)
                            return found ? getUsuarioNombreCompleto(found) : 'Especialista seleccionado'
                          })()
                        : 'Buscar especialista…'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(96vw,760px)] p-0" align="start">
                  <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                    <CommandInput placeholder="Buscar especialista…" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No se encontró el especialista.</CommandEmpty>
                      <CommandGroup>
                        {medicos.map((u: any) => {
                          const uuid = getUsuarioUUID(u)
                          const label = `${getUsuarioNombreCompleto(u)} ${u.username ? `(${u.username})` : ''}`.trim()
                          return (
                            <CommandItem
                              key={uuid || u.id}
                              value={label}
                              onSelect={() => {
                                setValue('usuarioAgendaUUID', uuid)
                                setOpenUsuarioAgenda(false)
                              }}
                            >
                              <Check
                                className={cn('mr-2 h-4 w-4', watchedUsuarioAgendaUUID === uuid ? 'opacity-100' : 'opacity-0')}
                              />
                              <span className="truncate">{label}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.usuarioAgendaUUID ? <p className="text-xs text-destructive">{errors.usuarioAgendaUUID.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha y hora *</Label>
              <DateTimePicker value={watch('fechaCita')} onChange={(v) => setValue('fechaCita', v)} disabled={isPast} />
              {errors.fechaCita ? <p className="text-xs text-destructive">{errors.fechaCita.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Duración (min) *</Label>
              <Input type="number" min={15} max={240} step={15} disabled={isPast} {...register('duracionMinutos')} />
              {errors.duracionMinutos ? <p className="text-xs text-destructive">{errors.duracionMinutos.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                className="h-10 w-14 p-1"
                disabled={isPast}
                value={watch('colorHex') || '#3b82f6'}
                onChange={(e) => setValue('colorHex', e.target.value)}
              />
              <Input
                className="font-mono"
                disabled={isPast}
                placeholder="#3b82f6"
                {...register('colorHex')}
              />
            </div>
            {errors.colorHex ? <p className="text-xs text-destructive">{errors.colorHex.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea rows={4} disabled={isPast} placeholder="Notas adicionales…" {...register('observaciones')} />
            {errors.observaciones ? <p className="text-xs text-destructive">{errors.observaciones.message}</p> : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {!isEditing ? (
              <Button type="submit" disabled={createCita.isPending}>
                Crear cita
              </Button>
            ) : !isPast ? (
              <Button type="submit" disabled={updateCita.isPending}>
                Guardar cambios
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
