import { useState, useEffect } from 'react'
import { Download, FileText, Image, FileArchive, Trash2, AlertCircle, Eye, Lock, Printer, ClipboardList, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { DocumentoResponseDTO, PrintableLabelBatchDTO } from '@/types/api'
import { useDeleteDocumento, useListarImpresorasDocumentos, useImprimirEtiquetaDocumento, useAdjuntarArchivo } from '../hooks/useDocumentos'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import { downloadDocumentoBlob, getLabelDataDocumento, type ContenidoCodigo } from '../api/documentos.api'
import { PrintableLabelsView } from '@/components/print/PrintableLabelsView'
import { SelectorContenidoCodigo } from './SelectorContenidoCodigo'
import { toast } from 'sonner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
  if (mimeType.startsWith('image/'))
    return <Image className="h-4 w-4 text-blue-500 shrink-0" />
  if (mimeType === 'application/pdf')
    return <FileText className="h-4 w-4 text-red-500 shrink-0" />
  if (mimeType.includes('zip') || mimeType.includes('compressed'))
    return <FileArchive className="h-4 w-4 text-yellow-600 shrink-0" />
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
}

function isViewable(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

function tipoEntidadLabel(tipoEntidad: string | null): string | null {
  switch (tipoEntidad) {
    case 'PACIENTE_CONSENTIMIENTO': return 'Consentimiento'
    case 'PACIENTE_CUESTIONARIO': return 'Cuestionario'
    case 'PACIENTE_GENERAL': return 'General'
    case 'ESTUDIO': return 'Estudio'
    case 'MUESTRA': return 'Muestra'
    case 'RESULTADO_EXAMEN': return 'Resultado de examen'
    default: return null
  }
}

// ─── Descarga autenticada ─────────────────────────────────────────────────────

async function handleSecureDownload(doc: DocumentoResponseDTO) {
  try {
    const { objectUrl, fileName } = await downloadDocumentoBlob(doc.id, false)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'No se pudo descargar el archivo')
  }
}

