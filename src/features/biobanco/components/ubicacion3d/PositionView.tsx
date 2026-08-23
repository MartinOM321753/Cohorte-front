import { useMemo } from 'react'
import { Leyenda, PistaArrastre, Scene3D } from './Scene3D'
import { C, Chip, Etiqueta, Prisma, Vial } from './primitives'
import { useOrbit } from './useOrbit'
import type { Ubicacion3DCaja, Ubicacion3DPosicion } from './ubicacion3d.types'

const CELDA = 52
const CELDA_H = 9

/**
 * Vista 3 · Acercamiento 3×3 alrededor de la posición destino.
 *
 * <p>La ventana se recorta contra los bordes reales de la caja: en una esquina
 * de una caja 9×9 el vecindario es de 2×2 y no se inventan celdas que no
 * existen.
 *
 * <p>El foco lo decide quien la usa: la posición de la muestra buscada, o la
 * celda que el usuario eligió al explorar la caja.
 */
export function PositionView({
  caja,
  fila,
  columna,
}: {
  caja: Ubicacion3DCaja
  fila: number
  columna: number
}) {
  const orbit = useOrbit({ rotX: 50, rotZ: -26 })

  const vecindad = useMemo(() => {
    const filaMin = Math.max(1, Math.min(fila - 1, caja.filas - 2))
    const columnaMin = Math.max(1, Math.min(columna - 1, caja.columnas - 2))
    const filaMax = Math.min(caja.filas, filaMin + 2)
    const columnaMax = Math.min(caja.columnas, columnaMin + 2)
    const porCoordenada = new Map<string, Ubicacion3DPosicion>()
    for (const p of caja.posiciones) porCoordenada.set(`${p.fila}:${p.columna}`, p)

    const celdas: Array<{ p: Ubicacion3DPosicion | null; fila: number; columna: number }> = []
    for (let f = filaMin; f <= filaMax; f++) {
      for (let c = columnaMin; c <= columnaMax; c++) {
        celdas.push({ p: porCoordenada.get(`${f}:${c}`) ?? null, fila: f, columna: c })
      }
    }
    return {
      celdas,
      filaMin,
      columnaMin,
      filas: filaMax - filaMin + 1,
      columnas: columnaMax - columnaMin + 1,
    }
  }, [caja, fila, columna])

  const foco = useMemo(
    () => caja.posiciones.find((p) => p.fila === fila && p.columna === columna) ?? null,
    [caja.posiciones, fila, columna],
  )

  const xDe = (columna: number) =>
    (columna - vecindad.columnaMin - (vecindad.columnas - 1) / 2) * CELDA
  const yDe = (fila: number) => (fila - vecindad.filaMin - (vecindad.filas - 1) / 2) * CELDA

  return (
    <Scene3D
      orbit={orbit}
      leyenda={
        <>
          <Leyenda color={C.destinoFuerte}>Posición abierta</Leyenda>
          <Leyenda color={C.celdaOcupada}>Vecina ocupada</Leyenda>
          <Leyenda color={C.celdaLibre}>Vecina libre</Leyenda>
        </>
      }
    >
      <PistaArrastre visible={!orbit.locked} />

      {vecindad.celdas.map(({ p, fila: f, columna: c }) => {
        const esFoco = f === fila && c === columna
        return (
          <Prisma
            key={`${f}:${c}`}
            w={CELDA - 6}
            d={CELDA - 6}
            h={CELDA_H}
            x={xDe(c)}
            y={yDe(f)}
            z={0}
            radio={4}
            tapa={esFoco ? C.destinoFuerte : p?.ocupada ? C.celdaOcupada : C.celdaLibre}
            lado={
              esFoco ? 'color-mix(in srgb, var(--imss-ochre-700) 60%, var(--card))' : C.ladoTenue
            }
            borde={esFoco ? C.bordeDestino : C.borde}
            title={
              p
                ? `F${f} C${c} · ${p.ocupada ? (p.etiquetaMuestra ?? 'ocupada') : 'libre'}`
                : `F${f} C${c}`
            }
          />
        )
      })}

      {/* La celda en foco no lleva rótulo: el vial y el chip ya la identifican
          y el texto quedaba tapado por el propio vial. */}
      {vecindad.celdas
        .filter(({ fila: f, columna: c }) => !(f === fila && c === columna))
        .map(({ fila: f, columna: c }) => (
          <Etiqueta key={`et-${f}:${c}`} x={xDe(c)} y={yDe(f)} z={CELDA_H + 2}>
            F{f}·C{c}
          </Etiqueta>
        ))}

      {/* El vial solo si la celda tiene algo dentro: dibujarlo sobre un hueco
          libre haría creer que ahí hay una muestra. */}
      {foco?.ocupada && <Vial x={xDe(columna)} y={yDe(fila)} z={CELDA_H} />}

      <Chip x={xDe(columna)} y={yDe(fila)} z={CELDA_H + (foco?.ocupada ? 62 : 26)}>
        F{fila} · C{columna}
      </Chip>
    </Scene3D>
  )
}
