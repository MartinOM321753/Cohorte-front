import { useMemo } from 'react'
import { Leyenda, PistaArrastre, Scene3D } from './Scene3D'
import { C, Etiqueta, LineaPuerta, Prisma } from './primitives'
import { useOrbit } from './useOrbit'
import type { Ubicacion3DRefrigerador } from './ubicacion3d.types'

const PLANCHA_W = 244
const PLANCHA_D = 164
const PLANCHA_H = 8
const SEPARACION = 44
/** Lo que se apartan las planchas por encima de la activa para no taparla. */
const DESPEJE = 30

/**
 * Vista 0 · El refrigerador como pila de planchas.
 *
 * <p>Cada plancha lleva su propia retícula de ocupación: la planta del piso con
 * un cuadro por hueco, teñido según cuántas alturas de esa columna están
 * ocupadas. Es la única forma de ver de un vistazo dónde queda sitio sin entrar
 * piso por piso.
 *
 * <p>Un clic selecciona el piso —y con eso cambia el panel lateral—; el segundo
 * entra en él, si {@link puedeEntrar} lo permite.
 */
export function FridgeView({
  refrigerador,
  pisoSeleccionado,
  onSeleccionar,
  onEntrar,
  puedeEntrar,
}: {
  refrigerador: Ubicacion3DRefrigerador
  pisoSeleccionado: number | null
  onSeleccionar: (idPiso: number) => void
  onEntrar: (idPiso: number) => void
  /** Al seguir una muestra concreta solo se puede entrar a su piso. */
  puedeEntrar: (idPiso: number) => boolean
}) {
  const orbit = useOrbit({ rotX: 62, rotZ: -34 })
  const pisos = refrigerador.pisos

  // El backend los manda de abajo hacia arriba; la pila se dibuja en ese orden
  // para que el piso 1 quede al fondo, como en el mueble real.
  const geometria = useMemo(() => {
    const activo = pisoSeleccionado ?? refrigerador.idPisoDestino
    // Sin piso activo (exploración recién abierta) no se apartan planchas:
    // la pila se ve entera y compacta hasta que el usuario elige una.
    const indiceActivo = activo == null ? pisos.length : pisos.findIndex((p) => p.id === activo)
    const total = (pisos.length - 1) * SEPARACION
    return pisos.map((piso, i) => ({
      piso,
      z: -total / 2 + i * SEPARACION + (indiceActivo >= 0 && i > indiceActivo ? DESPEJE : 0),
    }))
  }, [pisos, pisoSeleccionado, refrigerador.idPisoDestino])

  const zBase = geometria.length ? geometria[0].z : 0

  return (
    <Scene3D
      orbit={orbit}
      leyenda={
        <>
          {refrigerador.idPisoDestino != null && (
            <Leyenda color={C.destino}>Piso de la muestra</Leyenda>
          )}
          <Leyenda color={C.seleccion}>Seleccionado</Leyenda>
          <Leyenda color={C.celdaOcupada}>Hueco ocupado</Leyenda>
        </>
      }
    >
      <PistaArrastre visible={!orbit.locked} />

      <LineaPuerta ancho={PLANCHA_W + 16} y={PLANCHA_D / 2 + 16} z={zBase - 14} />

      {geometria.map(({ piso, z }) => {
        const esDestino = piso.id === refrigerador.idPisoDestino
        const esSeleccionado = piso.id === pisoSeleccionado
        const entrable = puedeEntrar(piso.id)
        return (
          <Prisma
            key={piso.id}
            w={PLANCHA_W}
            d={PLANCHA_D}
            h={PLANCHA_H}
            z={z}
            radio={4}
            tapa={esDestino ? C.destino : esSeleccionado ? C.seleccion : C.tapa}
            lado={esDestino ? 'color-mix(in srgb, var(--imss-ochre-700) 55%, var(--card))' : C.lado}
            borde={esDestino ? C.bordeDestino : esSeleccionado ? C.bordeSeleccion : C.borde}
            sombraTapa={
              esSeleccionado
                ? '0 0 0 2px color-mix(in srgb, var(--imss-green-500) 55%, transparent)'
                : undefined
            }
            onClick={() =>
              esSeleccionado && entrable ? onEntrar(piso.id) : onSeleccionar(piso.id)
            }
            title={
              esSeleccionado && entrable
                ? `Entrar al piso ${piso.numeroPiso}`
                : `Piso ${piso.numeroPiso} — ${piso.totalCajas} caja${piso.totalCajas === 1 ? '' : 's'}`
            }
            ariaLabel={`Piso ${piso.numeroPiso}, ${piso.posicionesOcupadas} de ${piso.totalPosiciones} huecos ocupados`}
            contenidoTapa={
              <ReticulaPiso
                filas={piso.filas}
                columnas={piso.columnas}
                altura={piso.altura}
                celdas={piso.reticula}
              />
            }
          />
        )
      })}

      {geometria.map(({ piso, z }) => (
        <Etiqueta
          key={`et-${piso.id}`}
          x={-PLANCHA_W / 2 - 62}
          y={0}
          z={z + PLANCHA_H}
          tono={
            piso.id === refrigerador.idPisoDestino
              ? 'destino'
              : piso.id === pisoSeleccionado
                ? 'fuerte'
                : 'muted'
          }
        >
          Piso {piso.numeroPiso} · {piso.porcentajeOcupacion}%
        </Etiqueta>
      ))}
    </Scene3D>
  )
}

/** Planta del piso: un cuadro por hueco, teñido según su ocupación vertical. */
function ReticulaPiso({
  filas,
  columnas,
  altura,
  celdas,
}: {
  filas: number
  columnas: number
  altura: number
  celdas: number[]
}) {
  if (!filas || !columnas) return null
  return (
    <div
      className="grid h-full w-full gap-[2px] p-[5px]"
      style={{
        gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: filas * columnas }, (_, i) => {
        const ocupadas = celdas[i] ?? 0
        const proporcion = altura > 0 ? ocupadas / altura : 0
        return (
          <div
            key={i}
            className="rounded-[1px]"
            style={{
              background:
                proporcion === 0
                  ? C.celdaLibre
                  : `color-mix(in srgb, var(--imss-green-500) ${Math.round(25 + proporcion * 45)}%, var(--card))`,
            }}
          />
        )
      })}
    </div>
  )
}
