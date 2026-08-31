import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Type, Image as ImageIcon, Square, Circle, Minus, Grid3x3, Ruler,
  Plus, ChevronLeft, ChevronRight, Save, ZoomIn, ZoomOut,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { LienzoReporte } from './LienzoReporte'
import { PanelPropiedades } from './PanelPropiedades'
import type {
  DisenoReporte, Elemento, FormaFigura, TamanoPagina,
} from '../types'
import { TAMANOS_PAGINA, medidasDe, nuevoId, zSuperior } from '../types'

/** Zoom disponible, en píxeles por milímetro. 3.78 ≈ tamaño real en pantalla. */
const ESCALAS = [1.6, 2.2, 2.8, 3.4, 3.78, 4.6]

interface Props {
  disenoInicial: DisenoReporte
  guardando: boolean
  onGuardar: (diseno: DisenoReporte) => void
}

export function EditorPlantilla({ disenoInicial, guardando, onGuardar }: Props) {
  const [diseno, setDiseno] = useState<DisenoReporte>(disenoInicial)
  const [paginaIndex, setPaginaIndex] = useState(0)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [escalaIndex, setEscalaIndex] = useState(3)
  const [ajusteMm, setAjusteMm] = useState(1)
  const [mostrarGuias, setMostrarGuias] = useState(true)

  // Si el editor se reutiliza para otra plantilla, hay que volver a empezar: sin
  // esto se quedaría mostrando el diseño anterior sobre la plantilla nueva.
  useEffect(() => {
    setDiseno(disenoInicial)
    setPaginaIndex(0)
    setSeleccionadoId(null)
  }, [disenoInicial])

  const escala = ESCALAS[escalaIndex]
  const pagina = diseno.paginas[paginaIndex]

  const seleccionado = useMemo(
    () => pagina?.elementos.find((e) => e.id === seleccionadoId) ?? null,
    [pagina, seleccionadoId],
  )

  // ── Operaciones sobre el diseño ───────────────────────────────────────────

  const cambiarElemento = useCallback((id: string, cambios: Partial<Elemento>) => {
    setDiseno((prev) => ({
      ...prev,
      paginas: prev.paginas.map((p, i) =>
        i !== paginaIndex ? p : {
          ...p,
          elementos: p.elementos.map((e) => (e.id === id ? { ...e, ...cambios } as Elemento : e)),
        }),
    }))
  }, [paginaIndex])

  const agregar = useCallback((elemento: Elemento) => {
    setDiseno((prev) => ({
      ...prev,
      paginas: prev.paginas.map((p, i) =>
        i !== paginaIndex ? p : { ...p, elementos: [...p.elementos, elemento] }),
    }))
    setSeleccionadoId(elemento.id)
  }, [paginaIndex])

  const eliminarSeleccionado = useCallback(() => {
    if (!seleccionadoId) return
    setDiseno((prev) => ({
      ...prev,
      paginas: prev.paginas.map((p, i) =>
        i !== paginaIndex ? p : { ...p, elementos: p.elementos.filter((e) => e.id !== seleccionadoId) }),
    }))
    setSeleccionadoId(null)
  }, [paginaIndex, seleccionadoId])

  const moverCapa = useCallback((direccion: 1 | -1) => {
    if (!seleccionado) return
    const z = Math.max(0, seleccionado.z + direccion)
    cambiarElemento(seleccionado.id, { z } as Partial<Elemento>)
  }, [seleccionado, cambiarElemento])

  // Suprimir borra el elemento seleccionado, salvo mientras se escribe en un
  // campo: ahí la tecla es para el texto, no para la hoja.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const activo = document.activeElement
      const escribiendo = activo instanceof HTMLInputElement
        || activo instanceof HTMLTextAreaElement
        || (activo as HTMLElement | null)?.isContentEditable
      if (escribiendo) return
      if (!seleccionadoId) return
      e.preventDefault()
      eliminarSeleccionado()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [seleccionadoId, eliminarSeleccionado])

  // ── Elementos nuevos ──────────────────────────────────────────────────────

  function base() {
    const { anchoMm } = medidasDe(diseno)
    return {
      id: nuevoId(),
      xMm: diseno.margenes.izquierdoMm,
      yMm: diseno.margenes.superiorMm,
      anchoMm: Math.min(70, anchoMm - diseno.margenes.izquierdoMm - diseno.margenes.derechoMm),
      altoMm: 12,
      z: zSuperior(pagina?.elementos ?? []) + 1,
    }
  }

  function agregarTexto() {
    agregar({
      ...base(), tipo: 'texto', contenido: 'Escribe aquí',
      tamanoPt: 11, color: '#111111', alineacion: 'left',
    })
  }

  function agregarImagen() {
    agregar({ ...base(), altoMm: 25, anchoMm: 40, tipo: 'imagen', url: '', ajuste: 'contener' })
  }

  function agregarFigura(forma: FormaFigura) {
    agregar({
      ...base(),
      altoMm: forma === 'linea' ? 2 : 25,
      tipo: 'figura',
      forma,
      relleno: forma === 'linea' ? undefined : '#e8eef1',
      colorBorde: '#33505c',
      grosorBordeMm: forma === 'linea' ? 0.4 : 0.2,
    })
  }

  // ── Páginas ───────────────────────────────────────────────────────────────

  function agregarPagina() {
    setDiseno((prev) => ({ ...prev, paginas: [...prev.paginas, { id: nuevoId(), elementos: [] }] }))
    setPaginaIndex(diseno.paginas.length)
    setSeleccionadoId(null)
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

        <Herramienta
          icono={<Grid3x3 className="h-4 w-4" strokeWidth={1.75} />}
          rotulo={ajusteMm > 0 ? 'Ajuste a 1 mm activo' : 'Ajuste libre'}
          activo={ajusteMm > 0}
          onClick={() => setAjusteMm(ajusteMm > 0 ? 0 : 1)}
        />
        <Herramienta
          icono={<Ruler className="h-4 w-4" strokeWidth={1.75} />}
          rotulo="Ver márgenes"
          activo={mostrarGuias}
          onClick={() => setMostrarGuias(!mostrarGuias)}
        />

        <span className="mx-2 h-5 w-px bg-[var(--border)]" />

        <Herramienta icono={<ZoomOut className="h-4 w-4" strokeWidth={1.75} />} rotulo="Alejar"
                     onClick={() => setEscalaIndex(Math.max(0, escalaIndex - 1))} />
        <Herramienta icono={<ZoomIn className="h-4 w-4" strokeWidth={1.75} />} rotulo="Acercar"
                     onClick={() => setEscalaIndex(Math.min(ESCALAS.length - 1, escalaIndex + 1))} />

        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" className="h-8"
                  disabled={guardando} onClick={() => onGuardar(diseno)}>
            <Save className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            {guardando ? 'Guardando…' : 'Guardar diseño'}
          </Button>
        </div>
      </div>

      {/* ── Lienzo + propiedades ── */}
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 overflow-auto bg-[var(--muted)]/60 p-6">
          <div className="mx-auto w-fit">
            <LienzoReporte
              diseno={diseno}
              paginaIndex={paginaIndex}
              seleccionadoId={seleccionadoId}
              escala={escala}
              ajusteMm={ajusteMm}
              mostrarGuias={mostrarGuias}
              onSeleccionar={setSeleccionadoId}
              onCambiarElemento={cambiarElemento}
            />

            {/* ── Paginación ── */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                      disabled={paginaIndex === 0}
                      onClick={() => { setPaginaIndex(paginaIndex - 1); setSeleccionadoId(null) }}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <span className="text-[12px] text-muted-foreground">
                Página {paginaIndex + 1} de {diseno.paginas.length}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                      disabled={paginaIndex >= diseno.paginas.length - 1}
                      onClick={() => { setPaginaIndex(paginaIndex + 1); setSeleccionadoId(null) }}>
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-[12px]"
                      onClick={agregarPagina}>
                <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                Agregar página
              </Button>
            </div>
          </div>
        </div>

        <aside className="w-72 shrink-0 overflow-auto border-l bg-background">
          <PanelPropiedades
            elemento={seleccionado}
            onCambiar={(cambios) => seleccionado && cambiarElemento(seleccionado.id, cambios)}
            onEliminar={eliminarSeleccionado}
            onSubirCapa={() => moverCapa(1)}
            onBajarCapa={() => moverCapa(-1)}
          />
        </aside>
      </div>
    </div>
  )
}

function Herramienta({ icono, rotulo, onClick, activo }: {
  icono: React.ReactNode; rotulo: string; onClick: () => void; activo?: boolean
}) {
  return (
    <Button
      type="button" variant="ghost" size="sm" title={rotulo} onClick={onClick}
      className={cn('h-8 px-2', activo && 'bg-[var(--accent)] text-[var(--accent-foreground)]')}
    >
      {icono}
    </Button>
  )
}
