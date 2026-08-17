import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Eraser, FilePlus2, Printer, SquareDashed, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BarcodeRenderer } from './BarcodeRenderer'
import { crearMedidor } from './codigoSimbolo'
import { ESTILOS_HOJA, imprimirHoja, resolverGeometria } from './hojaImpresion'
import { layoutEtiqueta } from './layoutEtiqueta'
import type { ConfiguracionEtiquetaResponse, LabelDataDTO } from '@/types/api'

interface PrintableLabelsViewProps {
  etiquetas: LabelDataDTO[]
  configuracion: ConfiguracionEtiquetaResponse
  open: boolean
  onClose: () => void
}

/** Índice de la etiqueta que ocupa la casilla, o `null` si está libre. */
type Casilla = number | null

/**
 * Contenido de una etiqueta, ya resuelto por el maquetado.
 *
 * Cada elemento sale con posición y tamaño absolutos dentro del recuadro. El
 * recuadro recorta, así que aunque el maquetado marque desborde, lo que se
 * imprime nunca invade la etiqueta de al lado.
 */
function LabelCell({
  label,
  config,
}: {
  label: LabelDataDTO
  config: ConfiguracionEtiquetaResponse
}) {
  const maquetado = useMemo(() => {
    const medir = crearMedidor(label.codigoDatos, config.tipoCodigo, config.moduloCodigo, config.dpi)
    return layoutEtiqueta(config, medir)
  }, [label.codigoDatos, config])

  return (
    <>
      {maquetado.elementos.map((elem) => {
        const base: React.CSSProperties = {
          left: `${elem.leftMm}mm`,
          top: `${elem.topMm}mm`,
          width: `${elem.anchoMm}mm`,
          height: `${elem.altoMm}mm`,
        }

        if (elem.tipo === 'CODIGO') {
          return (
            <div key="codigo" className="elemento" style={base}>
              <BarcodeRenderer
                data={label.codigoDatos}
                tipo={config.tipoCodigo}
                modulo={config.moduloCodigo}
                escalaDots={elem.escalaDots ?? 1}
                dpi={config.dpi}
              />
            </div>
          )
        }

        const esEtiqueta = elem.tipo === 'ETIQUETA'
        return (
          <div
            key={elem.tipo}
            className={`elemento elemento-texto${esEtiqueta ? ' elemento-mono' : ''}`}
            style={{
              ...base,
              fontSize: `${elem.fontPt}pt`,
              lineHeight: `${elem.altoMm}mm`,
            }}
          >
            {esEtiqueta ? label.etiqueta : label.nombre}
          </div>
        )
      })}

      {maquetado.desbordado && (
        <span
          className="solo-pantalla"
          style={{
            position: 'absolute',
            right: '1px',
            bottom: '1px',
            fontSize: '8px',
            color: '#dc2626',
            fontWeight: 600,
          }}
          title="El contenido no cabe en la etiqueta ni en su tamaño mínimo; se recorta al imprimir"
        >
          !
        </span>
      )}
    </>
  )
}

