import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Estructura común de los dos visualizadores 3D: cabecera, breadcrumb con
 * flechas, escenario y panel lateral.
 *
 * <p>Dos disposiciones, no dos diseños: en pantalla ancha la escena y el panel
 * van lado a lado; por debajo de `lg` el panel baja y crece hacia abajo. Ningún
 * corte produce desplazamiento horizontal — la escena se recorta y el panel
 * envuelve.
 */
export function Marco3D({
  titulo,
  descripcion,
  pasos,
  indiceActivo,
  onIr,
  escena,
  panel,
}: {
  titulo: ReactNode
  descripcion: string
  pasos: Array<{ nombre: string; icono: React.ComponentType<{ className?: string }>; habilitado: boolean }>
  indiceActivo: number
  /** Índice absoluto del paso al que se navega. */
  onIr: (indice: number) => void
  escena: ReactNode
  panel: ReactNode
}) {
  const anterior = indiceActivo - 1
  const siguiente = indiceActivo + 1
  const puedeAtras = anterior >= 0 && pasos[anterior]?.habilitado
  const puedeAdelante = siguiente < pasos.length && pasos[siguiente]?.habilitado

  return (
    <>
      <DialogHeader className="shrink-0 gap-1 border-b border-border px-4 py-3 text-left sm:px-5">
        <DialogTitle className="pr-8 text-base">{titulo}</DialogTitle>
        <DialogDescription className="text-[11px]">{descripcion}</DialogDescription>
      </DialogHeader>

      <nav className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-3 py-2 sm:px-5">
        <button
          type="button"
          onClick={() => onIr(anterior)}
          disabled={!puedeAtras}
          aria-label="Vista anterior"
          className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1">
          {pasos.map((paso, i) => {
            const Icono = paso.icono
            const activo = i === indiceActivo
            return (
              <li key={paso.nombre} className="flex min-w-0 items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/50">/</span>}
                <button
                  type="button"
                  onClick={() => onIr(i)}
                  disabled={!paso.habilitado}
                  aria-current={activo ? 'step' : undefined}
                  className={`inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                    activo
                      ? 'bg-[color-mix(in_srgb,var(--imss-green-500)_16%,transparent)] font-semibold text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icono className="h-3 w-3 shrink-0" />
                  <span className="truncate">{paso.nombre}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <button
          type="button"
          onClick={() => onIr(siguiente)}
          disabled={!puedeAdelante}
          aria-label="Vista siguiente"
          className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-[13rem] min-w-0 flex-[3] flex-col overflow-hidden">{escena}</div>
        <aside className="min-w-0 flex-1 overflow-y-auto border-t border-border lg:max-w-[17rem] lg:border-l lg:border-t-0">
          {panel}
        </aside>
      </div>
    </>
  )
}

/** Clases del `DialogContent` de ambos visualizadores. */
export const CLASES_DIALOGO_3D =
  'flex max-h-none flex-col overflow-x-hidden overflow-y-hidden p-0 sm:h-[86vh] sm:max-h-[86vh] sm:w-[min(64rem,calc(100vw-2rem))] sm:max-w-[min(64rem,calc(100vw-2rem))] sm:p-0 md:max-w-[min(64rem,calc(100vw-2rem))]'
