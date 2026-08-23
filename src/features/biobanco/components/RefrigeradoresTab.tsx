import { useState } from 'react'
import { Plus, Edit, Trash2, Layers, Boxes } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useGetRefrigeradores, useDeleteRefrigerador } from '../hooks/useBiobanco'
import { RefrigeradorFormModal } from './RefrigeradorFormModal'
import { PisosFormModal } from './PisosFormModal'
import { ExplorarBiobanco3DModal } from './ubicacion3d/ExplorarBiobanco3DModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Thermometer } from 'lucide-react'
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

export function RefrigeradoresTab() {
  const [isRefrigeradorModalOpen, setIsRefrigeradorModalOpen] = useState(false)
  const [isPisosModalOpen, setIsPisosModalOpen] = useState(false)
  const [selectedRefrigerador, setSelectedRefrigerador] = useState<any>(null)
  const [editingRefrigerador, setEditingRefrigerador] = useState<any>(null)
  const [explorando3D, setExplorando3D] = useState<number | null>(null)

  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('REFRIGERADORES_CREAR')
  const puedeEditar = hasPermiso('REFRIGERADORES_EDITAR')
  const puedeEliminar = hasPermiso('REFRIGERADORES_ELIMINAR')

  const { data: refrigeradores, isLoading } = useGetRefrigeradores()
  const deleteRefrigeradorMutation = useDeleteRefrigerador()

  const handleEdit = (refrigerador: any) => {
    setEditingRefrigerador(refrigerador)
    setIsRefrigeradorModalOpen(true)
  }

  const handleAddPisos = (refrigerador: any) => {
    setSelectedRefrigerador(refrigerador)
    setIsPisosModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await deleteRefrigeradorMutation.mutateAsync(id)
  }

  const handleModalClose = () => {
    setIsRefrigeradorModalOpen(false)
    setIsPisosModalOpen(false)
    setSelectedRefrigerador(null)
    setEditingRefrigerador(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Refrigeradores</h2>
          <p className="text-muted-foreground">Gestiona los equipos de almacenamiento criogénico</p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setIsRefrigeradorModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Refrigerador
          </Button>
        )}
      </div>

      <Alert>
        <Thermometer className="h-4 w-4" />
        <AlertDescription>
          Los refrigeradores son el nivel superior del sistema jerárquico. Cada refrigerador puede tener múltiples pisos con posiciones para cajas criogénicas.
        </AlertDescription>
      </Alert>

      {refrigeradores && refrigeradores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay refrigeradores registrados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando tu primer refrigerador criogénico para organizar el almacenamiento de muestras.
            </p>
            {puedeCrear && (
              <Button onClick={() => setIsRefrigeradorModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Refrigerador
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {refrigeradores?.map((refrigerador) => (
            <Card key={refrigerador.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{refrigerador.nombre}</CardTitle>
                  <Badge variant={refrigerador.activo ? 'default' : 'secondary'}>
                    {refrigerador.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Código: {refrigerador.codigo}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Marca:</span>
                    <p className="text-muted-foreground">{refrigerador.marca || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Modelo:</span>
                    <p className="text-muted-foreground">{refrigerador.modelo || 'N/A'}</p>
                  </div>
                </div>

                {/* ── Pisos con desglose de ocupación ─────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Pisos:</span>
                    <span>{refrigerador.totalPisos}</span>
                  </div>

                  {refrigerador.pisos && refrigerador.pisos.length > 0 && (
                    <div className="space-y-1.5 pl-6">
                      {refrigerador.pisos.map((piso) => (
                        <div key={piso.id} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">Piso {piso.numeroPiso}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {piso.posicionesOcupadas}/{piso.totalPosiciones}
                              <span className="ml-1 text-[10px]">({piso.porcentajeUso.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <Progress
                            value={piso.porcentajeUso}
                            className="h-1.5"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{piso.posicionesLibres} libres</span>
                            <span>{piso.posicionesOcupadas} ocupadas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {refrigerador.totalPisos === 0 && (
                    <p className="pl-6 text-xs text-muted-foreground italic">Sin pisos — haz clic en "Gestionar Pisos"</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {/* El recorrido 3D es de solo lectura: se ofrece a cualquiera que
                      pueda ver el refrigerador, no solo a quien puede editarlo. */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExplorando3D(refrigerador.id)}
                    disabled={refrigerador.totalPisos === 0}
                    title={
                      refrigerador.totalPisos === 0
                        ? 'Sin pisos que recorrer'
                        : 'Recorrer en 3D'
                    }
                    className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <Boxes className="mr-1 h-3 w-3" />
                    Ver en 3D
                  </Button>
                  {puedeEditar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPisos(refrigerador)}
                      className="flex-1"
                    >
                      <Layers className="mr-1 h-3 w-3" />
                      Gestionar Pisos
                    </Button>
                  )}
                  {puedeEditar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(refrigerador)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {puedeEliminar && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar "{refrigerador.nombre}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            El refrigerador <strong>{refrigerador.nombre}</strong> (código: {refrigerador.codigo}) será eliminado
                            junto con todos sus pisos y posiciones asociadas. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(refrigerador.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExplorarBiobanco3DModal
        open={explorando3D !== null}
        onOpenChange={(open) => !open && setExplorando3D(null)}
        idRefrigeradorInicial={explorando3D}
      />

      <RefrigeradorFormModal
        open={isRefrigeradorModalOpen}
        onOpenChange={handleModalClose}
        refrigerador={editingRefrigerador}
      />

      <PisosFormModal
        open={isPisosModalOpen}
        onOpenChange={handleModalClose}
        refrigerador={selectedRefrigerador}
      />
    </div>
  )
}