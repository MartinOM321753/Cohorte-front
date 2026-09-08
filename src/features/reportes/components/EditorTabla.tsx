import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Columns3,
  Italic, Plus, Rows3, Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { InsertarDatoEnCelda } from './InsertarDatoEnCelda'
import type { AlineacionTexto, CeldaTabla, ElementoTabla } from '../types'
import {
  anchosARepartir, anchosDe, conAnchoCambiado, conCeldaCambiada, conColumnaEliminada,
  conColumnaInsertada, conFilaEliminada, conFilaInsertada, cuantasColumnas,
  filasCuadradas, LIMITES_TABLA,
} from '../types'

/** Dónde está el cursor dentro de la rejilla. */
interface Foco {
  fila: number
  columna: number
}

interface Props {
  abierto: boolean
  /** La tabla que se edita. Null mientras el diálogo está cerrado. */
  tabla: ElementoTabla | null
  onCerrar: () => void
  /** Los cambios se aplican al instante, así que deshacer funciona como siempre. */
  onCambiar: (cambios: Partial<ElementoTabla>) => void
}

/**
 * El contenido de una tabla: sus celdas, sus filas y sus columnas.
 *
 * <p>Vive en un diálogo y no en el panel lateral por una razón de sitio: el panel
 * mide poco más de un dedo de ancho, y una rejilla de seis columnas ahí dentro
 * sale con una letra por renglón. Aquí caben la tabla entera y sus controles.</p>
 *
 * <p>Lo que se escribe se aplica en el momento, sin botón de aceptar. Así la hoja
 * de detrás enseña el resultado según se teclea, y deshacer sigue funcionando
 * igual que en el resto del editor — un diálogo con «aceptar» habría dejado fuera
 * del historial todo lo hecho dentro.</p>
 */
