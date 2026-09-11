import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { cn } from '@/lib/utils'
import type { Banda, DisenoReporte, Elemento, Margenes } from '../types'
import {
  elementosDeBanda, MARGENES_FLUJO_POR_DEFECTO, medidasDe, origenDeBanda,
} from '../types'
import { ElementoRender } from './ElementoRender'

/** Las ocho manijas de redimensionado, en el orden en que se dibujan. */
const MANIJAS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Manija = (typeof MANIJAS)[number]

/** Tamaño mínimo de un elemento. Por debajo deja de poderse agarrar. */
const MINIMO_MM = 4

/** Un elemento listo para pintar, con de dónde viene y a qué altura se dibuja. */
interface Pintable {
  elemento: Elemento
  banda: Banda
  /** Desplazamiento vertical de su banda respecto al borde de la hoja. */
  offsetYMm: number
  /** Un eco de otra página: se ve, pero se edita donde vive. */
  heredado: boolean
}

interface Props {
  diseno: DisenoReporte
  paginaIndex: number
  /** Puede haber varios a la vez: un grupo, o una selección hecha con Ctrl. */
  seleccionados: string[]
  escala: number
  /** Ajustar a una cuadrícula invisible, en milímetros. 0 = libre. */
  ajusteMm: number
  mostrarGuias: boolean
  /** `aditivo` llega con Ctrl o Shift: suma o quita de la selección. */
  onSeleccionar: (id: string | null, aditivo?: boolean) => void
  onCambiarElemento: (banda: Banda, id: string, cambios: Partial<Elemento>) => void
  /** Mueve de una vez todo lo seleccionado. Es lo que hace que un grupo sea un grupo. */
  onMoverSeleccion: (dxMm: number, dyMm: number) => void
  /**
   * Doble clic sobre un elemento que tiene contenido propio que editar.
   *
   * De momento solo las tablas: el doble clic sobre una celda es el gesto que
   * espera cualquiera que haya usado un procesador de textos.
   */
  onAbrirContenido?: (id: string) => void
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
  diseno, paginaIndex, seleccionados, escala, ajusteMm, mostrarGuias,
  onSeleccionar, onCambiarElemento, onMoverSeleccion, onAbrirContenido,
}: Props) {
  const { anchoMm, altoMm } = medidasDe(diseno)
  const hojaRef = useRef<HTMLDivElement>(null)

  // El gesto en curso. En un ref y no en estado: cambia en cada movimiento del
  // puntero y no debe provocar un render por sí mismo.
  const gesto = useRef<{
    id: string
    banda: Banda
    modo: 'mover' | Manija
    inicioX: number
    inicioY: number
    /** Lo ya aplicado al mover en grupo, para mandar solo la diferencia. */
    aplicadoX: number
    aplicadoY: number
    enGrupo: boolean
    original: { xMm: number; yMm: number; anchoMm: number; altoMm: number }
  } | null>(null)

  const [arrastrando, setArrastrando] = useState(false)

  const pagina = diseno.paginas[paginaIndex]
  const altoEncabezado = diseno.encabezado?.activo ? diseno.encabezado.altoMm : 0
  const altoPie = diseno.pie?.activo ? diseno.pie.altoMm : 0

  /**
   * Todo lo que se dibuja en esta hoja: el cuerpo de la página, los elementos
   * que se repiten y viven en la primera, y las dos bandas.
   *
   * <p>Las bandas van con su desplazamiento porque sus coordenadas son relativas
   * a ellas; el pie se ancla abajo, así que el suyo depende del alto de la hoja.</p>
   */
  const pintables: Pintable[] = (() => {
    const lista: Pintable[] = []

    if (paginaIndex > 0) {
      for (const e of diseno.paginas[0]?.elementos ?? []) {
        if (e.repiteEnTodas) {
          lista.push({ elemento: e, banda: 'cuerpo', offsetYMm: 0, heredado: true })
        }
      }
    }
    for (const e of pagina?.elementos ?? []) {
      lista.push({ elemento: e, banda: 'cuerpo', offsetYMm: 0, heredado: false })
    }
    for (const e of elementosDeBanda(diseno.encabezado)) {
      lista.push({ elemento: e, banda: 'encabezado', offsetYMm: 0, heredado: false })
    }
    const origenPie = origenDeBanda('pie', diseno)
    for (const e of elementosDeBanda(diseno.pie)) {
      lista.push({ elemento: e, banda: 'pie', offsetYMm: origenPie, heredado: false })
    }

    return lista
      .filter((p) => !p.elemento.oculto)
      .sort((a, b) => a.elemento.z - b.elemento.z)
  })()

  const aMm = useCallback((px: number) => px / escala, [escala])

  const ajustar = useCallback(
    (valorMm: number) => (ajusteMm > 0 ? Math.round(valorMm / ajusteMm) * ajusteMm : valorMm),
    [ajusteMm],
  )

  function iniciarGesto(e: ReactPointerEvent, p: Pintable, modo: 'mover' | Manija) {
    const { elemento } = p
    e.stopPropagation()

    // Un elemento bloqueado sí se puede seleccionar; lo que no se puede es
    // moverlo. Antes ni siquiera respondía al clic, así que bloquear algo era un
    // viaje de ida: no había forma de volver a alcanzarlo para desbloquearlo.
    const aditivo = e.ctrlKey || e.metaKey || e.shiftKey
    if (elemento.bloqueado || p.heredado) {
      if (!p.heredado) onSeleccionar(elemento.id, aditivo)
      return
    }

    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    // Si ya estaba seleccionado se conserva la selección —así se arrastra un
    // grupo entero—; si no, este pasa a ser lo único seleccionado.
    const yaEstaba = seleccionados.includes(elemento.id)
    if (!yaEstaba || aditivo) onSeleccionar(elemento.id, aditivo)

    // Que pertenezca a un grupo basta, aunque el grupo no estuviera seleccionado
    // todavía: el clic acaba de seleccionarlo entero. Mirando solo la selección
    // anterior, el primer arrastre sobre un grupo movía un elemento suelto y
    // deshacía justo lo que agrupar prometía.
    const hermanos = elemento.grupoId
      ? pintables.filter((x) => x.elemento.grupoId === elemento.grupoId).length
      : 1
    const enGrupo = modo === 'mover'
      && (hermanos > 1 || (yaEstaba && seleccionados.length > 1))

    gesto.current = {
      id: elemento.id,
      banda: p.banda,
      modo,
      inicioX: e.clientX,
      inicioY: e.clientY,
      aplicadoX: 0,
      aplicadoY: 0,
      enGrupo,
      original: {
        xMm: elemento.xMm, yMm: elemento.yMm,
        anchoMm: elemento.anchoMm, altoMm: elemento.altoMm,
      },
    }
    setArrastrando(true)
  }

  function moverPuntero(e: ReactPointerEvent) {
    const g = gesto.current
    if (!g) return

    const dxMm = aMm(e.clientX - g.inicioX)
    const dyMm = aMm(e.clientY - g.inicioY)
    const o = g.original

    if (g.modo === 'mover') {
      if (g.enGrupo) {
        // En grupo se manda el incremento desde la última vez, no la posición
        // absoluta: cada miembro parte de la suya y hay que respetarla.
        const destinoX = ajustar(o.xMm + dxMm) - o.xMm
        const destinoY = ajustar(o.yMm + dyMm) - o.yMm
        const pasoX = destinoX - g.aplicadoX
        const pasoY = destinoY - g.aplicadoY
        if (pasoX !== 0 || pasoY !== 0) {
          g.aplicadoX = destinoX
          g.aplicadoY = destinoY
          onMoverSeleccion(pasoX, pasoY)
        }
        return
      }
      onCambiarElemento(g.banda, g.id, {
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

    onCambiarElemento(g.banda, g.id, {
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

  // Una hoja de flujo no tiene coordenadas: su contenido va uno detrás de otro y
  // el motor decide dónde parte. Dibujarla con posición absoluta enseñaría algo
  // que el papel no va a hacer, que es justo lo que este lienzo existe para evitar.
  if (diseno.paginas[paginaIndex]?.flujo) {
    return (
      <HojaEnFlujo
        diseno={diseno}
        paginaIndex={paginaIndex}
        seleccionados={seleccionados}
        escala={escala}
        onSeleccionar={onSeleccionar}
        onAbrirContenido={onAbrirContenido}
      />
    )
  }

  return (
    <div
      ref={hojaRef}
      // `isolate` encierra aquí el orden de capas. Cada elemento lleva de z-index su
      // número de capa, y sin un contexto de apilado propio esos números competían
      // con los de toda la página: pasadas las 50 capas, los elementos se pintaban
      // encima de los diálogos (z-50), incluido el de guardar y salir.
      className={cn(
        'relative isolate shrink-0 bg-white shadow-md',
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
      {mostrarGuias && (
        <>
          <GuiaMargenes margenes={diseno.margenes} escala={escala}
                        anchoMm={anchoMm} altoMm={altoMm} />
          {altoEncabezado > 0 && (
            <GuiaBanda rotulo="Encabezado" escala={escala}
                       topMm={0} altoBandaMm={altoEncabezado} />
          )}
          {altoPie > 0 && (
            <GuiaBanda rotulo="Pie de página" escala={escala}
                       topMm={altoMm - altoPie} altoBandaMm={altoPie} />
          )}
        </>
      )}

      {pintables.map((p) => {
        const el = p.elemento
        const seleccionado = seleccionados.includes(el.id) && !p.heredado
        return (
          <div
            key={el.id + (p.heredado ? '-h' : '')}
            className={cn(
              'absolute',
              !el.bloqueado && !p.heredado && 'cursor-move',
              el.bloqueado && !p.heredado && 'cursor-default',
              p.heredado && 'opacity-60',
              seleccionado && (el.bloqueado
                ? 'outline outline-2 outline-dashed outline-amber-500'
                : 'outline outline-2 outline-sky-500'),
            )}
            style={{
              left: `${el.xMm * escala}px`,
              top: `${(el.yMm + p.offsetYMm) * escala}px`,
              width: `${el.anchoMm * escala}px`,
              height: `${el.altoMm * escala}px`,
              zIndex: el.z,
              // Girar solo cambia cómo se pinta: el arrastre y las manijas siguen
              // en el sistema sin girar, que es lo que hace la aritmética manejable.
              ...(el.rotacionGrados
                ? { transform: `rotate(${el.rotacionGrados}deg)` }
                : {}),
            }}
            // Los heredados se editan desde su página, no desde el eco: cambiar
            // aquí uno de ellos daría la impresión de que solo afecta a esta hoja.
            onPointerDown={(e) => iniciarGesto(e, p, 'mover')}
            onDoubleClick={(e) => {
              if (p.heredado || el.tipo !== 'tabla') return
              e.stopPropagation()
              onAbrirContenido?.(el.id)
            }}
          >
            <ElementoRender elemento={el} escala={escala} />

            {seleccionado && !el.bloqueado && seleccionados.length === 1
              && MANIJAS.map((m) => (
                <span
                  key={m}
                  onPointerDown={(e) => iniciarGesto(e, p, m)}
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

/** Dónde empieza y acaba una banda. Sin esto no se sabe qué se repite. */
function GuiaBanda({ rotulo, escala, topMm, altoBandaMm }: {
  rotulo: string; escala: number; topMm: number; altoBandaMm: number
}) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 border-y border-dashed border-violet-300 bg-violet-500/[0.04]"
      style={{ top: `${topMm * escala}px`, height: `${altoBandaMm * escala}px` }}
    >
      <span className="absolute right-0.5 top-0.5 text-[8px] uppercase tracking-wide text-violet-400">
        {rotulo}
      </span>
    </div>
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

/**
 * La hoja cuando su contenido fluye.
 *
 * <p>No hay coordenadas que enseñar: los elementos van uno detrás de otro y el
 * motor de PDF decide dónde corta. Se dibuja el mismo apilado que hará el
 * servidor —de arriba abajo y, a igual altura, de izquierda a derecha— para que la
 * vista previa no prometa una colocación que el papel no va a respetar.</p>
 *
 * <p>Por eso tampoco se arrastra. El orden es la posición vertical, que se cambia
 * en el panel de propiedades; permitir mover algo cuyo sitio final no depende de
 * dónde se suelte sería peor que no dejarlo mover.</p>
 */
function HojaEnFlujo({
  diseno, paginaIndex, seleccionados, escala, onSeleccionar, onAbrirContenido,
}: {
  diseno: DisenoReporte
  paginaIndex: number
  seleccionados: string[]
  escala: number
  onSeleccionar: (id: string | null, aditivo?: boolean) => void
  onAbrirContenido?: (id: string) => void
}) {
  const { anchoMm, altoMm } = medidasDe(diseno)
  const m = diseno.margenesFlujo ?? MARGENES_FLUJO_POR_DEFECTO
  const anchoUtilMm = anchoMm - m.izquierdaMm - m.derechaMm

  const elementos = [...(diseno.paginas[paginaIndex]?.elementos ?? [])]
    .filter((el) => !el.oculto)
    .sort((a, b) => (a.yMm - b.yMm) || (a.xMm - b.xMm))

  return (
    <div
      className="relative shrink-0 bg-white shadow-md"
      style={{
        width: `${anchoMm * escala}px`,
        // El alto es el de una página, pero el contenido puede seguir más abajo:
        // se marca dónde acaba el papel en vez de recortarlo, que es lo que hace
        // el lienzo y lo que esta hoja viene a resolver.
        minHeight: `${altoMm * escala}px`,
      }}
      onPointerDown={() => onSeleccionar(null)}
    >
      <div
        className="absolute inset-x-0 border-y border-dashed border-sky-200"
        style={{ top: 0, height: `${altoMm * escala}px` }}
      />
      <div
        className="relative"
        style={{
          paddingTop: `${m.arribaMm * escala}px`,
          paddingBottom: `${m.abajoMm * escala}px`,
          paddingLeft: `${m.izquierdaMm * escala}px`,
          paddingRight: `${m.derechaMm * escala}px`,
        }}
      >
        {elementos.length === 0 && (
          <p className="text-[11px] italic text-muted-foreground">
            Esta hoja reparte su contenido entre las páginas que haga falta. Lo que se
            agregue aparecerá aquí, uno debajo de otro.
          </p>
        )}

        {elementos.map((el) => (
          <div
            key={el.id}
            className={cn(
              'relative cursor-pointer',
              seleccionados.includes(el.id) && 'outline outline-2 outline-sky-500',
            )}
            style={{
              width: `${anchoUtilMm * escala}px`,
              marginBottom: `${4 * escala}px`,
              // Solo lo que necesita alto propio lo lleva; lo demás lo pide su
              // contenido, igual que en el papel.
              ...(el.tipo === 'imagen' || el.tipo === 'figura' || el.tipo === 'icono'
                ? { height: `${el.altoMm * escala}px` }
                : {}),
            }}
            onPointerDown={(e) => { e.stopPropagation(); onSeleccionar(el.id, e.ctrlKey || e.shiftKey) }}
            onDoubleClick={(e) => {
              if (el.tipo !== 'tabla') return
              e.stopPropagation()
              onAbrirContenido?.(el.id)
            }}
          >
            <ElementoRender elemento={el} escala={escala} />
          </div>
        ))}
      </div>
    </div>
  )
}
