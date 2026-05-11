import { useState } from 'react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  { label: 'Rojo',     value: '#ef4444' },
  { label: 'Naranja',  value: '#f97316' },
  { label: 'Amarillo', value: '#eab308' },
  { label: 'Verde',    value: '#22c55e' },
  { label: 'Azul',     value: '#3b82f6' },
  { label: 'Morado',   value: '#a855f7' },
  { label: 'Rosa',     value: '#ec4899' },
  { label: 'Blanco',   value: '#f8fafc' },
  { label: 'Gris',     value: '#6b7280' },
  { label: 'Negro',    value: '#1e293b' },
]

interface ColorPickerFieldProps {
  value: string
  onChange: (value: string) => void
}

export function ColorPickerField({ value, onChange }: ColorPickerFieldProps) {
  const [showCustom, setShowCustom] = useState(false)

  const isPreset = PRESET_COLORS.some(c => c.value === value)
  const selectedLabel = PRESET_COLORS.find(c => c.value === value)?.label ?? 'Personalizado'

  return (
    <div className="space-y-2">
      {/* Paleta predefinida */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            onClick={() => onChange(color.value)}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
              value === color.value
                ? 'border-primary ring-2 ring-primary ring-offset-1'
                : 'border-muted-foreground/30'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}

        {/* Botón para color libre */}
        <button
          type="button"
          title="Color personalizado"
          onClick={() => setShowCustom(v => !v)}
          className={cn(
            'w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center text-xs text-muted-foreground hover:border-primary transition-colors',
            !isPreset && value && 'border-primary ring-2 ring-primary ring-offset-1'
          )}
          style={!isPreset && value ? { backgroundColor: value } : undefined}
        >
          {(isPreset || !value) && '+'}
        </button>
      </div>

      {/* Input de color libre */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-input"
          />
          <span className="text-sm text-muted-foreground font-mono">
            {value || '—'}
          </span>
        </div>
      )}

      {/* Etiqueta del color seleccionado */}
      {value && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full border border-muted-foreground/30"
            style={{ backgroundColor: value }}
          />
          {selectedLabel}
        </p>
      )}
    </div>
  )
}