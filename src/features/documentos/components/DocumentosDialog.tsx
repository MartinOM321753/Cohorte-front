import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DocumentoUploader } from './DocumentoUploader'
import { DocumentoList } from './DocumentoList'
import {
  useDocumentosEstudio,
  useDocumentosMuestra,
} from '../hooks/useDocumentos'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EntidadEstudio  = { entidad: 'estudio';  estudioId: number }
type EntidadMuestra  = { entidad: 'muestra';  muestraId: number }

type DocumentosDialogProps = (EntidadEstudio | EntidadMuestra) & {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descripcion?: string
  usuarioUUID: string
  canDelete?: boolean
  canUpload?: boolean
}

// ─── Sub-panel para Estudio ───────────────────────────────────────────────────

function EstudioDocumentos({
  estudioId,
  usuarioUUID,
  canDelete,
  canUpload,
}: {
  estudioId: number
  usuarioUUID: string
  canDelete: boolean
  canUpload: boolean
}) {
  const { data: docs = [], isLoading, isError } = useDocumentosEstudio(estudioId, { enabled: estudioId > 0 })

  return (
    <div className="space-y-4">
      {canUpload ? (
        <DocumentoUploader
          entidad="estudio"
          estudioId={estudioId}
          usuarioUUID={usuarioUUID}
          accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
          showDescripcion
        />
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Tu rol no tiene permisos para subir documentos a estudios médicos.
        </p>
      )}
      <Separator />
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Archivos adjuntos ({docs.length})
        </p>
        <DocumentoList
          documentos={docs}
          isLoading={isLoading}
          isError={isError}
          canDelete={canDelete}
          emptyMessage="Este estudio no tiene documentos adjuntos aún."
        />
      </div>
    </div>
  )
}

// ─── Sub-panel para Muestra ───────────────────────────────────────────────────

function MuestraDocumentos({
  muestraId,
  usuarioUUID,
  canDelete,
  canUpload,
}: {
  muestraId: number
  usuarioUUID: string
  canDelete: boolean
  canUpload: boolean
}) {
  const { data: docs = [], isLoading, isError } = useDocumentosMuestra(muestraId, { enabled: muestraId > 0 })

  return (
    <div className="space-y-4">
      {canUpload ? (
        <DocumentoUploader
          entidad="muestra"
          muestraId={muestraId}
          usuarioUUID={usuarioUUID}
          accept="application/pdf,image/*,.doc,.docx"
          showDescripcion
        />
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Tu rol no tiene permisos para subir documentos a muestras biológicas.
        </p>
      )}
      <Separator />
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Archivos adjuntos ({docs.length})
        </p>
        <DocumentoList
          documentos={docs}
          isLoading={isLoading}
          isError={isError}
          canDelete={canDelete}
          emptyMessage="Esta muestra no tiene documentos adjuntos aún."
        />
      </div>
    </div>
  )
}

// ─── Dialog principal ─────────────────────────────────────────────────────────

export function DocumentosDialog(props: DocumentosDialogProps) {
  const { open, onOpenChange, titulo, descripcion, usuarioUUID, canDelete = false, canUpload = true } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && (
            <DialogDescription>{descripcion}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          {props.entidad === 'estudio' && (
            <EstudioDocumentos
              estudioId={props.estudioId}
              usuarioUUID={usuarioUUID}
              canDelete={canDelete}
              canUpload={canUpload}
            />
          )}
          {props.entidad === 'muestra' && (
            <MuestraDocumentos
              muestraId={props.muestraId}
              usuarioUUID={usuarioUUID}
              canDelete={canDelete}
              canUpload={canUpload}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
