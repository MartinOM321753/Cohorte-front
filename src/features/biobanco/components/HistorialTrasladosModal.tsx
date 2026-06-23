import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  History, ArrowLeftFromLine, CheckCircle2, Clock,
  PackageCheck, RotateCcw, Building2, ArrowRight, XCircle,
} from 'lucide-react'
import {
  useGetTrasladosByMuestra,
  useConfirmarRecepcion,
  useIniciarDevolucion,
  useConfirmarDevolucion,
} from '../hooks/useBiobanco'
import { MuestraDetalleDTO, TrasladoMuestra } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'

interface HistorialTrasladosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
}

function estadoBadge(estado: TrasladoMuestra['estado'], isOrigen?: boolean) {
  switch (estado) {
    case 'ENVIADA':
      return { label: 'En tránsito',   className: 'border-amber-500/40  text-amber-700  dark:text-amber-400  bg-amber-500/10'  }
    case 'RECIBIDA':
      return { label: 'Recibida',      className: 'border-blue-500/40   text-blue-700   dark:text-blue-400   bg-blue-500/10'   }
    case 'EN_DEVOLUCION':
      return isOrigen
        ? { label: 'Por recibir',    className: 'border-teal-500/40   text-teal-700   dark:text-teal-400   bg-teal-500/10'   }
        : { label: 'En devolución',  className: 'border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10' }
    case 'DEVUELTA':
      return { label: 'Devuelta',      className: 'border-green-500/40  text-green-700  dark:text-green-400  bg-green-500/10'  }
    case 'CANCELADO':
      return { label: 'Cancelado',     className: 'border-rose-500/40   text-rose-700   dark:text-rose-400   bg-rose-500/10'   }
  }
}

function estadoCardBg(estado: TrasladoMuestra['estado']) {
  switch (estado) {
    case 'ENVIADA':        return 'border-amber-500/30  bg-amber-500/10'
    case 'RECIBIDA':       return 'border-blue-500/20   bg-blue-500/10'
    case 'EN_DEVOLUCION':  return 'border-orange-500/20 bg-orange-500/10'
    case 'DEVUELTA':       return 'border-green-500/20  bg-green-500/10'
    case 'CANCELADO':      return 'border-rose-500/20   bg-rose-500/10'
  }
}

function EstadoIcon({ estado }: { estado: TrasladoMuestra['estado'] }) {
  switch (estado) {
    case 'ENVIADA':        return <Clock        className="h-4 w-4 text-amber-600  dark:text-amber-400"  />
    case 'RECIBIDA':       return <PackageCheck className="h-4 w-4 text-blue-600   dark:text-blue-400"   />
    case 'EN_DEVOLUCION':  return <RotateCcw    className="h-4 w-4 text-orange-600 dark:text-orange-400" />
    case 'DEVUELTA':       return <CheckCircle2 className="h-4 w-4 text-green-600  dark:text-green-400"  />
    case 'CANCELADO':      return <XCircle      className="h-4 w-4 text-rose-600   dark:text-rose-400"   />
  }
}

