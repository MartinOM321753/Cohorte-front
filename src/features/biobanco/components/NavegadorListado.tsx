import { ChevronsDown, ChevronsUp, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Mando flotante para saltar a los extremos del listado.
 *
 * <p>Va fijo al costado y centrado en la altura de la pantalla, no en el flujo
 * de la lista: con una lista que se carga por tramos, un botón puesto al final
 * del documento solo aparece cuando ya se recorrió todo, que es justo cuando
 * deja de hacer falta. Fijo está siempre a la mano, se vaya por donde se vaya.</p>
 *
 * <p>Ninguno de los dos se deshabilita. Aunque ya no quede nada que traer,
 * siguen sirviendo para volver de un tirón al extremo que se está mirando, que
 * es la mitad de lo que se les pide.</p>
 */
export function NavegadorListado({
  onInicio,
  onFinal,
  cargando,
  cargadas,
  total,
}: {
  onInicio: () => void
  onFinal: () => void
  cargando: boolean
  /** Tarjetas ya descargadas. */
  cargadas: number
  /** Tarjetas que cumplen los criterios en total. */
  total: number
}) {
  return (
    <div
      className="pointer-events-none fixed right-3 top-1/2 z-30 -translate-y-1/2 sm:right-5"
      role="navigation"
      aria-label="Recorrido del listado de muestras"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-full border bg-background/85 p-1.5 shadow-lg backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onInicio}
          title="Ir al inicio: las muestras más recientes"
        >
          <ChevronsUp className="h-4 w-4" />
          <span className="sr-only">Ir al inicio del listado</span>
        </Button>

        {/*
          El contador ocupa el hueco entre los dos botones y da la referencia que
          en una lista por tramos no existe: sin él, «bajar» no dice si faltan
          tres tarjetas o trescientas.
        */}
        <span className="px-1 py-0.5 text-center text-[10px] leading-tight text-muted-foreground tabular-nums">
          {cargando ? (
            <Loader2 className="mx-auto h-3 w-3 animate-spin" />
          ) : (
            <>
              <span className="block font-medium text-foreground">{cargadas}</span>
              <span className="block">de {total}</span>
            </>
          )}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onFinal}
          title="Ir al final: las muestras más antiguas"
        >
          <ChevronsDown className="h-4 w-4" />
          <span className="sr-only">Ir al final del listado</span>
        </Button>
      </div>
    </div>
  )
}