async function handleSecureView(doc: DocumentoResponseDTO) {
  try {
    const { objectUrl } = await downloadDocumentoBlob(doc.id, true)
    window.open(objectUrl, '_blank')
    // Revocar después de un momento (el navegador ya cargó el blob)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'No se pudo abrir el archivo')
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentoListProps {
  documentos: DocumentoResponseDTO[]
  isLoading?: boolean
  isError?: boolean
  canDelete?: boolean
  /** Permite adjuntar un archivo a registros creados como "solo etiqueta" (archivoSubido = false). Por defecto true. */
  canUpload?: boolean
  /** Muestra una insignia con el tipo de documento (útil cuando se combinan varias categorías en una sola lista). */
  showTipoBadge?: boolean
  emptyMessage?: string
  className?: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DocumentoList({
  documentos,
  isLoading,
  isError,
  canDelete = false,
  canUpload = true,
  showTipoBadge = false,
  emptyMessage = 'Sin documentos adjuntos.',
  className,
}: DocumentoListProps) {
  const [confirmDelete, setConfirmDelete] = useState<DocumentoResponseDTO | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [adjuntando, setAdjuntando] = useState<number | null>(null)
  const [printDoc, setPrintDoc] = useState<DocumentoResponseDTO | null>(null)
  const [browserPrintData, setBrowserPrintData] = useState<PrintableLabelBatchDTO | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState(() =>
    localStorage.getItem('zebra-printer-name') ?? ''
  )
  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const [contenido, setContenido] = useState<ContenidoCodigo>('ENLACE')
  const deleteMutation = useDeleteDocumento()
  const { data: impresoras } = useListarImpresorasDocumentos()
  const { data: configuraciones } = useGetConfiguracionesActivas()
  const printMutation = useImprimirEtiquetaDocumento()
  const adjuntarMutation = useAdjuntarArchivo()

  useEffect(() => {
    if (configuraciones && configuraciones.length > 0 && !selectedConfig) {
      const pred = configuraciones.find((c) => c.predeterminada)
      setSelectedConfig(String(pred ? pred.id : configuraciones[0].id))
    }
  }, [configuraciones])

  function handleAdjuntar(doc: DocumentoResponseDTO) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,image/*,.doc,.docx'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      setAdjuntando(doc.id)
      adjuntarMutation.mutate(
        { documentoId: doc.id, file },
        { onSettled: () => setAdjuntando(null) },
      )
    }
    input.click()
  }

  function handleDelete() {
    if (!confirmDelete) return
    deleteMutation.mutate(confirmDelete.id, {
      onSuccess: () => setConfirmDelete(null),
    })
  }

  async function onDownload(doc: DocumentoResponseDTO) {
    setDownloading(doc.id)
    await handleSecureDownload(doc)
    setDownloading(null)
  }

  async function onView(doc: DocumentoResponseDTO) {
    setDownloading(doc.id)
    await handleSecureView(doc)
    setDownloading(null)
  }

  async function handlePrint() {
    if (!printDoc) return
    const configId = selectedConfig ? Number(selectedConfig) : undefined
    if (selectedPrinter === '__browser__') {
      try {
        const data = await getLabelDataDocumento(printDoc.id, configId, contenido)
        setPrintDoc(null)
        setBrowserPrintData(data)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Error al obtener datos de etiqueta')
      }
      return
    }
    if (!selectedPrinter) return
    localStorage.setItem('zebra-printer-name', selectedPrinter)
    printMutation.mutate(
      {
        idDocumento: printDoc.id,
        impresora: selectedPrinter,
        configuracionId: configId,
        contenido,
      },
      { onSuccess: () => setPrintDoc(null) },
    )
  }

  // ─── Estados ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Spinner className="h-4 w-4" />
        Cargando documentos…
      </div>
    )
  }

  if (isError) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No se pudieron cargar los documentos.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!documentos || documentos.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>{emptyMessage}</p>
    )
  }

  // ─── Lista ─────────────────────────────────────────────────────────────────

  return (
    <>
      <ul className={cn('divide-y rounded-md border', className)}>
        {documentos.map((doc) => {
          const isBusy = downloading === doc.id

          return (
            <li
              key={doc.id}
              className="grid grid-cols-[16px_1fr_auto] items-start gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors"
            >
              {/* Icon — fixed 16 px column */}
              <div className="mt-0.5">
                {doc.archivoSubido ? (
                  <FileIcon mimeType={doc.mimeType} />
                ) : (
                  <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                )}
              </div>

              {/* Info — takes all remaining space; text wraps on long names */}
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug break-all">
                  {doc.archivoSubido ? doc.nombreOriginal : (doc.descripcion || 'Etiqueta sin archivo')}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {!doc.archivoSubido && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Pendiente de archivo
                    </span>
                  )}
                  {showTipoBadge && tipoEntidadLabel(doc.tipoEntidad) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {tipoEntidadLabel(doc.tipoEntidad)}
                    </Badge>
                  )}
                  {doc.etiqueta && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      {doc.etiqueta}
                    </Badge>
                  )}
                  {doc.archivoSubido && doc.tamanioBytes != null && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(doc.tamanioBytes)}
                    </span>
                  )}
                  {doc.fechaSubida && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.fechaSubida)}
                    </span>
                  )}
                  {doc.archivoSubido && doc.mimeType && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {doc.mimeType.split('/').pop()?.toUpperCase()}
                    </Badge>
                  )}
                </div>
                {doc.archivoSubido && doc.descripcion && (
                  <p className="text-xs text-muted-foreground break-words">{doc.descripcion}</p>
                )}
              </div>

              {/* Actions — auto-sized, never compressed */}
              <div className="flex items-center gap-1 pt-0.5">
                {!doc.archivoSubido ? (
                  canUpload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      title="Adjuntar archivo digitalizado"
                      disabled={adjuntando === doc.id}
                      onClick={() => handleAdjuntar(doc)}
                    >
                      {adjuntando === doc.id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )
                ) : doc.puedeDescargar ? (
                  <>
                    {/* Ver inline (PDFs e imágenes) */}
                    {isViewable(doc.mimeType) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Ver archivo"
                        disabled={isBusy}
                        onClick={() => onView(doc)}
                      >
                        {isBusy ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {/* Descargar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Descargar archivo"
                      disabled={isBusy}
                      onClick={() => onDownload(doc)}
                    >
                      {isBusy && !isViewable(doc.mimeType) ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  /* Sin permiso para descargar — muestra candado informativo */
                  <span
                    className="flex h-7 w-7 items-center justify-center text-muted-foreground/50"
                    title="No tienes permiso para descargar este archivo"
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}

                {doc.etiqueta && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-[var(--imss-green-600)]"
                    onClick={() => setPrintDoc(doc)}
                    title="Imprimir etiqueta"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(doc)}
                    title="Eliminar documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Modal confirmación eliminar */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar{' '}
              <span className="font-medium">{confirmDelete?.nombreOriginal}</span>? Esta acción
              no se puede deshacer y el archivo se borrará del almacenamiento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Spinner className="mr-2 h-4 w-4" />Eliminando…</>
              ) : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal imprimir etiqueta */}
      <Dialog open={!!printDoc} onOpenChange={(open) => !open && setPrintDoc(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimir etiqueta</DialogTitle>
            <DialogDescription>
              Etiqueta:{' '}
              <span className="font-mono font-semibold">{printDoc?.etiqueta}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Impresora</Label>
              <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Seleccionar impresora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__browser__">Impresora estándar (navegador)</SelectItem>
                  {impresoras?.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {configuraciones && configuraciones.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] text-muted-foreground">Configuración de etiqueta</Label>
                <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Seleccionar configuración" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuraciones.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}{c.predeterminada ? ' *' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-amber-600">
                No hay configuraciones de etiqueta. Cree una en Configuración &gt; Etiquetas.
              </p>
            )}

            {configuraciones && configuraciones.length > 0 && (
              <SelectorContenidoCodigo
                tipoCodigo={configuraciones.find((c) => String(c.id) === selectedConfig)?.tipoCodigo}
                value={contenido}
                onChange={setContenido}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDoc(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!selectedPrinter || printMutation.isPending || !configuraciones?.length}
              className="gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
            >
              {printMutation.isPending ? (
                <><Spinner className="mr-2 h-4 w-4" />Imprimiendo…</>
              ) : (
                <><Printer className="h-4 w-4" />Imprimir</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {browserPrintData && (
        <PrintableLabelsView
          open={true}
          etiquetas={browserPrintData.etiquetas}
          configuracion={browserPrintData.configuracion}
          onClose={() => setBrowserPrintData(null)}
        />
      )}
    </>
  )
}
