import { useMemo } from 'react'
import { Leyenda, PistaArrastre, Scene3D } from './Scene3D'
import { C, Chip, Etiqueta, Prisma } from './primitives'
import { useOrbit } from './useOrbit'
import type { Ubicacion3DCaja } from './ubicacion3d.types'

const AREA_W = 226
const AREA_D = 156
const PARED_H = 24

/**
 * Vista 2 · La caja con su rejilla de posiciones en la cara superior.
 *
 * <p>El sistema solo distingue celda libre y celda ocupada — no hay reserva ni
 * clasificación por proyecto — así que la leyenda tiene exactamente esos dos
 * estados más el resaltado.
 *
 * <p>Un clic selecciona la celda y el panel lateral pasa a describirla; el
 * segundo abre el acercamiento a su vecindario.
 */
export function BoxView({
  caja,
  posicionSeleccionada,
  onSeleccionar,
  onEntrar,
}: {
  caja: Ubicacion3DCaja
  /** Celda elegida, por id de PosicionCaja. */
  posicionSeleccionada: number | null
  onSeleccionar: (idPosicion: number) => void
  onEntrar: (idPosicion: number) => void
}) {
  const orbit = useOrbit({ rotX: 56, rotZ: -30 })

  const celda = Math.min(AREA_W / Math.max(caja.columnas, 1), AREA_D / Math.max(caja.filas, 1), 26)
  const w = celda * caja.columnas
  const d = celda * caja.filas

  const xDe = (columna: number) => (columna - (caja.columnas + 1) / 2) * celda
  const yDe = (fila: number) => (fila - (caja.filas + 1) / 2) * celda

  /** Celda resaltada: la que el usuario eligió o, si sigue una muestra, la suya. */
  const resaltada = useMemo(
    () =>
      caja.posiciones.find((p) => p.id === posicionSeleccionada) ??
      caja.posiciones.find((p) => p.esDestino) ??
      null,
    [caja.posiciones, posicionSeleccionada],
  )

  return (
    <Scene3D
      orbit={orbit}
      leyenda={
        <>
          {caja.filaDestino != null && (
            <Leyenda color={C.destinoFuerte}>Posición de la muestra</Leyenda>
          )}
          <Leyenda color={C.seleccion}>Seleccionada</Leyenda>
          <Leyenda color={C.celdaOcupada}>Ocupada</Leyenda>
          <Leyenda color={C.celdaLibre}>Libre</Leyenda>
        </>
      }
    >
      <PistaArrastre visible={!orbit.locked} />

      <Prisma
        w={w}
        d={d}
        h={PARED_H}
        radio={4}
        tapa="color-mix(in srgb, var(--imss-green-900) 6%, var(--card))"
        lado={C.lado}
        contenidoTapa={
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))`,
            }}
          >
            {caja.posiciones.map((p) => {
              const seleccionada = p.id === posicionSeleccionada
              const contenido = p.ocupada ? (p.etiquetaMuestra ?? 'ocupada') : 'libre'
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={-1}
                  aria-label={`Fila ${p.fila}, columna ${p.columna}: ${contenido}`}
                  title={
                    seleccionada
                      ? `Ver F${p.fila} C${p.columna} de cerca`
                      : `F${p.fila} C${p.columna} · ${contenido}`
                  }
                  onClick={() => (seleccionada ? onEntrar(p.id) : onSeleccionar(p.id))}
                  className="m-[1px] cursor-pointer rounded-[2px]"
                  style={{
                    border: `1px solid ${
                      p.esDestino ? C.bordeDestino : seleccionada ? C.bordeSeleccion : C.borde
                    }`,
                    background: p.esDestino
                      ? C.destinoFuerte
                      : seleccionada
                        ? C.seleccion
                        : p.ocupada
                          ? C.celdaOcupada
                          : C.celdaLibre,
                    boxShadow: p.esDestino
                      ? '0 0 0 2px color-mix(in srgb, var(--imss-ochre-500) 45%, transparent)'
                      : seleccionada
                        ? '0 0 0 2px color-mix(in srgb, var(--imss-green-500) 55%, transparent)'
                        : undefined,
                  }}
                />
              )
            })}
          </div>
        }
      />

      {resaltada && (
        <Chip x={xDe(resaltada.columna)} y={yDe(resaltada.fila)} z={PARED_H + 52}>
          F{resaltada.fila} · C{resaltada.columna}
        </Chip>
      )}

      <Etiqueta x={0} y={d / 2 + 22} z={0} tono="fuerte">
        {caja.codigoCaja}
      </Etiqueta>

      {/* Marcadores de columna (arriba) y de fila (izquierda). */}
      {Array.from({ length: caja.columnas }, (_, i) => i + 1).map((c) => (
        <Etiqueta
          key={`c-${c}`}
          x={xDe(c)}
          y={-d / 2 - 11}
          z={PARED_H}
          tono={c === resaltada?.columna ? 'destino' : 'muted'}
        >
          {c}
        </Etiqueta>
      ))}
      {Array.from({ length: caja.filas }, (_, i) => i + 1).map((f) => (
        <Etiqueta
          key={`f-${f}`}
          x={-w / 2 - 10}
          y={yDe(f)}
          z={PARED_H}
          tono={f === resaltada?.fila ? 'destino' : 'muted'}
        >
          {f}
        </Etiqueta>
      ))}
    </Scene3D>
  )
}