export function HistorialTrasladosModal({ open, onOpenChange, muestra }: HistorialTrasladosModalProps) {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)

  const [actionTrasladoId, setActionTrasladoId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<'recepcion' | 'devolucion' | 'confirmar-devolucion' | null>(null)
  const [obsText, setObsText] = useState('')

  const { data: historial = [], isLoading } = useGetTrasladosByMuestra(muestra?.id || 0)
  const confirmarRecepcionMutation = useConfirmarRecepcion()
  const iniciarDevolucionMutation  = useIniciarDevolucion()
  const confirmarDevolucionMutation = useConfirmarDevolucion()

  const handleAction = async () => {
    if (!actionTrasladoId || !actionType) return
    try {
      if (actionType === 'recepcion') {
        await confirmarRecepcionMutation.mutateAsync({
          idTraslado: actionTrasladoId,
          data: { uuidConfirma: userUuid },
        })
      } else if (actionType === 'devolucion') {
        await iniciarDevolucionMutation.mutateAsync({
          idTraslado: actionTrasladoId,
          data: { uuidInicia: userUuid, observaciones: obsText || undefined },
        })
      } else if (actionType === 'confirmar-devolucion') {
        await confirmarDevolucionMutation.mutateAsync({
          idTraslado: actionTrasladoId,
          data: { uuidConfirma: userUuid, observaciones: obsText || undefined },
        })
      }
      resetAction()
    } catch (_) {}
  }

  const resetAction = () => {
    setActionTrasladoId(null)
    setActionType(null)
    setObsText('')
  }

  const handleClose = () => {
    resetAction()
    onOpenChange(false)
  }

  const isPending =
    confirmarRecepcionMutation.isPending ||
    iniciarDevolucionMutation.isPending ||
    confirmarDevolucionMutation.isPending

  if (!muestra) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cadena de Custodia
          </DialogTitle>
          <DialogDescription>
            Muestra: <span className="font-mono font-semibold">{muestra.etiqueta}</span>
            {' — '}{muestra.paciente?.nombreCompleto}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
          </div>
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Esta muestra no tiene préstamos registrados.
          </p>
        ) : (
          <div className="space-y-3">
            {historial.map((traslado) => {
              const isOrigen  = traslado.institucionOrigen.id  === myInstitucionId
              const isDestino = traslado.institucionDestino.id === myInstitucionId
              const badge = estadoBadge(traslado.estado, isOrigen)

              return (
                <div
                  key={traslado.id}
                  className={`border rounded-lg p-4 space-y-2 ${estadoCardBg(traslado.estado)}`}
                >
                  {/* Header ─────────────────────────────────────────── */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EstadoIcon estado={traslado.estado} />
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{traslado.institucionOrigen.nombre}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span>{traslado.institucionDestino.nombre}</span>
                      </div>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>

                    {/* Acciones según estado y rol ───────────────────── */}
                    {traslado.estado === 'ENVIADA' && isDestino && actionTrasladoId !== traslado.id && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setActionTrasladoId(traslado.id); setActionType('recepcion') }}
                      >
                        <PackageCheck className="h-3 w-3 mr-1" />
                        Confirmar recepción
                      </Button>
                    )}
                    {traslado.estado === 'RECIBIDA' && isDestino && actionTrasladoId !== traslado.id && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setActionTrasladoId(traslado.id); setActionType('devolucion') }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Iniciar devolución
                      </Button>
                    )}
                    {traslado.estado === 'EN_DEVOLUCION' && isOrigen && actionTrasladoId !== traslado.id && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setActionTrasladoId(traslado.id); setActionType('confirmar-devolucion') }}
                      >
                        <ArrowLeftFromLine className="h-3 w-3 mr-1" />
                        Confirmar retorno
                      </Button>
                    )}
                  </div>

                  {/* Detalles ───────────────────────────────────────── */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Autorizado por:</span>{' '}
                      {traslado.autorizadoPor.nombreCompleto}
                    </div>
                    {traslado.recibidoPor && (
                      <div>
                        <span className="font-medium text-foreground">Recibido por:</span>{' '}
                        {traslado.recibidoPor.nombreCompleto}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">Fecha préstamo:</span>{' '}
                      {formatDate(traslado.fechaTraslado)}
                    </div>
                    {traslado.fechaRetorno && (
                      <div>
                        <span className="font-medium text-foreground">Retorno:</span>{' '}
                        {formatDate(traslado.fechaRetorno)}
                      </div>
                    )}
                  </div>

                  <div className="text-xs">
                    <span className="font-medium text-foreground">Motivo:</span>{' '}
                    <span className="text-muted-foreground">{traslado.motivo}</span>
                  </div>

                  {traslado.observaciones && (
                    <div className="text-xs">
                      <span className="font-medium text-foreground">Observaciones:</span>{' '}
                      <span className="text-muted-foreground">{traslado.observaciones}</span>
                    </div>
                  )}

                  {/* Formulario de acción inline ────────────────────── */}
                  {actionTrasladoId === traslado.id && actionType && (
                    <div className="mt-3 pt-3 border-t border-muted-foreground/20 space-y-3">
                      <p className="text-xs font-medium text-foreground">
                        {actionType === 'recepcion'
                          ? 'Confirmar recepción física de la muestra'
                          : actionType === 'devolucion'
                          ? 'Iniciar proceso de devolución'
                          : 'Confirmar retorno físico de la muestra'}
                      </p>
                      {actionType !== 'recepcion' && (
                        <div className="space-y-1">
                          <Label className="text-xs">Observaciones (opcional)</Label>
                          <Textarea
                            value={obsText}
                            onChange={(e) => setObsText(e.target.value)}
                            placeholder="Estado de la muestra, notas..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAction} disabled={isPending} className="h-7 text-xs">
                          {isPending ? 'Guardando...' : 'Confirmar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetAction} className="h-7 text-xs">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
