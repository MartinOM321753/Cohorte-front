import { useState, type ReactNode } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useCrearDocumentoSinArchivo } from '../hooks/useDocumentos'
import { TipoDocumentoPaciente } from '@/types/api'

const TIPO_LABELS: Record<TipoDocumentoPaciente, string> = {
  CONSENTIMIENTO: 'Consentimiento',
  CUESTIONARIO: 'Cuestionario',
  GENERAL: 'General',
  CUESTIONARIO_GENERAL: 'Cuestionario general de la Cohorte',
  CUESTIONARIO_MINIMENTAL: 'Minimental (>45 años)',
  CUESTIONARIO_AFLUENCIA_VERBAL: 'Afluencia verbal (>45 años)',
  CUESTIONARIO_AGES: 'AGES',
}

interface CrearEtiquetaButtonProps {
  pacienteUUID: string
  usuarioUUID: string
  /** Tipos de documento que se pueden elegir. Nunca debe incluir GENERAL (siempre requiere archivo). */
  tipos: TipoDocumentoPaciente[]
  /** Render-prop para personalizar el disparador; recibe la función `open`. Si se omite, se usa un botón por defecto. */
  trigger?: (open: () => void) => ReactNode
}

/**
 * Crea un registro de documento (Consentimiento/Cuestionario) sin archivo adjunto,
 * generando de inmediato una etiqueta imprimible. El archivo digitalizado se adjunta
 * después desde la lista de documentos (DocumentoList).
 */
export function CrearEtiquetaButton({ pacienteUUID, usuarioUUID, tipos, trigger }: CrearEtiquetaButtonProps) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoDocumentoPaciente | null>(tipos.length === 1 ? tipos[0] : null)
  const [descripcion, setDescripcion] = useState('')
  const mutation = useCrearDocumentoSinArchivo(pacienteUUID)

  function handleOpen() {
    setTipo(tipos.length === 1 ? tipos[0] : null)
    setDescripcion('')
    setOpen(true)
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) setDescripcion('')
  }

  function handleSubmit() {
    if (!tipo) return
    mutation.mutate(
      { usuarioUUID, tipoDoc: tipo, descripcion: descripcion.trim() || undefined },
      { onSuccess: () => handleOpenChange(false) },
    )
  }

  return (
    <>
      {trigger ? (
        trigger(handleOpen)
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
          <ClipboardList className="h-3.5 w-3.5" />
          Crear etiqueta
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear etiqueta sin archivo</DialogTitle>
            <DialogDescription>
              Se generará una etiqueta para imprimir y pegar al documento físico. El archivo
              digitalizado se puede adjuntar más adelante, una vez firmado o llenado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {tipos.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {tipos.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={tipo === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipo(t)}
                    className={tipo === t ? 'bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]' : ''}
                  >
                    {TIPO_LABELS[t]}
                  </Button>
                ))}
              </div>
            )}

            <Input
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="text-[13px]"
            />

            <Button
              onClick={handleSubmit}
              disabled={!tipo || mutation.isPending}
              className="gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]"
            >
              {mutation.isPending ? (
                <><Spinner className="h-4 w-4" />Creando…</>
              ) : (
                'Crear etiqueta'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
