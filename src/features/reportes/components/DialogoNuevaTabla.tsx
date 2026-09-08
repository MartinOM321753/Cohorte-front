import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import { LIMITES_TABLA } from '../types'

/** Con cuántas nace la propuesta: es el tamaño de la mayoría de los cuadros. */
const COLUMNAS_INICIALES = 3
const FILAS_INICIALES = 4

interface Props {
  abierto: boolean
  onCerrar: () => void
  onCrear: (columnas: number, filas: number, conEncabezado: boolean) => void
}

/**
 * Con qué tamaño nace una tabla.
 *
 * <p>Se pregunta antes de insertarla, y no después, porque el tamaño es lo único
 * que no se puede dar por supuesto: el resto del aspecto se cambia en el panel
 * viendo ya la tabla sobre la hoja, pero una tabla que nace con un tamaño
 * cualquiera obliga a añadir o quitar filas antes de empezar a escribir.</p>
 *
 * <p>Ni el tamaño ni el encabezado son definitivos: al editarla se pueden insertar
 * y quitar filas y columnas donde haga falta.</p>
 */
export function DialogoNuevaTabla({ abierto, onCerrar, onCrear }: Props) {
  const [columnas, setColumnas] = useState(COLUMNAS_INICIALES)
  const [filas, setFilas] = useState(FILAS_INICIALES)
  const [conEncabezado, setConEncabezado] = useState(true)

  // Cada vez que se abre se vuelve a la propuesta: lo que se tecleó para la tabla
  // anterior no tiene por qué valer para la siguiente.
  useEffect(() => {
    if (!abierto) return
    setColumnas(COLUMNAS_INICIALES)
    setFilas(FILAS_INICIALES)
    setConEncabezado(true)
  }, [abierto])

  const cols = acotar(columnas, LIMITES_TABLA.minColumnas, LIMITES_TABLA.maxColumnas)
  const fils = acotar(filas, LIMITES_TABLA.minFilas, LIMITES_TABLA.maxFilas)

  function crear() {
    onCrear(cols, fils, conEncabezado)
    onCerrar()
  }

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insertar una tabla</DialogTitle>
          <DialogDescription>
            Elige con cuántas nace. Después podrás agregar y quitar filas y columnas
            donde quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[12px]" htmlFor="tabla-columnas">Columnas</Label>
            <Input
              id="tabla-columnas"
              type="number" className="h-9"
              min={LIMITES_TABLA.minColumnas} max={LIMITES_TABLA.maxColumnas}
              value={columnas}
              onChange={(e) => setColumnas(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]" htmlFor="tabla-filas">Filas</Label>
            <Input
              id="tabla-filas"
              type="number" className="h-9"
              min={LIMITES_TABLA.minFilas} max={LIMITES_TABLA.maxFilas}
              value={filas}
              onChange={(e) => setFilas(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2">
          <Checkbox
            className="mt-0.5"
            checked={conEncabezado}
            onCheckedChange={(v) => setConEncabezado(v === true)}
          />
          <span>
            <span className="block text-[13px]">La primera fila es el encabezado</span>
            <span className="block text-[11.5px] leading-tight text-muted-foreground">
              Sale resaltada y se repite arriba si la tabla parte página.
            </span>
          </span>
        </label>

        <Vistazo columnas={cols} filas={fils} conEncabezado={conEncabezado} />

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button type="button" onClick={crear}>Insertar tabla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Una rejilla del tamaño elegido.
 *
 * <p>Cuesta poco y ahorra el viaje de insertar la tabla, verla y volver a
 * empezar: «cuatro filas» se lee distinto según se cuente o no el encabezado, y
 * aquí se ve de un vistazo qué va a salir.</p>
 */
function Vistazo({ columnas, filas, conEncabezado }: {
  columnas: number; filas: number; conEncabezado: boolean
}) {
  return (
    <div className="rounded-md border bg-[var(--muted)]/40 p-3">
      <div
        className="grid gap-px overflow-hidden rounded-sm bg-[var(--border)]"
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: filas * columnas }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-background',
              conEncabezado && i < columnas && 'bg-[var(--muted)]',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {filas} {filas === 1 ? 'fila' : 'filas'} × {columnas}{' '}
        {columnas === 1 ? 'columna' : 'columnas'}
        {conEncabezado && `, de las que la primera es el encabezado`}
      </p>
    </div>
  )
}

function acotar(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, Math.round(v)))
}
