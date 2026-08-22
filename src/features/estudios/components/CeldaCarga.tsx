import { AlertCircle } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TipoParametro } from '@/types/api'

/**
 * Una celda de la previsualización, con el control que corresponde a su tipo.
 *
 * <p>Antes todas las celdas eran un campo de texto, incluidas las de fecha, las
 * de sí/no y las de selección. Eso obliga a quien corrige a acertar de memoria
 * la ortografía exacta de una opción o el formato de una fecha, y a fallar dos y
 * tres veces por algo que el sistema ya sabe.</p>
 *
 * <p>El valor sigue viajando como texto hacia el servidor, que es quien valida.
 * Lo que cambia es cómo se escribe: un desplegable no puede producir una opción
 * inexistente, y un calendario no puede producir una fecha con el mes cambiado.</p>
 */
export function CeldaCarga({
  tipo, opciones, valor, error, onChange, esFecha, fechaNormalizada, canonico,
}: {
  /** Ausente en las columnas de control (folio y fecha). */
  tipo?: TipoParametro
  opciones?: string[]
  /** El texto tal como está hoy en la tabla. */
  valor: string
  error?: string
  onChange: (v: string) => void
  esFecha?: boolean
  /**
   * Para los de selección, la opción del catálogo que el servidor emparejó con
   * el valor. Hace falta porque la comparación ignora acentos y mayúsculas: el
   * archivo puede traer "femenino" y la opción llamarse "Femenino".
   */
  canonico?: string | null
  /**
   * La fecha ya interpretada por el servidor, en formato ISO. Es lo que entiende
   * el calendario; el texto crudo del archivo puede venir en cualquier formato.
   */
  fechaNormalizada?: string | null
}) {
  // ── Fecha ────────────────────────────────────────────────────────────────
  if (esFecha) {
    return (
      <div className="min-w-[210px] space-y-1">
        <DateTimePicker
          value={fechaNormalizada ?? ''}
          onChange={onChange}
          placeholder="Selecciona fecha y hora"
          timeStepMinutes={1}
          minHour={0}
          maxHour={23}
          className={error ? 'border-destructive' : undefined}
        />
        {/* Un archivo puede traer la fecha sin hora y el estudio se registraría a
            las 00:00 sin que nadie lo note. Enseñar el texto original permite
            distinguir "vino así" de "alguien lo eligió". */}
        {!error && valor && (
          <p className="px-1 text-[11px] text-muted-foreground">En el archivo: {valor}</p>
        )}
        {error && (
          <p className="flex items-start gap-1 px-1 text-[11px] leading-tight text-destructive">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" />
            <span>No se entendió «{valor}». Elige la fecha.</span>
          </p>
        )}
      </div>
    )
  }

  // ── Sí / No ──────────────────────────────────────────────────────────────
  if (tipo === 'BOOLEANO') {
    const activo = ['SI', 'SÍ', 'S', 'TRUE', 'T', 'VERDADERO', 'V', '1', 'X', 'YES', 'Y']
      .includes(valor.trim().toUpperCase())
    return (
      <div className="flex w-28 items-center gap-2">
        <Switch
          checked={activo}
          onCheckedChange={(v) => onChange(v ? 'Si' : 'No')}
        />
        <span className="text-[12px] text-muted-foreground">{activo ? 'Sí' : 'No'}</span>
      </div>
    )
  }

  // ── Selección ────────────────────────────────────────────────────────────
  if (tipo === 'TEXTO_OPCIONES') {
    const lista = opciones ?? []
    // El servidor ya dijo a qué opción corresponde el valor. Comparar aquí con
    // includes fallaría en cuanto el archivo trajera otra ortografía —"femenino"
    // contra "Femenino"— y el desplegable se vería vacío aunque el dato fuera
    // correcto. Si no hay canónico, es que no coincide con ninguna.
    const seleccion = canonico ?? (lista.includes(valor) ? valor : '')
    return (
      <div className="min-w-[150px] space-y-1">
        <Select value={seleccion} onValueChange={(v) => { if (v !== '') onChange(v) }}>
          <SelectTrigger className={cn('h-7 text-[12px]', error && 'border-destructive bg-destructive/5')}>
            <SelectValue placeholder="Elige una opción…" />
          </SelectTrigger>
          <SelectContent>
            {lista.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        {error && (
          <p className="flex items-start gap-1 px-1 text-[11px] leading-tight text-destructive">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" />
            <span>«{valor}» no está entre las opciones. Elige la correcta.</span>
          </p>
        )}
      </div>
    )
  }

  // ── Numérico, texto y las columnas de control ────────────────────────────
  return (
    <>
      <Input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        title={error ?? undefined}
        inputMode={tipo === 'NUMERICO' ? 'decimal' : undefined}
        className={cn('h-7 text-[12px]', error && 'border-destructive bg-destructive/5')}
      />
      {error && (
        <div className="px-1 pt-0.5 text-[11px] leading-tight text-destructive">{error}</div>
      )}
    </>
  )
}
