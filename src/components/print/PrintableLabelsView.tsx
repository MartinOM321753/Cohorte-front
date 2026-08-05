import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eraser, FilePlus2, Printer, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BarcodeRenderer } from './BarcodeRenderer'
import type {
  ConfiguracionEtiquetaResponse,
  DisposicionEtiqueta,
  LabelDataDTO,
} from '@/types/api'

interface PrintableLabelsViewProps {
  etiquetas: LabelDataDTO[]
  configuracion: ConfiguracionEtiquetaResponse
  open: boolean
  onClose: () => void
}

type ElementoEtiqueta = 'NOMBRE' | 'CODIGO' | 'ETIQUETA'

/** Carta, en milímetros. Coincide con `@page { size: letter }`. */
const ANCHO_HOJA_MM = 215.9
const ALTO_HOJA_MM = 279.4

/** Índice de la etiqueta que ocupa la casilla, o `null` si está libre. */
type Casilla = number | null

function getOrdenElementos(disposicion: DisposicionEtiqueta): ElementoEtiqueta[] {
  switch (disposicion) {
    case 'NOMBRE_CODIGO_ETIQUETA': return ['NOMBRE', 'CODIGO', 'ETIQUETA']
    case 'CODIGO_NOMBRE_ETIQUETA': return ['CODIGO', 'NOMBRE', 'ETIQUETA']
    case 'CODIGO_ETIQUETA': return ['CODIGO', 'ETIQUETA']
    case 'NOMBRE_ETIQUETA_CODIGO': return ['NOMBRE', 'ETIQUETA', 'CODIGO']
    default: return ['NOMBRE', 'CODIGO', 'ETIQUETA']
  }
}

function dotsToMm(dots: number, dpi: number): number {
  return dots / dpi * 25.4
}

function dotsToPt(dots: number, dpi: number): number {
  return dots / dpi * 72
}

