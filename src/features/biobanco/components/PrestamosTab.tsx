import { useState } from 'react'
import {
  ArrowRightFromLine, ArrowLeftFromLine, Building2, ArrowRight,
  AlertCircle, PackageCheck, RotateCcw, CheckCircle2, Clock,
  RefreshCw, FlaskConical, XCircle,
} from 'lucide-react'
import {
  useGetAllTraslados,
  useConfirmarRecepcion,
  useIniciarDevolucion,
  useConfirmarDevolucion,
} from '../hooks/useBiobanco'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrasladoMuestra } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'

// ── Helpers de estado ─────────────────────────────────────────────────────────

function estadoBadge(estado: TrasladoMuestra['estado']) {
  switch (estado) {
    case 'ENVIADA':
      return { label: 'Enviada',       cls: 'border-amber-500/40  text-amber-700  dark:text-amber-400  bg-amber-500/10'  }
    case 'RECIBIDA':
      return { label: 'Recibida',      cls: 'border-blue-500/40   text-blue-700   dark:text-blue-400   bg-blue-500/10'   }
    case 'EN_DEVOLUCION':
      return { label: 'En devolución', cls: 'border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10' }
    case 'DEVUELTA':
      return { label: 'Devuelta',      cls: 'border-green-500/40  text-green-700  dark:text-green-400  bg-green-500/10'  }
    case 'CANCELADO':
      return { label: 'Cancelado',     cls: 'border-rose-500/40   text-rose-700   dark:text-rose-400   bg-rose-500/10'   }
  }
}

function EstadoIcon({ estado }: { estado: TrasladoMuestra['estado'] }) {
  switch (estado) {
    case 'ENVIADA':        return <Clock        className="h-4 w-4 text-amber-600  dark:text-amber-400" />
    case 'RECIBIDA':       return <PackageCheck className="h-4 w-4 text-blue-600   dark:text-blue-400"  />
    case 'EN_DEVOLUCION':  return <RotateCcw    className="h-4 w-4 text-orange-600 dark:text-orange-400"/>
    case 'DEVUELTA':       return <CheckCircle2 className="h-4 w-4 text-green-600  dark:text-green-400" />
    case 'CANCELADO':      return <XCircle      className="h-4 w-4 text-rose-600   dark:text-rose-400"  />
  }
}

// ── Tarjeta de préstamo ────────────────────────────────────────────────────────

interface PrestamoCardProps {
  traslado: TrasladoMuestra
  myInstitucionId?: number
  onAction: (id: number, type: ActionType) => void
  actionTrasladoId: number | null
  actionType: ActionType | null
  obsText: string
  setObsText: (v: string) => void
  onConfirmAction: () => void
  onCancelAction: () => void
  isPending: boolean
}

type ActionType = 'recepcion' | 'devolucion' | 'confirmar-devolucion'

