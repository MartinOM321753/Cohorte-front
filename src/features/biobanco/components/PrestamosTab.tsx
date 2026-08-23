import { useState } from 'react'
import {
  ArrowRightFromLine, ArrowLeftFromLine, Building2, ArrowRight,
  AlertCircle, AlertTriangle, PackageCheck, RotateCcw, CheckCircle2, Clock,
  RefreshCw, FlaskConical, XCircle, MapPin, CalendarClock,
} from 'lucide-react'
import {
  useGetAllTraslados,
  useConfirmarRecepcion,
  useIniciarDevolucion,
  useConfirmarDevolucion,
  useGetAlicuotasEnDestino,
  useAsignarPosicionMuestra,
  useGetTrasladosByMuestra,
} from '../hooks/useBiobanco'
import { SeleccionPosicionCajaModal } from './SeleccionPosicionCajaModal'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrasladoMuestra, MuestraDetalleDTO } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'

// ── Helpers de estado ─────────────────────────────────────────────────────────

/**
 * @param soyElReceptor si esta institución es la que espera la muestra en una
 *        devolución. No es lo mismo que ser el origen de la fila: en un
 *        movimiento de devolución el origen es quien la manda.
 */
function estadoBadge(estado: TrasladoMuestra['estado'], soyElReceptor?: boolean) {
  switch (estado) {
    case 'ENVIADA':
      return { label: 'Enviada',       cls: 'border-amber-500/40  text-amber-700  dark:text-amber-400  bg-amber-500/10'  }
    case 'RECIBIDA':
      return { label: 'Recibida',      cls: 'border-blue-500/40   text-blue-700   dark:text-blue-400   bg-blue-500/10'   }
    case 'EN_DEVOLUCION':
      return soyElReceptor
        ? { label: 'Por recibir',    cls: 'border-teal-500/40   text-teal-700   dark:text-teal-400   bg-teal-500/10'   }
        : { label: 'En devolución',  cls: 'border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10' }
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
  // Recepción con posición
  posicionCajaId: number | null
  posicionLabel: string
  onOpenPosicionModal: () => void
  onClearPosicion: () => void
  // Devolución con alícuotas
  alicuotasEnDestino: MuestraDetalleDTO[]
  selectedAlicuotaIds: Set<number>
  onToggleAlicuota: (id: number) => void
  onSelectAllAlicuotas: () => void
  onDeselectAllAlicuotas: () => void
  // Devolución: destino (atajo en cadena de custodia)
  destinoDevolucionId: number | null
  setDestinoDevolucionId: (v: number | null) => void
  destinoDevolucionOptions: { id: number; label: string }[]
  // Permisos
  puedeConfirmar: boolean
  puedeDevolver: boolean
}

type ActionType = 'recepcion' | 'devolucion' | 'confirmar-devolucion' | 'asignar-posicion'

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
  posicionCajaId,
  posicionLabel,
  onOpenPosicionModal,
  onClearPosicion,
  alicuotasEnDestino,
  selectedAlicuotaIds,
  onToggleAlicuota,
  onSelectAllAlicuotas,
  onDeselectAllAlicuotas,
  destinoDevolucionId,
  setDestinoDevolucionId,
  destinoDevolucionOptions,
  puedeConfirmar,
  puedeDevolver,
}: PrestamoCardProps) {
  const isOrigen  = traslado.institucionOrigen.id  === myInstitucionId

  /**
   * Quién recibe la muestra en esta devolución, que es quien debe confirmarla.
   *
   * Se lee según la forma de la fila, igual que hace el servidor. Antes se usaba
   * `isOrigen` para las dos formas: en un movimiento de devolución eso invertía
   * la etiqueta y le ofrecía "Confirmar retorno" justo a quien envía la muestra
   * —que el servidor además aceptaba—, firmando el acuse de recibo en nombre
   * ajeno sobre un estado que ya no se puede deshacer.
   */
  const idReceptorDevolucion = traslado.esMovimientoDevolucion
    ? traslado.institucionDestino.id
    // Con atajo la muestra no vuelve al prestador sino a un tercero, y es ese
    // quien confirma. Mirar solo el origen dejaba el botón en manos de quien
    // recibiría un 403, y se lo quitaba a quien sí podía.
    : (traslado.idInstitucionDestinoDevolucion ?? traslado.institucionOrigen.id)
  const soyElReceptor = idReceptorDevolucion === myInstitucionId
  const isDestino = traslado.institucionDestino.id === myInstitucionId
  const badge = estadoBadge(traslado.estado, soyElReceptor)
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

        {/* Fecha límite */}
        {traslado.fechaLimite && (
          <div className={`flex items-center gap-1.5 text-xs ${traslado.vencido ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
            {traslado.vencido
              ? <AlertTriangle className="h-3 w-3 shrink-0" />
              : <CalendarClock className="h-3 w-3 shrink-0" />}
            <span className="font-medium">{traslado.vencido ? 'Vencido:' : 'Fecha límite:'}</span>{' '}
            {formatDate(traslado.fechaLimite)}
          </div>
        )}

        {/* Posición asignada */}
        {traslado.muestra.posicionLabel && (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">Posición:</span>{' '}
            <Badge variant="outline" className="text-[10px]">{traslado.muestra.posicionLabel}</Badge>
          </div>
        )}

        {/* Botones de acción */}
        {!isActionTarget && (
          <div className="flex flex-wrap gap-2 pt-1">
            {traslado.estado === 'ENVIADA' && isDestino && puedeConfirmar && (
              <Button
                size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => onAction(traslado.id, 'recepcion')}
              >
                <PackageCheck className="h-3 w-3 mr-1" />
                Confirmar recepción
              </Button>
            )}
            {traslado.estado === 'RECIBIDA' && isDestino && (
              <>
                {puedeConfirmar && (
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => onAction(traslado.id, 'asignar-posicion')}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {traslado.muestra.posicionLabel ? 'Actualizar posición' : 'Asignar posición'}
                  </Button>
                )}
                {puedeDevolver && (
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => onAction(traslado.id, 'devolucion')}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Iniciar devolución
                  </Button>
                )}
              </>
            )}
            {traslado.estado === 'EN_DEVOLUCION' && soyElReceptor && puedeConfirmar && (
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
                : actionType === 'asignar-posicion'
                ? 'Asignar posición en caja a la muestra recibida'
                : actionType === 'devolucion'
                ? 'Iniciar proceso de devolución'
                : 'Confirmar retorno físico de la muestra'}
            </p>

            {/* Asignar posición post-recepción */}
            {actionType === 'asignar-posicion' && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Selecciona la posición en caja
                </Label>
                {posicionCajaId ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">{posicionLabel}</Badge>
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={onClearPosicion}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenPosicionModal}>
                    <MapPin className="h-3 w-3 mr-1" />
                    Seleccionar posición en caja
                  </Button>
                )}
              </div>
            )}

            {/* Recepción: selector de posición opcional */}
            {actionType === 'recepcion' && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Asignar posición (opcional)
                </Label>
                {posicionCajaId ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">{posicionLabel}</Badge>
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={onClearPosicion}>
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenPosicionModal}>
                    <MapPin className="h-3 w-3 mr-1" />
                    Seleccionar posición en caja
                  </Button>
                )}
              </div>
            )}

            {/* Devolución: destino (default = eslabón anterior; opcional = atajo en la cadena) */}
            {actionType === 'devolucion' && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Devolver a
                </Label>
                <select
                  className="w-full rounded border bg-background px-2 py-1 text-xs"
                  value={destinoDevolucionId ?? ''}
                  onChange={(e) => setDestinoDevolucionId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Al eslabón anterior: {traslado.institucionOrigen.nombre}</option>
                  {destinoDevolucionOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Opcional: elige cualquier institución previa en la cadena de custodia (atajo).
                </p>
              </div>
            )}

            {/* Devolución: selección de alícuotas */}
            {actionType === 'devolucion' && alicuotasEnDestino.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Alícuotas a devolver junto con la muestra padre</Label>
                <div className="flex gap-2 mb-1">
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={onSelectAllAlicuotas}>
                    Todas
                  </Button>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={onDeselectAllAlicuotas}>
                    Ninguna
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded border p-2">
                  {alicuotasEnDestino.map((ali) => (
                    <label key={ali.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={selectedAlicuotaIds.has(ali.id)}
                        onCheckedChange={() => onToggleAlicuota(ali.id)}
                      />
                      <span className="font-mono">{ali.etiqueta}</span>
                      <span className="text-muted-foreground">
                        {ali.estadoMuestra === 'EN_BIOBANCO' ? 'En biobanco' : 'Sin posición'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {actionType !== 'recepcion' && actionType !== 'asignar-posicion' && (
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
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)
  const puedeConfirmar = hasPermiso('TRASLADOS_CONFIRMAR')
  const puedeDevolver = hasPermiso('TRASLADOS_DEVOLVER')

  const [actionTrasladoId, setActionTrasladoId] = useState<number | null>(null)
  const [actionType, setActionType]             = useState<ActionType | null>(null)
  const [obsText, setObsText]                   = useState('')

  // Recepción: posición opcional
  const [posicionCajaId, setPosicionCajaId]   = useState<number | null>(null)
  const [posicionLabel, setPosicionLabel]       = useState('')
  const [showPosicionModal, setShowPosicionModal] = useState(false)

  // Devolución: alícuotas
  const [selectedAlicuotaIds, setSelectedAlicuotaIds] = useState<Set<number>>(new Set())

  // Devolución: destino elegido (null = eslabón anterior/default)
  const [destinoDevolucionId, setDestinoDevolucionId] = useState<number | null>(null)

  const { data: traslados = [], isLoading, refetch } = useGetAllTraslados()
  const confirmarRecepcionMutation  = useConfirmarRecepcion()
  const iniciarDevolucionMutation   = useIniciarDevolucion()
  const confirmarDevolucionMutation = useConfirmarDevolucion()
  const asignarPosicionMutation     = useAsignarPosicionMuestra()

  const { data: alicuotasEnDestino = [] } = useGetAlicuotasEnDestino(
    actionTrasladoId ?? 0,
    { enabled: actionType === 'devolucion' && !!actionTrasladoId }
  )

  // Cargar historial de traslados de la muestra para poblar las opciones de "atajo"
  // en devolución (instituciones previas en la cadena de custodia).
  const trasladoDevolucion = traslados.find((t) => t.id === actionTrasladoId)
  const idMuestraDevolucion = trasladoDevolucion?.muestra.id ?? 0
  const { data: historialMuestra = [] } = useGetTrasladosByMuestra(
    actionType === 'devolucion' ? idMuestraDevolucion : 0
  )

  // Construir opciones únicas de instituciones que participaron en la cadena de custodia,
  // excluyendo (a) la que actualmente tiene la muestra y (b) la que es el eslabón anterior
  // por default (ésa se muestra como opción por defecto en el <select>).
  const destinoDevolucionOptions = (() => {
    if (!trasladoDevolucion) return []
    const excluir = new Set<number>([
      trasladoDevolucion.institucionDestino.id, // yo mismo (tenedor actual)
      trasladoDevolucion.institucionOrigen.id,  // eslabón anterior, ya es el default
    ])
    const seen = new Set<number>()
    const opts: { id: number; label: string }[] = []
    historialMuestra.forEach((t) => {
      const candidatos = [t.institucionOrigen, t.institucionDestino]
      candidatos.forEach((inst) => {
        if (!excluir.has(inst.id) && !seen.has(inst.id)) {
          seen.add(inst.id)
          opts.push({ id: inst.id, label: inst.nombre })
        }
      })
    })
    return opts
  })()

  const userUuid = useAuthStore((s) => s.user?.uuid) || ''

  const isPending =
    confirmarRecepcionMutation.isPending ||
    iniciarDevolucionMutation.isPending ||
    confirmarDevolucionMutation.isPending ||
    asignarPosicionMutation.isPending

  const handleAction = (id: number, type: ActionType) => {
    setActionTrasladoId(id)
    setActionType(type)
    setObsText('')
    setPosicionCajaId(null)
    setPosicionLabel('')
    setSelectedAlicuotaIds(new Set())
    setDestinoDevolucionId(null)
  }

  const handleConfirmAction = async () => {
    if (!actionTrasladoId || !actionType) return
    try {
      if (actionType === 'recepcion') {
        await confirmarRecepcionMutation.mutateAsync({
          idTraslado: actionTrasladoId,
          data: {
            uuidConfirma: userUuid,
            idPosicionCaja: posicionCajaId ?? undefined,
          },
        })
      } else if (actionType === 'devolucion') {
        const idsDevolver = selectedAlicuotaIds.size > 0 ? Array.from(selectedAlicuotaIds) : undefined
        await iniciarDevolucionMutation.mutateAsync({
          idTraslado: actionTrasladoId,
          data: {
            uuidInicia: userUuid,
            observaciones: obsText || undefined,
            idsAlicuotasDevolver: idsDevolver,
            idInstitucionDestinoDevolucion: destinoDevolucionId ?? undefined,
          },
        })
      } else if (actionType === 'asignar-posicion') {
        if (!posicionCajaId) return
        const traslado = traslados.find((t) => t.id === actionTrasladoId)
        if (!traslado) return
        await asignarPosicionMutation.mutateAsync({
          id: traslado.muestra.id,
          data: { idPosicionCaja: posicionCajaId },
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
    setPosicionCajaId(null)
    setPosicionLabel('')
    setSelectedAlicuotaIds(new Set())
    setDestinoDevolucionId(null)
  }

  const toggleAlicuota = (id: number) => {
    setSelectedAlicuotaIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Clasificar préstamos
  const activos    = traslados.filter((t) => t.estado !== 'DEVUELTA' && t.estado !== 'CANCELADO')
  const enviados   = traslados.filter((t) => t.estado === 'ENVIADA'  && t.institucionOrigen.id  === myInstitucionId)
  const recibidos  = traslados.filter((t) => t.institucionDestino.id === myInstitucionId && t.estado !== 'DEVUELTA' && t.estado !== 'CANCELADO')
  const devueltos  = traslados.filter((t) => t.estado === 'DEVUELTA')
  const cancelados = traslados.filter((t) => t.estado === 'CANCELADO')

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
    posicionCajaId,
    posicionLabel,
    onOpenPosicionModal: () => setShowPosicionModal(true),
    onClearPosicion: () => { setPosicionCajaId(null); setPosicionLabel('') },
    alicuotasEnDestino,
    selectedAlicuotaIds,
    onToggleAlicuota: toggleAlicuota,
    onSelectAllAlicuotas: () => setSelectedAlicuotaIds(new Set(alicuotasEnDestino.map((a) => a.id))),
    onDeselectAllAlicuotas: () => setSelectedAlicuotaIds(new Set()),
    destinoDevolucionId,
    setDestinoDevolucionId,
    destinoDevolucionOptions,
    puedeConfirmar,
    puedeDevolver,
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

      <Tabs defaultValue="activos" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="activos">
            Todos activos {activos.length > 0 && `(${activos.length})`}
          </TabsTrigger>
          <TabsTrigger value="enviados">
            <ArrowRightFromLine className="h-3.5 w-3.5 mr-1" />
            Enviados {enviados.length > 0 && `(${enviados.length})`}
          </TabsTrigger>
          <TabsTrigger value="recibidos">
            <ArrowLeftFromLine className="h-3.5 w-3.5 mr-1" />
            Recibidos {recibidos.length > 0 && `(${recibidos.length})`}
          </TabsTrigger>
          <TabsTrigger value="devueltos">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Devueltos {devueltos.length > 0 && `(${devueltos.length})`}
          </TabsTrigger>
          <TabsTrigger value="cancelados">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelados {cancelados.length > 0 && `(${cancelados.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Todos activos */}
        <TabsContent value="activos" className="space-y-4 mt-4">
          {activos.length === 0 ? (
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
              {activos.map((t) => <PrestamoCard key={t.id} {...cardProps(t)} />)}
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

        {/* Devueltos */}
        <TabsContent value="devueltos" className="space-y-4 mt-4">
          {devueltos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No hay préstamos devueltos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devueltos.map((t) => <PrestamoCard key={t.id} {...cardProps(t)} />)}
            </div>
          )}
        </TabsContent>

        {/* Cancelados */}
        <TabsContent value="cancelados" className="space-y-4 mt-4">
          {cancelados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No hay préstamos cancelados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cancelados.map((t) => <PrestamoCard key={t.id} {...cardProps(t)} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SeleccionPosicionCajaModal
        open={showPosicionModal}
        onOpenChange={setShowPosicionModal}
        onConfirm={({ idPosicionCaja, cajaLabel }) => {
          setPosicionCajaId(idPosicionCaja)
          setPosicionLabel(cajaLabel)
        }}
      />
    </div>
  )
}
