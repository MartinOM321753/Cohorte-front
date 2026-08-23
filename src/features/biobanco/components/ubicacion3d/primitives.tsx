import type { CSSProperties, ReactNode } from 'react'
import { CONTRA_ROTACION } from './useOrbit'

/**
 * Piezas de la escena.
 *
 * <p>Convención de ejes: el plano XY es la planta y +Z apunta hacia arriba.
 * Todo elemento se sitúa con {@link at}, que primero centra la pieza sobre su
 * propio origen y luego la lleva a su sitio, de modo que las coordenadas que
 * escribe cada vista son las del centro de la pieza.
 */
export function at(x: number, y: number, z: number, rot = ''): string {
  return `translate3d(${x}px, ${y}px, ${z}px) ${rot} translate(-50%, -50%)`
}

/**
 * Base de toda pieza. El `transformOrigin` en la esquina es obligatorio: con el
 * origen centrado que trae CSS por defecto, el `translate(-50%, -50%)` de
 * {@link at} se aplica sobre una pieza que ya gira alrededor de su centro y el
 * centrado se cuenta dos veces — las caras laterales salen disparadas fuera del
 * prisma.
 */
const capa: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  transformStyle: 'preserve-3d',
  transformOrigin: '0 0',
}

/** Colores de la escena, todos derivados del tema activo. */
export const C = {
  /** Cara superior de una pieza neutra. */
  tapa: 'color-mix(in srgb, var(--imss-green-500) 12%, var(--card))',
  /** Costados: más oscuros para que se lea el volumen. */
  lado: 'color-mix(in srgb, var(--imss-green-900) 22%, var(--card))',
  ladoTenue: 'color-mix(in srgb, var(--imss-green-900) 12%, var(--card))',
  borde: 'var(--border)',
  /** Pieza seleccionada por el usuario. */
  seleccion: 'color-mix(in srgb, var(--imss-green-500) 30%, var(--card))',
  bordeSeleccion: 'var(--imss-green-500)',
  /** El destino de la búsqueda. */
  destino: 'color-mix(in srgb, var(--imss-ochre-500) 62%, var(--card))',
  destinoFuerte: 'var(--imss-ochre-500)',
  bordeDestino: 'var(--imss-ochre-700)',
  /** Celdas de rejilla. */
  celdaLibre: 'color-mix(in srgb, var(--muted-foreground) 10%, transparent)',
  celdaOcupada: 'color-mix(in srgb, var(--imss-green-500) 48%, var(--card))',
} as const

export interface CajaGeom {
  w: number
  d: number
  h: number
  x?: number
  y?: number
  z?: number
}

/**
 * Prisma de cinco caras (tapa y cuatro costados). No lleva base: nunca se ve y
 * duplicar caras multiplica los nodos de una rejilla que ya puede tener cientos.
 */
export function Prisma({
  w,
  d,
  h,
  x = 0,
  y = 0,
  z = 0,
  tapa = C.tapa,
  lado = C.lado,
  borde = C.borde,
  radio = 3,
  opacidad = 1,
  sombraTapa,
  contenidoTapa,
  onClick,
  title,
  ariaLabel,
}: CajaGeom & {
  tapa?: string
  lado?: string
  borde?: string
  radio?: number
  opacidad?: number
  /** Sombra/realce extra sobre la tapa (p. ej. el aro del destino). */
  sombraTapa?: string
  contenidoTapa?: ReactNode
  onClick?: () => void
  title?: string
  ariaLabel?: string
}) {
  const caraBase: CSSProperties = {
    ...capa,
    border: `1px solid ${borde}`,
    borderRadius: radio,
    boxSizing: 'border-box',
  }
  const interactivo = !!onClick
  return (
    <div style={{ ...capa, transform: at(x, y, z), opacity: opacidad }}>
      {/* tapa */}
      <div
        role={interactivo ? 'button' : undefined}
        tabIndex={interactivo ? 0 : undefined}
        aria-label={ariaLabel}
        title={title}
        onClick={onClick}
        onKeyDown={
          interactivo
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick?.()
                }
              }
            : undefined
        }
        style={{
          ...caraBase,
          width: w,
          height: d,
          background: tapa,
          transform: at(0, 0, h),
          boxShadow: sombraTapa,
          cursor: interactivo ? 'pointer' : undefined,
        }}
      >
        {contenidoTapa}
      </div>
      {/* costados en Y */}
      <div style={{ ...caraBase, width: w, height: h, background: lado, transform: at(0, d / 2, h / 2, 'rotateX(-90deg)') }} />
      <div style={{ ...caraBase, width: w, height: h, background: lado, transform: at(0, -d / 2, h / 2, 'rotateX(-90deg)') }} />
      {/* costados en X */}
      <div style={{ ...caraBase, width: d, height: h, background: lado, transform: at(w / 2, 0, h / 2, 'rotateY(90deg) rotateZ(-90deg)') }} />
      <div style={{ ...caraBase, width: d, height: h, background: lado, transform: at(-w / 2, 0, h / 2, 'rotateY(90deg) rotateZ(-90deg)') }} />
    </div>
  )
}

