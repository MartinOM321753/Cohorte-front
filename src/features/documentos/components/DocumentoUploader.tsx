import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { DocumentoResponseDTO, TipoDocumentoPaciente } from '@/types/api'
import {
  useUploadDocumentoEstudio,
  useUploadDocumentoPaciente,
  useUploadDocumentoMuestra,
} from '../hooks/useDocumentos'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EntidadEstudio  = { entidad: 'estudio';  estudioId: number }
type EntidadPaciente = { entidad: 'paciente'; pacienteUUID: string; tipoDoc?: TipoDocumentoPaciente }
type EntidadMuestra  = { entidad: 'muestra';  muestraId: number }

type DocumentoUploaderProps = (EntidadEstudio | EntidadPaciente | EntidadMuestra) & {
  /** UUID del usuario autenticado, se adjunta en el request */
  usuarioUUID: string
  /** Callback cuando el archivo se sube con éxito */
  onUploaded?: (doc: DocumentoResponseDTO) => void
  /** Tipos de archivo aceptados, ej. "application/pdf,image/*" */
  accept?: string
  /** Mostrar campo de descripción opcional */
  showDescripcion?: boolean
  className?: string
}

// ─── Formatos legibles ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DocumentoUploader(props: DocumentoUploaderProps) {
  const { usuarioUUID, onUploaded, accept, showDescripcion = false, className } = props

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [dragging, setDragging] = useState(false)

  // Elegir mutation según entidad
  const estudioMutation  = useUploadDocumentoEstudio(
    props.entidad === 'estudio'  ? props.estudioId  : 0
  )
  const pacienteMutation = useUploadDocumentoPaciente(
    props.entidad === 'paciente' ? props.pacienteUUID : ''
  )
  const muestraMutation  = useUploadDocumentoMuestra(
    props.entidad === 'muestra'  ? props.muestraId  : 0
  )

  const isPending =
    estudioMutation.isPending || pacienteMutation.isPending || muestraMutation.isPending

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function selectFile(file: File) {
    setSelectedFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) selectFile(file)
    // Reset para permitir seleccionar el mismo archivo de nuevo
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) selectFile(file)
  }

  function handleClear() {
    setSelectedFile(null)
    setDescripcion('')
  }

  async function handleUpload() {
    if (!selectedFile) return

    // Guardia: verificar que el ID de entidad sea válido antes de llamar al backend
    if (props.entidad === 'estudio' && !props.estudioId) {
      toast.error('No se puede subir: ID del estudio no disponible')
      return
    }
    if (props.entidad === 'paciente' && !props.pacienteUUID) {
      toast.error('No se puede subir: UUID del participante no disponible')
      return
    }
    if (props.entidad === 'muestra' && !props.muestraId) {
      toast.error('No se puede subir: ID de la muestra no disponible')
      return
    }

    const desc = descripcion.trim() || undefined

    if (props.entidad === 'estudio') {
      estudioMutation.mutate(
        { file: selectedFile, usuarioUUID, descripcion: desc },
        {
          onSuccess: (doc) => {
            handleClear()
            onUploaded?.(doc)
          },
        },
      )
    } else if (props.entidad === 'paciente') {
      pacienteMutation.mutate(
        { file: selectedFile, usuarioUUID, tipoDoc: props.tipoDoc, descripcion: desc },
        {
          onSuccess: (doc) => {
            handleClear()
            onUploaded?.(doc)
          },
        },
      )
    } else {
      muestraMutation.mutate(
        { file: selectedFile, usuarioUUID, descripcion: desc },
        {
          onSuccess: (doc) => {
            handleClear()
            onUploaded?.(doc)
          },
        },
      )
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-3', className)}>
      {/* Zona de drop / selección */}
      {!selectedFile ? (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors',
            dragging
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary/60 hover:bg-muted/30',
          )}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-7 w-7 opacity-50" />
          <div className="text-center">
            <span className="font-medium text-foreground">Haz clic</span> o arrastra un archivo aquí
          </div>
          <p className="text-xs opacity-60">PDF, imágenes, Word, Excel · Máx. 50 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      ) : (
        /* Archivo seleccionado */
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Campo descripción (opcional) */}
      {showDescripcion && selectedFile && (
        <div className="space-y-1.5">
          <Label className="text-xs">Descripción (opcional)</Label>
          <Input
            placeholder="Ej. Consentimiento firmado 2026"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={isPending}
            maxLength={300}
          />
        </div>
      )}

      {/* Botón subir */}
      {selectedFile && (
        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Subiendo…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir archivo
            </>
          )}
        </Button>
      )}
    </div>
  )
}
