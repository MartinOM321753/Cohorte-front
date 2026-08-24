import { Fragment, useMemo, useState } from 'react'
import { Leyenda, PistaArrastre, Scene3D } from './Scene3D'
import { C, Chip, Etiqueta, Guia, LineaPuerta, Prisma, at } from './primitives'
import { useOrbit } from './useOrbit'
import type { Ubicacion3DPiso } from './ubicacion3d.types'

const AREA_W = 236
const AREA_D = 158
const CAJA_H = 20
const SEPARACION_ALTURA = 27
const DESPEJE = 34

/**
 * Vista 1 · El piso como rejilla de cajas en isométrico.
 *
 * <p>Las dimensiones vienen del piso, no del prototipo: un piso puede ser 3×4×3
 * o 6×6×1 y la escena se adapta repartiendo el área disponible entre filas y
 * columnas reales.
 *
 * <p>Un clic selecciona la caja —el panel lateral pasa a describirla— y el
 * segundo entra en ella, si {@link puedeEntrar} lo permite.
 */
export function FloorView({
  piso,
  cajaSeleccionada,
  onSeleccionar,
  onEntrar,
  puedeEntrar,
}: {
  piso: Ubicacion3DPiso
  /** Hueco seleccionado, por id de PosicionPiso. */
  cajaSeleccionada: number | null
  onSeleccionar: (idPosicionPiso: number) => void
  onEntrar: (idCaja: number) => void
  /** Al seguir una muestra concreta solo se puede entrar a su caja. */
  puedeEntrar: (idCaja: number) => boolean
}) {
  const orbit = useOrbit({ rotX: 58, rotZ: -38 })
  /** null = todas las alturas apiladas; un número = corte por esa altura. */
  const [corte, setCorte] = useState<number | null>(null)

  const cellW = Math.min(AREA_W / Math.max(piso.columnas, 1), 64)
  const cellD = Math.min(AREA_D / Math.max(piso.filas, 1), 64)
  const cajaW = Math.max(cellW - 6, 10)
  const cajaD = Math.max(cellD - 6, 10)

  const alturas = useMemo(
    () => Array.from({ length: Math.max(piso.altura, 1) }, (_, i) => i + 1),
    [piso.altura],
  )

  const visibles = useMemo(
    () => piso.cajas.filter((c) => corte === null || c.alturaIndex === corte),
    [piso.cajas, corte],
  )

  /** Hueco resaltado: el que el usuario eligió o, si sigue una muestra, el suyo. */
  const resaltado = useMemo(
    () =>
      piso.cajas.find((c) => c.idPosicionPiso === cajaSeleccionada) ??
      piso.cajas.find((c) => c.esDestino) ??
      null,
    [piso.cajas, cajaSeleccionada],
  )
  /** Niveles por encima del activo se apartan; sin nivel activo no se aparta nada. */
  const alturaActiva = resaltado?.alturaIndex ?? Number.POSITIVE_INFINITY

  const posicion = (filaIndex: number, columnaIndex: number, alturaIndex: number) => ({
    x: (columnaIndex - (piso.columnas + 1) / 2) * cellW,
    y: (filaIndex - (piso.filas + 1) / 2) * cellD,
    z:
      corte !== null
        ? 0
        : (alturaIndex - 1) * SEPARACION_ALTURA + (alturaIndex > alturaActiva ? DESPEJE : 0),
  })

  const zBase = 0
  /** Techo de la escena: donde cuelga el rótulo del destino. */
  const zRotulo =
    corte !== null
      ? CAJA_H + 16
      : (piso.altura - 1) * SEPARACION_ALTURA + DESPEJE + CAJA_H + 16

  return (
    <Scene3D
      orbit={orbit}
      leyenda={
        <>
          {piso.idCajaDestino != null && (
            <Leyenda color={C.destino}>Caja de la muestra</Leyenda>
          )}
          <Leyenda color={C.seleccion}>Seleccionada</Leyenda>
          <Leyenda color={C.tapa}>Caja colocada</Leyenda>
          <Leyenda color={C.celdaLibre}>Hueco libre</Leyenda>
        </>
      }
      aside={
        <RielAlturas alturas={alturas} corte={corte} onCambiar={setCorte} />
      }
    >
      <PistaArrastre visible={!orbit.locked} />

      <LineaPuerta ancho={AREA_W + 14} y={(piso.filas * cellD) / 2 + 16} z={zBase - 12} />

      {/* Al cortar por una altura se dibuja la plancha de ese nivel. Sin ella los
          huecos quedan flotando sueltos y la vista deja de leerse como una capa,
          sobre todo cuando ese nivel no tiene ninguna caja: se veian nueve
          recuadros en el aire y parecia que no habia cargado nada.

          Con todas las alturas apiladas no hace falta: el propio apilado ya
          enseña que hay varios niveles, y una plancha por nivel taparia el de
          abajo. */}
      {corte !== null && (
        <Prisma
          w={piso.columnas * cellW + 14}
          d={piso.filas * cellD + 14}
          h={5}
          z={-8}
          radio={4}
          tapa={C.tapa}
          lado={C.lado}
          borde={C.borde}
        />
      )}

      {visibles.map((hueco) => {
        const { x, y, z } = posicion(hueco.filaIndex, hueco.columnaIndex, hueco.alturaIndex)

        if (!hueco.idCaja) {
          return (
            <div
              key={hueco.idPosicionPiso}
              title={`Hueco libre ${hueco.fila}${hueco.columna} · altura ${hueco.altura}`}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transformOrigin: '0 0',
                width: cajaW,
                height: cajaD,
                border: `1px dashed ${C.borde}`,
                borderRadius: 3,
                background: C.celdaLibre,
                boxSizing: 'border-box',
                transform: at(x, y, z),
              }}
            />
          )
        }

        const esDestino = hueco.esDestino
        const esSeleccionada = hueco.idPosicionPiso === cajaSeleccionada
        const entrable = puedeEntrar(hueco.idCaja)
        const llenado = hueco.capacidad ? (hueco.ocupadas ?? 0) / hueco.capacidad : 0
        return (
          <Prisma
            key={hueco.idPosicionPiso}
            w={cajaW}
            d={cajaD}
            h={CAJA_H}
            x={x}
            y={y}
            z={z}
            tapa={
              esDestino
                ? C.destino
                : esSeleccionada
                  ? C.seleccion
                  : `color-mix(in srgb, var(--imss-green-500) ${Math.round(8 + llenado * 34)}%, var(--card))`
            }
            lado={esDestino ? 'color-mix(in srgb, var(--imss-ochre-700) 55%, var(--card))' : C.lado}
            borde={esDestino ? C.bordeDestino : esSeleccionada ? C.bordeSeleccion : C.borde}
            sombraTapa={
              esDestino
                ? '0 0 0 2px color-mix(in srgb, var(--imss-ochre-500) 55%, transparent)'
                : esSeleccionada
                  ? '0 0 0 2px color-mix(in srgb, var(--imss-green-500) 55%, transparent)'
                  : undefined
            }
            onClick={() =>
              esSeleccionada && entrable
                ? onEntrar(hueco.idCaja!)
                : onSeleccionar(hueco.idPosicionPiso)
            }
            title={
              esSeleccionada && entrable
                ? `Entrar a la caja ${hueco.codigoCaja}`
                : `${hueco.codigoCaja} · ${hueco.ocupadas ?? 0}/${hueco.capacidad ?? 0} posiciones`
            }
            ariaLabel={`Caja ${hueco.codigoCaja} en ${hueco.fila}${hueco.columna} altura ${hueco.altura}`}
          />
        )
      })}

      {/* El código de la caja resaltada, por encima de toda la pila: colgado a la
          altura de su propia caja quedaba escondido tras el nivel superior. */}
      {visibles
        .filter((c) => resaltado != null && c.idPosicionPiso === resaltado.idPosicionPiso)
        .map((c) => {
          const { x, y, z } = posicion(c.filaIndex, c.columnaIndex, c.alturaIndex)
          return (
            <Fragment key={`et-${c.idPosicionPiso}`}>
              <Guia x={x} y={y} zDesde={z + CAJA_H} zHasta={zRotulo} />
              <Chip x={x} y={y} z={zRotulo + 8}>
                {c.codigoCaja}
              </Chip>
            </Fragment>
          )
        })}

      {/* Con corte hay que decir que nivel se esta viendo: sin la pila de
          referencia, una capa suelta es indistinguible de otra. */}
      {corte !== null && (
        <Etiqueta
          x={(piso.columnas * cellW) / 2 + 30}
          y={0}
          z={CAJA_H}
          tono="fuerte"
        >
          Altura {corte}
        </Etiqueta>
      )}

      {/* Marcadores de fila y columna sobre el plano base. */}
      {Array.from({ length: piso.columnas }, (_, i) => i + 1).map((c) => (
        <Etiqueta
          key={`col-${c}`}
          x={(c - (piso.columnas + 1) / 2) * cellW}
          y={-((piso.filas * cellD) / 2) - 14}
          z={zBase}
        >
          {letra(c)}
        </Etiqueta>
      ))}
      {Array.from({ length: piso.filas }, (_, i) => i + 1).map((f) => (
        <Etiqueta
          key={`fil-${f}`}
          x={-((piso.columnas * cellW) / 2) - 14}
          y={(f - (piso.filas + 1) / 2) * cellD}
          z={zBase}
        >
          {letra(f)}
        </Etiqueta>
      ))}
    </Scene3D>
  )
}