export function PrintableLabelsView({
  etiquetas,
  configuracion: config,
  open,
  onClose,
}: PrintableLabelsViewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const geo = useMemo(() => resolverGeometria(config), [config])
  const { cols, rows } = geo
  const porPagina = Math.max(1, cols * rows)

  // Distribución sobre la hoja. `casillas` cubre todas las páginas seguidas;
  // `bloqueadas` son las posiciones que el usuario marcó como ya despegadas.
  const [casillas, setCasillas] = useState<Casilla[]>([])
  const [bloqueadas, setBloqueadas] = useState<Set<number>>(new Set())
  const [escala, setEscala] = useState(0.7)
  // Dibuja el contorno de cada recuadro también en el papel. Sirve para ver,
  // sobre la hoja de etiquetas, cuánto se separa cada recuadro de su troquel:
  // sin él solo se ve el contenido y hay que adivinar dónde cree el sistema que
  // está la etiqueta.
  const [marcoCalibracion, setMarcoCalibracion] = useState(false)
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
    imprimirHoja(content, geo.hojaAnchoMm, geo.hojaAltoMm, 'Etiquetas')
  }, [geo.hojaAnchoMm, geo.hojaAltoMm])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
        <style>{ESTILOS_HOJA}</style>

        <DialogHeader>
          <DialogTitle>Vista previa de impresión</DialogTitle>
          <DialogDescription>
            {etiquetas.length} etiqueta(s) · {cols} por fila · {rows} filas por página ·{' '}
            {paginas} hoja(s) · paso {geo.pasoHorizontalMm.toFixed(1)} ×{' '}
            {geo.pasoVerticalMm.toFixed(1)} mm
          </DialogDescription>
        </DialogHeader>

        {(geo.desbordaAncho || geo.desbordaAlto) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La cuadrícula no cabe en la hoja: ocupa {geo.anchoOcupadoMm.toFixed(1)} ×{' '}
              {geo.altoOcupadoMm.toFixed(1)} mm sobre una hoja de {geo.hojaAnchoMm} ×{' '}
              {geo.hojaAltoMm} mm. Revisa el paso, los márgenes de página y las etiquetas por
              fila en <strong>Configuración &gt; Etiquetas</strong>.
            </AlertDescription>
          </Alert>
        )}

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

          <Button
            variant={marcoCalibracion ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setMarcoCalibracion((v) => !v)}
            title="Imprime el contorno de cada recuadro para compararlo contra el troquel de la hoja"
          >
            <SquareDashed className="h-3.5 w-3.5" />
            Marco de calibración
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

        <p className="text-[12px] text-muted-foreground">
          Al imprimir, elige <strong>Márgenes: Ninguno</strong> y <strong>Escala: 100 %</strong>.
          Cualquier ajuste automático del navegador encoge la hoja y desplaza las etiquetas.
        </p>

        {marcoCalibracion && (
          <Alert>
            <SquareDashed className="h-4 w-4" />
            <AlertDescription className="text-[12px]">
              El contorno de cada recuadro saldrá impreso. Imprime sobre una hoja de etiquetas y
              mira, columna por columna, hacia qué lado se separa el marco del troquel:
              <br />• Si <strong>todas</strong> se separan lo mismo, sobra corregir el corrimiento
              (ajuste X).
              <br />• Si la separación <strong>crece</strong> de la primera a la cuarta, lo que
              falla es el paso.
              <br />
              Acuérdate de apagarlo antes de imprimir etiquetas de verdad.
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-auto" ref={printRef}>
          {Array.from({ length: paginas }).map((_, pageIdx) => (
            <div
              key={pageIdx}
              className="hoja-zoom mx-auto mb-4"
              style={
                {
                  '--hoja-ancho': `${geo.hojaAnchoMm}mm`,
                  '--hoja-alto': `${geo.hojaAltoMm}mm`,
                  '--escala': escala,
                } as React.CSSProperties
              }
            >
              <div className="hoja">
                {casillas
                  .slice(pageIdx * porPagina, (pageIdx + 1) * porPagina)
                  .map((valor, k) => {
                    const i = pageIdx * porPagina + k
                    const label = valor !== null ? etiquetas[valor] : null
                    const bloqueada = bloqueadas.has(i)

                    // Posición desde el origen de la hoja: el desfase de una fila
                    // no se hereda a la siguiente.
                    const col = k % cols
                    const fila = Math.floor(k / cols)
                    const leftMm = geo.origenXMm + col * geo.pasoHorizontalMm
                    const topMm = geo.origenYMm + fila * geo.pasoVerticalMm

                    return (
                      <div
                        key={i}
                        className={`casilla${marcoCalibracion ? ' con-marco' : ''}`}
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
                          left: `${leftMm}mm`,
                          top: `${topMm}mm`,
                          width: `${config.anchoMm}mm`,
                          height: `${config.altoMm}mm`,
                          border: destino === i ? '2px solid #16a34a' : '1px dashed #d1d5db',
                          // Igual que en la impresión: outline, para que activar
                          // el marco no mueva ni un poco el contenido.
                          outline: marcoCalibracion ? '0.25mm solid #000' : undefined,
                          outlineOffset: marcoCalibracion ? '-0.25mm' : undefined,
                          borderRadius: '2px',
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