function LabelCell({
  label,
  config,
}: {
  label: LabelDataDTO
  config: ConfiguracionEtiquetaResponse
}) {
  const orden = getOrdenElementos(config.disposicion)
  const fontNombrePt = dotsToPt(config.tamanoFuenteNombre, config.dpi)
  const fontEtiquetaPt = dotsToPt(config.tamanoFuenteEtiqueta, config.dpi)
  const gapNombreMm = dotsToMm(config.espaciadoNombre, config.dpi)
  const gapCodigoMm = dotsToMm(config.espaciadoCodigo, config.dpi)
  const gapEtiquetaMm = dotsToMm(config.espaciadoEtiqueta, config.dpi)
  const marginLeftMm = config.margenIzquierdoMm
  const marginTopMm = config.margenSuperiorMm

  // La impresora reserva para cada texto exactamente el alto de su fuente en dots
  // y después aplica el espaciado. Si aquí se dejara el interlineado por omisión,
  // cada renglón ocuparía de más y ese sobrante se sumaría al espacio configurado.
  const altoNombreMm = dotsToMm(config.tamanoFuenteNombre, config.dpi)
  const altoEtiquetaMm = dotsToMm(config.tamanoFuenteEtiqueta, config.dpi)

  return (
    <div
      style={{
        width: `${config.anchoMm}mm`,
        height: `${config.altoMm}mm`,
        padding: `${marginTopMm}mm ${marginLeftMm}mm 0 ${marginLeftMm}mm`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {orden.map((elem) => {
        switch (elem) {
          case 'NOMBRE':
            if (!config.mostrarNombre) return null
            return (
              <div
                key="nombre"
                style={{
                  fontSize: `${fontNombrePt}pt`,
                  height: `${altoNombreMm}mm`,
                  lineHeight: `${altoNombreMm}mm`,
                  marginBottom: `${gapNombreMm}mm`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                }}
              >
                {label.nombre}
              </div>
            )
          case 'CODIGO':
            if (!config.mostrarCodigo) return null
            return (
              <div
                key="codigo"
                style={{
                  marginBottom: `${gapCodigoMm}mm`,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <BarcodeRenderer
                  data={label.codigoDatos}
                  tipo={config.tipoCodigo}
                  modulo={config.moduloCodigo}
                  anchoBarra={config.anchoBarraCodigo ?? 2}
                  dpi={config.dpi}
                />
              </div>
            )
          case 'ETIQUETA':
            if (!config.mostrarEtiqueta) return null
            return (
              <div
                key="etiqueta"
                style={{
                  fontSize: `${fontEtiquetaPt}pt`,
                  height: `${altoEtiquetaMm}mm`,
                  lineHeight: `${altoEtiquetaMm}mm`,
                  marginBottom: `${gapEtiquetaMm}mm`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                }}
              >
                {label.etiqueta}
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

/**
 * El HTML que se imprime es el mismo que se ve en pantalla, así que las ayudas
 * visuales de la cuadrícula (bordes de guía, rayado de las casillas ya usadas,
 * numeración, reducción de la vista) se anulan aquí. Lo que sale en el papel es
 * únicamente el contenido de las etiquetas, en la posición elegida.
 */
function buildPrintHtml(printAreaHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Etiquetas</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; }
  svg { display: block; width: 100%; height: 100%; }
  .zoom-hoja { width: auto !important; height: auto !important; overflow: visible !important; margin: 0 !important; }
  .hoja { transform: none !important; box-shadow: none !important; }
  .casilla { border: none !important; outline: none !important; opacity: 1 !important; background: transparent !important; }
  .solo-pantalla { display: none !important; }
</style>
</head><body>${printAreaHtml}</body></html>`
}

export function PrintableLabelsView({
  etiquetas,
  configuracion: config,
  open,
  onClose,
}: PrintableLabelsViewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const cols = config.etiquetasPorFila
  const rows = config.filasPorPagina
  const porPagina = Math.max(1, cols * rows)

  // Distribución sobre la hoja. `casillas` cubre todas las páginas seguidas;
  // `bloqueadas` son las posiciones que el usuario marcó como ya despegadas.
  const [casillas, setCasillas] = useState<Casilla[]>([])
  const [bloqueadas, setBloqueadas] = useState<Set<number>>(new Set())
  const [escala, setEscala] = useState(0.7)
  const [origen, setOrigen] = useState<number | null>(null)
  const [destino, setDestino] = useState<number | null>(null)
  const puntoPresionado = useRef<{ x: number; y: number } | null>(null)

  // Reiniciar solo cuando cambia el lote de etiquetas, no en cada renderizado
  // del padre: de lo contrario se perdería el acomodo hecho a mano.
  const firma = useMemo(() => etiquetas.map((e) => e.etiqueta).join('|'), [etiquetas])

  useEffect(() => {
    const paginasNecesarias = Math.max(1, Math.ceil(etiquetas.length / porPagina))
    const total = paginasNecesarias * porPagina
    setCasillas(Array.from({ length: total }, (_, i) => (i < etiquetas.length ? i : null)))
    setBloqueadas(new Set())
    setOrigen(null)
    setDestino(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, porPagina])

  const paginas = Math.max(1, Math.ceil(casillas.length / porPagina))
  const libres = casillas.length - etiquetas.length - bloqueadas.size

  // ── Acciones sobre la cuadrícula ──────────────────────────────────────────

  /**
   * Reparte las etiquetas, en el orden en que están ahora, sobre las casillas
   * libres. Si no alcanzan, agrega hojas hasta que quepan: así marcar posiciones
   * nunca hace desaparecer una etiqueta.
   */
  function repartir(marcas: Set<number>) {
    const pendientes = casillas.filter((c): c is number => c !== null)
    let total = casillas.length
    while (total - marcas.size < pendientes.length) total += porPagina

    const siguientes: Casilla[] = Array.from({ length: total }, () => null)
    let k = 0
    for (let i = 0; i < total && k < pendientes.length; i++) {
      if (marcas.has(i)) continue
      siguientes[i] = pendientes[k++]
    }
    setCasillas(siguientes)
  }

  /**
   * Marca o libera una posición de la hoja. Marcar una casilla que ya tiene
   * etiqueta corre las etiquetas hacia adelante: es el caso habitual, porque la
   * hoja reutilizada viene despegada desde arriba. Con Shift se marca de golpe
   * todo lo que hay desde el inicio hasta esa casilla.
   */
  function alternarBloqueo(i: number, hastaAqui = false) {
    const marcas = new Set(bloqueadas)

    if (hastaAqui) {
      for (let k = 0; k <= i; k++) marcas.add(k)
    } else if (marcas.has(i)) {
      // Al liberar no se reacomoda nada: el hueco queda a disposición del usuario.
      marcas.delete(i)
      setBloqueadas(marcas)
      return
    } else {
      marcas.add(i)
    }

    setBloqueadas(marcas)
    repartir(marcas)
  }

  function acomodar() {
    repartir(bloqueadas)
  }

  function limpiarMarcas() {
    setBloqueadas(new Set())
  }

  function agregarHoja() {
    setCasillas((prev) => [...prev, ...Array.from({ length: porPagina }, () => null)])
  }

  /** Intercambia dos casillas. Nunca se pierde una etiqueta: siempre es un canje. */
  function soltar(j: number) {
    const i = origen
    setOrigen(null)
    setDestino(null)
    if (i === null || i === j || bloqueadas.has(j)) return
    setCasillas((prev) => {
      const s = [...prev]
      const t = s[j]
      s[j] = s[i]
      s[i] = t
      return s
    })
  }

  const handlePrint = useCallback(() => {
    const content = printRef.current?.innerHTML
    if (!content) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(buildPrintHtml(content))
    printWindow.document.close()

    printWindow.addEventListener('afterprint', () => printWindow.close())
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 250)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Vista previa de impresión</DialogTitle>
          <DialogDescription>
            {etiquetas.length} etiqueta(s) · {cols} por fila · {rows} filas por página ·{' '}
            {paginas} hoja(s)
          </DialogDescription>
        </DialogHeader>

        {/* Barra de herramientas de la cuadrícula */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <p className="mr-auto text-[12px] leading-snug text-muted-foreground">
            Haz clic en una posición para marcarla como <strong>ya usada</strong>; las etiquetas se
            recorren solas. Con <kbd className="rounded border px-1">Shift</kbd> + clic se marca
            todo desde el inicio de la hoja hasta ahí. Arrastra una etiqueta para moverla o
            intercambiarla.
            <br />
            {bloqueadas.size} posición(es) marcadas · {Math.max(0, libres)} libre(s)
          </p>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={acomodar}>
            <Wand2 className="h-3.5 w-3.5" />
            Reacomodar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={limpiarMarcas}
            disabled={bloqueadas.size === 0}
          >
            <Eraser className="h-3.5 w-3.5" />
            Limpiar marcas
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={agregarHoja}>
            <FilePlus2 className="h-3.5 w-3.5" />
            Agregar hoja
          </Button>

          <div className="flex items-center gap-1 border-l pl-2">
            {[0.5, 0.7, 1].map((v) => (
              <Button
                key={v}
                variant={escala === v ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2 text-[12px]"
                onClick={() => setEscala(v)}
              >
                {Math.round(v * 100)}%
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-auto" ref={printRef}>
          {Array.from({ length: paginas }).map((_, pageIdx) => (
            <div
              key={pageIdx}
              className="zoom-hoja mx-auto mb-4"
              style={{
                width: `${ANCHO_HOJA_MM * escala}mm`,
                height: `${ALTO_HOJA_MM * escala}mm`,
                overflow: 'hidden',
              }}
            >
              <div
                className="hoja"
                style={{
                  width: `${ANCHO_HOJA_MM}mm`,
                  height: `${ALTO_HOJA_MM}mm`,
                  transform: `scale(${escala})`,
                  transformOrigin: 'top left',
                  paddingTop: `${config.margenPaginaSuperiorMm}mm`,
                  paddingLeft: `${config.margenPaginaIzquierdoMm}mm`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, ${config.anchoMm}mm)`,
                  gridAutoRows: `${config.altoMm}mm`,
                  columnGap: `${config.espacioHorizontalMm}mm`,
                  rowGap: `${config.espacioVerticalMm}mm`,
                  alignContent: 'start',
                  justifyContent: 'start',
                  pageBreakAfter: pageIdx < paginas - 1 ? 'always' : undefined,
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  color: '#000',
                }}
              >
                {casillas
                  .slice(pageIdx * porPagina, (pageIdx + 1) * porPagina)
                  .map((valor, k) => {
                    const i = pageIdx * porPagina + k
                    const label = valor !== null ? etiquetas[valor] : null
                    const bloqueada = bloqueadas.has(i)

                    return (
                      <div
                        key={i}
                        className="casilla"
                        draggable={!!label}
                        onDragStart={(e) => {
                          if (!label) return
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(i))
                          setOrigen(i)
                        }}
                        onDragEnd={() => {
                          setOrigen(null)
                          setDestino(null)
                        }}
                        onDragOver={(e) => {
                          if (bloqueada || origen === null) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          if (destino !== i) setDestino(i)
                        }}
                        onDragLeave={() => setDestino((d) => (d === i ? null : d))}
                        onDrop={(e) => {
                          e.preventDefault()
                          soltar(i)
                        }}
                        onMouseDown={(e) => {
                          puntoPresionado.current = { x: e.clientX, y: e.clientY }
                        }}
                        onClick={(e) => {
                          // Un arrastre que no llegó a soltarse termina en clic:
                          // marcar la posición ahí sería lo contrario de lo pedido.
                          const p = puntoPresionado.current
                          puntoPresionado.current = null
                          if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) return
                          alternarBloqueo(i, e.shiftKey)
                        }}
                        title={
                          bloqueada
                            ? 'Posición marcada como ya usada — clic para liberarla'
                            : label
                              ? `${label.etiqueta} — arrastra para moverla, o clic para marcar esta posición como ya usada`
                              : 'Posición libre — clic para marcarla como ya usada'
                        }
                        style={{
                          position: 'relative',
                          height: `${config.altoMm}mm`,
                          border: destino === i ? '2px solid #16a34a' : '1px dashed #d1d5db',
                          borderRadius: '2px',
                          backgroundColor: '#fff',
                          opacity: origen === i ? 0.35 : 1,
                          cursor: label ? 'grab' : 'pointer',
                        }}
                      >
                        {label && <LabelCell label={label} config={config} />}

                        {bloqueada && (
                          <div
                            className="solo-pantalla"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background:
                                'repeating-linear-gradient(45deg, #e5e7eb 0 4px, #f9fafb 4px 8px)',
                              color: '#6b7280',
                              fontSize: '9px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            usada
                          </div>
                        )}

                        {label && (
                          <span
                            className="solo-pantalla"
                            style={{
                              position: 'absolute',
                              top: '1px',
                              left: '3px',
                              fontSize: '8px',
                              color: '#9ca3af',
                            }}
                          >
                            {valor! + 1}
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
