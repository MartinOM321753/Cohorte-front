import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignLeft, ChevronLeft, ChevronRight, Circle, Copy, Diamond, Grid3x3, Image as ImageIcon,
  Minus, MoveRight, PanelBottom, PanelTop, Plus, Redo2, Ruler, Save, Sparkles,
  Square, Table, Trash2, Triangle, Type, Undo2, ZoomIn, ZoomOut,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { DialogoNuevaTabla } from './DialogoNuevaTabla'
import { EditorTabla } from './EditorTabla'
import { GaleriaImagenes } from './GaleriaImagenes'
import { LienzoReporte } from './LienzoReporte'
import { PanelCapas, type CapaListada } from './PanelCapas'
import { PanelDatos } from './PanelDatos'
import { PanelPropiedades } from './PanelPropiedades'
import { SelectorIcono } from './SelectorIcono'
import type {
  Banda, DisenoReporte, Elemento, ElementoTabla, FormaFigura, TamanoPagina,
} from '../types'
import {
  COLUMNAS_LISTA,
  altoDeTablaNuevaMm, altoParaProporcion, bandaVacia, clonarElementos,
  contenidoDeTablaNueva, FORMAS_CON_RELLENO, FORMAS_DE_TRAZO, medidasDe, nuevoId,
  origenDeBanda, TAMANOS_PAGINA, zSuperior,
} from '../types'
import type { CampoReporte } from '../types.api'

/** Píxeles por milímetro. Cada paso es un nivel de zoom. */
const ESCALAS = [1.2, 1.6, 2, 2.6, 3.2, 4]

/** Alto con el que nacen las bandas. Se puede cambiar después. */
const ALTO_ENCABEZADO_MM = 25
const ALTO_PIE_MM = 18

/**
 * Cuántas versiones guarda el historial.
 *
 * Un diseño ocupa poco, pero tampoco tiene sentido conservar la sesión entera: con
 * ochenta pasos se cubre de sobra lo que alguien recuerda haber hecho.
 */
const MAX_HISTORIAL = 80

/**
 * Los cambios que se funden con el anterior si vienen seguidos.
 *
 * Arrastrar produce un cambio por milímetro y escribir uno por tecla; sin fundir,
 * deshacer devolvería un milímetro o una letra en vez del gesto entero.
 */
const CONTINUOS = ['mover:', 'editar:']

/** Cuánto se corre lo pegado respecto al original, para que no lo tape. */
const DESPLAZAMIENTO_PEGADO = 4

interface Props {
  disenoInicial: DisenoReporte
  guardando: boolean
  /** Debe resolverse cuando el diseño quedó guardado, o fallar si no. */
  onGuardar: (diseno: DisenoReporte) => Promise<unknown>
  /** Avisa a quien contiene el editor de si hay trabajo sin guardar. */
  onEstado?: (hayCambios: boolean, diseno: DisenoReporte) => void
}

