import { useMemo } from "react";
import { format } from "date-fns";
import { es as dateFnsEs } from "date-fns/locale";
// react-day-picker v9 usa su propio objeto de locale (distinto de date-fns)
import { es as rdpEs } from "react-day-picker/locale";
import { CalendarIcon, ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Utilidades de fecha de nacimiento ──────────────────────────────────────────
// Mayoría de edad: al menos 18 años, con 3 meses de tolerancia.
// La fecha máxima permitida = hoy - 18 años + 3 meses.
export function maxFechaNacimiento(): Date {
  const hoy = new Date();
  const max = new Date(
    hoy.getFullYear() - 18,
    hoy.getMonth() + 3,
    hoy.getDate(),
  );
  return max;
}

export function esMayorDeEdadConTolerancia(fechaStr: string): boolean {
  if (!fechaStr) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaStr);
  if (!m) return false;
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return fecha <= maxFechaNacimiento();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateOnly(value: string | undefined | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDateTime(
  value: string | undefined | null,
): { date: Date; time: string } | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const d = new Date(year, month, day, hour, minute, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return { date: d, time: `${pad2(hour)}:${pad2(minute)}` };
}

function roundUpMinutes(date: Date, step: number): string {
  const minutes = date.getMinutes();
  const remainder = minutes % step;
  const rounded = remainder === 0 ? minutes : minutes + (step - remainder);
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(rounded);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function buildTimeOptions(
  stepMinutes: number,
  minHour = 0,
  maxHour = 23,
): string[] {
  const times: string[] = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      // Para la última hora solo incluir :00
      if (hour === maxHour && minute > 0) continue;
      times.push(`${pad2(hour)}:${pad2(minute)}`);
    }
  }
  return times;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecciona una fecha",
  disabled,
  className,
  maxDate,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Si se proporciona, bloquea la selección de fechas posteriores a este día. */
  maxDate?: Date;
}) {
  const selected = useMemo(() => parseDateOnly(value), [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected
            ? format(selected, "dd/MM/yyyy", { locale: dateFnsEs })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={rdpEs}
          selected={selected ?? undefined}
          disabled={maxDate ? { after: maxDate } : undefined}
          onSelect={(d) => {
            if (!d) return;
            onChange(toDateOnlyString(d));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ── BirthDatePicker ────────────────────────────────────────────────────────────
// Como DatePicker pero con dropdown de mes/año y fechas futuras bloqueadas
// más allá de la mayoría de edad (18 años – 3 meses de tolerancia).
export function BirthDatePicker({
  value,
  onChange,
  placeholder = "Selecciona fecha de nacimiento",
  disabled,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = useMemo(() => parseDateOnly(value), [value]);
  const maxDate = useMemo(() => maxFechaNacimiento(), []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected
            ? format(selected, "dd/MM/yyyy", { locale: dateFnsEs })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={rdpEs}
          captionLayout="dropdown"
          selected={selected ?? undefined}
          defaultMonth={selected ?? maxDate}
          disabled={{ after: maxDate }}
          onSelect={(d) => {
            if (!d) return;
            onChange(toDateOnlyString(d));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Selector de fecha + hora para citas clínicas.
 *
 * Layout: dos controles siempre visibles lado a lado (nunca anidados en un
 * único popover), por lo que ambos son accesibles en cualquier tamaño de pantalla.
 *
 *   [📅  dd/MM/yyyy  ]  [🕐  Hora  ▼]
 *
 * Props:
 *  - minDate: bloquea fechas anteriores (ej. hoy para no agendar en el pasado)
 *  - maxDateTime: bloquea fechas/horas posteriores
 *  - minHour / maxHour: restringe el selector de hora al rango clínico (default 08–17)
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Fecha",
  disabled,
  timeStepMinutes = 15,
  maxDateTime,
  minDate,
  /** Hora mínima del rango (inclusive). Por defecto 8 = 08:00. */
  minHour = 8,
  /** Hora máxima del rango (inclusive, solo el :00). Por defecto 17 = 17:00. */
  maxHour = 17,
  disabledDaysOfWeek,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  timeStepMinutes?: number;
  maxDateTime?: Date;
  /** Si se proporciona, bloquea la selección de fechas anteriores a este día. */
  minDate?: Date;
  minHour?: number;
  maxHour?: number;
  /** Días de la semana a deshabilitar (0=domingo, 1=lunes, … 6=sábado). */
  disabledDaysOfWeek?: number[];
  className?: string;
}) {
  const parsed = useMemo(() => parseLocalDateTime(value), [value]);
  const selectedDate = parsed?.date ?? null;
  const selectedTime = parsed?.time ?? "";

  const allTimeOptions = useMemo(
    () => buildTimeOptions(timeStepMinutes, minHour, maxHour),
    [timeStepMinutes, minHour, maxHour],
  );

  const timeOptions = useMemo(() => {
    if (!maxDateTime || !selectedDate) return allTimeOptions;
    const sameDay =
      selectedDate.getFullYear() === maxDateTime.getFullYear() &&
      selectedDate.getMonth() === maxDateTime.getMonth() &&
      selectedDate.getDate() === maxDateTime.getDate();
    if (!sameDay) return allTimeOptions;
    const maxTime = `${pad2(maxDateTime.getHours())}:${pad2(maxDateTime.getMinutes())}`;
    return allTimeOptions.filter((t) => t <= maxTime);
  }, [allTimeOptions, maxDateTime, selectedDate]);

  const setDate = (d: Date) => {
    // Si no hay hora seleccionada, usar el primer slot disponible del rango
    const defaultTime = (() => {
      const rounded = roundUpMinutes(new Date(), timeStepMinutes);
      const [h] = rounded.split(":").map(Number);
      if (h < minHour) return `${pad2(minHour)}:00`;
      if (h > maxHour) return `${pad2(maxHour)}:00`;
      return rounded;
    })();
    const time = selectedTime || defaultTime;
    onChange(`${toDateOnlyString(d)}T${time}`);
  };

  const setTime = (time: string) => {
    const base = selectedDate ?? new Date();
    onChange(`${toDateOnlyString(base)}T${time}`);
  };

  // Matcher de fechas deshabilitadas
  const disabledDays = useMemo(() => {
    const matchers: any[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDateTime) matchers.push({ after: maxDateTime });
    if (disabledDaysOfWeek?.length) {
      matchers.push({ dayOfWeek: disabledDaysOfWeek });
    }
    if (matchers.length === 0) return undefined;
    if (matchers.length === 1) return matchers[0];
    return matchers;
  }, [minDate, maxDateTime, disabledDaysOfWeek]);

  return (
    <div className={cn("grid grid-cols-[1fr_auto] gap-2", className)}>
      {/* ── Selector de fecha ── */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal text-[13px]",
              !selectedDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: dateFnsEs })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={rdpEs}
            selected={selectedDate ?? undefined}
            disabled={disabledDays}
            onSelect={(d) => {
              if (!d) return;
              setDate(d);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* ── Selector de hora — siempre visible, nunca dentro del popover ── */}
      <Select value={selectedTime} onValueChange={setTime} disabled={disabled}>
        <SelectTrigger className="w-[125px] text-[13px]">
          <ClockIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {timeOptions.map((t) => (
            <SelectItem key={t} value={t} className="text-[13px]">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
