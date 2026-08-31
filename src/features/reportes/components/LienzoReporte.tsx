import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { cn } from '@/lib/utils'
import type { DisenoReporte, Elemento, Margenes } from '../types'
import { medidasDe } from '../types'
import { ElementoRender } from './ElementoRender'

/** Las ocho manijas de redimensionado, en el orden en que se dibujan. */
const MANIJAS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Manija = (typeof MANIJAS)[number]

/** Tamaño mínimo de un elemento. Por debajo deja de poderse agarrar. */
const MINIMO_MM = 4

interface Props {
  diseno: DisenoReporte
  paginaIndex: number
  seleccionadoId: string | null
  escala: number
  /** Ajustar a una cuadrícula invisible, en milímetros. 0 = libre. */
  ajusteMm: number
  mostrarGuias: boolean
  onSeleccionar: (id: string | null) => void
  onCambiarElemento: (id: string, cambios: Partial<Elemento>) => void
}

/**
 * La hoja donde se diseña.
 *
 * <p>Trabaja en milímetros y solo convierte a píxeles al pintar, con la escala.
 * Así lo que se guarda son medidas de papel: acercar o alejar la vista no cambia
 * ni un dato del diseño.</p>
 *
 * <p>El arrastre va con pointer events y captura del puntero, no con drag & drop
 * de HTML5. La razón es que el arrastre nativo no da coordenadas fiables durante
 * el movimiento —solo al soltar— y arrastra una imagen fantasma que aquí estorba.
 * Con captura, el elemento sigue recibiendo eventos aunque el cursor se salga de
 * la hoja, que es justo lo que pasa al mover algo hasta el borde.</p>
 */
