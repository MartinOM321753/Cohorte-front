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
  ({ className, type, sanitize, onChange, onBlur, onWheel, ...props }, ref) => {

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

    /**
     * Intercepta onWheel: evita que la rueda del ratón altere los campos
     * numéricos.
     *
     * Un `input type="number"` con el foco puesto incrementa o decrementa su
     * valor al girar la rueda. Al desplazarse por un formulario largo, el
     * puntero pasa por encima de un campo y le cambia el dato sin que la
     * persona se entere: en captura clínica eso es una alteración silenciosa
     * de resultados.
     *
     * Se quita el foco en vez de llamar a preventDefault() a propósito:
     * preventDefault también bloquearía el desplazamiento de la página, que es
     * justo lo que se quiere hacer. Sin foco, el campo ignora la rueda y la
     * página se desplaza con normalidad.
     */
    const handleWheel = React.useCallback(
      (e: React.WheelEvent<HTMLInputElement>) => {
        if (e.currentTarget.type === 'number') {
          e.currentTarget.blur()
        }
        onWheel?.(e)
      },
      [onWheel],
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
          // Oculta las flechas de los campos numericos. Miden unos pocos pixeles
          // y estan pegadas al borde, asi que es facil rozarlas y alterar un dato
          // sin querer. El valor se teclea; las flechas del teclado siguen
          // funcionando. Chrome/Edge usan los pseudoelementos; Firefox, textfield.
          '[appearance:textfield]',
          '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0',
          '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0',
          className,
        )}
        onChange={sanitize ? handleChange : onChange}
        onBlur={sanitize ? handleBlur : onBlur}
        onWheel={handleWheel}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
