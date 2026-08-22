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
/** Lo que produce el calendario: 2026-08-25T09:30 */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

export function CeldaCarga({
  tipo, opciones, valor, error, onChange, esFecha, fechaNormalizada, canonico, crudoOriginal,
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
   * La fecha ya interpretada por el servidor, en formato ISO. Solo sirve como
   * lectura inicial: en cuanto el usuario elige una en el calendario, la que
   * manda es la de `valor`.
   */
  fechaNormalizada?: string | null
  /** El texto tal como venía en el archivo, antes de cualquier corrección. */
  crudoOriginal?: string
}) {
  // ── Fecha ────────────────────────────────────────────────────────────────
  if (esFecha) {
    // En cuanto el usuario elige una fecha, el valor de la tabla pasa a ISO y es
    // el que manda. Seguir mostrando el del servidor haría que cambiar la hora no
    // se viera: la previsualización no se recalcula hasta volver a validar.
    const enCalendario = ISO.test(valor) ? valor : (fechaNormalizada ?? '')
    const original = crudoOriginal ?? valor
    return (
      // El selector reparte 180px para la fecha, 92 para la hora y 68 para los
      // minutos: por debajo de ~365px los recorta y las horas salen como "0C".
      <div className="w-[365px] space-y-1">
        <DateTimePicker
          value={enCalendario}
          onChange={onChange}
          placeholder="Selecciona fecha y hora"
          timeStepMinutes={1}
          minHour={0}
          maxHour={23}
          className={error ? 'border-destructive' : undefined}
        />
        {/* Un archivo puede traer la fecha sin hora y el estudio se registraría a
            las 00:00 sin que nadie lo note. Se enseña el texto ORIGINAL del
            archivo, no el valor actual: si mostrara el actual, tras elegir una
            fecha repetiría lo que ya se ve en el calendario y dejaría de servir
            para comparar. */}
        {!error && original && (
          <p className="px-1 text-[11px] text-muted-foreground">En el archivo: {original}</p>
        )}
        {error && (
          <p className="flex items-start gap-1 px-1 text-[11px] leading-tight text-destructive">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" />
            <span>No se entendió «{original}». Elige la fecha.</span>
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
      <div className="flex h-9 w-28 items-center gap-2">
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
          <SelectTrigger className={cn('h-9 text-[12px]', error && 'border-destructive bg-destructive/5')}>
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
        // 36px es la altura del selector de fecha, que es un componente
        // compartido: se igualan los demas a el y no al reves.
        className={cn('h-9 text-[12px]', error && 'border-destructive bg-destructive/5')}
      />
      {error && (
        <div className="px-1 pt-0.5 text-[11px] leading-tight text-destructive">{error}</div>
      )}
    </>
  )
}
