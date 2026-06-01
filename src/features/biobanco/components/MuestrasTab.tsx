import { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, TestTube, AlertCircle, Paperclip, ArrowRightFromLine, History } from 'lucide-react'
import { useGetMuestras, useDeleteMuestra, useGetAllTraslados } from '../hooks/useBiobanco'
import { MuestraFormModal } from './MuestraFormModal'
import { TrasladarMuestraModal } from './TrasladarMuestraModal'
import { HistorialTrasladosModal } from './HistorialTrasladosModal'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatDate } from '@/lib/utils'
import { MuestraDetalleDTO } from '@/types/api'

type EstadoActivo = 'TRASLADADA' | 'RECIBIDA' | 'EN_DEVOLUCION'
interface TrasladoInfo { almacenNombre: string; estado: EstadoActivo }

function activeBadge(estado: EstadoActivo) {
  switch (estado) {
    case 'TRASLADADA':    return { label: 'En tránsito',    cls: 'border-amber-400 text-amber-700 bg-amber-50' }
    case 'RECIBIDA':      return { label: 'Recibida',       cls: 'border-blue-400 text-blue-700 bg-blue-50' }
    case 'EN_DEVOLUCION': return { label: 'En devolución',  cls: 'border-orange-400 text-orange-700 bg-orange-50' }
  }
}

function activeCardBorder(estado: EstadoActivo) {
  switch (estado) {
    case 'TRASLADADA':    return 'border-amber-300'
    case 'RECIBIDA':      return 'border-blue-300'
    case 'EN_DEVOLUCION': return 'border-orange-300'
  }
}

function activeBox(estado: EstadoActivo) {
  switch (estado) {
    case 'TRASLADADA':    return { wrap: 'bg-amber-50 border-amber-200',   title: 'text-amber-800',  body: 'text-amber-700' }
    case 'RECIBIDA':      return { wrap: 'bg-blue-50 border-blue-200',     title: 'text-blue-800',   body: 'text-blue-700' }
    case 'EN_DEVOLUCION': return { wrap: 'bg-orange-50 border-orange-200', title: 'text-orange-800', body: 'text-orange-700' }
  }
}

export function MuestrasTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const isAdmin = useAuthStore((s) => s.hasRole('ADMINISTRADOR'))
  const canUploadMuestra = useAuthStore((s) => s.hasRole(['ADMINISTRADOR', 'LABORATORISTA']))

  const [searchTerm, setSearchTerm] = useState('')
  const [isMuestraModalOpen, setIsMuestraModalOpen] = useState(false)
  const [editingMuestra, setEditingMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [docMuestraId, setDocMuestraId] = useState<number | null>(null)
  const [trasladandoMuestra, setTrasladandoMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [historialMuestra, setHistorialMuestra] = useState<MuestraDetalleDTO | null>(null)

  const { data: muestras, isLoading } = useGetMuestras()
  const { data: traslados = [] } = useGetAllTraslados()
  const deleteMuestraMutation = useDeleteMuestra()

  // Mapa rápido: idMuestra → info de traslado si la muestra está fuera del biobanco
  const trasladosActivos = useMemo(() => {
    const ESTADOS_ACTIVOS: EstadoActivo[] = ['TRASLADADA', 'RECIBIDA', 'EN_DEVOLUCION']
    const map = new Map<number, TrasladoInfo>()
    traslados.forEach((t) => {
      if ((ESTADOS_ACTIVOS as string[]).includes(t.estado)) {
        map.set(t.muestra.id, { almacenNombre: t.almacen.nombre, estado: t.estado as EstadoActivo })
      }
    })
    return map
  }, [traslados])

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
          <p className="text-muted-foreground">Gestiona el registro, ubicación y traslados de muestras</p>
        </div>
        <Button onClick={() => setIsMuestraModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Muestra
        </Button>
      </div>

      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          Las muestras se almacenan en cajas criogénicas. Puedes trasladarlas a laboratorios externos y registrar su devolución desde el historial.
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
                : 'Intenta con otros términos de búsqueda.'}
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
          {filteredMuestras.map((muestra) => {
            const trasladoInfo = trasladosActivos.get(muestra.id)
            const esTrasladada = !!trasladoInfo
            const badge = trasladoInfo ? activeBadge(trasladoInfo.estado) : null
            const box = trasladoInfo ? activeBox(trasladoInfo.estado) : null

            return (
              <Card key={muestra.id} className={`relative flex flex-col ${trasladoInfo ? activeCardBorder(trasladoInfo.estado) : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-mono">{muestra.etiqueta}</CardTitle>
                    {trasladoInfo ? (
                      <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs shrink-0`}>
                        {badge!.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50 text-xs shrink-0">
                        En biobanco
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
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

                  {trasladoInfo ? (
                    <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
                      <span className={`font-medium ${box!.title}`}>Ubicación actual:</span>
                      <p className={`text-xs mt-0.5 ${box!.body}`}>{trasladoInfo.almacenNombre}</p>
                    </div>
                  ) : muestra.ubicacion ? (
                    <div className="text-sm">
                      <span className="font-medium">Ubicación:</span>
                      <p className="text-muted-foreground text-xs">
                        {muestra.ubicacion.codigoCaja} — F{muestra.ubicacion.fila} C{muestra.ubicacion.columna} (Piso {muestra.ubicacion.numeroPiso}, {muestra.ubicacion.codigoRefrigerador})
                      </p>
                    </div>
                  ) : null}

                  {muestra.observaciones && (
                    <div className="text-sm">
                      <span className="font-medium">Observaciones:</span>
                      <p className="text-muted-foreground text-xs mt-1">{muestra.observaciones}</p>
                    </div>
                  )}

                </CardContent>

                {/* Acciones — siempre al fondo de la card ─────────────── */}
                <CardFooter className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(muestra)}
                    className="flex-1"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>

                  {!esTrasladada && isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrasladandoMuestra(muestra)}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      title="Trasladar muestra a laboratorio externo"
                    >
                      <ArrowRightFromLine className="h-3 w-3" />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistorialMuestra(muestra)}
                    title="Historial de traslados"
                  >
                    <History className="h-3 w-3" />
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        title="Eliminar muestra"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar muestra {muestra.etiqueta}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La muestra <strong>{muestra.etiqueta}</strong>
                          {muestra.paciente ? ` del paciente ${muestra.paciente.nombreCompleto}` : ''} será
                          eliminada permanentemente y su posición en la caja quedará libre.
                          Esta acción no se puede deshacer.
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
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <MuestraFormModal
        open={isMuestraModalOpen}
        onOpenChange={handleModalClose}
        muestra={editingMuestra}
      />

      <TrasladarMuestraModal
        open={trasladandoMuestra !== null}
        onOpenChange={(open) => !open && setTrasladandoMuestra(null)}
        muestra={trasladandoMuestra}
      />

      <HistorialTrasladosModal
        open={historialMuestra !== null}
        onOpenChange={(open) => !open && setHistorialMuestra(null)}
        muestra={historialMuestra}
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