/**
 * Texto dentro de la escena. Se contrarrota, así que sigue de frente y legible
 * en cualquier ángulo de la órbita.
 */
export function Etiqueta({
  x,
  y,
  z,
  children,
  tono = 'muted',
  className = '',
}: {
  x: number
  y: number
  z: number
  children: ReactNode
  tono?: 'muted' | 'destino' | 'fuerte'
  className?: string
}) {
  const color =
    tono === 'destino'
      ? 'var(--imss-ochre-700)'
      : tono === 'fuerte'
        ? 'var(--foreground)'
        : 'var(--muted-foreground)'
  return (
    <div
      className={`whitespace-nowrap text-[10px] font-medium leading-none ${className}`}
      style={{ ...capa, transform: at(x, y, z, CONTRA_ROTACION), color }}
    >
      {children}
    </div>
  )
}

/** Etiqueta con fondo: para el código de la posición destino. */
export function Chip({
  x,
  y,
  z,
  children,
}: {
  x: number
  y: number
  z: number
  children: ReactNode
}) {
  return (
    <div
      className="whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-semibold leading-none shadow-sm"
      style={{
        ...capa,
        transform: at(x, y, z, CONTRA_ROTACION),
        background: C.destinoFuerte,
        color: 'var(--imss-green-900)',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Marca del frente: la línea punteada con topes que señala por dónde se abre.
 * Sin ella la escena gira y se pierde de vista cuál es la cara accesible.
 */
export function LineaPuerta({ ancho, y, z }: { ancho: number; y: number; z: number }) {
  return (
    <div style={{ ...capa, transform: at(0, y, z) }}>
      <div
        style={{
          ...capa,
          width: ancho,
          height: 0,
          borderTop: `1px dashed ${C.destinoFuerte}`,
          transform: at(0, 0, 0),
        }}
      />
      {[-ancho / 2, ancho / 2].map((x) => (
        <div
          key={x}
          style={{
            ...capa,
            width: 1,
            height: 9,
            background: C.destinoFuerte,
            transform: at(x, 0, 0),
          }}
        />
      ))}
      <Etiqueta x={0} y={12} z={0} tono="destino">
        Frente
      </Etiqueta>
    </div>
  )
}

/**
 * Hilo vertical del destino a su rótulo. Sin él, en una pila de alturas el chip
 * flota sobre la escena sin decir a cuál de las cajas pertenece.
 */
export function Guia({
  x,
  y,
  zDesde,
  zHasta,
}: {
  x: number
  y: number
  zDesde: number
  zHasta: number
}) {
  const alto = Math.max(zHasta - zDesde, 0)
  if (alto <= 0) return null
  return (
    <div
      style={{
        ...capa,
        transform: at(x, y, zDesde + alto / 2, CONTRA_ROTACION),
        width: 1,
        height: alto,
        background: C.destinoFuerte,
        opacity: 0.8,
      }}
    />
  )
}

/** Vial sobre la celda destino: se contrarrota para leerse siempre de perfil. */
export function Vial({ x, y, z, alto = 34 }: { x: number; y: number; z: number; alto?: number }) {
  return (
    <div
      style={{
        ...capa,
        transform: at(x, y, z + alto / 2, CONTRA_ROTACION),
        width: 13,
        height: alto,
        borderRadius: '3px 3px 6px 6px',
        border: `1px solid ${C.bordeDestino}`,
        background: `linear-gradient(to bottom, color-mix(in srgb, var(--imss-ochre-300) 55%, transparent) 0%, color-mix(in srgb, var(--imss-ochre-300) 55%, transparent) 38%, ${C.destinoFuerte} 38%, ${C.destinoFuerte} 100%)`,
        boxShadow: '0 2px 6px color-mix(in srgb, var(--imss-green-900) 30%, transparent)',
      }}
    />
  )
}
