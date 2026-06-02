import * as React from 'react'

import { cn } from '@/lib/utils'
import { applySanitizer, type SanitizeType } from '@/lib/sanitize'

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  /**
   * Tipo de sanitización a aplicar en tiempo real.
   * Para observaciones y notas clínicas usa `"descripcion"`.
   * Ver `SanitizeType` en `@/lib/sanitize` para todas las opciones.
   */
  sanitize?: SanitizeType
}

function Textarea({ className, sanitize, onChange, onBlur, ...props }: TextareaProps) {
  /**
   * Intercepta onChange: aplica el sanitizador antes de notificar a RHF.
   */
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
   */
  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
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
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-card px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      onChange={sanitize ? handleChange : onChange}
      onBlur={sanitize ? handleBlur : onBlur}
      {...props}
    />
  )
}

export { Textarea }