function PrestamoCard({
  traslado,
  myInstitucionId,
  onAction,
  actionTrasladoId,
  actionType,
  obsText,
  setObsText,
  onConfirmAction,
  onCancelAction,
  isPending,
}: PrestamoCardProps) {
  const badge = estadoBadge(traslado.estado)
  const isOrigen  = traslado.institucionOrigen.id  === myInstitucionId
  const isDestino = traslado.institucionDestino.id === myInstitucionId
  const isActionTarget = actionTrasladoId === traslado.id

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          {/* Muestra info */}
          <div className="flex items-center gap-2">
            <EstadoIcon estado={traslado.estado} />
            <div>
              <p className="font-mono text-sm font-medium leading-tight">
                {traslado.muestra.etiqueta}
              </p>
              {traslado.muestra.esAlicuota && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-full px-1.5 py-0.5 mt-0.5">
                  <FlaskConical className="h-2.5 w-2.5" />
                  Alícuota
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`${badge.cls} text-xs shrink-0`}>
            {badge.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 px-4 pb-4">
        {/* Ruta de institución */}
        <div className="flex items-center gap-1.5 text-sm flex-wrap">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className={`font-medium ${isOrigen ? 'text-primary' : 'text-foreground'}`}>
            {traslado.institucionOrigen.nombre}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className={`font-medium ${isDestino ? 'text-primary' : 'text-foreground'}`}>
            {traslado.institucionDestino.nombre}
          </span>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Fecha:</span>{' '}
            {formatDate(traslado.fechaTraslado)}
          </div>
          <div>
            <span className="font-medium text-foreground">Autoriza:</span>{' '}
            {traslado.autorizadoPor.nombreCompleto}
          </div>
        </div>

        <div className="text-xs">
          <span className="font-medium text-foreground">Motivo:</span>{' '}
          <span className="text-muted-foreground">{traslado.motivo}</span>
        </div>

        {traslado.observaciones && (
          <div className="text-xs">
            <span className="font-medium text-foreground">Obs.:</span>{' '}
            <span className="text-muted-foreground">{traslado.observaciones}</span>
          </div>
        )}

        {/* Botones de acción */}
        {!isActionTarget && (
          <div className="flex flex-wrap gap-2 pt-1">
            {traslado.estado === 'ENVIADA' && isDestino && (
              <Button
                size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => onAction(traslado.id, 'recepcion')}
              >
                <PackageCheck className="h-3 w-3 mr-1" />
                Confirmar recepción
              </Button>
            )}
            {traslado.estado === 'RECIBIDA' && isDestino && (
              <Button
                size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => onAction(traslado.id, 'devolucion')}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Iniciar devolución
              </Button>
            )}
            {traslado.estado === 'EN_DEVOLUCION' && isOrigen && (
              <Button
                size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => onAction(traslado.id, 'confirmar-devolucion')}
              >
                <ArrowLeftFromLine className="h-3 w-3 mr-1" />
                Confirmar retorno
              </Button>
            )}
          </div>
        )}

        {/* Formulario inline de confirmación */}
        {isActionTarget && actionType && (
          <div className="mt-2 pt-3 border-t space-y-3">
            <p className="text-xs font-medium">
              {actionType === 'recepcion'
                ? '¿Confirmar que la muestra fue recibida físicamente?'
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
              <Button size="sm" onClick={onConfirmAction} disabled={isPending} className="h-7 text-xs">
                {isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelAction} className="h-7 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PrestamosTab() {
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)

  const [actionTrasladoId, setActionTrasladoId] = useState<number | null>(null)
  const [actionType, setActionType]             = useState<ActionType | null>(null)
  const [obsText, setObsText]                   = useState('')

  const { data: traslados = [], isLoading, refetch } = useGetAllTraslados()
  const confirmarRecepcionMutation  = useConfirmarRecepcion()
  const iniciarDevolucionMutation   = useIniciarDevolucion()
  const confirmarDevolucionMutation = useConfirmarDevolucion()

  const userUuid = useAuthStore((s) => s.user?.uuid) || ''

  const isPending =
    confirmarRecepcionMutation.isPending ||
    iniciarDevolucionMutation.isPending ||
    confirmarDevolucionMutation.isPending

  const handleAction = (id: number, type: ActionType) => {
    setActionTrasladoId(id)
    setActionType(type)
    setObsText('')
  }

  const handleConfirmAction = async () => {
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
      handleCancelAction()
    } catch (_) {}
  }

  const handleCancelAction = () => {
    setActionTrasladoId(null)
    setActionType(null)
    setObsText('')
  }

  // Clasificar préstamos
  const enviados   = traslados.filter((t) => t.estado === 'ENVIADA'  && t.institucionOrigen.id  === myInstitucionId)
  const recibidos  = traslados.filter((t) => t.institucionDestino.id === myInstitucionId && t.estado !== 'DEVUELTA')
  const todos      = traslados

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const cardProps = (traslado: TrasladoMuestra) => ({
    traslado,
    myInstitucionId,
    onAction: handleAction,
    actionTrasladoId,
    actionType,
    obsText,
    setObsText,
    onConfirmAction: handleConfirmAction,
    onCancelAction: handleCancelAction,
    isPending,
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Préstamos de Muestras</h2>
          <p className="text-muted-foreground">
            Muestras prestadas a otras instituciones o recibidas en préstamo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList>
          <TabsTrigger value="todos">
            Todos activos {todos.length > 0 && `(${todos.length})`}
          </TabsTrigger>
          <TabsTrigger value="enviados">
            <ArrowRightFromLine className="h-3.5 w-3.5 mr-1" />
            Enviados {enviados.length > 0 && `(${enviados.length})`}
          </TabsTrigger>
          <TabsTrigger value="recibidos">
            <ArrowLeftFromLine className="h-3.5 w-3.5 mr-1" />
            Recibidos {recibidos.length > 0 && `(${recibidos.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Todos activos */}
        <TabsContent value="todos" className="space-y-4 mt-4">
          {todos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No hay préstamos activos en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todos.map((t) => <PrestamoCard key={t.id} {...cardProps(t)} />)}
            </div>
          )}
        </TabsContent>

        {/* Enviados */}
        <TabsContent value="enviados" className="space-y-4 mt-4">
          {enviados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ArrowRightFromLine className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No tienes muestras enviadas a otras instituciones.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enviados.map((t) => <PrestamoCard key={t.id} {...cardProps(t)} />)}
            </div>
          )}
        </TabsContent>

        {/* Recibidos */}
        <TabsContent value="recibidos" className="space-y-4 mt-4">
          {recibidos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ArrowLeftFromLine className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No tienes muestras recibidas de otras instituciones.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recibidos.map((t) => <PrestamoCard key={t.id} {...cardProps(t)} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
