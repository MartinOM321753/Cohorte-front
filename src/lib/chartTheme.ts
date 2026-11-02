/**
 * Hook que devuelve los colores de gráficas leyéndolos desde CSS vars del tema activo.
 * Re-evalúa cada vez que el componente se monta (el tema ya fue aplicado al DOM).
 * Usar en lugar de hex hardcodeados para que todos los temas funcionen correctamente.
 */
export function useChartColors() {
  const css =
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement)
      : null
  const v = (name: string) => css?.getPropertyValue(name).trim() ?? ''

  return {
    /** Verde IMSS — línea principal / barras primarias */
    line:    v('--chart-1')              || '#1e4e3a',
    /** Ámbar/ocre — segunda línea */
    line2:   v('--chart-2')              || '#a87b2c',
    /** Azul — tercera línea */
    line3:   v('--chart-3')              || '#0f7490',
    /** Rojo/cardinal — cuarta línea */
    line4:   v('--chart-4')              || '#b3261e',
    /** Líneas de cuadrícula */
    grid:    v('--chart-grid')           || '#dbe1de',
    /** Banda de referencia (fondo) */
    band:    v('--chart-band')           || '#ecf2ee',
    /** Bordes de la banda de referencia (líneas punteadas) */
    refLine: v('--chart-line')           || '#1e4e3a',
    /** Color de error/peligro */
    danger:  v('--destructive')          || '#b3261e',
    /** Color de texto secundario atenuado */
    muted:   v('--muted-foreground')     || '#4a5651',
    /** Color de éxito */
    success: v('--status-success-fg')    || '#145c39',
    /** Color de advertencia */
    warning: v('--status-warning-fg')    || '#8a560e',
    /** Color de texto neutro de ejes */
    ink300:  v('--imss-ink-300')         || '#7d8782',
    /** Color primario del tema */
    primary: v('--primary')              || '#1e4e3a',
    /** Fondo del tooltip (popover del tema) */
    tooltipBg:   v('--popover')            || '#ffffff',
    /** Texto del tooltip (legible en claro y oscuro) */
    tooltipText: v('--popover-foreground') || '#14241d',
    /** Borde del tooltip */
    border:      v('--border')             || '#dbe1de',
  }
}

/**
 * Estilos de tooltip de Recharts anclados a los tokens del tema, para que la
 * etiqueta y los valores siempre contrasten con el fondo (en claro el default
 * blanco escondía el texto claro; aquí usamos --popover/--popover-foreground).
 */
export function tooltipTema(c: ReturnType<typeof useChartColors>) {
  return {
    contentStyle: {
      backgroundColor: c.tooltipBg,
      border: `1px solid ${c.border}`,
      borderRadius: 8,
      fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,.12)',
      color: c.tooltipText,
    } as const,
    labelStyle: { color: c.tooltipText, fontWeight: 600, marginBottom: 2 } as const,
    itemStyle: { color: c.tooltipText } as const,
  }
}
