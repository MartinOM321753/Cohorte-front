import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  RotateCcw,
  Warehouse,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEncargadoStore } from '@/stores/encargadoStore'
import {
  useGetTrasladosByAlmacen,
  useGetAlmacenesByEncargado,
  useConfirmarRecepcion,
  useIniciarDevolucion,
} from '../hooks/useBiobanco'
import { TrasladoMuestra } from '@/types/api'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

function estadoBadge(estado: TrasladoMuestra['estado']) {
  switch (estado) {
    case 'TRASLADADA':
      return { label: 'En tránsito', className: 'border-amber-400 text-amber-700 bg-amber-100' }
    case 'RECIBIDA':
      return { label: 'Recibida', className: 'border-blue-400 text-blue-700 bg-blue-100' }
    case 'EN_DEVOLUCION':
      return { label: 'En devolución', className: 'border-orange-400 text-orange-700 bg-orange-100' }
    case 'DEVUELTA':
      return { label: 'Devuelta', className: 'border-green-400 text-green-700 bg-green-100' }
  }
}

function EstadoIcon({ estado }: { estado: TrasladoMuestra['estado'] }) {
  switch (estado) {
    case 'TRASLADADA':    return <Clock className="h-4 w-4 text-amber-600" />
    case 'RECIBIDA':      return <PackageCheck className="h-4 w-4 text-blue-600" />
    case 'EN_DEVOLUCION': return <RotateCcw className="h-4 w-4 text-orange-600" />
    case 'DEVUELTA':      return <CheckCircle2 className="h-4 w-4 text-green-600" />
  }
}

export default function EncargadoPage() {
  const { user } = useAuthStore()
  const uuid = user?.uuid ?? ''
  const { selectedAlmacenId: numericAlmacenId } = useEncargadoStore()
  const isValidId = numericAlmacenId !== null && numericAlmacenId > 0

  const [page, setPage] = useState(0)
  const [devolucionId, setDevolucionId] = useState<number | null>(null)
  const [obsDevolucion, setObsDevolucion] = useState('')

  const { data: almacenes = [], isLoading: loadingAlmacenes } = useGetAlmacenesByEncargado(uuid)
  const selectedAlmacen = almacenes.find((a) => a.id === (numericAlmacenId ?? -1))

  const { data: pageResult, isLoading: loadingTraslados } = useGetTrasladosByAlmacen(
    numericAlmacenId ?? 0,
    page,
    PAGE_SIZE
  )

  const confirmarRecepcionMutation = useConfirmarRecepcion()
  const iniciarDevolucionMutation = useIniciarDevolucion()

  const handleConfirmarRecepcion = async (idTraslado: number) => {
    await confirmarRecepcionMutation.mutateAsync({
      idTraslado,
      data: { uuidEncargado: uuid },
    }).catch(() => {})
  }

  const handleIniciarDevolucion = async () => {
    if (!devolucionId) return
    await iniciarDevolucionMutation.mutateAsync({
      idTraslado: devolucionId,
      data: { uuidEncargado: uuid, observaciones: obsDevolucion || undefined },
    }).catch(() => {})
    setDevolucionId(null)
    setObsDevolucion('')
  }

  // No valid almacen ID — show splash
  if (!isValidId) {
    if (loadingAlmacenes) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )
    }
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <Warehouse className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Selecciona un almacén</h2>
            <p className="text-sm text-muted-foreground text-center">
              {almacenes.length === 0
                ? 'No tienes almacenes asignados. Contacta al administrador.'
                : 'Elige un almacén del menú lateral para ver sus muestras.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const traslados = pageResult?.content ?? []
  const totalPages = pageResult?.totalPages ?? 0
  const totalElements = pageResult?.totalElements ?? 0

  const activas = traslados.filter((t) => t.estado !== 'DEVUELTA')
  const historicas = traslados.filter((t) => t.estado === 'DEVUELTA')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Warehouse className="h-7 w-7 text-primary mt-0.5" />
        <div>
          <h1 className="text-2xl font-bold">
            {selectedAlmacen?.nombre ?? `Almacén #${numericAlmacenId}`}
          </h1>
          {selectedAlmacen && (
            <p className="text-sm text-muted-foreground">
              {selectedAlmacen.ciudad}, {selectedAlmacen.estado}
              {selectedAlmacen.direccion && ` · ${selectedAlmacen.direccion}`}
            </p>
          )}
        </div>
      </div>

      {/* Loading */}
      {loadingTraslados ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Active traslados */}
          <section>
            <h2 className="text-base font-semibold mb-3">
              Muestras activas
              {totalElements > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({totalElements} total)
                </span>
              )}
            </h2>

            {activas.length === 0 && historicas.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No hay muestras en esta página.
                </CardContent>
              </Card>
            ) : activas.length === 0 ? null : (
              <div className="space-y-3">
                {activas.map((traslado) => {
                  const badge = estadoBadge(traslado.estado)
                  return (
                    <Card key={traslado.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <EstadoIcon estado={traslado.estado} />
                            <CardTitle className="text-sm font-mono">
                              {traslado.muestra.etiqueta}
                            </CardTitle>
                            <Badge variant="outline" className={badge.className}>
                              {badge.label}
                            </Badge>
                          </div>

                          {traslado.estado === 'TRASLADADA' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={confirmarRecepcionMutation.isPending}
                              onClick={() => handleConfirmarRecepcion(traslado.id)}
                            >
                              <PackageCheck className="h-3.5 w-3.5 mr-1" />
                              Confirmar recepción
                            </Button>
                          )}

                          {traslado.estado === 'RECIBIDA' && devolucionId !== traslado.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setDevolucionId(traslado.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Iniciar devolución
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">Tipo:</span>{' '}
                            {traslado.muestra.unidad}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Autorizado por:</span>{' '}
                            {traslado.autorizadoPor.nombreCompleto}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Fecha traslado:</span>{' '}
                            {formatDate(traslado.fechaTraslado)}
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className="font-medium text-foreground">Motivo:</span>{' '}
                          <span className="text-muted-foreground">{traslado.motivo}</span>
                        </div>
                        {traslado.observaciones && (
                          <div className="text-xs text-muted-foreground">{traslado.observaciones}</div>
                        )}

                        {devolucionId === traslado.id && (
                          <div className="mt-2 pt-3 border-t space-y-2">
                            <p className="text-xs font-medium">Iniciar devolución de muestra</p>
                            <div className="space-y-1">
                              <Label className="text-xs">Observaciones (opcional)</Label>
                              <Textarea
                                value={obsDevolucion}
                                onChange={(e) => setObsDevolucion(e.target.value)}
                                placeholder="Estado al enviar, notas..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={iniciarDevolucionMutation.isPending}
                                onClick={handleIniciarDevolucion}
                              >
                                {iniciarDevolucionMutation.isPending ? 'Enviando...' : 'Confirmar envío'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => { setDevolucionId(null); setObsDevolucion('') }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          {/* Historical traslados on current page */}
          {historicas.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 text-muted-foreground">Devueltas</h2>
              <div className="space-y-2">
                {historicas.map((traslado) => (
                  <Card key={traslado.id} className="opacity-70">
                    <CardContent className="py-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium">{traslado.muestra.etiqueta}</p>
                        <p className="text-xs text-muted-foreground">
                          Enviada {formatDate(traslado.fechaTraslado)}
                          {traslado.fechaRetorno && ` · Devuelta ${formatDate(traslado.fechaRetorno)}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-green-400 text-green-700 bg-green-100 shrink-0">
                        Devuelta
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {traslados.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No hay muestras registradas en este almacén.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
