import { useState } from 'react'
import { Plus, Edit, Trash2, Search, TestTube, AlertCircle, Paperclip } from 'lucide-react'
import { useGetMuestras, useDeleteMuestra } from '../hooks/useBiobanco'
import { MuestraFormModal } from './MuestraFormModal'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/utils'
import { MuestraDetalleDTO } from '@/types/api'

export function MuestrasTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const isAdmin  = useAuthStore((s) => s.hasRole('ADMINISTRADOR'))
  const canUploadMuestra = useAuthStore((s) => s.hasRole(['ADMINISTRADOR', 'LABORATORISTA']))
  const [searchTerm, setSearchTerm] = useState('')
  const [isMuestraModalOpen, setIsMuestraModalOpen] = useState(false)
  const [editingMuestra, setEditingMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [docMuestraId, setDocMuestraId] = useState<number | null>(null)

  const { data: muestras, isLoading } = useGetMuestras()
  const deleteMuestraMutation = useDeleteMuestra()

  const filteredMuestras = muestras?.filter((muestra) => {
    const term = searchTerm.toLowerCase()
    if (!term) return true
    const pacienteStr = muestra.paciente
      ? `${muestra.paciente.folio} ${muestra.paciente.nombreCompleto}`
      : ''
    return (
      muestra.etiqueta.toLowerCase().includes(term) ||
      muestra.unidad.toLowerCase().includes(term) ||
      pacienteStr.toLowerCase().includes(term)
    )
  }) ?? []

  const handleEdit = (muestra: MuestraDetalleDTO) => {
    setEditingMuestra(muestra)
    setIsMuestraModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await deleteMuestraMutation.mutateAsync(id)
  }

  const handleModalClose = () => {
    setIsMuestraModalOpen(false)
    setEditingMuestra(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Muestras Biológicas</h2>
          <p className="text-muted-foreground">Gestiona el registro y ubicación de muestras</p>
        </div>
        <Button onClick={() => setIsMuestraModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Muestra
        </Button>
      </div>

      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          Las muestras biológicas se almacenan en posiciones específicas de las cajas criogénicas.
          Cada muestra debe estar asociada a un paciente y tener una ubicación física definida.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por etiqueta, paciente o unidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredMuestras.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {muestras?.length === 0 ? 'No hay muestras registradas' : 'No se encontraron resultados'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {muestras?.length === 0
                ? 'Registra la primera muestra biológica en el sistema.'
                : 'Intenta con otros términos de búsqueda.'
              }
            </p>
            {muestras?.length === 0 && (
              <Button onClick={() => setIsMuestraModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primera Muestra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMuestras.map((muestra) => (
            <Card key={muestra.id} className="relative">
              <CardHeader>
                <CardTitle className="text-lg font-mono">{muestra.etiqueta}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Valor:</span>
                    <p className="text-muted-foreground">{muestra.valor} {muestra.unidad}</p>
                  </div>
                  <div>
                    <span className="font-medium">Recolección:</span>
                    <p className="text-muted-foreground">{formatDate(muestra.fechaRecoleccion)}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="font-medium">Paciente:</span>
                  <p className="text-muted-foreground truncate">
                    {muestra.paciente ? `${muestra.paciente.folio} — ${muestra.paciente.nombreCompleto}` : '—'}
                  </p>
                </div>

                {muestra.ubicacion && (
                  <div className="text-sm">
                    <span className="font-medium">Ubicación:</span>
                    <p className="text-muted-foreground text-xs">
                      {muestra.ubicacion.codigoCaja} — F{muestra.ubicacion.fila} C{muestra.ubicacion.columna} (Piso {muestra.ubicacion.numeroPiso}, {muestra.ubicacion.codigoRefrigerador})
                    </p>
                  </div>
                )}

                {muestra.observaciones && (
                  <div className="text-sm">
                    <span className="font-medium">Observaciones:</span>
                    <p className="text-muted-foreground text-xs mt-1">{muestra.observaciones}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(muestra)}
                    className="flex-1"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDocMuestraId(muestra.id)}
                    title="Documentos adjuntos"
                  >
                    <Paperclip className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar muestra?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La muestra será removida de su posición.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(muestra.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MuestraFormModal
        open={isMuestraModalOpen}
        onOpenChange={handleModalClose}
        muestra={editingMuestra}
      />

      <DocumentosDialog
        open={docMuestraId !== null}
        onOpenChange={(open) => !open && setDocMuestraId(null)}
        entidad="muestra"
        muestraId={docMuestraId ?? 0}
        titulo="Documentos de la muestra"
        descripcion="Sube y consulta los archivos adjuntos a esta muestra biológica."
        usuarioUUID={userUuid}
        canDelete={isAdmin}
        canUpload={canUploadMuestra}
      />
    </div>
  )
}
