import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  IlamyCalendar,
  useIlamyCalendarContext,
  defaultTranslations,
  type CalendarEvent,
  type CalendarView,
  type Translations,
} from "@ilamy/calendar";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";

import type { Cita } from "@/types/api";
import { useUpdateCita } from "../hooks/useCitas";
import { CitaIlamyEventForm } from "./CitaIlamyEventForm";
import { getCitaDurationMinutes, getCitaStartDate } from "../lib/citaUtils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

dayjs.locale("es");

// ─── Tipos internos ────────────────────────────────────────────────────────────

type Props = {
  citas: Cita[];
  isLoading?: boolean;
};

interface PendingDrop {
  citaUuid: string;
  pacienteNombre: string;
  startAtLocal: string;
  durationMinutes: number;
  displayStart: string;
  displayEnd: string;
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

function safeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function formatDateTime(d: dayjs.Dayjs): string {
  return d.format("dddd D [de] MMMM [·] HH:mm");
}

// ─── Header personalizado ──────────────────────────────────────────────────────
// Debe renderizarse dentro del contexto de IlamyCalendar (via headerComponent).

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "day", label: "Día" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "year", label: "Año" },
];

function CitasCalendarHeader() {
  const {
    currentDate,
    view,
    setView,
    nextPeriod,
    prevPeriod,
    today,
    firstDayOfWeek,
  } = useIlamyCalendarContext();

  const periodLabel = useMemo(() => {
    if (view === "day") {
      return currentDate.format("dddd, D [de] MMMM [de] YYYY");
    }
    if (view === "week") {
      const offset = (currentDate.day() - firstDayOfWeek + 7) % 7;
      const start = currentDate.subtract(offset, "day");
      const end = start.add(6, "day");
      if (start.month() === end.month()) {
        return `${start.format("D")} – ${end.format("D [de] MMMM [de] YYYY")}`;
      }
      if (start.year() === end.year()) {
        return `${start.format("D [de] MMM")} – ${end.format("D [de] MMM YYYY")}`;
      }
      return `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
    }
    if (view === "month") {
      return currentDate.format("MMMM [de] YYYY");
    }
    return currentDate.format("YYYY");
  }, [currentDate, view, firstDayOfWeek]);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-(--imss-ink-100) bg-background px-4 py-2.5">
      {/* ← Navegación */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-(--imss-ink-500) hover:text-(--imss-ink-900)"
          onClick={() => prevPeriod()}
          title="Período anterior"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button
          variant="outline"
          className="h-8 px-3 text-[13px] font-medium"
          onClick={() => today()}
        >
          Hoy
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-(--imss-ink-500) hover:text-(--imss-ink-900)"
          onClick={() => nextPeriod()}
          title="Período siguiente"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>

      {/* Período actual */}
      <span className="flex-1 text-center text-[14px] font-semibold capitalize text-(--imss-ink-900) truncate">
        {periodLabel}
      </span>

      {/* Selector de vista */}
      <div className="flex items-center rounded-md border border-(--imss-ink-100) overflow-hidden">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={[
              "px-3 py-1.5 text-[13px] font-medium transition-colors",
              view === key
                ? "bg-(--imss-green-500) text-white"
                : "bg-background text-(--imss-ink-500) hover:bg-(--imss-ink-50) hover:text-(--imss-ink-900)",
              "border-r border-(--imss-ink-100) last:border-r-0",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function CitasIlamyCalendar({ citas, isLoading }: Props) {
  const timezone = useMemo(() => safeTimeZone(), []);
  const updateCita = useUpdateCita();
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  // 1. Agrega una ref al wrapper del calendario
  const calendarWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = calendarWrapperRef.current;
    if (!wrapper) return;

    const VISIBLE_HOURS = 9; // 08:00 – 17:00
    const HEADER_APPROX_HEIGHT = 96; // header custom + barra de días

    const observer = new ResizeObserver(([entry]) => {
      const totalH = entry.contentRect.height;
      const cellH = Math.max(
        80,
        Math.floor((totalH - HEADER_APPROX_HEIGHT) / VISIBLE_HOURS),
      );
      const cal = wrapper.querySelector(
        '[data-testid="ilamy-calendar"]',
      ) as HTMLElement | null;
      if (cal) {
        cal.style.setProperty("--calendar-hour-row-height", `${cellH}px`);
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);
  const translations = useMemo<Translations>(
    () => ({
      ...defaultTranslations,
      today: "Hoy",
      create: "Crear",
      new: "Nuevo",
      update: "Actualizar",
      delete: "Eliminar",
      cancel: "Cancelar",
      export: "Exportar",
      event: "Evento",
      events: "Eventos",
      newEvent: "Nueva cita",
      title: "Título",
      description: "Descripción",
      location: "Ubicación",
      allDay: "Todo el día",
      startDate: "Fecha inicio",
      endDate: "Fecha fin",
      startTime: "Hora inicio",
      endTime: "Hora fin",
      searchTime: "Buscar hora",
      color: "Color",
      createEvent: "Crear",
      editEvent: "Editar",
      addNewEvent: "Agendar cita",
      editEventDetails: "Editar detalles",
      eventTitlePlaceholder: "Título",
      eventDescriptionPlaceholder: "Notas (opcional)",
      eventLocationPlaceholder: "Ubicación (opcional)",
      month: "Mes",
      week: "Semana",
      day: "Día",
      year: "Año",
      more: "Más",
      sunday: "Domingo",
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sun: "Dom",
      mon: "Lun",
      tue: "Mar",
      wed: "Mié",
      thu: "Jue",
      fri: "Vie",
      sat: "Sáb",
      january: "Enero",
      february: "Febrero",
      march: "Marzo",
      april: "Abril",
      may: "Mayo",
      june: "Junio",
      july: "Julio",
      august: "Agosto",
      september: "Septiembre",
      october: "Octubre",
      november: "Noviembre",
      december: "Diciembre",
    }),
    [],
  );

  const events = useMemo<CalendarEvent[]>(
    () =>
      citas
        .map((cita) => {
          const startDate = getCitaStartDate(cita);
          if (!startDate) return null;
          const duration = getCitaDurationMinutes(cita);
          const endDate = new Date(startDate.getTime() + duration * 60_000);

          const paciente = cita.paciente?.nombreCompleto || "Sin paciente";
          const usuario = cita.usuarioAgenda?.nombreCompleto;

          const styleByEstado: Record<
            string,
            { color: string; backgroundColor: string }
          > = {
            PROGRAMADA: { color: "#1d4ed8", backgroundColor: "#dbeafe" },
            COMPLETADA: { color: "#166534", backgroundColor: "#dcfce7" },
            CANCELADA: { color: "#991b1b", backgroundColor: "#fee2e2" },
            NO_ASISTIO: { color: "#7c2d12", backgroundColor: "#ffedd5" },
          };

          const estadoKey = String(cita.estadoCita ?? "")
            .toUpperCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, "_")
            .trim();
          const eventStyle = styleByEstado[estadoKey] ?? {
            color: "#0f172a",
            backgroundColor: "#e2e8f0",
          };

          return {
            id: String(cita.uuid || cita.id),
            title: usuario ? `${paciente} · ${usuario}` : paciente,
            start: dayjs(startDate),
            end: dayjs(endDate),
            color: cita.colorHex ?? eventStyle.color,
            backgroundColor: eventStyle.backgroundColor,
            description: cita.observaciones,
            data: { cita },
          } satisfies CalendarEvent;
        })
        .filter(Boolean) as CalendarEvent[],
    [citas],
  );

  return (
    <>
      <style>{`
  [data-testid="ilamy-calendar"] {
    --calendar-time-col: 84px;
    --calendar-hour-row-height: 80px;
    --calendar-month-cell-height: 110px;

    width: 100% !important;
    height: 100% !important;
    min-height: 100% !important;

    display: flex !important;
    flex-direction: column !important;

    overflow: hidden !important;
    border: 1px solid hsl(var(--border));
    border-radius: 10px;
    background: hsl(var(--background));
  }

  [data-testid="ilamy-calendar"] > div:first-child {
    flex: 0 0 auto !important;
    height: auto !important;
    min-height: auto !important;
  }

  [data-testid="ilamy-calendar"] > div:not(:first-child) {
    flex: 1 1 auto !important;
    min-height: 0 !important;
  }

  [data-testid="all-day-row"] {
    display: none !important;
  }

  /* ── Vista semana/día: contenedores verticales ── */
  [data-testid="vertical-grid-scroll"] {
    width: 100% !important;
    min-width: 100% !important;
    height: 100% !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: auto !important;
  }

  [data-testid="vertical-grid-body"] {
    width: 100% !important;
    min-width: 100% !important;
    height: auto !important;
    min-height: 100% !important;
  }

  /* Celdas de hora en vista semana/día */
  [data-testid="vertical-grid-body"] .min-h-\\[60px\\],
  [data-testid="vertical-grid-header"] .min-h-\\[60px\\] {
    min-height: var(--calendar-hour-row-height) !important;
  }

  /* ── Vista mes: contenedores horizontales ── */
  [data-testid="horizontal-grid-scroll"] {
    height: 100% !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: auto !important;
  }

  /* Celdas de día en vista mes */
  [data-testid="horizontal-grid-body"] .min-h-\\[60px\\] {
    min-height: var(--calendar-month-cell-height) !important;
  }

  /* ── Vista año ── */
  [data-testid="year-view"] {
    height: 100% !important;
    overflow: auto !important;
  }

  /* La librería usa sm:grid-cols-2 lg:grid-cols-3 pero esas clases no se
     generan porque node_modules queda fuera del escaneo de Tailwind.
     Las forzamos aquí directamente. */
  [data-testid="year-grid"] {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  @media (max-width: 900px) {
    [data-testid="year-grid"] {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 540px) {
    [data-testid="year-grid"] {
      grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
    }
  }

  /* ── Eventos compactos en vista semana/día (una línea) ── */
  [data-testid="vertical-grid-body"] div.absolute {
    height: 26px !important;
    min-height: 26px !important;
    overflow: hidden !important;
  }

  /* ── Columna de tiempo (ancho) ── */
  [data-testid="ilamy-calendar"] .w-10,
  [data-testid="ilamy-calendar"] .sm\\:w-16 {
    width: var(--calendar-time-col) !important;
    min-width: var(--calendar-time-col) !important;
    max-width: var(--calendar-time-col) !important;
    flex: 0 0 var(--calendar-time-col) !important;
  }

  [data-testid="ilamy-calendar"] [class*="grid"] > .w-10:first-child,
  [data-testid="ilamy-calendar"] [class*="grid"] > .sm\\:w-16:first-child,
  [data-testid="ilamy-calendar"] [class*="flex"] > .w-10:first-child,
  [data-testid="ilamy-calendar"] [class*="flex"] > .sm\\:w-16:first-child {
    width: var(--calendar-time-col) !important;
    min-width: var(--calendar-time-col) !important;
    max-width: var(--calendar-time-col) !important;
    flex: 0 0 var(--calendar-time-col) !important;
  }

  [data-testid="ilamy-calendar"] [data-testid="day-view"] {
    width: 100% !important;
  }

  [data-testid="ilamy-calendar"] [data-testid="day-view"] [class*="grid-cols-2"],
  [data-testid="ilamy-calendar"] [data-testid="day-view"] [class*="grid-cols"] {
    grid-template-columns: var(--calendar-time-col) minmax(0, 1fr) !important;
  }

  [data-testid="ilamy-calendar"] [data-testid="day-view"] [class*="flex"] > :first-child {
    flex: 0 0 var(--calendar-time-col) !important;
    width: var(--calendar-time-col) !important;
    min-width: var(--calendar-time-col) !important;
    max-width: var(--calendar-time-col) !important;
  }

  [data-testid="ilamy-calendar"] [data-testid="day-view"] [class*="flex"] > :last-child {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  [data-testid="ilamy-calendar"] [data-testid="hour-label"] {
    font-size: 12px !important;
    line-height: 1 !important;
  }

  [data-testid="ilamy-calendar"] [class*="sticky"] {
    background: hsl(var(--background));
    z-index: 20;
  }

  [data-testid="ilamy-calendar"] [data-testid="event"],
  [data-testid="ilamy-calendar"] [class*="event"] {
    font-size: 11px;
    line-height: 1.2;
    overflow: hidden;
  }

`}</style>
      <div
        ref={calendarWrapperRef}
        className="relative w-full"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <IlamyCalendar
          events={events}
          translations={translations}
          locale="es"
          timezone={timezone}
          firstDayOfWeek="monday"
          initialView="week"
          timeFormat="24-hour"
          renderHour={(date) => (
            <span className="block w-full pr-2 text-right text-[12px] leading-none text-muted-foreground">
              {date.format("HH:mm")}
            </span>
          )}
          dayMaxEvents={4}
          disableDragAndDrop={false}
          disableEventClick={false}
          disableCellClick={false}
          stickyViewHeader
          /* ── Header distribuido en todo el ancho ── */
          headerComponent={<CitasCalendarHeader />}
          /* ── Horario clínico: 08:00 – 17:00 todos los días ── */
          businessHours={{
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
            startTime: 8,
            endTime: 17,
          }}
          /* Oculta (y bloquea) horas fuera del horario clínico */
          hideNonBusinessHours
          /* Las celdas fuera de horario quedan no-interactivas */
          classesOverride={{
            disabledCell: "bg-muted/60 pointer-events-none cursor-not-allowed",
          }}
          renderEventForm={(props) => <CitaIlamyEventForm {...props} />}
          onEventUpdate={(event) => {
            const cita = (event.data as any)?.cita as Cita | undefined;
            if (!cita?.uuid) return;

            const newStart = event.start;
            const newEnd = event.end;
            const now = dayjs();

            if (newStart.isBefore(now)) {
              toast.error("No puedes reprogramar una cita a una fecha pasada.");
              return;
            }

            setPendingDrop({
              citaUuid: cita.uuid,
              pacienteNombre: cita.paciente?.nombreCompleto ?? "Paciente",
              startAtLocal: newStart.format("YYYY-MM-DDTHH:mm"),
              durationMinutes: Math.max(15, newEnd.diff(newStart, "minute")),
              displayStart: formatDateTime(newStart),
              displayEnd: formatDateTime(newEnd),
            });
          }}
        />
        {isLoading ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/40 text-sm text-muted-foreground">
            Cargando citas…
          </div>
        ) : null}
        {/* ── Confirmación de drag & drop ── */}
        <AlertDialog
          open={!!pendingDrop}
          onOpenChange={(v) => {
            if (!v) setPendingDrop(null);
          }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock
                  className="h-5 w-5 text-(--imss-green-600)"
                  strokeWidth={1.75}
                />
                <AlertDialogTitle className="text-[15px]">
                  ¿Reprogramar cita?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-[13px]">
                  <p className="text-(--imss-ink-500)">
                    La cita de{" "}
                    <span className="font-semibold text-(--imss-ink-900)">
                      {pendingDrop?.pacienteNombre}
                    </span>{" "}
                    se moverá a los siguientes horarios:
                  </p>
                  <div className="rounded-md border border-(--imss-ink-100) divide-y divide-(--imss-ink-100)">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium uppercase tracking-widest text-[11px] text-(--imss-ink-300)">
                        Inicio
                      </span>
                      <span className="font-medium text-[13px] text-(--imss-ink-900) capitalize">
                        {pendingDrop?.displayStart}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium uppercase tracking-widest text-[11px] text-(--imss-ink-300)">
                        Fin
                      </span>
                      <span className="font-medium text-[13px] text-(--imss-ink-900) capitalize">
                        {pendingDrop?.displayEnd}
                      </span>
                    </div>
                  </div>
                  <p className="text-(--imss-ink-400)">
                    Esta acción actualizará la fecha y hora de la cita en el
                    sistema.
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
                className="bg-(--imss-green-500) text-white hover:bg-(--imss-green-700) text-[13px]"
                disabled={updateCita.isPending}
                onClick={() => {
                  if (!pendingDrop) return;
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
                        toast.success("Cita reprogramada correctamente.");
                        setPendingDrop(null);
                      },
                      onError: () => {
                        toast.error("No se pudo reprogramar la cita.");
                        setPendingDrop(null);
                      },
                    },
                  );
                }}
              >
                {updateCita.isPending ? "Guardando…" : "Confirmar cambio"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