export function EditorTabla({ abierto, tabla, onCerrar, onCambiar }: Props) {
  const [foco, setFoco] = useState<Foco | null>(null)
  /** Para llevar el cursor a la celda recién nacida al insertar una fila. */
  const porEnfocar = useRef<Foco | null>(null)

  useEffect(() => {
    if (!abierto) setFoco(null)
  }, [abierto])

  if (!tabla) return null

  const filas = filasCuadradas(tabla)
  const anchos = anchosDe(tabla)
  const columnas = cuantasColumnas(tabla)
  const conEncabezado = tabla.conEncabezado !== false

  const celdaEnFoco: CeldaTabla | null =
    foco && filas[foco.fila] ? filas[foco.fila][foco.columna] ?? null : null

  // ── Operaciones ───────────────────────────────────────────────────────────

  function escribir(fila: number, columna: number, texto: string) {
    onCambiar({ filas: conCeldaCambiada(tabla!, fila, columna, { texto }) })
  }

  function formatear(cambios: Partial<CeldaTabla>) {
    if (!foco) return
    onCambiar({ filas: conCeldaCambiada(tabla!, foco.fila, foco.columna, cambios) })
  }

  /**
   * Añade un marcador al final de lo que haya en la celda.
   *
   * <p>Una celda que solo contiene el marcador imprime el valor a secas, que es lo
   * habitual. Y como el dato vive dentro de la celda, hereda su ancho, su alineación y
   * su formato en vez de quedar suelto encima de la tabla, donde se desfasa en cuanto
   * la tabla crece.</p>
   */
  function insertarEnLaCelda(marcador: string) {
    if (!foco) return
    const actual = celdaEnFoco?.texto ?? ''
    const texto = actual.trim() === '' ? marcador : `${actual} ${marcador}`
    escribir(foco.fila, foco.columna, texto)
  }

  function insertarFila(indice: number) {
    onCambiar({ filas: conFilaInsertada(tabla!, indice) })
    porEnfocar.current = { fila: indice, columna: foco?.columna ?? 0 }
    setFoco(porEnfocar.current)
  }

  function eliminarFila(indice: number) {
    const nuevas = conFilaEliminada(tabla!, indice)
    if (nuevas === tabla!.filas) return
    onCambiar({ filas: nuevas })
    // El cursor se queda donde estaba la fila borrada, o en la última si era esa.
    setFoco({ fila: Math.min(indice, nuevas.length - 1), columna: foco?.columna ?? 0 })
  }

  function insertarColumna(indice: number) {
    onCambiar(conColumnaInsertada(tabla!, indice))
    setFoco({ fila: foco?.fila ?? 0, columna: indice })
  }

  function eliminarColumna(indice: number) {
    const nueva = conColumnaEliminada(tabla!, indice)
    if (nueva.filas === tabla!.filas) return
    onCambiar(nueva)
    setFoco({ fila: foco?.fila ?? 0, columna: Math.max(0, Math.min(indice, columnas - 2)) })
  }

  /**
   * Tabulador y Enter recorren la rejilla, como en cualquier hoja de cálculo.
   *
   * <p>Enter con Mayúsculas no salta: dentro de una celda hace falta poder partir
   * el renglón, que es la mitad de para qué sirve una tabla de indicaciones.</p>
   */
  function alPulsarEnCelda(e: React.KeyboardEvent, fila: number, columna: number) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const paso = e.shiftKey ? -1 : 1
      const plano = fila * columnas + columna + paso
      if (plano < 0 || plano >= filas.length * columnas) return
      setFoco({ fila: Math.floor(plano / columnas), columna: plano % columnas })
      porEnfocar.current = { fila: Math.floor(plano / columnas), columna: plano % columnas }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (fila + 1 < filas.length) {
        setFoco({ fila: fila + 1, columna })
        porEnfocar.current = { fila: fila + 1, columna }
      } else {
        // En la última fila, Enter añade otra: es lo que espera quien está
        // llenando una tabla de arriba abajo sin levantar las manos del teclado.
        insertarFila(filas.length)
      }
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      {/* Ancho de sobra: una tabla de seis o siete columnas con sus controles no cabe
          en un diálogo estrecho, y encoger las celdas para que quepan es justamente lo
          que hace ilegible lo que se está escribiendo. */}
      <DialogContent className="@container w-[95vw] max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Contenido de la tabla</DialogTitle>
          <DialogDescription>
            Escriba en las celdas, o coloque en ellas un dato del participante con
            «Insertar dato». Con los menús de cada fila y de cada columna puede
            insertarlas y eliminarlas donde lo necesite. Los cambios se reflejan en la
            hoja de inmediato.
          </DialogDescription>
        </DialogHeader>

        {/* ── Formato de la celda en la que está el cursor ── */}
        <div className="flex flex-wrap items-center gap-1 rounded-md border bg-[var(--muted)]/40 px-2 py-1.5">
          <Marca
            icono={<Bold className="h-3.5 w-3.5" strokeWidth={2} />}
            rotulo="Negrita"
            activo={!!celdaEnFoco?.negrita}
            deshabilitado={!celdaEnFoco}
            onClick={() => formatear({ negrita: !celdaEnFoco?.negrita })}
          />
          <Marca
            icono={<Italic className="h-3.5 w-3.5" strokeWidth={2} />}
            rotulo="Cursiva"
            activo={!!celdaEnFoco?.cursiva}
            deshabilitado={!celdaEnFoco}
            onClick={() => formatear({ cursiva: !celdaEnFoco?.cursiva })}
          />

          <span className="mx-1 h-4 w-px bg-[var(--border)]" />

          {ALINEACIONES.map(({ valor, icono, rotulo }) => (
            <Marca
              key={valor}
              icono={icono}
              rotulo={rotulo}
              activo={(celdaEnFoco?.alineacion ?? 'left') === valor}
              deshabilitado={!celdaEnFoco}
              onClick={() => formatear({ alineacion: valor })}
            />
          ))}

          <span className="mx-1 h-4 w-px bg-[var(--border)]" />

          <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Fondo
            <input
              type="color"
              className="h-6 w-8 cursor-pointer rounded border bg-background p-0.5 disabled:opacity-40"
              disabled={!celdaEnFoco}
              value={celdaEnFoco?.fondo ?? '#ffffff'}
              onChange={(e) => formatear({ fondo: e.target.value })}
            />
          </label>
          {celdaEnFoco?.fondo && (
            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]"
                    onClick={() => formatear({ fondo: undefined })}>
              Quitar
            </Button>
          )}

          <span className="mx-1 h-4 w-px bg-[var(--border)]" />

          <InsertarDatoEnCelda
            deshabilitado={!celdaEnFoco}
            onInsertar={insertarEnLaCelda}
          />

          <span className="ml-auto text-[11.5px] text-muted-foreground">
            {celdaEnFoco
              ? `Fila ${foco!.fila + 1}, columna ${foco!.columna + 1}`
              : 'Seleccione una celda para darle formato'}
          </span>
        </div>

        {/* ── La rejilla ── */}
        <div className="max-h-[62vh] overflow-auto rounded-md border">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                {/* La esquina, sobre la columna de controles de fila. */}
                <th className="w-9 border-b border-r bg-[var(--muted)]/60" />
                {Array.from({ length: columnas }, (_, j) => (
                  <th key={j} className="border-b border-r bg-[var(--muted)]/60 p-1 align-top"
                      style={{ width: `${anchos[j]}%` }}>
                    <div className="flex items-center gap-1">
                      <MenuColumna
                        indice={j}
                        cuantas={columnas}
                        onInsertar={insertarColumna}
                        onEliminar={eliminarColumna}
                        onRepartir={() => onCambiar({ columnas: anchosARepartir(columnas) })}
                      />
                      <Input
                        type="number" min={2} max={98}
                        className="h-6 w-14 px-1 text-[11px]"
                        title="Ancho de la columna, en porcentaje de la tabla"
                        value={Math.round(anchos[j])}
                        onChange={(e) =>
                          onCambiar({ columnas: conAnchoCambiado(tabla, j, Number(e.target.value)) })}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filas.map((fila, i) => {
                const esEncabezado = conEncabezado && i === 0
                return (
                  <tr key={i} className={cn(esEncabezado && 'bg-[var(--muted)]/40')}>
                    <td className="border-b border-r bg-[var(--muted)]/60 p-1 text-center align-top">
                      <MenuFila
                        indice={i}
                        cuantas={filas.length}
                        esEncabezado={esEncabezado}
                        onInsertar={insertarFila}
                        onEliminar={eliminarFila}
                      />
                    </td>
                    {fila.map((celda, j) => (
                      <td key={j} className="border-b border-r p-0 align-top">
                        <Celda
                          celda={celda}
                          esEncabezado={esEncabezado}
                          enFoco={foco?.fila === i && foco?.columna === j}
                          pedidoDeFoco={porEnfocar.current?.fila === i && porEnfocar.current?.columna === j}
                          onFocoAtendido={() => { porEnfocar.current = null }}
                          onFoco={() => setFoco({ fila: i, columna: j })}
                          onEscribir={(texto) => escribir(i, j, texto)}
                          onTecla={(e) => alPulsarEnCelda(e, i, j)}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button" variant="outline" size="sm" className="h-8 text-[12px]"
            disabled={filas.length >= LIMITES_TABLA.maxFilas}
            onClick={() => insertarFila(filas.length)}
          >
            <Rows3 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Agregar fila
          </Button>
          <Button
            type="button" variant="outline" size="sm" className="h-8 text-[12px]"
            disabled={columnas >= LIMITES_TABLA.maxColumnas}
            onClick={() => insertarColumna(columnas)}
          >
            <Columns3 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Agregar columna
          </Button>
          <span className="text-[11.5px] text-muted-foreground">
            {filas.length} × {columnas}
            {columnas >= LIMITES_TABLA.maxColumnas && ' · es el máximo de columnas'}
          </span>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onCerrar}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Una celda editable.
 *
 * <p>Es un área de texto y no un campo de una línea porque en una tabla de papel
 * las celdas llevan frases: con un campo simple, el texto largo se desplazaba
 * lateralmente y no se veía entero mientras se escribía.</p>
 */
function Celda({
  celda, esEncabezado, enFoco, pedidoDeFoco, onFocoAtendido, onFoco, onEscribir, onTecla,
}: {
  celda: CeldaTabla
  esEncabezado: boolean
  enFoco: boolean
  pedidoDeFoco: boolean
  onFocoAtendido: () => void
  onFoco: () => void
  onEscribir: (texto: string) => void
  onTecla: (e: React.KeyboardEvent) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Al insertar una fila o al saltar con el tabulador, el cursor tiene que
  // aparecer en la celda nueva; si no, hay que volver a pulsarla con el ratón.
  useEffect(() => {
    if (!pedidoDeFoco) return
    ref.current?.focus()
    ref.current?.select()
    onFocoAtendido()
  }, [pedidoDeFoco, onFocoAtendido])

  return (
    <Textarea
      ref={ref}
      rows={1}
      value={celda.texto}
      onFocus={onFoco}
      onChange={(e) => onEscribir(e.target.value)}
      onKeyDown={onTecla}
      className={cn(
        'min-h-[2.1rem] resize-y rounded-none border-0 bg-transparent px-2 py-1.5 text-[12.5px] shadow-none focus-visible:ring-1 focus-visible:ring-inset',
        celda.negrita || esEncabezado ? 'font-semibold' : 'font-normal',
        celda.cursiva && 'italic',
        enFoco && 'bg-[var(--accent)]/30',
      )}
      style={{
        textAlign: celda.alineacion ?? 'left',
        ...(celda.fondo ? { background: celda.fondo } : {}),
      }}
    />
  )
}

function MenuColumna({ indice, cuantas, onInsertar, onEliminar, onRepartir }: {
  indice: number
  cuantas: number
  onInsertar: (indice: number) => void
  onEliminar: (indice: number) => void
  onRepartir: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-6 gap-0.5 px-1 text-[11px]"
                title={`Columna ${indice + 1}`}>
          {indice + 1}
          <ChevronDown className="h-3 w-3" strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          disabled={cuantas >= LIMITES_TABLA.maxColumnas}
          onClick={() => onInsertar(indice)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Insertar columna a la izquierda
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={cuantas >= LIMITES_TABLA.maxColumnas}
          onClick={() => onInsertar(indice + 1)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Insertar columna a la derecha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRepartir}>
          <Columns3 className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Repartir el ancho por igual
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={cuantas <= LIMITES_TABLA.minColumnas}
          onClick={() => onEliminar(indice)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Eliminar esta columna
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MenuFila({ indice, cuantas, esEncabezado, onInsertar, onEliminar }: {
  indice: number
  cuantas: number
  esEncabezado: boolean
  onInsertar: (indice: number) => void
  onEliminar: (indice: number) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-6 w-full px-0 text-[11px]"
                title={esEncabezado ? 'Encabezado' : `Fila ${indice + 1}`}>
          {esEncabezado ? '⌶' : indice + 1}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          disabled={cuantas >= LIMITES_TABLA.maxFilas}
          onClick={() => onInsertar(indice)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Insertar fila arriba
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={cuantas >= LIMITES_TABLA.maxFilas}
          onClick={() => onInsertar(indice + 1)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Insertar fila abajo
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={cuantas <= LIMITES_TABLA.minFilas}
          onClick={() => onEliminar(indice)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Eliminar esta fila
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ALINEACIONES: { valor: AlineacionTexto; icono: React.ReactNode; rotulo: string }[] = [
  { valor: 'left', icono: <AlignLeft className="h-3.5 w-3.5" strokeWidth={2} />, rotulo: 'Izquierda' },
  { valor: 'center', icono: <AlignCenter className="h-3.5 w-3.5" strokeWidth={2} />, rotulo: 'Centro' },
  { valor: 'right', icono: <AlignRight className="h-3.5 w-3.5" strokeWidth={2} />, rotulo: 'Derecha' },
  { valor: 'justify', icono: <AlignJustify className="h-3.5 w-3.5" strokeWidth={2} />, rotulo: 'Justificado' },
]

function Marca({ icono, rotulo, activo, deshabilitado, onClick }: {
  icono: React.ReactNode
  rotulo: string
  activo: boolean
  deshabilitado: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button" variant="ghost" size="sm" title={rotulo}
      disabled={deshabilitado} onClick={onClick}
      className={cn('h-7 px-2', activo && 'bg-[var(--accent)] text-[var(--accent-foreground)]')}
    >
      {icono}
    </Button>
  )
}
