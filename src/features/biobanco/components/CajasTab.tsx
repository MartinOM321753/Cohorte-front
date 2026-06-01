import { useState } from 'react'
import { Plus, Edit, Trash2, Grid3X3, Package, MapPin } from 'lucide-react'
import { useGetCajas, useDeleteCaja } from '../hooks/useBiobanco'
import { CajaFormModal } from './CajaFormModal'
import { PosicionesModal } from './PosicionesModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
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

export function CajasTab() {
  const [isCajaModalOpen, setIsCajaModalOpen] = useState(false)
  const [isPosicionesModalOpen, setIsPosicionesModalOpen] = useState(false)
  const [selectedCaja, setSelectedCaja] = useState<any>(null)
  const [editingCaja, setEditingCaja] = useState<any>(null)

  const { data: cajas, isLoading } = useGetCajas()
  const deleteCajaMutation = useDeleteCaja()

  const handleEdit = (caja: any) => {
    setEditingCaja(caja)
    setIsCajaModalOpen(true)
  }

  const handleViewPosiciones = (caja: any) => {
    setSelectedCaja(caja)
    setIsPosicionesModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await deleteCajaMutation.mutateAsync(id)
  }

  const handleModalClose = () => {
    setIsCajaModalOpen(false)
    setIsPosicionesModalOpen(false)
    setSelectedCaja(null)
    setEditingCaja(null)
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
          <h2 className="text-2xl font-bold">Cajas Criogénicas</h2>
          <p className="text-muted-foreground">Gestiona las cajas de almacenamiento y sus posiciones</p>
        </div>
        <Button onClick={() => setIsCajaModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Caja
        </Button>
      </div>

      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          Las cajas criogénicas se asignan a posiciones específicas en los pisos de los refrigeradores.
          Cada caja tiene una matriz de posiciones donde se almacenan las muestras biológicas.
        </AlertDescription>
      </Alert>

      {cajas && cajas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay cajas registradas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea cajas criogénicas para organizar el almacenamiento de muestras.
              Primero necesitas tener refrigeradores con pisos configurados.
            </p>
            <Button onClick={() => setIsCajaModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primera Caja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cajas?.map((caja) => (
            <Card key={caja.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{caja.codigoCaja}</CardTitle>
                  <Badge variant={caja.activo ? 'default' : 'secondary'}>
                    {caja.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {caja.tipoCaja}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Dimensiones:</span>
                    <p className="text-muted-foreground">{caja.filas}×{caja.columnas}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Color:</span>
                    {caja.color ? (
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: caja.color }}
                        title={caja.color}
                      />
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="font-medium">Posiciones totales:</span>
                  <span>{caja.filas * caja.columnas}</span>
                </div>

                {caja.posiciones && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Ocupadas:</span>
                    <span>{caja.posiciones.filter(p => p.ocupada).length}</span>
                    <span className="text-muted-foreground">
                      / {caja.posiciones.length}
                    </span>
                  </div>
                )}

                {caja.ubicacionPiso ? (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-blue-700 text-xs leading-snug">{caja.ubicacionPiso}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs italic">Sin posición asignada</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPosiciones(caja)}
                    className="flex-1"
                  >
                    <Grid3X3 className="mr-1 h-3 w-3" />
                    Ver Posiciones
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(caja)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar caja {caja.codigoCaja}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La caja <strong>{caja.codigoCaja}</strong> ({caja.tipoCaja}) será eliminada junto con todas
                          sus posiciones. Si contiene muestras almacenadas, la operación será rechazada.
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(caja.id)}
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

      <CajaFormModal
        open={isCajaModalOpen}
        onOpenChange={handleModalClose}
        caja={editingCaja}
      />

      <PosicionesModal
        open={isPosicionesModalOpen}
        onOpenChange={handleModalClose}
        caja={selectedCaja}
      />
    </div>
  )
}