export function LienzoReporte({
  diseno, paginaIndex, seleccionadoId, escala, ajusteMm, mostrarGuias,
  onSeleccionar, onCambiarElemento,
}: Props) {
  const { anchoMm, altoMm } = medidasDe(diseno)
  const hojaRef = useRef<HTMLDivElement>(null)

  // El gesto en curso. En un ref y no en estado: cambia en cada movimiento del
  // puntero y no debe provocar un render por sí mismo.
  const gesto = useRef<{
    id: string
    modo: 'mover' | Manija
    inicioX: number
    inicioY: number
    original: { xMm: number; yMm: number; anchoMm: number; altoMm: number }
  } | null>(null)

  const [arrastrando, setArrastrando] = useState(false)

  const pagina = diseno.paginas[paginaIndex]

  /**
   * Los elementos que se dibujan en esta página: los suyos, más los que se
   * repiten en todas y viven en la primera.
   */
  const elementos: Elemento[] = (() => {
    const propios = pagina?.elementos ?? []
    if (paginaIndex === 0) return propios
    const repetidos = (diseno.paginas[0]?.elementos ?? []).filter((e) => e.repiteEnTodas)
    return [...repetidos, ...propios]
  })().slice().sort((a, b) => a.z - b.z)

  const aMm = useCallback((px: number) => px / escala, [escala])

  const ajustar = useCallback(
    (valorMm: number) => (ajusteMm > 0 ? Math.round(valorMm / ajusteMm) * ajusteMm : valorMm),
    [ajusteMm],
  )

  function iniciarGesto(
    e: ReactPointerEvent,
    elemento: Elemento,
    modo: 'mover' | Manija,
  ) {
    if (elemento.bloqueado) return
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    gesto.current = {
      id: elemento.id,
      modo,
      inicioX: e.clientX,
      inicioY: e.clientY,
      original: {
        xMm: elemento.xMm, yMm: elemento.yMm,
        anchoMm: elemento.anchoMm, altoMm: elemento.altoMm,
      },
    }
    setArrastrando(true)
    onSeleccionar(elemento.id)
  }

  function moverPuntero(e: ReactPointerEvent) {
    const g = gesto.current
    if (!g) return

    const dxMm = aMm(e.clientX - g.inicioX)
    const dyMm = aMm(e.clientY - g.inicioY)
    const o = g.original

    if (g.modo === 'mover') {
      onCambiarElemento(g.id, {
        xMm: ajustar(o.xMm + dxMm),
        yMm: ajustar(o.yMm + dyMm),
      } as Partial<Elemento>)
      return
    }

    // Redimensionar. Cada manija mueve unos bordes y deja los otros quietos; al
    // tirar del lado izquierdo o superior hay que mover también el origen, o el
    // elemento crecería hacia el lado contrario al que se arrastra.
    let { xMm, yMm, anchoMm: ancho, altoMm: alto } = o
    const m = g.modo

    if (m.includes('e')) ancho = o.anchoMm + dxMm
    if (m.includes('s')) alto = o.altoMm + dyMm
    if (m.includes('w')) { ancho = o.anchoMm - dxMm; xMm = o.xMm + dxMm }
    if (m.includes('n')) { alto = o.altoMm - dyMm; yMm = o.yMm + dyMm }

    // Al llegar al mínimo se congela el borde móvil en vez de dejar que el
    // elemento se invierta sobre sí mismo.
    if (ancho < MINIMO_MM) {
      if (m.includes('w')) xMm = o.xMm + (o.anchoMm - MINIMO_MM)
      ancho = MINIMO_MM
    }
    if (alto < MINIMO_MM) {
      if (m.includes('n')) yMm = o.yMm + (o.altoMm - MINIMO_MM)
      alto = MINIMO_MM
    }

    onCambiarElemento(g.id, {
      xMm: ajustar(xMm), yMm: ajustar(yMm),
      anchoMm: ajustar(ancho), altoMm: ajustar(alto),
    } as Partial<Elemento>)
  }

  function terminarGesto(e: ReactPointerEvent) {
    if (!gesto.current) return
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // El navegador ya la soltó (el puntero salió de la ventana). No es un
      // problema: el gesto termina igual.
    }
    gesto.current = null
    setArrastrando(false)
  }

  return (
    <div
      ref={hojaRef}
      className={cn(
        'relative shrink-0 bg-white shadow-md',
        arrastrando && 'select-none',
      )}
      style={{
        width: `${anchoMm * escala}px`,
        height: `${altoMm * escala}px`,
      }}
      onPointerDown={() => onSeleccionar(null)}
      onPointerMove={moverPuntero}
      onPointerUp={terminarGesto}
      onPointerCancel={terminarGesto}
    >
      {mostrarGuias && <GuiaMargenes margenes={diseno.margenes} escala={escala}
                                     anchoMm={anchoMm} altoMm={altoMm} />}

      {elementos.map((el) => {
        const heredado = paginaIndex > 0 && el.repiteEnTodas
        const seleccionado = el.id === seleccionadoId && !heredado
        return (
          <div
            key={el.id + (heredado ? '-h' : '')}
            className={cn(
              'absolute',
              !el.bloqueado && !heredado && 'cursor-move',
              heredado && 'opacity-60',
              seleccionado && 'outline outline-2 outline-sky-500',
            )}
            style={{
              left: `${el.xMm * escala}px`,
              top: `${el.yMm * escala}px`,
              width: `${el.anchoMm * escala}px`,
              height: `${el.altoMm * escala}px`,
              zIndex: el.z,
            }}
            // Los heredados se editan desde su página, no desde el eco: cambiar
            // aquí uno de ellos daría la impresión de que solo afecta a esta hoja.
            onPointerDown={(e) => !heredado && iniciarGesto(e, el, 'mover')}
          >
            <ElementoRender elemento={el} escala={escala} />

            {seleccionado && !el.bloqueado && MANIJAS.map((m) => (
              <span
                key={m}
                onPointerDown={(e) => iniciarGesto(e, el, m)}
                className={cn(
                  'absolute h-2 w-2 rounded-[1px] border border-white bg-sky-500',
                  posicionManija(m),
                  cursorManija(m),
                )}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Marca dónde caen los márgenes. Solo en pantalla: no se imprime. */
function GuiaMargenes({ margenes, escala, anchoMm, altoMm }: {
  margenes: Margenes; escala: number; anchoMm: number; altoMm: number
}) {
  return (
    <div
      className="pointer-events-none absolute border border-dashed border-sky-300"
      style={{
        left: `${margenes.izquierdoMm * escala}px`,
        top: `${margenes.superiorMm * escala}px`,
        width: `${(anchoMm - margenes.izquierdoMm - margenes.derechoMm) * escala}px`,
        height: `${(altoMm - margenes.superiorMm - margenes.inferiorMm) * escala}px`,
      }}
    />
  )
}

function posicionManija(m: Manija): string {
  switch (m) {
    case 'nw': return '-left-1 -top-1'
    case 'n':  return 'left-1/2 -top-1 -translate-x-1/2'
    case 'ne': return '-right-1 -top-1'
    case 'e':  return '-right-1 top-1/2 -translate-y-1/2'
    case 'se': return '-bottom-1 -right-1'
    case 's':  return 'left-1/2 -bottom-1 -translate-x-1/2'
    case 'sw': return '-bottom-1 -left-1'
    case 'w':  return '-left-1 top-1/2 -translate-y-1/2'
  }
}

function cursorManija(m: Manija): string {
  if (m === 'n' || m === 's') return 'cursor-ns-resize'
  if (m === 'e' || m === 'w') return 'cursor-ew-resize'
  if (m === 'nw' || m === 'se') return 'cursor-nwse-resize'
  return 'cursor-nesw-resize'
}
