import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Lock, LockOpen, RotateCcw } from 'lucide-react'
import type { Orbit } from './useOrbit'

/**
 * Escenario común a las cuatro vistas.
 *
 * <p>La escena se compone siempre sobre un lienzo de tamaño fijo
 * ({@link width} × {@link height}) y luego se escala para caber en el hueco
 * disponible. Es lo que permite que el mismo componente funcione en un teléfono
 * de 320 px y en un monitor sin una sola barra de desplazamiento lateral: la
 * geometría 3D no se recalcula, solo se reduce.
 */
export function Scene3D({
  orbit,
  children,
  leyenda,
  aside,
}: {
  orbit: Orbit
  children: ReactNode
  /** Chips de leyenda bajo el escenario. */
  leyenda?: ReactNode
  /** Control flotante propio de la vista (p. ej. el riel de alturas del piso). */
  aside?: ReactNode
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [encuadre, setEncuadre] = useState('scale(1)')

  useLayoutEffect(() => {
    const caja = boxRef.current
    const capaFit = fitRef.current
    const raiz = rootRef.current
    if (!caja || !capaFit || !raiz) return

    const medir = () => {
      // Se mide con el encuadre desactivado; si no, cada medición dependería
      // del encuadre anterior y el valor nunca se estabilizaría.
      capaFit.style.transform = 'none'
      const marco = caja.getBoundingClientRect()
      if (marco.width <= 0 || marco.height <= 0) return

      // Dos niveles bastan: las piezas son grupos con sus caras dentro, y lo que
      // cuelga de una cara (rejillas) nunca sobresale de ella.
      const piezas = raiz.querySelectorAll<HTMLElement>(':scope > *, :scope > * > *')
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      piezas.forEach((p) => {
        const r = p.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) return
        minX = Math.min(minX, r.left)
        minY = Math.min(minY, r.top)
        maxX = Math.max(maxX, r.right)
        maxY = Math.max(maxY, r.bottom)
      })
      if (!Number.isFinite(minX)) return

      const anchoEscena = Math.max(maxX - minX, 1)
      const altoEscena = Math.max(maxY - minY, 1)
      const escala = Math.min(
        (marco.width * 0.94) / anchoEscena,
        (marco.height * 0.94) / altoEscena,
        1.6,
      )
      const centroX = marco.left + marco.width / 2
      const centroY = marco.top + marco.height / 2
      const dx = (centroX - (minX + maxX) / 2) * escala
      const dy = (centroY - (minY + maxY) / 2) * escala
      const nuevo = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${escala.toFixed(3)})`
      capaFit.style.transform = nuevo
      setEncuadre(nuevo)
    }

    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(caja)
    return () => ro.disconnect()
    // El encuadre se fija al montar la vista y al cambiar de tamaño: girar la
    // escena no lo recalcula, así el objeto no "salta" mientras se arrastra.
  }, [])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        ref={boxRef}
        className="relative min-h-0 min-w-0 flex-1 touch-none select-none overflow-hidden"
        style={{ cursor: orbit.locked ? 'default' : orbit.dragging ? 'grabbing' : 'grab' }}
        {...orbit.handlers}
      >
        {aside}
        {/* Capa 2D: escala y centra la imagen ya proyectada, sin tocar la
            geometría 3D que hay debajo. */}
        <div
          ref={fitRef}
          className="absolute inset-0"
          style={{ transform: encuadre, transformOrigin: '50% 50%' }}
        >
          <div className="absolute inset-0" style={{ perspective: '1100px' }}>
            <div
              ref={rootRef}
              className="absolute left-1/2 top-1/2"
              style={{
                transformStyle: 'preserve-3d',
                transformOrigin: '0 0',
                transform: orbit.transform,
                transition: orbit.dragging ? 'none' : 'transform 260ms ease-out',
                ...orbit.vars,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{leyenda}</div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={orbit.reset}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Vista inicial
          </button>
          <button
            type="button"
            onClick={orbit.toggleLock}
            aria-pressed={orbit.locked}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
              orbit.locked
                ? 'border-[var(--imss-ochre-500)] bg-[color-mix(in_srgb,var(--imss-ochre-500)_16%,transparent)] text-[var(--imss-ochre-700)]'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {orbit.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
            {orbit.locked ? 'Bloqueado' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Chip de leyenda: un cuadrito de color y su significado. */
export function Leyenda({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-border"
        style={{ background: color }}
      />
      {children}
    </span>
  )
}

/**
 * Aviso de "arrastra para girar" que se retira solo tras el primer arrastre.
 * Sin él la interacción no se descubre: la escena parece una imagen.
 */
export function PistaArrastre({ visible }: { visible: boolean }) {
  const [oculto, setOculto] = useState(false)
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setOculto(true), 4000)
    return () => clearTimeout(t)
  }, [visible])
  if (!visible || oculto) return null
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground shadow-sm">
      Arrastra para girar
    </div>
  )
}
