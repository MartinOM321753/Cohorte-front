import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

/** Inclinación mínima y máxima: por debajo de 18° la escena se aplana y deja de leerse. */
const TILT_MIN = 18
const TILT_MAX = 84

export interface OrbitHome {
  rotX: number
  rotZ: number
}

export interface Orbit {
  rotX: number
  rotZ: number
  locked: boolean
  /** Se pasa al contenedor arrastrable. */
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
  }
  /** `rotateX(...) rotateZ(...)` listo para el nodo raíz de la escena. */
  transform: string
  /**
   * `--rx` / `--rz` para que las etiquetas se contrarroten y sigan legibles
   * desde cualquier ángulo.
   */
  vars: CSSProperties
  reset: () => void
  toggleLock: () => void
  dragging: boolean
}

/**
 * Órbita compartida por las cuatro vistas: arrastrar inclina y gira, *Vista
 * inicial* vuelve al ángulo home y *Bloquear* congela el ángulo.
 *
 * <p>El giro en Z es libre; la inclinación se limita para que la escena nunca
 * quede vista de canto ni completamente cenital.
 */
export function useOrbit(home: OrbitHome): Orbit {
  const [rotX, setRotX] = useState(home.rotX)
  const [rotZ, setRotZ] = useState(home.rotZ)
  // Arranca bloqueado a proposito. Con la orbita libre, el arrastre captura el
  // puntero en cuanto se aprieta sobre una pieza y el clic nunca llega a ella:
  // no se puede seleccionar nada. Girar es lo ocasional; seleccionar es a lo que
  // se viene, asi que lo que pide un gesto deliberado es girar.
  const [locked, setLocked] = useState(true)
  const [dragging, setDragging] = useState(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (locked) return
    // Con captura el arrastre sobrevive a salir del contenedor; sin ella la
    // escena se quedaba girada a medias al soltar fuera del escenario. Si el
    // puntero ya no está activo la captura lanza, y perder el giro entero por
    // eso sería peor que girar sin captura.
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* puntero no capturable: el arrastre sigue funcionando sin captura */
    }
    last.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
  }, [locked])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (locked || !last.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setRotZ((z) => z + dx * 0.45)
    setRotX((x) => Math.min(TILT_MAX, Math.max(TILT_MIN, x + dy * 0.35)))
  }, [locked])

  const endDrag = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* nunca se llegó a capturar */
    }
    last.current = null
    setDragging(false)
  }, [])

  const reset = useCallback(() => {
    setRotX(home.rotX)
    setRotZ(home.rotZ)
  }, [home.rotX, home.rotZ])

  const toggleLock = useCallback(() => setLocked((l) => !l), [])

  const vars = useMemo(
    () => ({ '--rx': `${rotX}deg`, '--rz': `${rotZ}deg` }) as CSSProperties,
    [rotX, rotZ],
  )

  return {
    rotX,
    rotZ,
    locked,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    transform: `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
    vars,
    reset,
    toggleLock,
  }
}

/**
 * Contrarrotación de una etiqueta dentro de la escena. Deshace el giro del
 * escenario en orden inverso, así que el texto sigue de frente al girar.
 */
export const CONTRA_ROTACION = 'rotateZ(calc(-1 * var(--rz))) rotateX(calc(-1 * var(--rx)))'
