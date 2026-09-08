import { Eye, EyeOff, Grid3x3, Group, Image as ImageIcon, Lock, Minus, MoveDown, MoveUp, Sparkles, Square, Table2, Type, Ungroup, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Banda, Elemento } from '../types'
import { rotuloDeElemento } from '../types'

/** Un elemento con la banda en que vive, que es lo que hace falta para tocarlo. */
export interface CapaListada {
  elemento: Elemento
  banda: Banda
}

interface Props {
  capas: CapaListada[]
  seleccionados: string[]
  onSeleccionar: (id: string, aditivo?: boolean) => void
  onCambiar: (banda: Banda, id: string, cambios: Partial<Elemento>) => void
  onMoverCapa: (banda: Banda, id: string, direccion: 1 | -1) => void
  onAgrupar: () => void
  onDesagrupar: () => void
}

const ROTULO_BANDA: Record<Banda, string> = {
  encabezado: 'Encabezado',
  cuerpo: 'Hoja',
  pie: 'Pie de página',
}

/**
 * Las capas de la hoja, de arriba abajo.
 *
 * <p>Resuelve dos cosas que el lienzo solo no puede. La primera es alcanzar lo
 * inalcanzable: un elemento bloqueado, uno oculto o uno que quedó tapado por otro
 * no se puede pulsar en la hoja, y sin una lista no había forma de volver a
 * seleccionarlo — bloquear algo era un viaje sin retorno. La segunda es ver el
 * orden de apilamiento, que en la hoja solo se deduce de qué tapa a qué.</p>
 *
 * <p>Se listan de mayor a menor z, como en cualquier editor: lo que está encima
 * en el papel aparece arriba en la lista.</p>
 */
export function PanelCapas({
  capas, seleccionados, onSeleccionar, onCambiar, onMoverCapa, onAgrupar, onDesagrupar,
}: Props) {
  const porBanda: { banda: Banda; lista: CapaListada[] }[] = (['encabezado', 'cuerpo', 'pie'] as Banda[])
    .map((banda) => ({
      banda,
      lista: capas.filter((c) => c.banda === banda)
                  .slice()
                  .sort((a, b) => b.elemento.z - a.elemento.z),
    }))
    .filter((g) => g.lista.length > 0)

  const elegidos = capas.filter((c) => seleccionados.includes(c.elemento.id))
  const grupos = new Set(elegidos.map((c) => c.elemento.grupoId).filter(Boolean))

  // Agrupar necesita al menos dos, y los dos en la misma banda: un elemento del
  // pie y otro de la hoja no se pueden mover juntos porque no comparten origen.
  const mismaBanda = elegidos.length > 0 && elegidos.every((c) => c.banda === elegidos[0].banda)
  const puedeAgrupar = elegidos.length > 1 && mismaBanda
  const puedeDesagrupar = grupos.size > 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b p-2">
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[12px]"
                disabled={!puedeAgrupar} onClick={onAgrupar}>
          <Group className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
          Agrupar
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[12px]"
                disabled={!puedeDesagrupar} onClick={onDesagrupar}>
          <Ungroup className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
          Desagrupar
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {capas.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">
            La hoja está vacía. Agrega un elemento desde la barra de arriba.
          </p>
        ) : porBanda.map(({ banda, lista }) => (
          <div key={banda} className="mb-2">
            {porBanda.length > 1 && (
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                {ROTULO_BANDA[banda]}
              </div>
            )}
            <div className="space-y-0.5">
              {lista.map(({ elemento: el }) => {
                const seleccionado = seleccionados.includes(el.id)
                return (
                  <div
                    key={el.id}
                    className={cn(
                      'group flex items-center gap-1.5 rounded-md px-1.5 py-1',
                      seleccionado ? 'bg-sky-500/10' : 'hover:bg-[var(--muted)]',
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      onClick={(e) => onSeleccionar(el.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                    >
                      <IconoDe elemento={el} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[12px]',
                                            el.oculto && 'text-muted-foreground line-through')}>
                          {rotuloDeElemento(el)}
                        </span>
                        {el.grupoId && (
                          <span className="block text-[10px] leading-tight text-violet-500">
                            Agrupado
                          </span>
                        )}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center">
                      <Boton titulo="Subir una capa" onClick={() => onMoverCapa(banda, el.id, 1)}>
                        <MoveUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Boton>
                      <Boton titulo="Bajar una capa" onClick={() => onMoverCapa(banda, el.id, -1)}>
                        <MoveDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Boton>
                      <Boton
                        titulo={el.oculto ? 'Mostrar' : 'Ocultar (tampoco sale impreso)'}
                        activo={el.oculto}
                        onClick={() => onCambiar(banda, el.id, { oculto: !el.oculto } as Partial<Elemento>)}
                      >
                        {el.oculto
                          ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                          : <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      </Boton>
                      <Boton
                        titulo={el.bloqueado ? 'Desbloquear' : 'Bloquear'}
                        activo={el.bloqueado}
                        onClick={() => onCambiar(banda, el.id, { bloqueado: !el.bloqueado } as Partial<Elemento>)}
                      >
                        {el.bloqueado
                          ? <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                          : <Unlock className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      </Boton>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-2.5">
        <p className="text-[11px] leading-tight text-muted-foreground">
          Ctrl y clic para elegir varios. Lo bloqueado y lo oculto se selecciona desde
          aquí, que es lo único que los alcanza.
        </p>
      </div>
    </div>
  )
}

/** Los botones de la fila: aparecen al pasar por encima, salvo si están activos. */
function Boton({ titulo, activo, onClick, children }: {
  titulo: string
  activo?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={cn(
        'rounded p-1 text-muted-foreground hover:bg-[var(--background)] hover:text-foreground',
        // Lo activo se queda visible: un candado que solo se ve al pasar el ratón
        // no avisa de nada.
        activo ? 'text-amber-600' : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
      )}
    >
      {children}
    </button>
  )
}

function IconoDe({ elemento }: { elemento: Elemento }) {
  const clase = 'h-3.5 w-3.5 shrink-0 text-muted-foreground'
  switch (elemento.tipo) {
    case 'texto':  return <Type className={clase} strokeWidth={1.75} />
    case 'imagen': return <ImageIcon className={clase} strokeWidth={1.75} />
    case 'datos':  return <Table2 className={cn(clase, 'text-sky-600')} strokeWidth={1.75} />
    case 'tabla':  return <Grid3x3 className={clase} strokeWidth={1.75} />
    case 'icono':  return <Sparkles className={clase} strokeWidth={1.75} />
    case 'figura':
      return elemento.forma === 'linea'
        ? <Minus className={clase} strokeWidth={1.75} />
        : <Square className={clase} strokeWidth={1.75} />
  }
}
