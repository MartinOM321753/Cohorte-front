import { useState } from 'react'
import { Download, FileText, Image, FileArchive, Trash2, AlertCircle, Eye, Lock, Printer } from 'lucide-react'
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
import { DocumentoResponseDTO } from '@/types/api'
import { useDeleteDocumento, useListarImpresorasDocumentos, useImprimirEtiquetaDocumento } from '../hooks/useDocumentos'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import { downloadDocumentoBlob } from '../api/documentos.api'
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
  emptyMessage?: string
  className?: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DocumentoList({
  documentos,
  isLoading,
  isError,
  canDelete = false,
  emptyMessage = 'Sin documentos adjuntos.',
  className,
}: DocumentoListProps) {
  const [confirmDelete, setConfirmDelete] = useState<DocumentoResponseDTO | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [printDoc, setPrintDoc] = useState<DocumentoResponseDTO | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState(() =>
    localStorage.getItem('zebra-printer-name') ?? ''
  )
  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const deleteMutation = useDeleteDocumento()
  const { data: impresoras } = useListarImpresorasDocumentos()
  const { data: configuraciones } = useGetConfiguracionesActivas()
  const printMutation = useImprimirEtiquetaDocumento()

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

  function handlePrint() {
    if (!printDoc || !selectedPrinter) return
    localStorage.setItem('zebra-printer-name', selectedPrinter)
    printMutation.mutate(
      {
        idDocumento: printDoc.id,
        impresora: selectedPrinter,
        configuracionId: selectedConfig ? Number(selectedConfig) : undefined,
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
                <FileIcon mimeType={doc.mimeType} />
              </div>

              {/* Info — takes all remaining space; text wraps on long names */}
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug break-all">
                  {doc.nombreOriginal}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {doc.etiqueta && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      {doc.etiqueta}
                    </Badge>
                  )}
                  {doc.tamanioBytes != null && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(doc.tamanioBytes)}
                    </span>
                  )}
                  {doc.fechaSubida && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.fechaSubida)}
                    </span>
                  )}
                  {doc.mimeType && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {doc.mimeType.split('/').pop()?.toUpperCase()}
                    </Badge>
                  )}
                </div>
                {doc.descripcion && (
                  <p className="text-xs text-muted-foreground break-words">{doc.descripcion}</p>
                )}
              </div>

              {/* Actions — auto-sized, never compressed */}
              <div className="flex items-center gap-1 pt-0.5">
                {doc.puedeDescargar ? (
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
                  {impresoras?.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Configuración de etiqueta</Label>
              <Select
                value={selectedConfig || '__default__'}
                onValueChange={(v) => setSelectedConfig(v === '__default__' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Predeterminada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Predeterminada</SelectItem>
                  {configuraciones?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDoc(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!selectedPrinter || printMutation.isPending}
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
    </>
  )
}
