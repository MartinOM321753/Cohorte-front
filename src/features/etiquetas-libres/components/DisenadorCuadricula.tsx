import { AlignCenter, AlignLeft, AlignRight, Bold, Minus, Plus, Tag, Unlink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Alineacion } from '@/components/print/layoutCuadricula'

import type { TablaEtiquetas } from '../api/etiquetasLibres.api'
import {
  celdaEn,
  celdaVacia,
  conCelda,
  columnasSinColocar,
  estaCubierta,
  MAX_COLUMNAS,
  MAX_FILAS,
  redimensionar,
  type CeldaDiseno,
  type DisenoEtiqueta,
} from '../disenoEtiqueta'

/**
 * Diseñador de la etiqueta.
 *
 * Se dibuja con la misma forma que la cuadrícula real —tantas cajas como filas y
 * columnas tenga— pero NO a escala. Una etiqueta de 39.5 × 12.7 mm no admite un
 * selector dentro, así que a tamaño real el diseñador sería inoperable; el
 * tamaño real se ve al lado, en la vista previa, que es donde importa.
 *
 * Cada caja corresponde a una celda y ahí se elige qué columna del archivo cae
 * en ella. Unir una celda con la de su derecha es lo que permite que un dato
 * cruce la etiqueta mientras otros dos van a la par.
 */
export function DisenadorCuadricula({
  tabla,
  diseno,
  onChange,
}: {
  tabla: TablaEtiquetas
  diseno: DisenoEtiqueta
  onChange: (d: DisenoEtiqueta) => void
}) {
  const sinColocar = columnasSinColocar(diseno, tabla)

  function actualizar(celda: CeldaDiseno, cambios: Partial<CeldaDiseno>) {
    onChange(conCelda(diseno, { ...celda, ...cambios }))
  }

  function alternarUnion(celda: CeldaDiseno) {
    const unida = celda.columnaSpan > 1
    if (unida) {
      actualizar(celda, { columnaSpan: 1 })
      return
    }
    // Al unirse con la de la derecha, lo que hubiera en esa posición deja de
    // tener sitio: se libera en vez de quedar oculto e imprimirse igualmente.
    const vecina = celdaEn(diseno, celda.fila, celda.columna + 1)
    let siguiente = conCelda(diseno, { ...celda, columnaSpan: celda.columnaSpan + 1 })
    if (vecina) {
      siguiente = conCelda(siguiente, { ...vecina, columnaArchivo: null, columnaSpan: 1 })
    }
    onChange(siguiente)
  }

  return (
    <div className="space-y-3">
      {/* Tamaño de la cuadrícula */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Contador
          rotulo="Filas"
          valor={diseno.filas}
          min={1}
          max={MAX_FILAS}
          onChange={(v) => onChange(redimensionar(diseno, v, diseno.columnas))}
        />
        <Contador
          rotulo="Columnas"
          valor={diseno.columnas}
          min={1}
          max={MAX_COLUMNAS}
          onChange={(v) => onChange(redimensionar(diseno, diseno.filas, v))}
        />

        {sinColocar.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Sin colocar:{' '}
            <span className="font-medium">
              {sinColocar.map((i) => tabla.encabezados[i] || `Columna ${i + 1}`).join(', ')}
            </span>
          </p>
        )}
      </div>

      {/* La cuadrícula */}
      <div
        className="grid gap-1.5 rounded-md border bg-muted/20 p-2"
        style={{ gridTemplateColumns: `repeat(${diseno.columnas}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: diseno.filas }).flatMap((_, fila) =>
          Array.from({ length: diseno.columnas }).map((__, columna) => {
            if (estaCubierta(diseno, fila, columna)) return null

            const celda = celdaEn(diseno, fila, columna) ?? celdaVacia(fila, columna)
            const ocupada = celda.columnaArchivo !== null
            const puedeUnir = columna + celda.columnaSpan < diseno.columnas
            const unida = celda.columnaSpan > 1

            return (
              <div
                key={`${fila}-${columna}`}
                className={`flex flex-col gap-1 rounded border p-1.5 ${
                  ocupada ? 'border-[var(--imss-green-500)]/40 bg-background' : 'border-dashed bg-background/50'
                }`}
                style={{ gridColumn: `span ${celda.columnaSpan}` }}
              >
                <select
                  className="h-7 w-full min-w-0 rounded border bg-background px-1 text-[12px]"
                  value={celda.columnaArchivo ?? ''}
                  onChange={(e) =>
                    actualizar(celda, {
                      columnaArchivo: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  aria-label={`Dato de la fila ${fila + 1}, columna ${columna + 1}`}
                >
                  <option value="">(vacía)</option>
                  {tabla.encabezados.map((enc, i) => (
                    <option key={i} value={i}>
                      {enc || `Columna ${i + 1}`}
                    </option>
                  ))}
                </select>

                {ocupada && (
                  <>
                    <p className="truncate text-[10px] text-muted-foreground" title={tabla.filas[0]?.[celda.columnaArchivo as number]}>
                      {tabla.filas[0]?.[celda.columnaArchivo as number] || '—'}
                    </p>

                    <div className="flex flex-wrap items-center gap-0.5">
                      {(
                        [
                          ['IZQUIERDA', AlignLeft],
                          ['CENTRO', AlignCenter],
                          ['DERECHA', AlignRight],
                        ] as [Alineacion, typeof AlignLeft][]
                      ).map(([a, Icono]) => (
                        <Button
                          key={a}
                          type="button"
                          variant={celda.alineacion === a ? 'default' : 'ghost'}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => actualizar(celda, { alineacion: a })}
                          aria-label={`Alinear a la ${a.toLowerCase()}`}
                        >
                          <Icono className="h-3 w-3" />
                        </Button>
                      ))}

                      <Button
                        type="button"
                        variant={celda.negrita ? 'default' : 'ghost'}
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => actualizar(celda, { negrita: !celda.negrita })}
                        aria-label="Negrita"
                      >
                        <Bold className="h-3 w-3" />
                      </Button>

                      <Button
                        type="button"
                        variant={celda.conEncabezado ? 'default' : 'ghost'}
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => actualizar(celda, { conEncabezado: !celda.conEncabezado })}
                        title="Anteponer el nombre de la columna al valor"
                        aria-label="Anteponer el nombre de la columna"
                      >
                        <Tag className="h-3 w-3" />
                      </Button>

                      {(puedeUnir || unida) && (
                        <Button
                          type="button"
                          variant={unida ? 'default' : 'ghost'}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => alternarUnion(celda)}
                          title={unida ? 'Separar de la celda de la derecha' : 'Unir con la celda de la derecha'}
                          aria-label={unida ? 'Separar celda' : 'Unir con la celda de la derecha'}
                        >
                          {unida ? <Unlink className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}

function Contador({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-[12px] text-muted-foreground">{rotulo}</Label>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={valor <= min}
        onClick={() => onChange(valor - 1)}
        aria-label={`Menos ${rotulo.toLowerCase()}`}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-5 text-center font-mono text-[13px]">{valor}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={valor >= max}
        onClick={() => onChange(valor + 1)}
        aria-label={`Más ${rotulo.toLowerCase()}`}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}
