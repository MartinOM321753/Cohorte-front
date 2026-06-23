/**
 * EncargadoPage — Préstamos de la institución del usuario.
 * El rol ENCARGADO ya no está vinculado a un almacén físico específico;
 * esta página muestra los préstamos activos de la institución del usuario logueado.
 */
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PackageCheck,
  RotateCcw,
  Building2,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useGetAllTraslados,
  useConfirmarRecepcion,
  useIniciarDevolucion,
  useConfirmarDevolucion,
} from '../hooks/useBiobanco'
import { TrasladoMuestra } from '@/types/api'
import { formatDate } from '@/lib/utils'

function estadoBadge(estado: TrasladoMuestra['estado'], isOrigen?: boolean) {
  switch (estado) {
    case 'ENVIADA':
      return { label: 'En tránsito',   className: 'border-amber-400 text-amber-700 bg-amber-100' }
    case 'RECIBIDA':
      return { label: 'Recibida',      className: 'border-blue-400 text-blue-700 bg-blue-100' }
    case 'EN_DEVOLUCION':
      return isOrigen
        ? { label: 'Por recibir',    className: 'border-teal-400 text-teal-700 bg-teal-100' }
        : { label: 'En devolución',  className: 'border-orange-400 text-orange-700 bg-orange-100' }
    case 'DEVUELTA':
      return { label: 'Devuelta',      className: 'border-green-400 text-green-700 bg-green-100' }
    case 'CANCELADO':
      return { label: 'Cancelado',     className: 'border-rose-400 text-rose-700 bg-rose-100' }
  }
}

function EstadoIcon({ estado }: { estado: TrasladoMuestra['estado'] }) {
  switch (estado) {
    case 'ENVIADA':        return <Clock        className="h-4 w-4 text-amber-600"  />
    case 'RECIBIDA':       return <PackageCheck className="h-4 w-4 text-blue-600"   />
    case 'EN_DEVOLUCION':  return <RotateCcw    className="h-4 w-4 text-orange-600" />
    case 'DEVUELTA':       return <CheckCircle2 className="h-4 w-4 text-green-600"  />
    case 'CANCELADO':      return <X            className="h-4 w-4 text-rose-600"   />
  }
}

export default function EncargadoPage() {
  const { user } = useAuthStore()
  const uuid = user?.uuid ?? ''
  const myInstitucionId = user?.institucion?.id

  const [devolucionId, setDevolucionId]   = useState<number | null>(null)
  const [obsDevolucion, setObsDevolucion] = useState('')

  const { data: traslados = [], isLoading } = useGetAllTraslados()
  const confirmarRecepcionMutation  = useConfirmarRecepcion()
  const iniciarDevolucionMutation   = useIniciarDevolucion()
  const confirmarDevolucionMutation = useConfirmarDevolucion()

  const handleConfirmarRecepcion = async (idTraslado: number) => {
    await confirmarRecepcionMutation.mutateAsync({
      idTraslado,
      data: { uuidConfirma: uuid },
    }).catch(() => {})
  }

  const handleIniciarDevolucion = async () => {
    if (!devolucionId) return
    await iniciarDevolucionMutation.mutateAsync({
      idTraslado: devolucionId,
      data: { uuidInicia: uuid, observaciones: obsDevolucion || undefined },
    }).catch(() => {})
    setDevolucionId(null)
    setObsDevolucion('')
  }

  const activas   = traslados.filter((t) => t.estado !== 'DEVUELTA')
  const historicas = traslados.filter((t) => t.estado === 'DEVUELTA')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Building2 className="h-7 w-7 text-primary mt-0.5" />
        <div>
          <h1 className="text-2xl font-bold">
            {user?.institucion?.nombre ?? 'Mi institución'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Préstamos activos de mi institución
          </p>
        </div>
      </div>

      {/* Active traslados */}
      <section>
        <h2 className="text-base font-semibold mb-3">
          Muestras activas
          {activas.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({activas.length})
            </span>
          )}
        </h2>

        {activas.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No hay muestras activas en préstamo para tu institución.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activas.map((traslado) => {
              const isDestino = traslado.institucionDestino.id === myInstitucionId
              const isOrigen  = traslado.institucionOrigen.id  === myInstitucionId
              const badge     = estadoBadge(traslado.estado, isOrigen)

              return (
                <Card key={traslado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <EstadoIcon estado={traslado.estado} />
                        <CardTitle className="text-sm font-mono">
                          {traslado.muestra.etiqueta}
                        </CardTitle>
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </div>

                      {traslado.estado === 'ENVIADA' && isDestino && (
                        <Button
                          size="sm" className="h-7 text-xs"
                          disabled={confirmarRecepcionMutation.isPending}
                          onClick={() => handleConfirmarRecepcion(traslado.id)}
                        >
                          <PackageCheck className="h-3.5 w-3.5 mr-1" />
                          Confirmar recepción
                        </Button>
                      )}

                      {traslado.estado === 'RECIBIDA' && isDestino && devolucionId !== traslado.id && (
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setDevolucionId(traslado.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Iniciar devolución
                        </Button>
                      )}

                      {traslado.estado === 'EN_DEVOLUCION' && isOrigen && (
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          disabled={confirmarDevolucionMutation.isPending}
                          onClick={() => confirmarDevolucionMutation.mutateAsync({
                            idTraslado: traslado.id,
                            data: { uuidConfirma: uuid },
                          }).catch(() => {})}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Confirmar retorno
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Origen:</span>{' '}
                        {traslado.institucionOrigen.nombre}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Destino:</span>{' '}
                        {traslado.institucionDestino.nombre}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Autorizado por:</span>{' '}
                        {traslado.autorizadoPor.nombreCompleto}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Fecha préstamo:</span>{' '}
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
                            size="sm" className="h-7 text-xs"
                            disabled={iniciarDevolucionMutation.isPending}
                            onClick={handleIniciarDevolucion}
                          >
                            {iniciarDevolucionMutation.isPending ? 'Enviando...' : 'Confirmar envío'}
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs"
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

      {/* Historical */}
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
                      {traslado.institucionOrigen.nombre} → {traslado.institucionDestino.nombre}
                      {' · '}Enviada {formatDate(traslado.fechaTraslado)}
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

      {traslados.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay préstamos registrados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
