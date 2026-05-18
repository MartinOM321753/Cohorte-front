import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { IlamyCalendar, defaultTranslations, type CalendarEvent, type Translations } from '@ilamy/calendar'
import { toast } from 'sonner'
import { CalendarClock } from 'lucide-react'

import type { Cita } from '@/types/api'
import { useUpdateCita } from '../hooks/useCitas'
import { CitaIlamyEventForm } from './CitaIlamyEventForm'
import { getCitaDurationMinutes, getCitaStartDate } from '../lib/citaUtils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

dayjs.locale('es')

type Props = {
  citas: Cita[]
  isLoading?: boolean
}

interface PendingDrop {
  citaUuid: string
  pacienteNombre: string
  startAtLocal: string
  durationMinutes: number
  displayStart: string   // formateado para mostrar al usuario
  displayEnd: string
}

function safeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function formatDateTime(d: dayjs.Dayjs): string {
  return d.format('dddd D [de] MMMM [·] HH:mm')
}

export function CitasIlamyCalendar({ citas, isLoading }: Props) {
  const timezone = useMemo(() => safeTimeZone(), [])
  const updateCita = useUpdateCita()
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

  const translations = useMemo<Translations>(
    () => ({
      ...defaultTranslations,
      today: 'Hoy',
      create: 'Crear',
      new: 'Nuevo',
      update: 'Actualizar',
      delete: 'Eliminar',
      cancel: 'Cancelar',
      export: 'Exportar',
      event: 'Evento',
      events: 'Eventos',
      newEvent: 'Nueva cita',
      title: 'Título',
      description: 'Descripción',
      location: 'Ubicación',
      allDay: 'Todo el día',
      startDate: 'Fecha inicio',
      endDate: 'Fecha fin',
      startTime: 'Hora inicio',
      endTime: 'Hora fin',
      searchTime: 'Buscar hora',
      color: 'Color',
      createEvent: 'Crear',
      editEvent: 'Editar',
      addNewEvent: 'Agendar cita',
      editEventDetails: 'Editar detalles',
      eventTitlePlaceholder: 'Título',
      eventDescriptionPlaceholder: 'Notas (opcional)',
      eventLocationPlaceholder: 'Ubicación (opcional)',
      // Views
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      year: 'Año',
      more: 'Más',
      // Weekdays
      sunday: 'Domingo',
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sun: 'Dom',
      mon: 'Lun',
      tue: 'Mar',
      wed: 'Mié',
      thu: 'Jue',
      fri: 'Vie',
      sat: 'Sáb',
      // Months
      january: 'Enero',
      february: 'Febrero',
      march: 'Marzo',
      april: 'Abril',
      may: 'Mayo',
      june: 'Junio',
      july: 'Julio',
      august: 'Agosto',
      september: 'Septiembre',
      october: 'Octubre',
      november: 'Noviembre',
      december: 'Diciembre',
    }),
    [],
  )

  const events = useMemo<CalendarEvent[]>(
    () =>
      citas
        .map((cita) => {
          const startDate = getCitaStartDate(cita)
          if (!startDate) return null
          const duration = getCitaDurationMinutes(cita)
          const endDate = new Date(startDate.getTime() + duration * 60_000)

          const paciente = cita.paciente?.nombreCompleto || 'Sin paciente'
          const usuario = cita.usuarioAgenda?.nombreCompleto

          const styleByEstado: Record<string, { color: string; backgroundColor: string }> = {
            PROGRAMADA: { color: '#1d4ed8', backgroundColor: '#dbeafe' },
            COMPLETADA: { color: '#166534', backgroundColor: '#dcfce7' },
            CANCELADA: { color: '#991b1b', backgroundColor: '#fee2e2' },
            NO_ASISTIO: { color: '#7c2d12', backgroundColor: '#ffedd5' },
          }

          const estadoKey = String((cita as any).estadoCita ?? '').toUpperCase().trim()
          const eventStyle = styleByEstado[estadoKey] ?? { color: '#0f172a', backgroundColor: '#e2e8f0' }

          return {
            id: String(cita.uuid || cita.id),
            title: usuario ? `${paciente} · ${usuario}` : paciente,
            start: dayjs(startDate),
            end: dayjs(endDate),
            color: cita.colorHex ?? eventStyle.color,
            backgroundColor: eventStyle.backgroundColor,
            description: cita.observaciones,
            data: { cita },
          } satisfies CalendarEvent
        })
        .filter(Boolean) as CalendarEvent[],
    [citas],
  )

  return (
    <div className="relative h-[calc(100vh-12rem)] min-h-[640px] w-full">
      <IlamyCalendar
        events={events}
        translations={translations}
        locale="es"
        timezone={timezone}
        firstDayOfWeek="monday"
        initialView="week"
        timeFormat="24-hour"
        dayMaxEvents={4}
        disableDragAndDrop={false}
        disableEventClick={false}
        disableCellClick={false}
        stickyViewHeader
        renderEventForm={(props) => <CitaIlamyEventForm {...props} />}
        onEventUpdate={(event) => {
          const cita = (event.data as any)?.cita as Cita | undefined
          if (!cita?.uuid) return

          const newStart = event.start
          const newEnd = event.end
          const now = dayjs()

          if (newStart.isBefore(now)) {
            toast.error('No puedes reprogramar una cita a una fecha pasada.')
            return
          }

          setPendingDrop({
            citaUuid: cita.uuid,
            pacienteNombre: cita.paciente?.nombreCompleto ?? 'Paciente',
            startAtLocal: newStart.format('YYYY-MM-DDTHH:mm'),
            durationMinutes: Math.max(15, newEnd.diff(newStart, 'minute')),
            displayStart: formatDateTime(newStart),
            displayEnd: formatDateTime(newEnd),
          })
        }}
      />

      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/40 text-sm text-muted-foreground">
          Cargando citas…
        </div>
      ) : null}

      {/* ── Confirmación de drag & drop ── */}
      <AlertDialog open={!!pendingDrop} onOpenChange={(v) => { if (!v) setPendingDrop(null) }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-5 w-5 text-[var(--imss-green-600)]" strokeWidth={1.75} />
              <AlertDialogTitle className="text-[15px]">
                ¿Reprogramar cita?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-[13px]">
                <p className="text-[var(--imss-ink-500)]">
                  La cita de{' '}
                  <span className="font-semibold text-[var(--imss-ink-900)]">
                    {pendingDrop?.pacienteNombre}
                  </span>{' '}
                  se moverá a los siguientes horarios:
                </p>
                <div className="rounded-md border border-[var(--imss-ink-100)] divide-y divide-[var(--imss-ink-100)] text-[12px]">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium uppercase tracking-widest text-[11px] text-[var(--imss-ink-300)]">
                      Inicio
                    </span>
                    <span className="font-medium text-[var(--imss-ink-900)] capitalize">
                      {pendingDrop?.displayStart}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium uppercase tracking-widest text-[11px] text-[var(--imss-ink-300)]">
                      Fin
                    </span>
                    <span className="font-medium text-[var(--imss-ink-900)] capitalize">
                      {pendingDrop?.displayEnd}
                    </span>
                  </div>
                </div>
                <p className="text-[var(--imss-ink-400)]">
                  Esta acción actualizará la fecha y hora de la cita en el sistema.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="text-[13px]"
              onClick={() => setPendingDrop(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
              disabled={updateCita.isPending}
              onClick={() => {
                if (!pendingDrop) return
                updateCita.mutate(
                  {
                    uuid: pendingDrop.citaUuid,
                    data: {
                      startAtLocal: pendingDrop.startAtLocal,
                      timezone,
                      durationMinutes: pendingDrop.durationMinutes,
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success('Cita reprogramada correctamente.')
                      setPendingDrop(null)
                    },
                    onError: () => {
                      toast.error('No se pudo reprogramar la cita.')
                      setPendingDrop(null)
                    },
                  },
                )
              }}
            >
              {updateCita.isPending ? 'Guardando…' : 'Confirmar cambio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