/** Conmutador de alturas: apilado completo o corte por nivel. */
function RielAlturas({
  alturas,
  corte,
  onCambiar,
}: {
  alturas: number[]
  corte: number | null
  onCambiar: (v: number | null) => void
}) {
  if (alturas.length <= 1) return null
  const boton = (activo: boolean) =>
    `rounded-md border px-1.5 py-1 text-[10px] leading-none transition-colors ${
      activo
        ? 'border-[var(--imss-green-500)] bg-[color-mix(in_srgb,var(--imss-green-500)_18%,transparent)] text-foreground'
        : 'border-border bg-card/70 text-muted-foreground hover:text-foreground'
    }`
  return (
    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
      <button type="button" onClick={() => onCambiar(null)} className={boton(corte === null)}>
        Todas
      </button>
      {alturas.map((a) => (
        <button key={a} type="button" onClick={() => onCambiar(a)} className={boton(corte === a)}>
          H{a}
        </button>
      ))}
    </div>
  )
}

/** Mismo esquema de etiquetas que usa el backend para PosicionPiso: A, B, C… */
function letra(n: number): string {
  let s = ''
  let x = n
  while (x > 0) {
    x--
    s = String.fromCharCode(65 + (x % 26)) + s
    x = Math.floor(x / 26)
  }
  return s
}
