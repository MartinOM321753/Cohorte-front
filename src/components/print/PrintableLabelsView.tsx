import { useRef, useCallback } from 'react'
import { Printer, X } from 'lucide-react'
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

  const barcodeModuleMm = config.moduloCodigo * 25.4 / config.dpi
  const barcodeSizeMm = barcodeModuleMm * 20

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
                  lineHeight: 1.1,
                  marginBottom: `${gapNombreMm}mm`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
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
                  sizeMm={barcodeSizeMm}
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
                  lineHeight: 1.1,
                  marginBottom: `${gapEtiquetaMm}mm`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
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

function buildPrintHtml(printAreaHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Etiquetas</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; }
  svg { display: block; width: 100%; height: 100%; }
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
  const labelsPerPage = cols * rows

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
            {etiquetas.length} etiqueta(s) · {cols} por fila · {rows} filas por página
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto" ref={printRef}>
          {Array.from({ length: Math.ceil(etiquetas.length / labelsPerPage) }).map((_, pageIdx) => {
            const pageLabels = etiquetas.slice(
              pageIdx * labelsPerPage,
              (pageIdx + 1) * labelsPerPage,
            )
            return (
              <div
                key={pageIdx}
                style={{
                  width: '215.9mm',
                  minHeight: '279.4mm',
                  paddingTop: `${config.margenPaginaSuperiorMm}mm`,
                  paddingLeft: `${config.margenPaginaIzquierdoMm}mm`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, ${config.anchoMm}mm)`,
                  columnGap: `${config.espacioHorizontalMm}mm`,
                  rowGap: `${config.espacioVerticalMm}mm`,
                  pageBreakAfter: pageIdx < Math.ceil(etiquetas.length / labelsPerPage) - 1 ? 'always' : undefined,
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  color: '#000',
                }}
              >
                {pageLabels.map((label, i) => (
                  <div
                    key={i}
                    style={{ border: '1px dashed #d1d5db' }}
                  >
                    <LabelCell label={label} config={config} />
                  </div>
                ))}
              </div>
            )
          })}
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
