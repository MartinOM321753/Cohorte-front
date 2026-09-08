'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Una barra de pestañas que cabe siempre, sin estirar la página.
 *
 * <p>Resuelve un fallo que se repetía en varios módulos. La barra heredaba
 * {@code w-fit}, o sea que se dimensionaba a su contenido en vez de a su sitio; con
 * seis pestañas de nombre largo crecía más que la pantalla y quien quería cambiar de
 * pestaña tenía que desplazar <b>la página entera</b> hacia los lados. Y en escritorio
 * se repartían en columnas iguales, que con nombres largos y sin permitir corte de
 * línea desbordaban cada una su columna.</p>
 *
 * <p>Aquí las pestañas conservan su ancho natural y bajan a otro renglón cuando no
 * caben. No hay desplazamiento en ninguna dirección y no queda ninguna oculta, que era
 * el otro riesgo de una barra que se desliza: lo que no se ve, no se busca.</p>
 *
 * <p>Las pestañas se seleccionan por atributo y no como hijas directas por dos razones:
 * así alcanza también a las que van envueltas en otro elemento —las deshabilitadas
 * llevan un contenedor para poder mostrar su explicación al pasar por encima— y así la
 * regla gana en especificidad al {@code flex-1} que cada pestaña trae puesto, que es lo
 * que las encogía por debajo de su propio texto.</p>
 */
export const BARRA_PESTANAS = [
  'h-auto w-full max-w-full flex-wrap justify-start gap-1',
  '[&_[data-slot=tabs-trigger]]:flex-none',
  '[&_[data-slot=tabs-trigger]]:h-8',
].join(' ')

/**
 * La barra de pestañas como carrusel: se desliza dentro de su sitio.
 *
 * <p>Las pestañas conservan su ancho y su renglón, y cuando no caben la barra se
 * desplaza con las flechas de los lados en vez de amontonarlas en varias líneas ni
 * —lo que pasaba antes— estirar la página entera hacia los lados.</p>
 *
 * <p>La pieza que lo hace funcionar es el {@code min-w-0} de la pista. Un elemento
 * flexible se niega por omisión a encogerse por debajo de su contenido, así que sin eso
 * el {@code overflow-x-auto} nunca llega a activarse: la pista crece, empuja a su padre
 * y el desplazamiento acaba apareciendo abajo del todo, en la ventana. Es exactamente
 * el fallo que se repetía en seis módulos.</p>
 *
 * <p>Las flechas solo aparecen cuando hay algo a lo que llegar. Y al cambiar de pestaña
 * con el teclado, la que queda activa se trae a la vista sola: una pestaña seleccionada
 * que no se ve es peor que no tener carrusel.</p>
 */
export function BarraPestanas({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const pista = React.useRef<HTMLDivElement>(null)
  const [alInicio, setAlInicio] = React.useState(true)
  const [alFinal, setAlFinal] = React.useState(true)

  const medir = React.useCallback(() => {
    const el = pista.current
    if (!el) return
    // Un píxel de margen: los navegadores redondean y sin él la flecha derecha se
    // queda encendida para siempre al llegar al tope.
    setAlInicio(el.scrollLeft <= 1)
    setAlFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  React.useEffect(() => {
    const el = pista.current
    if (!el) return
    medir()

    const observador = new ResizeObserver(medir)
    observador.observe(el)
    // También el contenido: las pestañas aparecen según los permisos de cada quien.
    if (el.firstElementChild) observador.observe(el.firstElementChild)
    return () => observador.disconnect()
  }, [medir])

  // La pestaña activa siempre a la vista, aunque se haya cambiado con el teclado.
  React.useEffect(() => {
    const el = pista.current
    if (!el) return
    const activa = el.querySelector('[data-state="active"]')
    activa?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  })

  function desplazar(hacia: -1 | 1) {
    const el = pista.current
    if (!el) return
    el.scrollBy({ left: hacia * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  const hayDesplazamiento = !(alInicio && alFinal)

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      {hayDesplazamiento && (
        <FlechaPestanas hacia="izquierda" deshabilitada={alInicio} onClick={() => desplazar(-1)} />
      )}

      <div
        ref={pista}
        onScroll={medir}
        className="min-w-0 flex-1 overflow-x-auto scrollbar-none"
      >
        {children}
      </div>

      {hayDesplazamiento && (
        <FlechaPestanas hacia="derecha" deshabilitada={alFinal} onClick={() => desplazar(1)} />
      )}
    </div>
  )
}

function FlechaPestanas({
  hacia, deshabilitada, onClick,
}: {
  hacia: 'izquierda' | 'derecha'
  deshabilitada: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-label={hacia === 'izquierda' ? 'Ver las pestañas anteriores' : 'Ver las pestañas siguientes'}
      className={cn(
        'flex h-8 w-7 shrink-0 items-center justify-center rounded-md border bg-background',
        'text-muted-foreground transition hover:bg-muted focus-visible:ring-ring/50',
        'focus-visible:ring-[3px] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-30',
      )}
    >
      {hacia === 'izquierda'
        ? <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        : <ChevronRight className="h-4 w-4" strokeWidth={2} />}
    </button>
  )
}

/** Dentro del carrusel las pestañas van en un solo renglón, con su ancho natural. */
export const PISTA_PESTANAS = [
  'h-9 w-max min-w-full flex-nowrap justify-start gap-1',
  '[&_[data-slot=tabs-trigger]]:flex-none',
].join(' ')

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      // min-w-0 para que lo ancho de dentro —una tabla, sobre todo— se desplace en su
      // propio contenedor. Sin esto se niega a encogerse, empuja a sus padres y el
      // desplazamiento acaba saliendo abajo del todo, en la ventana.
      className={cn('min-w-0 flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
