import * as React from 'react'

import { cn } from '@/lib/utils'
import { applySanitizer, type SanitizeType } from '@/lib/sanitize'

export interface InputProps extends React.ComponentProps<'input'> {
  /**
   * Tipo de sanitización a aplicar en tiempo real mientras el usuario escribe.
   *
   * - **nombre** / **apellido**: solo letras con acentos; primera letra de cada
   *   palabra en mayúscula; sin números ni símbolos.
   * - **texto**: letras, números y puntuación básica; bloquea caracteres
   *   peligrosos (SQL / XSS).
   * - **descripcion**: texto clínico libre; bloquea solo caracteres XSS (< > &).
   * - **codigo**: alfanumérico + guión, todo en mayúsculas (ej. REF-001).
   * - **folio**: letras + números + guión + guión bajo (ej. C-00184).
   * - **alfanumerico**: letras con acentos, números, espacios y guión.
   * - **telefono**: solo dígitos (0-9).
   * - **usuario**: minúsculas + dígitos + . _ - (para usernames).
   * - **numero**: dígitos + un punto decimal.
   */
  sanitize?: SanitizeType
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, sanitize, onChange, onBlur, ...props }, ref) => {

    /**
     * Intercepta onChange: aplica el sanitizador antes de notificar a
     * React Hook Form (o cualquier handler externo).
     *
     * La mutación directa de `e.currentTarget.value` es segura aquí porque:
     * 1. `currentTarget` es el nodo DOM real (mutable).
     * 2. React Hook Form lee `event.target.value` al procesar el evento —
     *    con el valor ya saneado.
     */
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (sanitize) {
          const raw = e.currentTarget.value
          const cleaned = applySanitizer(sanitize, raw)
          if (cleaned !== raw) {
            e.currentTarget.value = cleaned
          }
        }
        onChange?.(e)
      },
      [sanitize, onChange],
    )

    /**
     * Intercepta onBlur: elimina espacios sobrantes al inicio y al final.
     * El valor del DOM queda actualizado visualmente; el valor final también
     * queda limpio en la capa Zod (`.trim()` en los schemas).
     */
    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (sanitize) {
          const trimmed = e.currentTarget.value.trim()
          if (trimmed !== e.currentTarget.value) {
            e.currentTarget.value = trimmed
          }
        }
        onBlur?.(e)
      },
      [sanitize, onBlur],
    )

    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-card px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className,
        )}
        onChange={sanitize ? handleChange : onChange}
        onBlur={sanitize ? handleBlur : onBlur}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
