import { useState } from 'react'
import { Plus, Edit, Building2, MapPin, Phone, User, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useGetAlmacenes, useDeleteAlmacen, useActivateAlmacen } from '../hooks/useBiobanco'
import { AlmacenFormModal } from './AlmacenFormModal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Almacen, TIPO_INSTITUCION_LABELS } from '@/types/api'

export function AlmacenesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null)

  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('TRASLADOS_CREAR')
  const puedeEditar = hasPermiso('TRASLADOS_CREAR')

  const { data: almacenes = [], isLoading } = useGetAlmacenes()
  const deleteAlmacenMutation = useDeleteAlmacen()
  const activateAlmacenMutation = useActivateAlmacen()

  const handleEdit = (almacen: Almacen) => {
    setEditingAlmacen(almacen)
    setIsModalOpen(true)
  }

  const handleDesactivar = async (id: number) => {
    await deleteAlmacenMutation.mutateAsync(id)
  }

  const handleActivar = async (id: number) => {
    await activateAlmacenMutation.mutateAsync(id)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingAlmacen(null)
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
          <h2 className="text-2xl font-bold">Instituciones Externas</h2>
          <p className="text-muted-foreground">Instituciones (INMEGEN, INSP, hospitales, laboratorios) que reciben traslados de muestras</p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Institución
          </Button>
        )}
      </div>

      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription>
          Registra las instituciones externas que tienen acceso al biobanco o a las que se trasladan muestras.
          Las instituciones inactivas conservan su historial pero no pueden recibir nuevos traslados.
        </AlertDescription>
      </Alert>

      {almacenes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay instituciones registradas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Registra la primera institución externa para poder trasladar muestras.
            </p>
            {puedeCrear && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primera Institución
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {almacenes.map((almacen) => (
            <Card key={almacen.id} className={`relative flex flex-col ${!almacen.activo ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{almacen.nombre}</CardTitle>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={almacen.activo ? 'default' : 'secondary'}>
                      {almacen.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {almacen.tipo && (
                      <Badge variant="outline" className="text-[10px]">
                        {TIPO_INSTITUCION_LABELS[almacen.tipo] ?? almacen.tipo}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{almacen.ciudad}, {almacen.estado}</span>
                  </div>
                  {almacen.direccion && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-0" />
                      <span className="text-xs">{almacen.direccion}</span>
                    </div>
                  )}
                  {almacen.responsable && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{almacen.responsable}</span>
                    </div>
                  )}
                  {almacen.telefono && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{almacen.telefono}</span>
                    </div>
                  )}
                  {almacen.encargado && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                      <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <div>
                        <span className="text-xs font-medium text-foreground">
                          {almacen.encargado.nombreCompleto}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          · @{almacen.encargado.username}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>

              {/* Acciones — siempre al fondo de la card ─────────────────── */}
              {puedeEditar && (
              <CardFooter className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(almacen)}
                  className="flex-1"
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Editar
                </Button>

                {almacen.activo ? (
                  /* ── Botón DESACTIVAR ── */
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        title="Desactivar almacén"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Desactivar institución?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La institución <strong>{almacen.nombre}</strong> quedará inactiva y no podrá recibir nuevos traslados.
                          El historial de traslados anteriores se conserva.
                          Solo es posible desactivarla si todas las muestras ya fueron devueltas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDesactivar(almacen.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Desactivar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  /* ── Botón ACTIVAR ── */
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
                        title="Activar almacén"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Activar institución?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La institución <strong>{almacen.nombre}</strong> volverá a estar disponible para recibir nuevos traslados de muestras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleActivar(almacen.id)}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          Activar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      <AlmacenFormModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        almacen={editingAlmacen}
      />
    </div>
  )
}