export function EditorPlantilla({ disenoInicial, guardando, onGuardar, onEstado }: Props) {
  const [diseno, setDiseno] = useState<DisenoReporte>(disenoInicial)
  const [paginaIndex, setPaginaIndex] = useState(0)
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [escalaIndex, setEscalaIndex] = useState(3)
  const [ajusteMm, setAjusteMm] = useState(1)
  const [mostrarGuias, setMostrarGuias] = useState(true)
  /** Dónde caen los elementos nuevos. */
  const [bandaDestino, setBandaDestino] = useState<Banda>('cuerpo')
  const [selectorIcono, setSelectorIcono] = useState(false)
  const [dialogoNuevaTabla, setDialogoNuevaTabla] = useState(false)
  /** La tabla cuyo contenido se está escribiendo, si hay alguna. */
  const [tablaEnEdicion, setTablaEnEdicion] = useState<string | null>(null)
  /** La página que se va a borrar, mientras se confirma. */
  const [paginaPorEliminar, setPaginaPorEliminar] = useState<number | null>(null)
  /**
   * La imagen a la que se le está eligiendo archivo.
   *
   * <p>Guarda además si el elemento acaba de nacer, porque de eso depende qué pasa
   * al cerrar la galería sin elegir nada: una imagen recién insertada se retira —un
   * recuadro vacío en la hoja no es lo que buscaba quien se arrepintió—, mientras
   * que a una que ya estaba puesta se le deja la que tenía.</p>
   */
  const [eligiendoImagen, setEligiendoImagen] = useState<{ id: string; reciente: boolean } | null>(null)

  // El diseño tal como está en el servidor. Comparar contra esto es lo que dice si
  // hay trabajo sin guardar.
  const [guardado, setGuardado] = useState(() => JSON.stringify(disenoInicial))

  /**
   * Lo copiado, con la banda de la que salió.
   *
   * Es un portapapeles propio y no el del sistema: lo que se copia es un trozo de
   * diseño, no texto, y pasarlo por el portapapeles del navegador obligaría a
   * serializarlo y a pedir permisos para algo que no sale nunca de esta pantalla.
   */
  const [portapapeles, setPortapapeles] = useState<{ banda: Banda; elementos: Elemento[] } | null>(null)

  /**
   * El historial de deshacer.
   *
   * <p>Va en un ref y no en estado porque cambia en cada paso del arrastre y no debe
   * provocar un render por sí mismo. `indice` apunta a la versión que se está
   * viendo; deshacer retrocede y rehacer avanza, y cualquier cambio nuevo corta la
   * rama que quedaba por delante — que es lo que espera quien deshace tres pasos y
   * luego hace otra cosa.</p>
   */
  const historial = useRef({
    pila: [disenoInicial] as DisenoReporte[],
    indice: 0,
    motivo: '' as string,
    ms: 0,
  })
  /** Lo que provocó el cambio en curso, para saber si se puede fundir con el anterior. */
  const motivo = useRef('inicial')
  /** Verdadero mientras se aplica un deshacer o rehacer, para no re-registrarlo. */
  const saltando = useRef(false)
  const [puedeDeshacer, setPuedeDeshacer] = useState(false)
  const [puedeRehacer, setPuedeRehacer] = useState(false)

  const hayCambios = JSON.stringify(diseno) !== guardado

  // No hay ningún efecto que reponga `disenoInicial` sobre el diseño en curso, y es
  // deliberado: `disenoInicial` se construye nuevo en cada render de la página, así
  // que un efecto pendiente de él se disparaba con cualquier re-render del padre
  // —un refetch en segundo plano, el propio estado del guardado— y borraba lo que
  // se llevara diseñado sin avisar. Cambiar de plantilla se resuelve arriba con
  // `key`, que remonta el editor entero.

  useEffect(() => {
    onEstado?.(hayCambios, diseno)
  }, [hayCambios, diseno, onEstado])

  /**
   * Registra cada versión del diseño en el historial.
   *
   * <p>Se hace en un efecto sobre el diseño ya aplicado, y no dentro de quien lo
   * modifica, para no meter un efecto secundario en el actualizador de estado: React
   * llama a esos actualizadores dos veces en desarrollo, y el historial acabaría con
   * cada paso duplicado.</p>
   *
   * <p>Los cambios continuos se funden en un solo paso: arrastrar un elemento
   * produce un cambio por cada milímetro, y deshacer debería devolverlo a donde
   * estaba antes de agarrarlo, no un milímetro atrás. Se funden por motivo y por
   * tiempo, así que soltar y volver a arrastrar cuenta como dos pasos.</p>
   */
  useEffect(() => {
    if (saltando.current) {
      saltando.current = false
      setPuedeDeshacer(historial.current.indice > 0)
      setPuedeRehacer(historial.current.indice < historial.current.pila.length - 1)
      return
    }

    const h = historial.current
    if (diseno === h.pila[h.indice]) return

    const ahora = Date.now()
    const fundible = CONTINUOS.some((pre) => motivo.current.startsWith(pre))
    const mismoGesto = fundible && motivo.current === h.motivo && ahora - h.ms < 700

    if (mismoGesto) {
      h.pila[h.indice] = diseno
    } else {
      // Lo que quedaba por delante se descarta: se abrió una rama nueva.
      h.pila = [...h.pila.slice(0, h.indice + 1), diseno]
      if (h.pila.length > MAX_HISTORIAL) h.pila.shift()
      h.indice = h.pila.length - 1
    }
    h.motivo = motivo.current
    h.ms = ahora

    setPuedeDeshacer(h.indice > 0)
    setPuedeRehacer(h.indice < h.pila.length - 1)
  }, [diseno])

  const deshacer = useCallback(() => {
    const h = historial.current
    if (h.indice <= 0) return
    h.indice--
    saltando.current = true
    setSeleccionados([])
    setDiseno(h.pila[h.indice])
  }, [])

  const rehacer = useCallback(() => {
    const h = historial.current
    if (h.indice >= h.pila.length - 1) return
    h.indice++
    saltando.current = true
    setSeleccionados([])
    setDiseno(h.pila[h.indice])
  }, [])

  // Cerrar la pestaña o recargar no pasa por ningún diálogo nuestro; esto es lo
  // único que el navegador deja hacer al respecto.
  useEffect(() => {
    if (!hayCambios) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  async function guardarAhora() {
    // Se retrata el diseño antes de mandarlo: si se sigue editando mientras viaja,
    // esos cambios nuevos deben seguir contando como pendientes.
    const instantanea = JSON.stringify(diseno)
    try {
      await onGuardar(diseno)
      setGuardado(instantanea)
    } catch {
      // El aviso de error lo da la mutación; aquí basta con no marcarlo guardado.
    }
  }

  const escala = ESCALAS[escalaIndex]
  const pagina = diseno.paginas[paginaIndex]

  // ── Acceso por banda ──────────────────────────────────────────────────────

  /**
   * Todo lo editable de la hoja actual, con la banda en que vive.
   *
   * <p>Los ecos de elementos que se repiten y viven en otra página quedan fuera a
   * propósito: se editan donde están, no en la copia.</p>
   */
  const capas: CapaListada[] = useMemo(() => {
    const lista: CapaListada[] = []
    for (const e of pagina?.elementos ?? []) lista.push({ elemento: e, banda: 'cuerpo' })
    if (diseno.encabezado?.activo) {
      for (const e of diseno.encabezado.elementos) lista.push({ elemento: e, banda: 'encabezado' })
    }
    if (diseno.pie?.activo) {
      for (const e of diseno.pie.elementos) lista.push({ elemento: e, banda: 'pie' })
    }
    return lista
  }, [pagina, diseno.encabezado, diseno.pie])

  const capaDe = useCallback(
    (id: string) => capas.find((c) => c.elemento.id === id) ?? null,
    [capas],
  )

  const elegidos = useMemo(
    () => capas.filter((c) => seleccionados.includes(c.elemento.id)),
    [capas, seleccionados],
  )

  /** El único elegido, o null si hay cero o varios: es lo que edita el panel. */
  const seleccionado = elegidos.length === 1 ? elegidos[0].elemento : null

  /**
   * La tabla cuyo contenido se está escribiendo.
   *
   * <p>Se resuelve del diseño en cada render y no se copia al abrir el diálogo:
   * así lo que se teclea allí se ve al momento en la hoja de detrás, y borrar la
   * tabla —o deshacer hasta antes de crearla— cierra el diálogo en vez de dejarlo
   * editando algo que ya no existe.</p>
   */
  const tablaDeEdicion = useMemo<ElementoTabla | null>(() => {
    if (!tablaEnEdicion) return null
    const capa = capas.find((c) => c.elemento.id === tablaEnEdicion)
    return capa?.elemento.tipo === 'tabla' ? capa.elemento : null
  }, [capas, tablaEnEdicion])

  /** La imagen que está esperando archivo, para marcar en la galería la que ya lleve. */
  const imagenEnEspera = useMemo(() => {
    if (!eligiendoImagen) return null
    const capa = capas.find((c) => c.elemento.id === eligiendoImagen.id)
    return capa?.elemento.tipo === 'imagen' ? capa.elemento : null
  }, [capas, eligiendoImagen])

  /**
   * Aplica una transformación a la lista de elementos de una banda.
   *
   * @param razon por qué se cambia; el historial funde entre sí los pasos seguidos
   *              de una misma razón para que un arrastre sea un solo deshacer
   */
  const transformar = useCallback((
    banda: Banda,
    fn: (elementos: Elemento[]) => Elemento[],
    razon = 'cambio',
  ) => {
    motivo.current = razon
    setDiseno((prev) => {
      if (banda === 'cuerpo') {
        return {
          ...prev,
          paginas: prev.paginas.map((p, i) => (i !== paginaIndex ? p : { ...p, elementos: fn(p.elementos) })),
        }
      }
      const actual = banda === 'encabezado' ? prev.encabezado : prev.pie
      if (!actual) return prev
      const nueva = { ...actual, elementos: fn(actual.elementos) }
      return banda === 'encabezado' ? { ...prev, encabezado: nueva } : { ...prev, pie: nueva }
    })
  }, [paginaIndex])

  const cambiarElemento = useCallback((banda: Banda, id: string, cambios: Partial<Elemento>) => {
    // La razón incluye qué propiedades se tocan: escribir en un campo se funde en un
    // paso, pero cambiar de campo abre uno nuevo.
    const razon = `editar:${id}:${Object.keys(cambios).join(',')}`
    transformar(banda, (els) =>
      els.map((e) => (e.id === id ? { ...e, ...cambios } as Elemento : e)), razon)
  }, [transformar])

  // ── Selección ─────────────────────────────────────────────────────────────

  /**
   * Selecciona, expandiendo al grupo entero.
   *
   * <p>Pulsar un miembro selecciona todo el grupo: es lo que hace que agrupar
   * signifique algo al arrastrar. Con Ctrl se suma o se quita de la selección, que
   * es como se arma la selección para agrupar en primer lugar.</p>
   */
  const alSeleccionar = useCallback((id: string | null, aditivo?: boolean) => {
    if (id == null) { setSeleccionados([]); return }

    const capa = capas.find((c) => c.elemento.id === id)
    const delGrupo = capa?.elemento.grupoId
      ? capas.filter((c) => c.elemento.grupoId === capa.elemento.grupoId).map((c) => c.elemento.id)
      : [id]

    setSeleccionados((prev) => {
      if (!aditivo) return delGrupo
      const yaEsta = delGrupo.every((x) => prev.includes(x))
      return yaEsta
        ? prev.filter((x) => !delGrupo.includes(x))
        : [...prev, ...delGrupo.filter((x) => !prev.includes(x))]
    })
  }, [capas])

  // Al cambiar de página se sueltan los elegidos que ya no están a la vista; los
  // de las bandas siguen valiendo, porque las bandas son las mismas en toda hoja.
  useEffect(() => {
    setSeleccionados((prev) => {
      const vivos = prev.filter((id) => capas.some((c) => c.elemento.id === id))
      // Se devuelve el mismo array cuando no sobra nadie. Con uno nuevo, cada
      // cambio del diseño —y hay uno por cada milímetro de arrastre— provocaba un
      // render de más sin que nada hubiera cambiado.
      return vivos.length === prev.length ? prev : vivos
    })
  }, [capas])

  // ── Operaciones sobre el diseño ───────────────────────────────────────────

  const agregar = useCallback((elemento: Elemento) => {
    transformar(bandaDestino, (els) => [...els, elemento])
    setSeleccionados([elemento.id])
  }, [transformar, bandaDestino])

  const eliminarSeleccion = useCallback(() => {
    if (elegidos.length === 0) return
    for (const banda of ['cuerpo', 'encabezado', 'pie'] as Banda[]) {
      const ids = elegidos.filter((c) => c.banda === banda).map((c) => c.elemento.id)
      if (ids.length) transformar(banda, (els) => els.filter((e) => !ids.includes(e.id)))
    }
    setSeleccionados([])
  }, [elegidos, transformar])

  const moverCapa = useCallback((banda: Banda, id: string, direccion: 1 | -1) => {
    const capa = capas.find((c) => c.elemento.id === id)
    if (!capa) return
    cambiarElemento(banda, id, { z: Math.max(0, capa.elemento.z + direccion) } as Partial<Elemento>)
  }, [capas, cambiarElemento])

  /** Mueve de una vez todo lo seleccionado. Lo bloqueado se queda donde está. */
  const moverSeleccion = useCallback((dxMm: number, dyMm: number) => {
    for (const banda of ['cuerpo', 'encabezado', 'pie'] as Banda[]) {
      const ids = elegidos
        .filter((c) => c.banda === banda && !c.elemento.bloqueado)
        .map((c) => c.elemento.id)
      if (!ids.length) continue
      transformar(banda, (els) => els.map((e) =>
        ids.includes(e.id) ? { ...e, xMm: e.xMm + dxMm, yMm: e.yMm + dyMm } : e),
        `mover:${ids.join(',')}`)
    }
  }, [elegidos, transformar])

  /**
   * Agrupa lo seleccionado bajo una etiqueta común.
   *
   * <p>Solo dentro de una misma banda: un elemento del pie y otro de la hoja no
   * comparten origen de coordenadas, así que «moverlos juntos» no querría decir
   * nada. Si algo ya estaba en otro grupo, se pasa a este — lo contrario dejaría
   * dos grupos entrelazados y ninguna forma clara de deshacerlos.</p>
   */
  const agrupar = useCallback(() => {
    if (elegidos.length < 2) return
    const banda = elegidos[0].banda
    if (!elegidos.every((c) => c.banda === banda)) return

    const grupoId = nuevoId()
    const ids = elegidos.map((c) => c.elemento.id)
    transformar(banda, (els) => els.map((e) => (ids.includes(e.id) ? { ...e, grupoId } : e)))
  }, [elegidos, transformar])

  const desagrupar = useCallback(() => {
    const grupos = new Set(elegidos.map((c) => c.elemento.grupoId).filter(Boolean))
    if (grupos.size === 0) return

    for (const banda of ['cuerpo', 'encabezado', 'pie'] as Banda[]) {
      transformar(banda, (els) => els.map((e) =>
        e.grupoId && grupos.has(e.grupoId) ? { ...e, grupoId: undefined } : e))
    }
  }, [elegidos, transformar])

  // ── Copiar, cortar y pegar ────────────────────────────────────────────────

  const copiar = useCallback(() => {
    if (elegidos.length === 0) return
    const banda = elegidos[0].banda
    // Solo de una banda: pegar mezclando hoja y pie no tendría dónde caer, porque
    // sus coordenadas se miden desde sitios distintos.
    const deLaBanda = elegidos.filter((c) => c.banda === banda).map((c) => c.elemento)
    setPortapapeles({ banda, elementos: JSON.parse(JSON.stringify(deLaBanda)) })
  }, [elegidos])

  /**
   * Pega lo copiado, un poco corrido para que no tape al original.
   *
   * <p>Cada copia estrena identificador, y los grupos se rehacen: si lo copiado
   * estaba agrupado, lo pegado queda agrupado <b>entre sí</b> y no con el original.
   * Compartir la etiqueta haría que mover la copia arrastrara también lo copiado.</p>
   */
  const pegar = useCallback(() => {
    if (!portapapeles || portapapeles.elementos.length === 0) return

    const destino: Banda =
      portapapeles.banda === 'encabezado' && !diseno.encabezado?.activo ? 'cuerpo'
      : portapapeles.banda === 'pie' && !diseno.pie?.activo ? 'cuerpo'
      : portapapeles.banda

    const gruposNuevos = new Map<string, string>()
    const nuevos = portapapeles.elementos.map((e) => {
      const copia: Elemento = { ...e, id: nuevoId(), xMm: e.xMm + DESPLAZAMIENTO_PEGADO, yMm: e.yMm + DESPLAZAMIENTO_PEGADO }
      if (e.grupoId) {
        if (!gruposNuevos.has(e.grupoId)) gruposNuevos.set(e.grupoId, nuevoId())
        copia.grupoId = gruposNuevos.get(e.grupoId)
      }
      return copia
    })

    transformar(destino, (els) => {
      const base = zSuperior(els)
      return [...els, ...nuevos.map((e, i) => ({ ...e, z: base + 1 + i }))]
    }, 'pegar')
    setSeleccionados(nuevos.map((e) => e.id))
  }, [portapapeles, diseno.encabezado, diseno.pie, transformar])

  const cortar = useCallback(() => {
    if (elegidos.length === 0) return
    copiar()
    eliminarSeleccion()
  }, [elegidos, copiar, eliminarSeleccion])

  /** Duplicar es copiar y pegar de una vez, sin tocar lo que hubiera copiado. */
  const duplicar = useCallback(() => {
    if (elegidos.length === 0) return
    const banda = elegidos[0].banda
    const deLaBanda = elegidos.filter((c) => c.banda === banda).map((c) => c.elemento)

    const gruposNuevos = new Map<string, string>()
    const nuevos = deLaBanda.map((e) => {
      const copia: Elemento = JSON.parse(JSON.stringify(e))
      copia.id = nuevoId()
      copia.xMm += DESPLAZAMIENTO_PEGADO
      copia.yMm += DESPLAZAMIENTO_PEGADO
      if (e.grupoId) {
        if (!gruposNuevos.has(e.grupoId)) gruposNuevos.set(e.grupoId, nuevoId())
        copia.grupoId = gruposNuevos.get(e.grupoId)
      }
      return copia
    })

    transformar(banda, (els) => {
      const base = zSuperior(els)
      return [...els, ...nuevos.map((e, i) => ({ ...e, z: base + 1 + i }))]
    }, 'duplicar')
    setSeleccionados(nuevos.map((e) => e.id))
  }, [elegidos, transformar])

  /**
   * Cambia un elemento de banda, recolocándolo.
   *
   * <p>Las coordenadas de una banda son relativas a ella, así que mover algo de la
   * hoja al pie sin recalcular la y lo dejaría fuera de la banda — normalmente muy
   * por debajo del papel, donde ya no se ve ni se puede volver a agarrar.</p>
   */
  const cambiarDeBanda = useCallback((id: string, destino: Banda) => {
    const capa = capaDe(id)
    if (!capa || capa.banda === destino) return

    const yAbsoluta = capa.elemento.yMm + origenDeBanda(capa.banda, diseno)
    const altoDestino = destino === 'encabezado' ? (diseno.encabezado?.altoMm ?? 0)
                      : destino === 'pie' ? (diseno.pie?.altoMm ?? 0)
                      : medidasDe(diseno).altoMm

    let yNueva = yAbsoluta - origenDeBanda(destino, diseno)
    yNueva = Math.max(0, Math.min(yNueva, Math.max(0, altoDestino - capa.elemento.altoMm)))

    transformar(capa.banda, (els) => els.filter((e) => e.id !== id))
    transformar(destino, (els) => [...els, { ...capa.elemento, yMm: yNueva, z: zSuperior(els) + 1 }])
  }, [capaDe, diseno, transformar])

  /**
   * Los atajos de la hoja.
   *
   * <p>Todos se ignoran mientras el foco está en un campo: ahí Ctrl+Z tiene que
   * deshacer lo que se escribe y Suprimir borrar una letra, no un elemento. Sin esa
   * comprobación, corregir un texto acabaría borrando el elemento entero.</p>
   */
  // Con un diálogo abierto, la hoja no escucha: Suprimir dentro del editor de una
  // tabla tiene que borrar una fila, y Escape cerrar el diálogo, no vaciar la
  // selección de detrás.
  const hayDialogo = selectorIcono || dialogoNuevaTabla
    || tablaEnEdicion != null || eligiendoImagen != null || paginaPorEliminar != null

  useEffect(() => {
    if (hayDialogo) return

    function alPulsar(e: KeyboardEvent) {
      const activo = document.activeElement
      const escribiendo = activo instanceof HTMLInputElement
        || activo instanceof HTMLTextAreaElement
        || (activo as HTMLElement | null)?.isContentEditable
      if (escribiendo) return

      const conControl = e.ctrlKey || e.metaKey

      if (conControl) {
        const tecla = e.key.toLowerCase()
        // Ctrl+Y y Ctrl+Shift+Z rehacen: la primera es la costumbre en Windows y la
        // segunda la del resto, y no cuesta nada admitir las dos.
        if (tecla === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); return }
        if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) { e.preventDefault(); rehacer(); return }
        if (tecla === 'c') { e.preventDefault(); copiar(); return }
        if (tecla === 'x') { e.preventDefault(); cortar(); return }
        if (tecla === 'v') { e.preventDefault(); pegar(); return }
        if (tecla === 'd') { e.preventDefault(); duplicar(); return }
        return
      }

      if (e.key === 'Escape') { setSeleccionados([]); return }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (seleccionados.length === 0) return
        e.preventDefault()
        eliminarSeleccion()
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [hayDialogo, seleccionados, eliminarSeleccion, deshacer, rehacer, copiar, cortar, pegar, duplicar])

  // ── Bandas ────────────────────────────────────────────────────────────────

  /**
   * Enciende o apaga una banda.
   *
   * <p>Apagarla no borra lo que tenga dentro: se deja de dibujar y ya. Volver a
   * encenderla lo devuelve tal cual, que es lo que espera quien la apagó para ver
   * cómo queda la hoja sin membrete.</p>
   */
  function alternarBanda(banda: 'encabezado' | 'pie') {
    setDiseno((prev) => {
      const actual = banda === 'encabezado' ? prev.encabezado : prev.pie
      const nueva = actual
        ? { ...actual, activo: !actual.activo }
        : bandaVacia(banda === 'encabezado' ? ALTO_ENCABEZADO_MM : ALTO_PIE_MM)
      return banda === 'encabezado' ? { ...prev, encabezado: nueva } : { ...prev, pie: nueva }
    })
    // Si se apaga la banda en la que se estaba insertando, lo nuevo iría a un sitio
    // invisible. Se vuelve a la hoja.
    if (bandaDestino === banda) setBandaDestino('cuerpo')
  }

  function cambiarAltoBanda(banda: 'encabezado' | 'pie', altoMm: number) {
    const limpio = Math.max(5, Math.min(120, altoMm || 0))
    setDiseno((prev) => {
      const actual = banda === 'encabezado' ? prev.encabezado : prev.pie
      if (!actual) return prev
      const nueva = { ...actual, altoMm: limpio }
      return banda === 'encabezado' ? { ...prev, encabezado: nueva } : { ...prev, pie: nueva }
    })
  }

  const encabezadoActivo = !!diseno.encabezado?.activo
  const pieActivo = !!diseno.pie?.activo

  // ── Elementos nuevos ──────────────────────────────────────────────────────

  function base() {
    const { anchoMm } = medidasDe(diseno)
    const enBanda = bandaDestino !== 'cuerpo'
    const destino = bandaDestino === 'cuerpo' ? (pagina?.elementos ?? [])
                  : bandaDestino === 'encabezado' ? (diseno.encabezado?.elementos ?? [])
                  : (diseno.pie?.elementos ?? [])
    return {
      id: nuevoId(),
      xMm: diseno.margenes.izquierdoMm,
      // Dentro de una banda las coordenadas son suyas, así que el margen superior
      // de la hoja no pinta nada: se empieza pegado al borde de la banda.
      yMm: enBanda ? 2 : diseno.margenes.superiorMm,
      anchoMm: Math.min(70, anchoMm - diseno.margenes.izquierdoMm - diseno.margenes.derechoMm),
      altoMm: 12,
      z: zSuperior(destino) + 1,
    }
  }

  function agregarTexto() {
    agregar({
      ...base(), tipo: 'texto', contenido: 'Escriba aquí',
      tamanoPt: 11, color: '#111111', alineacion: 'left',
    })
  }

  /**
   * Mete una imagen y abre la galería en el mismo gesto.
   *
   * <p>Insertar una imagen sin decir cuál no sirve para nada, y antes había que
   * buscar el botón del panel de la derecha para llegar a la galería. Ahora se abre
   * sola: elegir es el paso siguiente inevitable.</p>
   */
  function agregarImagen() {
    const el: Elemento = {
      ...base(), altoMm: 25, anchoMm: 40, tipo: 'imagen', url: '', ajuste: 'contener',
    }
    agregar(el)
    setEligiendoImagen({ id: el.id, reciente: true })
  }

  function agregarTabla(columnas: number, filas: number, conEncabezado: boolean) {
    const { anchoMm } = medidasDe(diseno)
    agregar({
      ...base(),
      anchoMm: anchoMm - diseno.margenes.izquierdoMm - diseno.margenes.derechoMm,
      altoMm: altoDeTablaNuevaMm(filas),
      tipo: 'tabla',
      ...contenidoDeTablaNueva(columnas, filas, conEncabezado),
    })
  }

  /**
   * Pone la imagen elegida en el elemento que la esperaba.
   *
   * <p>La caja se ajusta a la proporción del archivo: dejarla en los 40×25 con los
   * que nace obligaba a cuadrarla a mano cada vez, y un logo apaisado metido en una
   * caja casi cuadrada se ve deformado hasta que alguien lo arregla.</p>
   */
  function ponerImagenElegida(imagen: { clave: string; nombre: string; anchoPx?: number | null; altoPx?: number | null }) {
    const pendiente = eligiendoImagen
    if (!pendiente) return
    const capa = capaDe(pendiente.id)
    if (!capa) return

    const alto = altoParaProporcion(capa.elemento.anchoMm, imagen)
    cambiarElemento(capa.banda, pendiente.id, {
      url: imagen.clave,
      descripcion: imagen.nombre,
      ...(alto ? { altoMm: alto } : {}),
    } as Partial<Elemento>)
    setEligiendoImagen(null)
  }

  /** Cerrar la galería sin elegir retira la imagen que se acababa de insertar. */
  function cerrarGaleria() {
    const pendiente = eligiendoImagen
    setEligiendoImagen(null)
    if (!pendiente?.reciente) return

    const capa = capaDe(pendiente.id)
    if (!capa || (capa.elemento.tipo === 'imagen' && capa.elemento.url)) return
    transformar(capa.banda, (els) => els.filter((e) => e.id !== pendiente.id))
    setSeleccionados((prev) => prev.filter((x) => x !== pendiente.id))
  }

  function agregarFigura(forma: FormaFigura) {
    const trazo = FORMAS_DE_TRAZO.includes(forma)
    agregar({
      ...base(),
      // Un trazo nace bajo: darle 25 mm de alto lo dejaría en medio de una caja
      // enorme y costaría entender de dónde agarrarlo.
      altoMm: trazo ? 6 : 25,
      tipo: 'figura',
      forma,
      relleno: FORMAS_CON_RELLENO.includes(forma) ? '#e8eef1' : undefined,
      colorBorde: '#33505c',
      grosorBordeMm: trazo ? 0.4 : 0.2,
      estiloBorde: 'solid',
      ...(forma === 'flecha' ? { punta: 'fin' as const } : {}),
    })
  }

  function agregarIcono(icono: { nombre: string; codigo: string }) {
    // Cuadrado: los glifos de esta tipografía se dibujan dentro de un cuadrado, y
    // una caja alargada solo dejaría aire a los lados.
    agregar({
      ...base(), anchoMm: 12, altoMm: 12,
      tipo: 'icono', codigo: icono.codigo, nombre: icono.nombre, color: '#33505c',
    })
  }

  // ── Insertar datos ────────────────────────────────────────────────────────

  /**
   * Mete el marcador dentro del texto seleccionado. Si no hay ninguno, crea uno:
   * es lo que espera quien pulsa un dato sin haber seleccionado nada antes, y
   * mejor que no pase nada sin explicación.
   */
  function insertarEnTexto(clave: string) {
    const marcador = `{{${clave}}}`
    const capa = seleccionado ? capaDe(seleccionado.id) : null
    if (seleccionado?.tipo === 'texto' && capa) {
      const actual = seleccionado.contenido
      const separador = actual && !actual.endsWith(' ') ? ' ' : ''
      cambiarElemento(capa.banda, seleccionado.id,
                      { contenido: actual + separador + marcador } as Partial<Elemento>)
      return
    }
    agregar({
      ...base(), tipo: 'texto', contenido: marcador,
      tamanoPt: 11, color: '#111111', alineacion: 'left',
    })
  }

  function agregarBloque(campo: CampoReporte) {
    const { anchoMm } = medidasDe(diseno)
    agregar({
      ...base(),
      anchoMm: anchoMm - diseno.margenes.izquierdoMm - diseno.margenes.derechoMm,
      altoMm: 60,
      tipo: 'datos',
      clave: campo.clave,
      desbordamiento: 'crecer',
    })
  }

  /**
   * El mismo bloque, con el trato del reporte del participante.
   *
   * <p>Nace con las cinco columnas puestas —incluida la barra— porque es lo que
   * distingue a la lista de la tabla; quien no la quiera la quita, pero insertarla
   * sin barra dejaría dos cosas idénticas y ninguna razón para elegir una.</p>
   */
  function agregarLista(campo: CampoReporte) {
    const { anchoMm } = medidasDe(diseno)
    agregar({
      ...base(),
      anchoMm: anchoMm - diseno.margenes.izquierdoMm - diseno.margenes.derechoMm,
      altoMm: 60,
      tipo: 'lista',
      clave: campo.clave,
      desbordamiento: 'crecer',
      estilo: { columnas: [...COLUMNAS_LISTA] },
    })
  }

  // ── Páginas ───────────────────────────────────────────────────────────────

  function agregarPagina() {
    motivo.current = 'agregar-pagina'
    setDiseno((prev) => ({ ...prev, paginas: [...prev.paginas, { id: nuevoId(), elementos: [] }] }))
    setPaginaIndex(diseno.paginas.length)
    setSeleccionados([])
  }

  /**
   * Cambia la hoja entre lienzo y flujo.
   *
   * <p>No se toca nada de lo que ya tiene puesto. Las coordenadas se conservan
   * aunque en flujo no se usen: quien vuelva a posición fija se encuentra su hoja
   * como la dejó, y perderlas por probar sería un castigo desproporcionado para un
   * interruptor.</p>
   */
  function alternarFlujo() {
    motivo.current = 'alternar-flujo'
    setDiseno((prev) => ({
      ...prev,
      paginas: prev.paginas.map((p, i) =>
        i === paginaIndex ? { ...p, flujo: !p.flujo } : p),
    }))
  }

  /**
   * Copia la hoja entera justo detrás de ella.
   *
   * <p>Todo lo de dentro estrena identificador y los grupos se rehacen, así que la
   * copia se edita sola: compartiéndolos, mover algo en la página nueva habría
   * movido su gemelo en la original.</p>
   */
  function duplicarPagina() {
    const origen = diseno.paginas[paginaIndex]
    if (!origen) return

    motivo.current = 'duplicar-pagina'
    const copia = { id: nuevoId(), elementos: clonarElementos(origen.elementos) }
    setDiseno((prev) => ({
      ...prev,
      paginas: [
        ...prev.paginas.slice(0, paginaIndex + 1),
        copia,
        ...prev.paginas.slice(paginaIndex + 1),
      ],
    }))
    // Se va a la copia: es lo que se acaba de crear y lo que se va a retocar.
    setPaginaIndex(paginaIndex + 1)
    setSeleccionados([])
  }

  /**
   * Quita una hoja.
   *
   * <p>Se pregunta antes solo si lleva algo dentro: confirmar el borrado de una
   * página en blanco es un clic de más que no protege de nada. La última no se
   * puede quitar — un diseño sin páginas no se puede maquetar, y el servidor lo
   * rechazaría al guardar.</p>
   */
  function pedirEliminarPagina() {
    if (diseno.paginas.length <= 1) return
    if ((diseno.paginas[paginaIndex]?.elementos.length ?? 0) === 0) {
      eliminarPagina(paginaIndex)
      return
    }
    setPaginaPorEliminar(paginaIndex)
  }

  function eliminarPagina(indice: number) {
    if (diseno.paginas.length <= 1) return

    motivo.current = 'eliminar-pagina'
    setDiseno((prev) => ({ ...prev, paginas: prev.paginas.filter((_, i) => i !== indice) }))
    // Al borrar la última se retrocede una; si no, se queda en el mismo sitio, que
    // ahora ocupa la que venía detrás.
    setPaginaIndex(Math.max(0, Math.min(indice, diseno.paginas.length - 2)))
    setSeleccionados([])
    setPaginaPorEliminar(null)
  }

  function cambiarTamano(tamano: TamanoPagina) {
    setDiseno((prev) => ({ ...prev, tamano }))
  }

  function cambiarOrientacion(orientacion: 'vertical' | 'horizontal') {
    setDiseno((prev) => ({ ...prev, orientacion }))
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Barra de herramientas ── */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-[var(--muted)]/40 px-3 py-2">
        <Herramienta icono={<Type className="h-4 w-4" strokeWidth={1.75} />} rotulo="Texto" onClick={agregarTexto} />
        <Herramienta icono={<ImageIcon className="h-4 w-4" strokeWidth={1.75} />} rotulo="Imagen" onClick={agregarImagen} />
        <Herramienta icono={<Square className="h-4 w-4" strokeWidth={1.75} />} rotulo="Rectángulo" onClick={() => agregarFigura('rectangulo')} />
        <Herramienta icono={<Circle className="h-4 w-4" strokeWidth={1.75} />} rotulo="Elipse" onClick={() => agregarFigura('elipse')} />
        <Herramienta icono={<Minus className="h-4 w-4" strokeWidth={1.75} />} rotulo="Línea" onClick={() => agregarFigura('linea')} />
        <Herramienta icono={<MoveRight className="h-4 w-4" strokeWidth={1.75} />} rotulo="Flecha" onClick={() => agregarFigura('flecha')} />
        <Herramienta icono={<Triangle className="h-4 w-4" strokeWidth={1.75} />} rotulo="Triángulo" onClick={() => agregarFigura('triangulo')} />
        <Herramienta icono={<Diamond className="h-4 w-4" strokeWidth={1.75} />} rotulo="Rombo" onClick={() => agregarFigura('rombo')} />
        <Herramienta icono={<Sparkles className="h-4 w-4" strokeWidth={1.75} />} rotulo="Icono" onClick={() => setSelectorIcono(true)} />
        <Herramienta icono={<Table className="h-4 w-4" strokeWidth={1.75} />}
                     rotulo="Tabla: la escribes tú, con las filas y columnas que quieras"
                     onClick={() => setDialogoNuevaTabla(true)} />

        {(encabezadoActivo || pieActivo) && (
          <Select value={bandaDestino} onValueChange={(v) => setBandaDestino(v as Banda)}>
            <SelectTrigger className="h-8 w-36 text-[12px]" title="Dónde caen los elementos nuevos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cuerpo">Insertar en la hoja</SelectItem>
              {encabezadoActivo && <SelectItem value="encabezado">En el encabezado</SelectItem>}
              {pieActivo && <SelectItem value="pie">En el pie</SelectItem>}
            </SelectContent>
          </Select>
        )}

        <span className="mx-2 h-5 w-px bg-[var(--border)]" />

        <Select value={diseno.tamano} onValueChange={(v) => cambiarTamano(v as TamanoPagina)}>
          <SelectTrigger className="h-8 w-28 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TAMANOS_PAGINA).map(([clave, t]) => (
              <SelectItem key={clave} value={clave}>{t.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={diseno.orientacion} onValueChange={(v) => cambiarOrientacion(v as 'vertical' | 'horizontal')}>
          <SelectTrigger className="h-8 w-28 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vertical">Vertical</SelectItem>
            <SelectItem value="horizontal">Horizontal</SelectItem>
          </SelectContent>
        </Select>

        <span className="mx-2 h-5 w-px bg-[var(--border)]" />

        {/* Las dos bandas son opcionales: sin encenderlas la hoja es exactamente
            la de antes, y apagarlas no borra lo que tengan dentro. */}
        <Herramienta
          icono={<PanelTop className="h-4 w-4" strokeWidth={1.75} />}
          rotulo={encabezadoActivo ? 'Quitar el encabezado (no se borra lo que tenga)' : 'Poner un encabezado'}
          activo={encabezadoActivo}
          onClick={() => alternarBanda('encabezado')}
        />
        {encabezadoActivo && (
          <AltoBanda valor={diseno.encabezado?.altoMm ?? ALTO_ENCABEZADO_MM}
                     onCambiar={(v) => cambiarAltoBanda('encabezado', v)} />
        )}
        <Herramienta
          icono={<PanelBottom className="h-4 w-4" strokeWidth={1.75} />}
          rotulo={pieActivo ? 'Quitar el pie (no se borra lo que tenga)' : 'Poner un pie de página'}
          activo={pieActivo}
          onClick={() => alternarBanda('pie')}
        />
        {pieActivo && (
          <AltoBanda valor={diseno.pie?.altoMm ?? ALTO_PIE_MM}
                     onCambiar={(v) => cambiarAltoBanda('pie', v)} />
        )}

        <span className="mx-2 h-5 w-px bg-[var(--border)]" />

        <Herramienta
          icono={<Grid3x3 className="h-4 w-4" strokeWidth={1.75} />}
          rotulo={ajusteMm > 0 ? 'Ajuste a 1 mm activo' : 'Ajuste libre'}
          activo={ajusteMm > 0}
          onClick={() => setAjusteMm(ajusteMm > 0 ? 0 : 1)}
        />
        <Herramienta
          icono={<Ruler className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Ver márgenes y bandas"
          activo={mostrarGuias}
          onClick={() => setMostrarGuias(!mostrarGuias)}
        />

        <span className="mx-2 h-5 w-px bg-[var(--border)]" />

        <Herramienta
          icono={<Undo2 className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Deshacer (Ctrl+Z)"
          deshabilitado={!puedeDeshacer}
          onClick={deshacer}
        />
        <Herramienta
          icono={<Redo2 className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Rehacer (Ctrl+Y)"
          deshabilitado={!puedeRehacer}
          onClick={rehacer}
        />

        <Herramienta icono={<ZoomOut className="h-4 w-4" strokeWidth={1.75} />} rotulo="Alejar"
                     onClick={() => setEscalaIndex(Math.max(0, escalaIndex - 1))} />
        <Herramienta icono={<ZoomIn className="h-4 w-4" strokeWidth={1.75} />} rotulo="Acercar"
                     onClick={() => setEscalaIndex(Math.min(ESCALAS.length - 1, escalaIndex + 1))} />

        <div className="ml-auto flex items-center gap-2">
          {hayCambios && !guardando && (
            <span className="text-[11px] text-amber-600">Cambios sin guardar</span>
          )}
          <Button type="button" size="sm" className="h-8"
                  disabled={guardando || !hayCambios} onClick={guardarAhora}>
            <Save className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            {guardando ? 'Guardando…' : hayCambios ? 'Guardar diseño' : 'Guardado'}
          </Button>
        </div>
      </div>

      {/* ── Lienzo + paneles ── */}
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 overflow-auto bg-[var(--muted)]/60 p-6">
          <div className="mx-auto w-fit">
            <LienzoReporte
              diseno={diseno}
              paginaIndex={paginaIndex}
              seleccionados={seleccionados}
              escala={escala}
              ajusteMm={ajusteMm}
              mostrarGuias={mostrarGuias}
              onSeleccionar={alSeleccionar}
              onCambiarElemento={cambiarElemento}
              onMoverSeleccion={moverSeleccion}
              onAbrirContenido={setTablaEnEdicion}
            />

            {/* ── Paginación ── */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                      title="Página anterior"
                      disabled={paginaIndex === 0}
                      onClick={() => { setPaginaIndex(paginaIndex - 1); setSeleccionados([]) }}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <span className="text-[12px] text-muted-foreground">
                Página {paginaIndex + 1} de {diseno.paginas.length}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                      title="Página siguiente"
                      disabled={paginaIndex >= diseno.paginas.length - 1}
                      onClick={() => { setPaginaIndex(paginaIndex + 1); setSeleccionados([]) }}>
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>

              <span className="mx-1 h-5 w-px bg-[var(--border)]" />

              <Button type="button" variant="ghost" size="sm" className="h-7 text-[12px]"
                      onClick={agregarPagina}>
                <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                Agregar
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-[12px]"
                      title="Duplicar esta página con todo lo que tiene"
                      onClick={duplicarPagina}>
                <Copy className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                Duplicar
              </Button>

              {/* El lienzo tiene alto fijo y recorta lo que no cabe, sin avisar. En
                  flujo el contenido se reparte entre las páginas que haga falta, que
                  es lo que necesita una lista de mediciones que puede crecer. */}
              <Button
                type="button"
                variant={pagina?.flujo ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-[12px]"
                title={pagina?.flujo
                  ? 'Esta hoja reparte su contenido entre las páginas que haga falta. '
                    + 'Pulse para volverla de posición fija.'
                  : 'Hoja de posición fija: lo que no cabe se recorta. Pulse para que el '
                    + 'contenido fluya y se reparta entre páginas.'}
                onClick={alternarFlujo}
              >
                <AlignLeft className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                {pagina?.flujo ? 'En flujo' : 'Posición fija'}
              </Button>
              <Button
                type="button" variant="ghost" size="sm"
                className="h-7 text-[12px] text-destructive hover:text-destructive"
                // La última no se quita: un diseño sin páginas no se puede imprimir.
                title={diseno.paginas.length <= 1
                  ? 'Es la única página: un diseño necesita al menos una'
                  : 'Quitar esta página'}
                disabled={diseno.paginas.length <= 1}
                onClick={pedirEliminarPagina}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                Quitar
              </Button>
            </div>
          </div>
        </div>

        {/* El panel crece con la pantalla. A 288 px fijos, las propiedades de una tabla
            o la lista de campos salían con una palabra por renglón; en un monitor ancho
            hay sitio de sobra y no hay razón para desperdiciarlo. */}
        <aside className="flex w-72 shrink-0 flex-col border-l bg-background xl:w-80 2xl:w-96">
          <Tabs defaultValue="propiedades" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid w-full shrink-0 grid-cols-3 rounded-none border-b bg-transparent">
              <TabsTrigger value="propiedades">Propiedades</TabsTrigger>
              <TabsTrigger value="capas">Capas</TabsTrigger>
              <TabsTrigger value="datos">Datos</TabsTrigger>
            </TabsList>

            <TabsContent value="propiedades" className="min-h-0 flex-1 overflow-auto">
              <PanelPropiedades
                elemento={seleccionado}
                cuantosSeleccionados={elegidos.length}
                banda={seleccionado ? capaDe(seleccionado.id)?.banda ?? 'cuerpo' : 'cuerpo'}
                bandasDisponibles={{ encabezado: encabezadoActivo, pie: pieActivo }}
                onCambiar={(cambios) => {
                  const capa = seleccionado ? capaDe(seleccionado.id) : null
                  if (capa) cambiarElemento(capa.banda, capa.elemento.id, cambios)
                }}
                onCambiarBanda={(destino) => seleccionado && cambiarDeBanda(seleccionado.id, destino)}
                onEditarTabla={() => seleccionado && setTablaEnEdicion(seleccionado.id)}
                onEliminar={eliminarSeleccion}
                onSubirCapa={() => {
                  const capa = seleccionado ? capaDe(seleccionado.id) : null
                  if (capa) moverCapa(capa.banda, capa.elemento.id, 1)
                }}
                onBajarCapa={() => {
                  const capa = seleccionado ? capaDe(seleccionado.id) : null
                  if (capa) moverCapa(capa.banda, capa.elemento.id, -1)
                }}
              />
            </TabsContent>

            <TabsContent value="capas" className="min-h-0 flex-1 overflow-hidden">
              <PanelCapas
                capas={capas}
                seleccionados={seleccionados}
                onSeleccionar={alSeleccionar}
                onCambiar={cambiarElemento}
                onMoverCapa={moverCapa}
                onAgrupar={agrupar}
                onDesagrupar={desagrupar}
              />
            </TabsContent>

            <TabsContent value="datos" className="min-h-0 flex-1 overflow-hidden">
              <PanelDatos
                onInsertarEnTexto={insertarEnTexto}
                onAgregarBloque={agregarBloque}
              onAgregarLista={agregarLista}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <SelectorIcono
        abierto={selectorIcono}
        onCerrar={() => setSelectorIcono(false)}
        onElegir={agregarIcono}
      />

      <DialogoNuevaTabla
        abierto={dialogoNuevaTabla}
        onCerrar={() => setDialogoNuevaTabla(false)}
        onCrear={agregarTabla}
      />

      <EditorTabla
        abierto={tablaDeEdicion != null}
        tabla={tablaDeEdicion}
        onCerrar={() => setTablaEnEdicion(null)}
        onCambiar={(cambios) => {
          const capa = tablaEnEdicion ? capaDe(tablaEnEdicion) : null
          if (capa) cambiarElemento(capa.banda, capa.elemento.id, cambios as Partial<Elemento>)
        }}
      />

      <GaleriaImagenes
        abierto={eligiendoImagen != null}
        claveActual={imagenEnEspera?.url || undefined}
        onCerrar={cerrarGaleria}
        onElegir={ponerImagenElegida}
      />

      <Dialog open={paginaPorEliminar != null} onOpenChange={(a) => !a && setPaginaPorEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quitar la página {(paginaPorEliminar ?? 0) + 1}</DialogTitle>
            <DialogDescription>
              Tiene {diseno.paginas[paginaPorEliminar ?? 0]?.elementos.length}{' '}
              {diseno.paginas[paginaPorEliminar ?? 0]?.elementos.length === 1
                ? 'elemento' : 'elementos'}, y se van con ella. Se puede recuperar con
              deshacer, pero solo mientras no se cierre el editor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPaginaPorEliminar(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive"
                    onClick={() => eliminarPagina(paginaPorEliminar!)}>
              Quitar la página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** El alto de una banda, en milímetros, junto a su interruptor. */
function AltoBanda({ valor, onCambiar }: { valor: number; onCambiar: (v: number) => void }) {
  return (
    <Input
      type="number" min={5} max={120} step={1}
      className="h-8 w-16 text-[12px]"
      title="Alto de la banda en milímetros"
      value={valor}
      onChange={(e) => onCambiar(Number(e.target.value))}
    />
  )
}

function Herramienta({ icono, rotulo, onClick, activo, deshabilitado }: {
  icono: React.ReactNode
  rotulo: string
  onClick: () => void
  activo?: boolean
  deshabilitado?: boolean
}) {
  return (
    <Button
      type="button" variant="ghost" size="sm" title={rotulo} onClick={onClick}
      disabled={deshabilitado}
      className={cn('h-8 px-2', activo && 'bg-[var(--accent)] text-[var(--accent-foreground)]')}
    >
      {icono}
    </Button>
  )
}
