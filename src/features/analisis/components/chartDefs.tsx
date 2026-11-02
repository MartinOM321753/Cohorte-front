import type { ReactElement } from 'react'

/**
 * `<defs>` reutilizables para las gráficas: degradados verticales (barras y área),
 * degradado radial (puntos) y un filtro de «glow» suave, todos derivados de la
 * paleta del tema activo. La opacidad va en `stop-opacity` (no en el color) para
 * que funcione igual con colores hex u oklch de cualquier tema.
 *
 * IMPORTANTE: Recharts descarta los hijos que son componentes propios, así que se
 * usa como función que devuelve un `<defs>` crudo e inline:
 *   {chartDefs('vr', [colores.line])}
 * Referenciar con `url(#${id}-bar-0)`, `url(#${id}-area-0)`, `url(#${id}-dot-0)`
 * y `url(#${id}-glow)`.
 */
export function chartDefs(id: string, palette: string[]): ReactElement {
  return (
    <defs>
      {palette.map((c, i) => (
        <linearGradient key={`b${i}`} id={`${id}-bar-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.95} />
          <stop offset="100%" stopColor={c} stopOpacity={0.3} />
        </linearGradient>
      ))}
      {palette.map((c, i) => (
        <linearGradient key={`a${i}`} id={`${id}-area-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.4} />
          <stop offset="100%" stopColor={c} stopOpacity={0.02} />
        </linearGradient>
      ))}
      {palette.map((c, i) => (
        <radialGradient key={`d${i}`} id={`${id}-dot-${i}`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={c} stopOpacity={0.98} />
          <stop offset="100%" stopColor={c} stopOpacity={0.35} />
        </radialGradient>
      ))}
      <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}
