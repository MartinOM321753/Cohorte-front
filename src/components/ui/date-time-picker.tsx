import { useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function parseDateOnly(value: string | undefined | null): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const d = new Date(year, month, day)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function parseLocalDateTime(value: string | undefined | null): { date: Date; time: string } | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])
  const d = new Date(year, month, day, hour, minute, 0, 0)
  if (Number.isNaN(d.getTime())) return null
  return { date: d, time: `${pad2(hour)}:${pad2(minute)}` }
}

function roundUpMinutes(date: Date, step: number): string {
  const minutes = date.getMinutes()
  const remainder = minutes % step
  const rounded = remainder === 0 ? minutes : minutes + (step - remainder)
  const d = new Date(date)
  d.setSeconds(0, 0)
  d.setMinutes(rounded)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function buildTimeOptions(stepMinutes: number): string[] {
  const times: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      times.push(`${pad2(hour)}:${pad2(minute)}`)
    }
  }
  return times
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  disabled,
  className,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const selected = useMemo(() => parseDateOnly(value), [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, 'dd/MM/yyyy', { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          onSelect={(d) => {
            if (!d) return
            onChange(toDateOnlyString(d))
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Selecciona fecha y hora',
  disabled,
  timeStepMinutes = 15,
  maxDateTime,
  className,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  timeStepMinutes?: number
  maxDateTime?: Date
  className?: string
}) {
  const parsed = useMemo(() => parseLocalDateTime(value), [value])
  const selectedDate = parsed?.date ?? null
  const selectedTime = parsed?.time ?? ''
  const allTimeOptions = useMemo(() => buildTimeOptions(timeStepMinutes), [timeStepMinutes])

  const timeOptions = useMemo(() => {
    if (!maxDateTime || !selectedDate) return allTimeOptions
    const sameDay =
      selectedDate.getFullYear() === maxDateTime.getFullYear() &&
      selectedDate.getMonth() === maxDateTime.getMonth() &&
      selectedDate.getDate() === maxDateTime.getDate()
    if (!sameDay) return allTimeOptions
    const maxTime = `${pad2(maxDateTime.getHours())}:${pad2(maxDateTime.getMinutes())}`
    return allTimeOptions.filter((t) => t <= maxTime)
  }, [allTimeOptions, maxDateTime, selectedDate])

  const displayValue = useMemo(() => {
    if (!selectedDate) return ''
    return format(selectedDate, 'dd/MM/yyyy HH:mm', { locale: es })
  }, [selectedDate])

  const setDate = (d: Date) => {
    const time = selectedTime || roundUpMinutes(new Date(), timeStepMinutes)
    onChange(`${toDateOnlyString(d)}T${time}`)
  }

  const setTime = (time: string) => {
    const base = selectedDate ?? new Date()
    onChange(`${toDateOnlyString(base)}T${time}`)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? displayValue : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid gap-3">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            disabled={maxDateTime ? { after: maxDateTime } : undefined}
            onSelect={(d) => {
              if (!d) return
              setDate(d)
            }}
            initialFocus
          />

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Hora</div>
            <Select value={selectedTime} onValueChange={setTime} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona hora" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
