import { useEffect, useState } from 'react'
import { Download, File, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { downloadDocumentoBlob } from '../api/documentos.api'
import type { DocumentoResponseDTO } from '@/types/api'

interface DocumentoViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documento: DocumentoResponseDTO | null
}

export function DocumentoViewerDialog({
  open,
  onOpenChange,
  documento,
}: DocumentoViewerDialogProps) {
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null)
  const [blobMime, setBlobMime] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [loadErr,  setLoadErr]  = useState<string | null>(null)
  const [dlBusy,   setDlBusy]   = useState(false)

  // ── Load blob when dialog opens ───────────────────────────────────────────
  useEffect(() => {
    // Clean up previous blob
    setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
    setBlobMime(null)
    setLoadErr(null)

    if (!open || !documento) return

    if (!documento.puedeDescargar) {
      setLoadErr('Tu rol no tiene permiso para visualizar este archivo.')
      return
    }

    let cancelled = false
    setLoading(true)

    downloadDocumentoBlob(documento.id, true)
      .then(({ objectUrl, mimeType }) => {
        if (cancelled) { URL.revokeObjectURL(objectUrl); return }
        setBlobUrl(objectUrl)
        setBlobMime(mimeType)
      })
      .catch((err) => {
        if (!cancelled) setLoadErr(err?.message ?? 'No se pudo cargar el archivo.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documento?.id])

  // ── Download handler (fresh request, inline=false → Content-Disposition: attachment) ──
  async function handleDownload() {
    if (!documento) return
    setDlBusy(true)
    try {
      const { objectUrl, fileName } = await downloadDocumentoBlob(documento.id, false)
      const a = window.document.createElement('a')
      a.href = objectUrl
      a.download = fileName
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo descargar el archivo')
    } finally {
      setDlBusy(false)
    }
  }

  // ── Derived flags ────────────────────────────────────────────────────────
  const mime     = blobMime ?? documento?.mimeType ?? ''
  const isPdf    = mime.includes('pdf')
  const isImage  = mime.startsWith('image/')
  const canShow  = blobUrl && !loading && !loadErr

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-[880px] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-[var(--border)] px-6 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate text-[15px] font-semibold text-[var(--imss-ink-900)]">
              {documento?.nombreOriginal ?? 'Documento'}
            </DialogTitle>
            {documento?.puedeDescargar && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 text-[12px]"
                onClick={handleDownload}
                disabled={dlBusy}
              >
                {dlBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                Descargar
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Loading */}
          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-[var(--imss-ink-400)]">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-[13px]">Cargando archivo…</p>
            </div>
          )}

          {/* Permission denied / error */}
          {!loading && loadErr && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-[var(--imss-ink-400)]">
              <Lock className="h-8 w-8 opacity-40" strokeWidth={1.5} />
              <p className="text-[13px] text-center max-w-xs">{loadErr}</p>
            </div>
          )}

          {/* PDF viewer */}
          {canShow && isPdf && (
            <iframe
              src={blobUrl!}
              className="w-full flex-1"
              style={{ minHeight: '70vh' }}
              title={documento?.nombreOriginal}
            />
          )}

          {/* Image viewer */}
          {canShow && isImage && !isPdf && (
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
              <img
                src={blobUrl!}
                alt={documento?.nombreOriginal}
                className="max-h-[70vh] rounded-md object-contain shadow-sm"
              />
            </div>
          )}

          {/* Other file type — show icon + name, user can download */}
          {canShow && !isPdf && !isImage && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--muted)]">
                <File className="h-8 w-8 text-[var(--imss-ink-400)]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium text-[var(--imss-ink-900)]">
                  {documento?.nombreOriginal}
                </p>
                <p className="mt-1 text-[12px] text-[var(--imss-ink-400)]">
                  Vista previa no disponible para este tipo de archivo
                </p>
              </div>
              <Button
                onClick={handleDownload}
                disabled={dlBusy}
                className="gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
              >
                {dlBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                )}
                Descargar archivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
