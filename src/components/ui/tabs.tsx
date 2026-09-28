'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

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
 * La barra de secciones: un solo renglón que llena todo su sitio y, cuando ya no cabe,
 * se desliza con el dedo.
 *
 * <p>En una pantalla holgada las pestañas se reparten por igual y ocupan todo el ancho
 * disponible, como un buen menú. Al encoger la ventana menguan todas a la par hasta que
 * llegan a su ancho natural —el del texto—; a partir de ahí ya no se amontonan ni se
 * apilan en varios renglones: el carril se desliza de lado, y en un móvil se arrastra
 * con el dedo. No hay flechas ni botones, solo la barra que se mueve.</p>
 *
 * <p>La pieza que lo sostiene es el {@code min-w-0} de este carril. Un elemento flexible
 * se niega por omisión a encogerse por debajo de su contenido, así que sin él el
 * {@code overflow-x-auto} nunca se activa: la pista crece, empuja a su padre y el
 * desplazamiento acaba apareciendo abajo del todo, en la ventana. El resto del truco
 * vive en {@code PISTA_PESTANAS}.</p>
 *
 * <p>Al cambiar de pestaña —también con el teclado— la que queda activa se trae a la
 * vista sola: una pestaña seleccionada que no se ve es peor que no tener carril.</p>
 */
export function BarraPestanas({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const pista = React.useRef<HTMLDivElement>(null)

  // La pestaña activa siempre a la vista, aunque se haya cambiado con el teclado o el
  // carril esté desplazado en una pantalla estrecha.
  React.useEffect(() => {
    const el = pista.current
    if (!el) return
    const activa = el.querySelector('[data-state="active"]')
    activa?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  })

  return (
    <div
      ref={pista}
      className={cn('min-w-0 overflow-x-auto scrollbar-none', className)}
    >
      {children}
    </div>
  )
}

/**
 * La pista dentro del carril. Es la que reparte el ancho y decide cuándo deslizarse.
 *
 * <p>{@code w-full} la hace tan ancha como su sitio y, con las pestañas en {@code flex-1}
 * —el ancho que ya traen puesto—, se reparten ese sitio por igual y lo llenan entero.
 * {@code min-w-max} es el otro extremo: obliga a la pista a no ser nunca más estrecha
 * que la suma de las pestañas a su ancho natural. Cuando la ventana baja de ahí, gana
 * {@code min-w-max}, la pista se hace más ancha que el carril y este se desliza en lugar
 * de recortar el texto. No se pone {@code min-w-0} en las pestañas a propósito: ese
 * mínimo automático del texto es justo lo que impide que se aplasten unas sobre otras.</p>
 */
export const PISTA_PESTANAS = [
  'h-9 w-full min-w-max flex-nowrap justify-start gap-1',
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
