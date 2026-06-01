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
import { History, ArrowLeftFromLine, CheckCircle2, Clock, PackageCheck, RotateCcw } from 'lucide-react'
import { useGetTrasladosByMuestra, useRegistrarDevolucion } from '../hooks/useBiobanco'
import { MuestraDetalleDTO, TrasladoMuestra } from '@/types/api'
import { formatDate } from '@/lib/utils'

interface HistorialTrasladosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
}

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

function estadoCardBg(estado: TrasladoMuestra['estado']) {
  switch (estado) {
    case 'TRASLADADA':   return 'border-amber-300 bg-amber-50'
    case 'RECIBIDA':     return 'border-blue-200 bg-blue-50'
    case 'EN_DEVOLUCION':return 'border-orange-200 bg-orange-50'
    case 'DEVUELTA':     return 'border-green-200 bg-green-50'
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

export function HistorialTrasladosModal({ open, onOpenChange, muestra }: HistorialTrasladosModalProps) {
  const [confirmingDevolucionId, setConfirmingDevolucionId] = useState<number | null>(null)
  const [obsDevolucion, setObsDevolucion] = useState('')

  const { data: historial = [], isLoading } = useGetTrasladosByMuestra(muestra?.id || 0)
  const devolucionMutation = useRegistrarDevolucion()

  const handleConfirmarDevolucion = async () => {
    if (!confirmingDevolucionId) return
    try {
      await devolucionMutation.mutateAsync({
        idTraslado: confirmingDevolucionId,
        data: { observaciones: obsDevolucion || undefined },
      })
      setConfirmingDevolucionId(null)
      setObsDevolucion('')
    } catch (_) {}
  }

  const handleClose = () => {
    setConfirmingDevolucionId(null)
    setObsDevolucion('')
    onOpenChange(false)
  }

  if (!muestra) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Traslados
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
            Esta muestra no tiene traslados registrados.
          </p>
        ) : (
          <div className="space-y-3">
            {historial.map((traslado) => {
              const badge = estadoBadge(traslado.estado)
              return (
                <div
                  key={traslado.id}
                  className={`border rounded-lg p-4 space-y-2 ${estadoCardBg(traslado.estado)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EstadoIcon estado={traslado.estado} />
                      <span className="font-semibold text-sm">{traslado.almacen.nombre}</span>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>

                    {/* Admin confirms physical return when sample is EN_DEVOLUCION */}
                    {traslado.estado === 'EN_DEVOLUCION' && confirmingDevolucionId !== traslado.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setConfirmingDevolucionId(traslado.id)}
                      >
                        <ArrowLeftFromLine className="h-3 w-3 mr-1" />
                        Confirmar retorno
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Destino:</span>{' '}
                      {traslado.almacen.ciudad}, {traslado.almacen.estado}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Autorizado por:</span>{' '}
                      {traslado.autorizadoPor.nombreCompleto}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Traslado:</span>{' '}
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

                  {/* Admin confirm return form */}
                  {confirmingDevolucionId === traslado.id && (
                    <div className="mt-3 pt-3 border-t border-orange-300 space-y-3">
                      <p className="text-xs font-medium text-orange-800">
                        Confirmar retorno físico de la muestra al biobanco
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">Observaciones (opcional)</Label>
                        <Textarea
                          value={obsDevolucion}
                          onChange={(e) => setObsDevolucion(e.target.value)}
                          placeholder="Estado de la muestra al regresar, notas..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleConfirmarDevolucion}
                          disabled={devolucionMutation.isPending}
                          className="h-7 text-xs"
                        >
                          {devolucionMutation.isPending ? 'Guardando...' : 'Confirmar devolución'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setConfirmingDevolucionId(null); setObsDevolucion('') }}
                          className="h-7 text-xs"
                        >
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
