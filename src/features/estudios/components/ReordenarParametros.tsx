import { useEffect, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/** Lo mínimo que esta lista necesita saber de un parámetro para acomodarlo. */
export interface ParametroOrdenable {
  id: number
  nombre: string
  unidad?: string | null
  activo?: boolean
}

/**
 * Acomoda los parámetros de un tipo de estudio arrastrándolos.
 *
 * <p>Se guarda con un botón y no al soltar: arrastrar es fácil de hacer sin
 * querer, y el orden de los parámetros es lo que van a ver todos los que capturen
 * desde mañana. Mientras no se confirme, lo que se mueve vive solo aquí, y
 * «Cancelar» devuelve la lista como estaba.</p>
 *
 * <p>Los botones de subir y bajar no son un adorno: el arrastre no existe para
 * quien navega con teclado, y en una lista de veinte parámetros mover uno dos
 * lugares es más rápido con ellos que arrastrando.</p>
 */
export function ReordenarParametros({
  parametros,
  guardando,
  onGuardar,
  onCancelar,
}: {
  parametros: ParametroOrdenable[]
  guardando: boolean
  onGuardar: (idsEnOrden: number[]) => void
  onCancelar: () => void
}) {
  const [orden, setOrden] = useState<ParametroOrdenable[]>(parametros)

  // Si el catálogo cambia por detrás —otra pestaña, otra persona— hay que partir
  // de lo que hay ahora: guardar un orden armado sobre una lista que ya no existe
  // lo rechaza el servidor de todos modos.
  //
  // La dependencia son los ids y no el arreglo: el padre lo reconstruye en cada
  // render, y con la identidad del arreglo este efecto volvería a correr todo el
  // tiempo, borrando lo que el usuario acabara de mover.
  const idsDelCatalogo = parametros.map((p) => p.id).join(',')
  useEffect(() => {
    setOrden(parametros)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsDelCatalogo])

  const sinCambios =
    orden.length === parametros.length &&
    orden.every((p, i) => p.id === parametros[i].id)

  function mover(desde: number, hacia: number) {
    if (hacia < 0 || hacia >= orden.length) return
    const copia = [...orden]
    const [movido] = copia.splice(desde, 1)
    copia.splice(hacia, 0, movido)
    setOrden(copia)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Arrastre los parámetros, o use las flechas, para definir el orden en que se
        presentan al capturar y en el expediente.
      </p>

      <Reorder.Group axis="y" values={orden} onReorder={setOrden} className="space-y-1.5">
        {orden.map((parametro, indice) => (
          <FilaOrdenable
            key={parametro.id}
            parametro={parametro}
            posicion={indice + 1}
            esPrimero={indice === 0}
            esUltimo={indice === orden.length - 1}
            onSubir={() => mover(indice, indice - 1)}
            onBajar={() => mover(indice, indice + 1)}
          />
        ))}
      </Reorder.Group>

      <div className="flex items-center gap-2 border-t pt-3">
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onGuardar(orden.map((p) => p.id))}
          disabled={guardando || sinCambios}
        >
          {guardando ? <Spinner className="h-3 w-3" /> : <Check className="h-3 w-3" strokeWidth={1.75} />}
          Guardar orden
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onCancelar} disabled={guardando}>
          <X className="h-3 w-3" strokeWidth={1.75} />
          Cancelar
        </Button>
        {sinCambios && !guardando && (
          <span className="text-[11px] text-muted-foreground">Sin cambios por guardar</span>
        )}
      </div>
    </div>
  )
}

function FilaOrdenable({
  parametro,
  posicion,
  esPrimero,
  esUltimo,
  onSubir,
  onBajar,
}: {
  parametro: ParametroOrdenable
  posicion: number
  esPrimero: boolean
  esUltimo: boolean
  onSubir: () => void
  onBajar: () => void
}) {
  // El arrastre se dispara solo desde el asa. Sin esto, la fila entera arrastra y
  // los botones de subir y bajar dejan de poder pulsarse: el clic se interpreta
  // como el principio de un arrastre.
  const controles = useDragControls()
  const enUso = parametro.activo !== false

  return (
    <Reorder.Item
      value={parametro}
      dragListener={false}
      dragControls={controles}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-background px-2 py-1.5',
        !enUso && 'opacity-60'
      )}
    >
      <button
        type="button"
        aria-label={`Arrastrar ${parametro.nombre}`}
        onPointerDown={(e) => controles.start(e)}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <span className="w-6 shrink-0 text-center font-mono text-[11px] text-muted-foreground">
        {posicion}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm">
        {parametro.nombre}
        {parametro.unidad && (
          <span className="ml-1 text-xs text-muted-foreground">({parametro.unidad})</span>
        )}
      </span>

      {!enUso && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Fuera de uso
        </Badge>
      )}

      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onSubir}
          disabled={esPrimero}
          aria-label={`Subir ${parametro.nombre}`}
        >
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onBajar}
          disabled={esUltimo}
          aria-label={`Bajar ${parametro.nombre}`}
        >
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
      </div>
    </Reorder.Item>
  )
}
