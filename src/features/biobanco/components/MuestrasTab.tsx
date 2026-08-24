import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react'
import {
  Plus, Edit, Trash2, Search, TestTube, AlertCircle,
  Paperclip, ArrowRightFromLine, History, FlaskConical,
  ChevronDown, ChevronUp, MapPinOff, ClipboardList, X, Printer, Tag,
  EyeOff, Eye, Ban, Boxes, ScanLine,
} from 'lucide-react'
import { useGetMuestras, useDeleteMuestra, useDarDeBajaMuestra, useGetAllTraslados, useCancelarPrestamo, useGetTiposMuestraActivos, useListarImpresoras, useImprimirEtiqueta, useImprimirAlicuotas, useImprimirLoteCompleto, useBuscarMuestraPorEtiqueta } from '../hooks/useBiobanco'
import { EscanearEtiquetaModal } from './EscanearEtiquetaModal'
import { useLectorCodigos } from '../hooks/useLectorCodigos'
import { getLabelDataEtiqueta, getLabelDataAlicuotas, getLabelDataLoteCompleto, imprimirAcomodado } from '../api/biobanco.api'
import { AcomodoCarrilesDialog } from '@/components/print/AcomodoCarrilesDialog'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import { PrintableLabelsView } from '@/components/print/PrintableLabelsView'
import { SedeBadge } from '@/components/common/SedeBadge'
import type { PrintableLabelBatchDTO } from '@/types/api'
import { MuestraFormModal } from './MuestraFormModal'
import { GenerarAlicuotasModal } from './GenerarAlicuotasModal'
import { TrasladarMuestraModal } from './TrasladarMuestraModal'
import { HistorialTrasladosModal } from './HistorialTrasladosModal'
import { UbicacionMuestra3DModal } from './ubicacion3d/UbicacionMuestra3DModal'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import { EstudiosMuestraPanel } from './EstudiosMuestraPanel'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDate } from '@/lib/utils'
import { MuestraDetalleDTO } from '@/types/api'

// ── Traslado helpers ──────────────────────────────────────────────────────────

type EstadoActivo = 'ENVIADA' | 'RECIBIDA' | 'EN_DEVOLUCION'
interface TrasladoInfo {
  idTraslado: number
  institucionNombre: string
  estado: EstadoActivo
  institucionOrigenId: number
  institucionDestinoId: number
}

function activeBadge(estado: EstadoActivo, isOrigen?: boolean) {
  switch (estado) {
    case 'ENVIADA':       return { label: 'En tránsito',   cls: 'border-amber-500/40  text-amber-700  dark:text-amber-400  bg-amber-500/10'  }
    case 'RECIBIDA':      return { label: 'Recibida',      cls: 'border-blue-500/40   text-blue-700   dark:text-blue-400   bg-blue-500/10'   }
    case 'EN_DEVOLUCION':
      return isOrigen
        ? { label: 'Por recibir',    cls: 'border-teal-500/40   text-teal-700   dark:text-teal-400   bg-teal-500/10'   }
        : { label: 'En devolución',  cls: 'border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10' }
  }
}

function activeCardBorder(estado: EstadoActivo, isOrigen?: boolean) {
  switch (estado) {
    case 'ENVIADA':       return 'border-amber-500/40'
    case 'RECIBIDA':      return 'border-blue-500/40'
    case 'EN_DEVOLUCION': return isOrigen ? 'border-teal-500/40' : 'border-orange-500/40'
  }
}

function activeBox(estado: EstadoActivo, isOrigen?: boolean) {
  switch (estado) {
    case 'ENVIADA':       return { wrap: 'bg-amber-500/10  border-amber-500/20',  title: 'text-amber-700  dark:text-amber-300',  body: 'text-amber-600  dark:text-amber-400'  }
    case 'RECIBIDA':      return { wrap: 'bg-blue-500/10   border-blue-500/20',   title: 'text-blue-700   dark:text-blue-300',   body: 'text-blue-600   dark:text-blue-400'   }
    case 'EN_DEVOLUCION':
      return isOrigen
        ? { wrap: 'bg-teal-500/10   border-teal-500/20',   title: 'text-teal-700   dark:text-teal-300',   body: 'text-teal-600   dark:text-teal-400'   }
        : { wrap: 'bg-orange-500/10 border-orange-500/20', title: 'text-orange-700 dark:text-orange-300', body: 'text-orange-600 dark:text-orange-400' }
  }
}

// ── Acciones compartidas ──────────────────────────────────────────────────────

interface SharedActions {
  puedeTraslado: boolean
  puedeCancelarTraslado: boolean
  puedeEliminarDocs: boolean
  puedeDarBaja: boolean
  userUuid: string
  canUpload: boolean
  myInstitucionId?: number
  onEdit: (m: MuestraDetalleDTO) => void
  onTrasladoClick: (m: MuestraDetalleDTO) => void
  onCancelarEnvio: (idTraslado: number, motivo: string) => void
  onHistorial: (m: MuestraDetalleDTO) => void
  onDocumentos: (id: number) => void
  onResultados: (m: MuestraDetalleDTO) => void
  onGenerarAlicuotas: (m: MuestraDetalleDTO) => void
  onDelete: (id: number) => void
  onDarBaja: (id: number, motivo: string) => void
  onPrintEtiqueta: (id: number) => void
  onPrintAlicuotas: (id: number) => void
  onPrintLoteCompleto: (id: number) => void
  onVerUbicacion3D: (m: MuestraDetalleDTO) => void
}

function DarDeBajaButton({
  muestra,
  onDarBaja,
}: {
  muestra: MuestraDetalleDTO
  onDarBaja: (id: number, motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <AlertDialog onOpenChange={(open) => { if (!open) setMotivo('') }}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline" size="sm"
          className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
          title="Dar de baja (irreversible)"
        >
          <Ban className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Dar de baja la muestra {muestra.etiqueta}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es <strong>irreversible</strong>. La muestra pasará a estado BAJA:
            se libera su posición (si tenía), no se podrá prestar, alicuotar ni aplicar
            estudios. El historial y los estudios ya realizados se conservan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-xs font-medium">Motivo (obligatorio)</label>
          <textarea
            className="w-full rounded border bg-background px-2 py-1 text-xs"
            rows={3}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la baja..."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDarBaja(muestra.id, motivo.trim())}
            disabled={motivo.trim().length === 0}
            className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Dar de baja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MuestraFooter({
  muestra,
  trasladoInfo,
  actions,
  numAlicuotas = 0,
}: {
  muestra: MuestraDetalleDTO
  trasladoInfo: TrasladoInfo | undefined
  actions: SharedActions
  numAlicuotas?: number
}) {
  const [cancelMotivo, setCancelMotivo] = useState('')
  const esTrasladada = !!trasladoInfo
  const isPrestada = muestra.estadoMuestra === 'PRESTADA'
  const noEsMia = muestra.idInstitucion != null
    && actions.myInstitucionId != null
    && muestra.idInstitucion !== actions.myInstitucionId
  const noEnMiPosesion = muestra.idInstitucionActual != null
    && actions.myInstitucionId != null
    && muestra.idInstitucionActual !== actions.myInstitucionId
  const noEditable = isPrestada || noEsMia || noEnMiPosesion
  const esBaja = muestra.estadoMuestra === 'BAJA'
  // Una muestra dada de baja no puede prestarse: el backend lo rechaza con 409.
  // Sin esta condicion se ofrecia una accion condenada a fallar.
  const puedeEnviar = !esTrasladada && !noEnMiPosesion && actions.puedeTraslado && !esBaja
  const puedeCancel = trasladoInfo?.estado === 'ENVIADA' && actions.puedeCancelarTraslado
  const esPadre = muestra.idMuestraPadre == null

  return (
    <CardFooter className="flex flex-wrap gap-2 pt-3 border-t mt-auto">
      <Button
        variant="outline" size="sm"
        onClick={() => actions.onEdit(muestra)}
        className="flex-1"
        disabled={noEditable}
        title={noEnMiPosesion ? 'Muestra fuera de este biobanco' : isPrestada ? 'No se puede editar una muestra en tránsito' : noEsMia ? 'Solo la institución propietaria puede editar' : undefined}
      >
        <Edit className="mr-1 h-3 w-3" />
        Editar
      </Button>

      {esPadre && !noEnMiPosesion && !isPrestada && numAlicuotas === 0 && (
        <Button
          variant="outline" size="sm"
          onClick={() => actions.onGenerarAlicuotas(muestra)}
          className="text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
          title="Generar alícuotas"
        >
          <FlaskConical className="h-3 w-3 mr-1" />
          Alícuotas
        </Button>
      )}

      {puedeEnviar && (
        <Button
          variant="outline" size="sm"
          onClick={() => actions.onTrasladoClick(muestra)}
          className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
          title="Trasladar a institución externa"
        >
          <ArrowRightFromLine className="h-3 w-3" />
        </Button>
      )}

      {puedeCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              title="Cancelar envío — devolver muestra al biobanco"
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar el envío de {muestra.etiqueta}?</AlertDialogTitle>
              <AlertDialogDescription>
                La muestra <strong>{muestra.etiqueta}</strong> está en tránsito hacia{' '}
                <strong>{trasladoInfo!.institucionNombre}</strong>. Al cancelar, el préstamo quedará
                anulado y la muestra regresará a estado <strong>Sin Posición</strong> en tu institución.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5 py-2">
              <label className="text-xs font-medium">Motivo de la cancelación</label>
              <Input
                placeholder="Motivo (máx. 100 caracteres)"
                maxLength={100}
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground text-right">{cancelMotivo.length}/100</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelMotivo('')}>Mantener envío</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { actions.onCancelarEnvio(trasladoInfo!.idTraslado, cancelMotivo.trim()); setCancelMotivo('') }}
                className="bg-rose-600 text-white hover:bg-rose-700"
                disabled={!cancelMotivo.trim()}
              >
                Sí, cancelar envío
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* El 3D solo tiene sentido cuando la muestra esta fisicamente aqui y en
          una posicion: prestada o sin posicion, la tarjeta ya dice donde esta. */}
      {muestra.ubicacion && !isPrestada && !noEnMiPosesion && (
        <Button
          variant="outline" size="sm"
          onClick={() => actions.onVerUbicacion3D(muestra)}
          title="Ver ubicación en 3D"
          className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
        >
          <Boxes className="h-3 w-3" />
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={() => actions.onHistorial(muestra)} title="Historial de traslados">
        <History className="h-3 w-3" />
      </Button>

      <Button
        variant="outline" size="sm"
        onClick={() => actions.onResultados(muestra)}
        title="Resultados de calidad"
        className="text-primary border-primary/30 hover:bg-primary/10"
      >
        <ClipboardList className="h-3 w-3" />
      </Button>

      <Button variant="outline" size="sm" onClick={() => actions.onDocumentos(muestra.id)} title="Documentos adjuntos">
        <Paperclip className="h-3 w-3" />
      </Button>

      <Button
        variant="outline" size="sm"
        onClick={() => actions.onPrintEtiqueta(muestra.id)}
        title="Imprimir etiqueta"
        className="text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
      >
        <Printer className="h-3 w-3" />
      </Button>

      {esPadre && numAlicuotas > 0 && (
        <Button
          variant="outline" size="sm"
          onClick={() => actions.onPrintLoteCompleto(muestra.id)}
          title="Imprimir padre + todas las alícuotas"
          className="text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
        >
          <Printer className="h-3 w-3 mr-1" />
          Todo
        </Button>
      )}

      {/* Dar de baja: solo la institución propietaria, y si la muestra no está en tránsito */}
      {actions.puedeDarBaja && !noEsMia && !isPrestada && muestra.estadoMuestra !== 'BAJA' && (
        <DarDeBajaButton muestra={muestra} onDarBaja={actions.onDarBaja} />
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline" size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            title={noEnMiPosesion ? 'Muestra fuera de este biobanco' : isPrestada ? 'No se puede eliminar una muestra en tránsito' : noEsMia ? 'Solo la institución propietaria puede eliminar' : 'Eliminar muestra'}
            disabled={noEditable}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar muestra {muestra.etiqueta}?</AlertDialogTitle>
            <AlertDialogDescription>
              La muestra <strong>{muestra.etiqueta}</strong>
              {muestra.paciente ? ` del participante ${muestra.paciente.nombreCompleto}` : ''} será
              eliminada permanentemente junto con sus alícuotas, estudios e historial.
              Para eliminarla, ninguna alícuota debe tener posición en caja asignada.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actions.onDelete(muestra.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardFooter>
  )
}

// ── Card muestra padre ────────────────────────────────────────────────────────

interface PadreCardProps {
  muestra: MuestraDetalleDTO
  numAlicuotas: number
  trasladoInfo: TrasladoInfo | undefined
  isExpanded: boolean
  onToggle: () => void
  actions: SharedActions
}

/**
 * Envoltorio que identifica cada tarjeta en el DOM y la enmarca cuando fue la
 * localizada por el lector.
 *
 * El `data-muestra-id` es lo que permite hacer scroll hasta ella sin sacar una
 * ref por tarjeta, que con las alícuotas apareciendo y desapareciendo del grid
 * sería un mapa de refs que hay que limpiar a mano.
 *
 * Conserva `h-full` porque este div pasa a ser la celda del grid: sin él, la
 * tarjeta deja de estirarse y las alturas de la fila se descuadran.
 */
function MarcoLocalizada({ id, resaltada, children }: {
  id: number
  resaltada: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-muestra-id={id}
      className={`h-full rounded-lg transition-all duration-500 ${
        resaltada
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg'
          : 'ring-0'
      }`}
    >
      {children}
    </div>
  )
}

function PadreCard({ muestra, numAlicuotas, trasladoInfo, isExpanded, onToggle, actions }: PadreCardProps) {
  const isOrigen = trasladoInfo ? trasladoInfo.institucionOrigenId === actions.myInstitucionId : undefined
  const badge = trasladoInfo ? activeBadge(trasladoInfo.estado, isOrigen) : null
  const box   = trasladoInfo ? activeBox(trasladoInfo.estado, isOrigen) : null
  const noEnMiPosesion = muestra.idInstitucionActual != null
    && actions.myInstitucionId != null
    && muestra.idInstitucionActual !== actions.myInstitucionId
  const esMia = muestra.idInstitucion != null
    && muestra.idInstitucion === actions.myInstitucionId

  return (
    <div className="relative h-full">
      <Card className={`h-full flex flex-col ${noEnMiPosesion ? 'opacity-60' : ''} ${trasladoInfo ? activeCardBorder(trasladoInfo.estado, isOrigen) : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-mono leading-tight">{muestra.etiqueta}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <SedeBadge
                  idInstitucion={muestra.idInstitucion}
                  nombreInstitucion={muestra.nombreInstitucion}
                />
                {muestra.tipoMuestra && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
                    <FlaskConical className="h-2.5 w-2.5" />
                    {muestra.tipoMuestra.nombre}
                  </span>
                )}
                {muestra.tuboMuestra && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
                    <TestTube className="h-2.5 w-2.5" />
                    {muestra.tuboMuestra.nombre}
                  </span>
                )}
                {numAlicuotas > 0 && (
                  <span className="inline-flex items-center text-[10px] font-medium text-primary border border-primary/30 bg-primary/5 rounded-full px-2 py-0.5">
                    {numAlicuotas} alícuota{numAlicuotas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {/* La baja es irreversible y define el estado de la muestra, asi que
                  se antepone a cualquier distintivo de ubicacion: antes, una muestra
                  dada de baja se veia igual que una activa sin posicion asignada. */}
              {muestra.estadoMuestra === 'BAJA' ? (
                <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 whitespace-nowrap text-xs">
                  Dada de baja
                </Badge>
              ) : trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
                <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                  {badge!.label}
                </Badge>
              ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
                <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                  {badge!.label}
                </Badge>
              ) : noEnMiPosesion && esMia ? (
                <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400 bg-gray-500/10 text-xs">
                  Fuera
                </Badge>
              ) : noEnMiPosesion && !esMia ? (
                <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs">
                  Devuelta
                </Badge>
              ) : muestra.ubicacion ? (
                <Badge variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400 bg-green-500/10 text-xs">
                  En biobanco
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-xs">
                  Sin ubicación
                </Badge>
              )}
              {!esMia && muestra.idInstitucion != null && (
                <Badge variant="outline" className="border-purple-500/40 text-purple-700 dark:text-purple-400 bg-purple-500/10 text-xs">
                  Externa
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Valor:</span>
              <p className="text-muted-foreground">{muestra.valor != null ? `${muestra.valor} ${muestra.unidad ?? ''}` : '—'}</p>
            </div>
            <div>
              <span className="font-medium">Recolección:</span>
              <p className="text-muted-foreground">{formatDate(muestra.fechaRecoleccion)}</p>
            </div>
          </div>

          <div className="text-sm">
            <span className="font-medium">Participante:</span>
            <p className="text-muted-foreground truncate">
              {muestra.paciente ? `${muestra.paciente.folio} — ${muestra.paciente.nombreCompleto}` : '—'}
            </p>
            {muestra.paciente && muestra.paciente.activo === false && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-700 dark:text-red-400 border border-red-500/40 bg-red-500/10 rounded-full px-2 py-0.5 mt-1">
                <Ban className="h-2.5 w-2.5" />
                En cuarentena (participante inactivo)
              </span>
            )}
          </div>

          {trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
            <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
              <span className={`font-medium ${box!.title}`}>En tránsito:</span>
              <p className={`text-xs mt-0.5 ${box!.body}`}>Pendiente de recepción</p>
            </div>
          ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
            <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
              <span className={`font-medium ${box!.title}`}>{isOrigen ? 'Por recibir:' : 'Devolución:'}</span>
              <p className={`text-xs mt-0.5 ${box!.body}`}>{isOrigen ? 'Pendiente de recepción' : 'En proceso de devolución'}</p>
            </div>
          ) : noEnMiPosesion ? (
            <div className={`text-sm rounded-md border px-2 py-1.5 ${esMia ? 'border-gray-300/40 bg-gray-500/5' : 'border-blue-300/40 bg-blue-500/5'}`}>
              <span className={`font-medium ${esMia ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>Ubicación:</span>
              <p className={`text-xs mt-0.5 ${esMia ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                En biobanco de {muestra.nombreInstitucionActual ?? 'otra institución'}
              </p>
            </div>
          ) : muestra.ubicacion ? (
            <div className="text-sm">
              <span className="font-medium">Ubicación:</span>
              <p className="text-muted-foreground text-xs">
                {muestra.ubicacion.codigoCaja} — F{muestra.ubicacion.fila} C{muestra.ubicacion.columna}
                {' '}(Piso {muestra.ubicacion.numeroPiso}, {muestra.ubicacion.codigoRefrigerador})
              </p>
            </div>
          ) : (
            <div className="text-sm invisible select-none" aria-hidden>
              <span className="font-medium">Ubicación:</span>
              <p className="text-xs">—</p>
            </div>
          )}

          {muestra.observaciones ? (
            <div className="text-sm">
              <span className="font-medium">Observaciones:</span>
              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{muestra.observaciones}</p>
            </div>
          ) : (
            <div className="text-sm invisible select-none" aria-hidden>
              <span className="font-medium">Observaciones:</span>
              <p className="text-xs mt-1">—</p>
            </div>
          )}
        </CardContent>

        <MuestraFooter muestra={muestra} trasladoInfo={trasladoInfo} actions={actions} numAlicuotas={numAlicuotas} />
      </Card>

      {/* Botón toggle circular — mitad dentro / mitad fuera del borde derecho, centrado */}
      {numAlicuotas > 0 && (
        <button
          onClick={onToggle}
          title={isExpanded ? 'Colapsar alícuotas' : `Ver ${numAlicuotas} alícuota${numAlicuotas !== 1 ? 's' : ''}`}
          className="
            absolute right-0 top-1/2
            translate-x-1/2 -translate-y-1/2
            z-10
            h-7 w-7 rounded-full
            flex items-center justify-center
            bg-background border border-border shadow-sm
            hover:bg-muted transition-colors
          "
        >
          {isExpanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>
      )}
    </div>
  )
}

// ── Card alícuota (hijo) — mismo esqueleto que padre, tono atenuado ───────────

interface AlicuotaCardProps {
  muestra: MuestraDetalleDTO
  trasladoInfo: TrasladoInfo | undefined
  actions: SharedActions
}

function AlicuotaCard({ muestra, trasladoInfo, actions }: AlicuotaCardProps) {
  const esTrasladada = !!trasladoInfo
  const isOrigen = trasladoInfo ? trasladoInfo.institucionOrigenId === actions.myInstitucionId : undefined
  const badge  = trasladoInfo ? activeBadge(trasladoInfo.estado, isOrigen) : null
  const box    = trasladoInfo ? activeBox(trasladoInfo.estado, isOrigen) : null
  const noEnMiPosesion = muestra.idInstitucionActual != null
    && actions.myInstitucionId != null
    && muestra.idInstitucionActual !== actions.myInstitucionId
  const sinUbicacion = !muestra.ubicacion && !esTrasladada && !noEnMiPosesion
  const esPrestada = muestra.idInstitucion != null
    && actions.myInstitucionId != null
    && muestra.idInstitucion !== actions.myInstitucionId

  return (
    <Card className={`
      h-full flex flex-col border border-dashed ${noEnMiPosesion ? 'opacity-50' : 'opacity-80'}
      ${trasladoInfo ? activeCardBorder(trasladoInfo.estado, isOrigen) : 'border-muted-foreground/40'}
      bg-muted/20
    `}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-mono leading-tight text-muted-foreground">
              {muestra.etiqueta}
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Siempre visible: una misma muestra padre puede tener alícuotas
                  generadas por cada institución por la que ha pasado, y ocultar
                  las propias las volvería indistinguibles de las ajenas. */}
              <SedeBadge
                idInstitucion={muestra.idInstitucion}
                nombreInstitucion={muestra.nombreInstitucion}
                mostrarSiempre
                accion="Generada por"
              />
              {muestra.numeroAlicuota != null && muestra.totalAlicuotas != null && (
                <span className="inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-full px-2 py-0.5">
                  Alíc. {muestra.numeroAlicuota}/{muestra.totalAlicuotas}
                </span>
              )}
              {muestra.tuboMuestra && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
                  <TestTube className="h-2.5 w-2.5" />
                  {muestra.tuboMuestra.nombre}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
              <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                {badge!.label}
              </Badge>
            ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
              <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                {badge!.label}
              </Badge>
            ) : noEnMiPosesion && !esPrestada ? (
              <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400 bg-gray-500/10 text-xs">
                Fuera
              </Badge>
            ) : noEnMiPosesion && esPrestada ? (
              <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs">
                Devuelta
              </Badge>
            ) : sinUbicacion ? (
              <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-xs">
                Sin ubicación
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50 text-xs">
                En biobanco
              </Badge>
            )}
            {esPrestada && (
              <Badge variant="outline" className="border-purple-500/40 text-purple-700 dark:text-purple-400 bg-purple-500/10 text-xs">
                Externa
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Volumen:</span>
            <p className="text-muted-foreground">{muestra.valor != null ? `${muestra.valor} ${muestra.unidad ?? ''}` : '—'}</p>
          </div>
          <div>
            <span className="font-medium">Recolección:</span>
            <p className="text-muted-foreground">{formatDate(muestra.fechaRecoleccion)}</p>
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium">Participante:</span>
          <p className="text-muted-foreground truncate">
            {muestra.paciente ? `${muestra.paciente.folio} — ${muestra.paciente.nombreCompleto}` : '—'}
          </p>
        </div>

        {trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
          <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
            <span className={`font-medium ${box!.title}`}>En tránsito:</span>
            <p className={`text-xs mt-0.5 ${box!.body}`}>Pendiente de recepción</p>
          </div>
        ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
          <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
            <span className={`font-medium ${box!.title}`}>{isOrigen ? 'Por recibir:' : 'Devolución:'}</span>
            <p className={`text-xs mt-0.5 ${box!.body}`}>{isOrigen ? 'Pendiente de recepción' : 'En proceso de devolución'}</p>
          </div>
        ) : noEnMiPosesion ? (
          <div className={`text-sm rounded-md border px-2 py-1.5 ${!esPrestada ? 'border-gray-300/40 bg-gray-500/5' : 'border-blue-300/40 bg-blue-500/5'}`}>
            <span className={`font-medium ${!esPrestada ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>Ubicación:</span>
            <p className={`text-xs mt-0.5 ${!esPrestada ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
              En biobanco de {muestra.nombreInstitucionActual ?? 'otra institución'}
            </p>
          </div>
        ) : muestra.ubicacion ? (
          <div className="text-sm">
            <span className="font-medium">Ubicación:</span>
            <p className="text-muted-foreground text-xs">
              {muestra.ubicacion.codigoCaja} — F{muestra.ubicacion.fila} C{muestra.ubicacion.columna}
              {' '}(Piso {muestra.ubicacion.numeroPiso}, {muestra.ubicacion.codigoRefrigerador})
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-1.5">
            <MapPinOff className="h-3.5 w-3.5 shrink-0" />
            <span>Sin posición asignada — edita para asignar una caja</span>
          </div>
        )}

        {/* Placeholder observaciones para igualar altura */}
        <div className="text-sm invisible select-none" aria-hidden>
          <span className="font-medium">Observaciones:</span>
          <p className="text-xs mt-1">—</p>
        </div>
      </CardContent>

      <MuestraFooter muestra={muestra} trasladoInfo={trasladoInfo} actions={actions} />
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function MuestrasTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)
  const puedeCrear = useAuthStore((s) => s.hasPermiso('MUESTRAS_CREAR'))
  const puedeTraslado = useAuthStore((s) => s.hasPermiso('TRASLADOS_CREAR'))
  const puedeCancelarTraslado = useAuthStore((s) => s.hasPermiso('TRASLADOS_CANCELAR'))
  const puedeEliminarDocs = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_ELIMINAR'))
  const puedeDarBaja = useAuthStore((s) => s.hasPermiso('MUESTRAS_DAR_BAJA'))
  const canUploadMuestra = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_SUBIR'))
  const puedeImprimir = useAuthStore((s) => s.hasPermiso('MUESTRAS_IMPRIMIR'))
  const puedeEscanear = useAuthStore((s) => s.hasPermiso('MUESTRAS_ESCANEAR'))
  const puedeEditarMuestra = useAuthStore((s) => s.hasPermiso('MUESTRAS_EDITAR'))

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [isMuestraModalOpen, setIsMuestraModalOpen] = useState(false)
  const [editingMuestra, setEditingMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [docMuestraId, setDocMuestraId] = useState<number | null>(null)
  const [ubicacion3DMuestra, setUbicacion3DMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [trasladandoMuestra, setTrasladandoMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [pendingTraslado, setPendingTraslado] = useState<MuestraDetalleDTO | null>(null)
  const [historialMuestra, setHistorialMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [resultadosMuestra, setResultadosMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [generarAlicuotasMuestra, setGenerarAlicuotasMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [hideDevueltasHuerfanas, setHideDevueltasHuerfanas] = useState(true)
  const [incluirHistorico, setIncluirHistorico] = useState(false)

  // ── Búsqueda por etiqueta leída ────────────────────────────────────────────
  const [escanerAbierto, setEscanerAbierto] = useState(false)
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  /** Muestra localizada por el último escaneo: se resalta hasta que se toque otra cosa. */
  const [resaltadaId, setResaltadaId] = useState<number | null>(null)

  const { data: muestras, isLoading } = useGetMuestras({ incluirHistorico })
  const { data: traslados = [] } = useGetAllTraslados()
  const { data: tiposActivos = [], isLoading: isLoadingTiposMuestra } = useGetTiposMuestraActivos()
  const deleteMuestraMutation = useDeleteMuestra()
  const darBajaMutation = useDarDeBajaMuestra()
  const cancelarPrestamoMutation = useCancelarPrestamo()
  const { data: impresoras = [] } = useListarImpresoras({ enabled: puedeImprimir })
  const { data: configuracionesEtiqueta = [] } = useGetConfiguracionesActivas({ enabled: puedeImprimir })
  const imprimirEtiquetaMut = useImprimirEtiqueta()
  const imprimirAlicuotasMut = useImprimirAlicuotas()
  const imprimirLoteMut = useImprimirLoteCompleto()

  const [browserPrintData, setBrowserPrintData] = useState<PrintableLabelBatchDTO | null>(null)
  // Lote a acomodar sobre los carriles del rollo antes de mandarlo a la Zebra.
  const [acomodoRollo, setAcomodoRollo] = useState<PrintableLabelBatchDTO | null>(null)
  const [enviandoAcomodo, setEnviandoAcomodo] = useState(false)

  const [selectedPrinter, setSelectedPrinter] = useState<string>(() =>
    localStorage.getItem('zebra-printer-name') ?? ''
  )
  const handleSelectPrinter = (val: string) => {
    setSelectedPrinter(val)
    localStorage.setItem('zebra-printer-name', val)
  }

  const configPredeterminada = configuracionesEtiqueta.find((c) => c.predeterminada)
  const [selectedConfigId, setSelectedConfigId] = useState<number | undefined>(undefined)
  const resolvedConfigId = selectedConfigId ?? configPredeterminada?.id

  const hayTiposConTubos = tiposActivos.some((t) => t.tubos.some((tb) => tb.activo))
  const puedeCrearMuestra = puedeCrear && !isLoadingTiposMuestra && hayTiposConTubos

  const trasladosActivos = useMemo(() => {
    // Solo ENVIADA y EN_DEVOLUCION representan tránsito real: RECIBIDA significa
    // que el destino ya tiene la muestra físicamente y puede operar sobre ella
    // (incluyendo prestarla a un tercer eslabón de la cadena de custodia).
    // Preferimos el traslado más reciente si hay varios activos para la misma muestra.
    const ESTADOS_ACTIVOS: EstadoActivo[] = ['ENVIADA', 'EN_DEVOLUCION']
    const map = new Map<number, TrasladoInfo>()
    const ordenados = [...traslados].sort(
      (a, b) => new Date(b.fechaTraslado).getTime() - new Date(a.fechaTraslado).getTime()
    )
    ordenados.forEach((t) => {
      if ((ESTADOS_ACTIVOS as string[]).includes(t.estado) && !map.has(t.muestra.id)) {
        map.set(t.muestra.id, {
          idTraslado: t.id,
          institucionNombre: t.institucionDestino.nombre,
          estado: t.estado as EstadoActivo,
          institucionOrigenId: t.institucionOrigen.id,
          institucionDestinoId: t.institucionDestino.id,
        })
      }
    })
    return map
  }, [traslados])

  // Separar padres de alícuotas — alícuotas cuyo padre no está visible se tratan como cards independientes
  const { padres, alicuotasByPadre } = useMemo(() => {
    const all = muestras ?? []
    const padresArr: MuestraDetalleDTO[] = []
    const byPadre = new Map<number, MuestraDetalleDTO[]>()
    const padreIds = new Set(all.filter((m) => m.idMuestraPadre == null).map((m) => m.id))

    all.forEach((m) => {
      if (m.idMuestraPadre == null) {
        padresArr.push(m)
      } else if (padreIds.has(m.idMuestraPadre)) {
        const hijos = byPadre.get(m.idMuestraPadre) ?? []
        hijos.push(m)
        byPadre.set(m.idMuestraPadre, hijos)
      } else {
        padresArr.push(m)
      }
    })

    byPadre.forEach((hijos) =>
      hijos.sort((a, b) => (a.numeroAlicuota ?? 0) - (b.numeroAlicuota ?? 0))
    )

    return { padres: padresArr, alicuotasByPadre: byPadre }
  }, [muestras])

  const huerfanasDevueltasCount = useMemo(() => {
    return padres.filter((m) => {
      if (m.idMuestraPadre == null) return false
      const esExterna = m.idInstitucion != null && m.idInstitucion !== myInstitucionId
      const fueraDeMiBiobanco = m.idInstitucionActual != null && m.idInstitucionActual !== myInstitucionId
      return esExterna && fueraDeMiBiobanco
    }).length
  }, [padres, myInstitucionId])

  /** Coincidencia de una muestra suelta contra el texto buscado. */
  const coincide = (m: MuestraDetalleDTO, term: string) => {
    const pacienteStr = m.paciente ? `${m.paciente.folio} ${m.paciente.nombreCompleto}` : ''
    return (
      m.etiqueta.toLowerCase().includes(term) ||
      (m.unidad ?? '').toLowerCase().includes(term) ||
      pacienteStr.toLowerCase().includes(term) ||
      (m.tipoMuestra?.nombre ?? '').toLowerCase().includes(term) ||
      (m.tuboMuestra?.nombre ?? '').toLowerCase().includes(term)
    )
  }

  /*
   * El filtro corre sobre las muestras padre, pero las alícuotas no están en esa
   * lista: viven plegadas dentro de su padre. Comparar solo contra la padre hacía
   * que buscar la etiqueta de una alícuota vaciara la pantalla — la padre no
   * coincide, desaparece, y con ella la alícuota que sí coincidía.
   *
   * Una padre se conserva si coincide ella o si coincide alguna de sus alícuotas,
   * y en ese segundo caso se despliega sola: mostrarla plegada dejaría al usuario
   * mirando una tarjeta que no dice nada de lo que buscó.
   */
  const { filteredPadres, expandidasPorBusqueda } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const porBusqueda = new Set<number>()

    const lista = padres.filter((m) => {
      if (hideDevueltasHuerfanas && m.idMuestraPadre != null) {
        const esExterna = m.idInstitucion != null && m.idInstitucion !== myInstitucionId
        const fueraDeMiBiobanco = m.idInstitucionActual != null && m.idInstitucionActual !== myInstitucionId
        if (esExterna && fueraDeMiBiobanco) return false
      }
      if (!term) return true
      if (coincide(m, term)) return true

      const alicuotaCoincide = (alicuotasByPadre.get(m.id) ?? []).some((a) => coincide(a, term))
      if (alicuotaCoincide) porBusqueda.add(m.id)
      return alicuotaCoincide
    })

    return { filteredPadres: lista, expandidasPorBusqueda: porBusqueda }
  }, [padres, alicuotasByPadre, searchTerm, hideDevueltasHuerfanas, myInstitucionId])

  /*
   * Las padres que solo coinciden por una alicuota se despliegan solas.
   *
   * Se siembra en el estado en lugar de calcularlo en el render: si `isExpanded`
   * fuera derivado, el boton de plegar dejaria de responder en esas tarjetas
   * —al quitarla de expandedIds seguiria expandida por la busqueda—. Sembrandolo,
   * el toggle vuelve a mandar y el usuario puede cerrarla si quiere.
   */
  useEffect(() => {
    if (expandidasPorBusqueda.size === 0) return
    setExpandedIds((prev) => {
      const faltantes = [...expandidasPorBusqueda].filter((id) => !prev.has(id))
      if (faltantes.length === 0) return prev   // sin cambios: React no re-renderiza
      const next = new Set(prev)
      faltantes.forEach((id) => next.add(id))
      return next
    })
  }, [expandidasPorBusqueda])

  const toggleExpanded = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleEdit = (m: MuestraDetalleDTO) => { setEditingMuestra(m); setIsMuestraModalOpen(true) }

  // ── Escaneo: de la etiqueta al formulario de edición ───────────────────────

  const buscarPorEtiqueta = useBuscarMuestraPorEtiqueta()

  /**
   * La muestra recién localizada, en espera de que la fila exista en el DOM.
   *
   * Hace falta un paso intermedio porque entre resolver la etiqueta y poder
   * hacer scroll pasan varios renders: puede que haya que encender el histórico
   * —lo que vuelve a pedir la lista al servidor—, limpiar el filtro de texto y
   * desplegar la muestra padre. Intentar el scroll en el mismo tick no encuentra
   * nada. Este efecto reintenta cuando la lista cambia.
   */
  const pendienteDeLocalizar = useRef<{ id: number; abrirEdicion: boolean } | null>(null)

  const resolverEtiqueta = useCallback(async (codigo: string) => {
    setErrorEscaneo(null)
    try {
      const res = await buscarPorEtiqueta.mutateAsync(codigo)
      const m = res.muestra

      // La lista se deja en condiciones de mostrarla antes de buscarla.
      if (res.requiereHistorico) setIncluirHistorico(true)
      // Una alícuota huérfana devuelta está oculta tras su propio filtro.
      setHideDevueltasHuerfanas(false)
      // El texto de la etiqueta queda en la búsqueda: es lo que pidió el usuario
      // —que quede indexada— y de paso deja la lista reducida a lo pertinente.
      setSearchTerm(m.etiqueta)
      // Si es alícuota, su fila solo existe con la muestra padre desplegada.
      if (res.idMuestraPadre != null) {
        setExpandedIds((prev) => new Set(prev).add(res.idMuestraPadre as number))
      }

      setResaltadaId(m.id)
      pendienteDeLocalizar.current = { id: m.id, abrirEdicion: puedeEditarMuestra }
      setEscanerAbierto(false)
      toast.success(`Muestra ${m.etiqueta} localizada`)
    } catch (e: any) {
      const msg = e?.response?.data?.message
        || 'No se pudo resolver la etiqueta leída.'
      setErrorEscaneo(msg)
      // Si el escáner está cerrado (lector físico) el error se ve como aviso;
      // con la cámara abierta se pinta dentro del modal y no se interrumpe.
      if (!escanerAbierto) toast.error(msg)
    }
  }, [buscarPorEtiqueta, puedeEditarMuestra, escanerAbierto])

  // Lector conectado: funciona con el listado a la vista, sin abrir nada.
  useLectorCodigos({
    activo: puedeEscanear && !escanerAbierto && !isMuestraModalOpen,
    onLectura: resolverEtiqueta,
  })

  const temporizadorEdicion = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sin array de dependencias a propósito: se reintenta en cada render hasta que
  // la fila aparece. El temporizador NO se limpia aquí — este efecto vuelve a
  // correr constantemente y su limpieza cancelaría el diálogo antes de abrirlo.
  useEffect(() => {
    const pendiente = pendienteDeLocalizar.current
    if (!pendiente) return

    const nodo = document.querySelector<HTMLElement>(`[data-muestra-id="${pendiente.id}"]`)
    if (!nodo) return   // aún no está pintada; el próximo render lo reintenta

    pendienteDeLocalizar.current = null
    nodo.scrollIntoView({ behavior: 'smooth', block: 'center' })

    if (!pendiente.abrirEdicion) return
    // Se deja terminar el desplazamiento antes de abrir el diálogo: si se abre
    // encima, el usuario no llega a ver dónde estaba la muestra.
    temporizadorEdicion.current = setTimeout(() => {
      const encontrada = muestras?.find((m) => m.id === pendiente.id)
      if (encontrada) handleEdit(encontrada)
    }, 550)
  })

  // Cancelar solo al desmontar: si el usuario sale de la tab a medio camino, no
  // debe abrirse un diálogo sobre otra pantalla.
  useEffect(() => () => {
    if (temporizadorEdicion.current) clearTimeout(temporizadorEdicion.current)
  }, [])
  const handleDelete = async (id: number) => { await deleteMuestraMutation.mutateAsync(id) }
  const handleDarBaja = async (id: number, motivo: string) => {
    if (!motivo || motivo.trim().length === 0) return
    await darBajaMutation.mutateAsync({ id, motivo: motivo.trim() })
  }
  const handleModalClose = () => { setIsMuestraModalOpen(false); setEditingMuestra(null) }

  const handleTrasladoClick = (m: MuestraDetalleDTO) => setPendingTraslado(m)
  const handleConfirmTraslado = () => {
    if (pendingTraslado) { setTrasladandoMuestra(pendingTraslado); setPendingTraslado(null) }
  }

  const handleCancelarEnvio = async (idTraslado: number, motivo: string) => {
    await cancelarPrestamoMutation.mutateAsync({
      idTraslado,
      data: { uuidUsuario: userUuid, motivo: motivo || 'Cancelación desde el panel de muestras' },
    })
  }

  const isBrowserPrint = selectedPrinter === '__browser__'

  const handlePrintEtiqueta = async (id: number) => {
    if (!resolvedConfigId) { toast.error('No hay configuración de etiqueta. Cree una en Configuración > Etiquetas.'); return }
    if (isBrowserPrint) {
      try {
        const data = await getLabelDataEtiqueta(id, resolvedConfigId)
        setBrowserPrintData(data)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Error al obtener datos de etiqueta')
      }
      return
    }
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }
    try {
      await imprimirEtiquetaMut.mutateAsync({ idMuestra: id, impresora: imp, configuracionId: resolvedConfigId })
      toast.success('Etiqueta enviada a la impresora')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al imprimir'
      toast.error(msg)
    }
  }

  /**
   * En rollo, antes de imprimir un lote se abre el acomodo por carriles.
   *
   * La Zebra avanza el papel por filas completas: mandar el lote directo deja en
   * blanco los carriles sobrantes de la última fila, y esos troqueles se pierden.
   * Pasar por el acomodo permite decidir en qué carril cae cada etiqueta.
   */
  const abrirAcomodoRollo = async (
    cargar: () => Promise<PrintableLabelBatchDTO>,
  ): Promise<boolean> => {
    try {
      const data = await cargar()
      if (data.etiquetas.some((e) => e.id == null)) return false
      setAcomodoRollo(data)
      return true
    } catch {
      return false
    }
  }

  const handlePrintAlicuotas = async (id: number) => {
    if (!resolvedConfigId) { toast.error('No hay configuración de etiqueta. Cree una en Configuración > Etiquetas.'); return }
    if (isBrowserPrint) {
      try {
        const data = await getLabelDataAlicuotas(id, resolvedConfigId)
        setBrowserPrintData(data)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Error al obtener datos de etiquetas')
      }
      return
    }
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }

    if (await abrirAcomodoRollo(() => getLabelDataAlicuotas(id, resolvedConfigId))) return

    // Si no se pudo preparar el acomodo, se imprime en secuencia como antes.
    try {
      const total = await imprimirAlicuotasMut.mutateAsync({ idMuestraPadre: id, impresora: imp, configuracionId: resolvedConfigId })
      toast.success(`${total} etiqueta(s) enviada(s) a la impresora`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al imprimir'
      toast.error(msg)
    }
  }

  const handlePrintLoteCompleto = async (id: number) => {
    if (!resolvedConfigId) { toast.error('No hay configuración de etiqueta. Cree una en Configuración > Etiquetas.'); return }
    if (isBrowserPrint) {
      try {
        const data = await getLabelDataLoteCompleto(id, resolvedConfigId)
        setBrowserPrintData(data)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Error al obtener datos de etiquetas')
      }
      return
    }
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }

    if (await abrirAcomodoRollo(() => getLabelDataLoteCompleto(id, resolvedConfigId))) return

    try {
      const total = await imprimirLoteMut.mutateAsync({ idMuestraPadre: id, impresora: imp, configuracionId: resolvedConfigId })
      toast.success(`${total} etiqueta(s) enviada(s) a la impresora (padre + alícuotas)`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al imprimir lote'
      toast.error(msg)
    }
  }

  /** Manda a la Zebra el acomodo que el operador armó en la cuadrícula. */
  const enviarAcomodo = async (slots: (number | null)[], marcoDepuracion: boolean) => {
    if (!acomodoRollo) return
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }

    setEnviandoAcomodo(true)
    try {
      const ids = slots.map((s) => (s === null ? null : acomodoRollo.etiquetas[s].id ?? null))
      const total = await imprimirAcomodado(imp, ids, resolvedConfigId, marcoDepuracion)
      toast.success(`${total} etiqueta(s) enviada(s) a la impresora`)
      setAcomodoRollo(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Error al imprimir')
    } finally {
      setEnviandoAcomodo(false)
    }
  }

  const actions: SharedActions = {
    puedeTraslado,
    puedeCancelarTraslado,
    puedeEliminarDocs,
    puedeDarBaja,
    userUuid,
    canUpload: canUploadMuestra,
    myInstitucionId,
    onEdit: handleEdit,
    onTrasladoClick: handleTrasladoClick,
    onCancelarEnvio: handleCancelarEnvio,
    onHistorial: setHistorialMuestra,
    onDocumentos: setDocMuestraId,
    onResultados: setResultadosMuestra,
    onGenerarAlicuotas: setGenerarAlicuotasMuestra,
    onDelete: handleDelete,
    onDarBaja: handleDarBaja,
    onPrintEtiqueta: handlePrintEtiqueta,
    onPrintAlicuotas: handlePrintAlicuotas,
    onPrintLoteCompleto: handlePrintLoteCompleto,
    onVerUbicacion3D: setUbicacion3DMuestra,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Muestras Biológicas</h2>
          <p className="text-muted-foreground text-sm">Gestiona el registro, ubicación y traslados de muestras</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {configuracionesEtiqueta.length > 0 && (
            <div className="flex items-center gap-1.5 border rounded-md px-2 py-1.5 text-sm">
              <Tag className="h-4 w-4 text-violet-600 shrink-0" />
              <select
                className="bg-transparent outline-none cursor-pointer max-w-[140px] truncate"
                value={resolvedConfigId ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedConfigId(val ? Number(val) : undefined)
                }}
              >
                {configuracionesEtiqueta.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.nombre}{cfg.predeterminada ? ' *' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {puedeImprimir && (
            <div className="flex items-center gap-1.5 border rounded-md px-2 py-1.5 text-sm">
              <Printer className="h-4 w-4 text-sky-600 shrink-0" />
              <select
                className="bg-transparent outline-none cursor-pointer max-w-[180px] truncate"
                value={selectedPrinter || (impresoras.length > 0 ? impresoras[0] : '__browser__')}
                onChange={(e) => handleSelectPrinter(e.target.value)}
              >
                <option value="__browser__">Impresora estándar (navegador)</option>
                {impresoras.map((imp) => (
                  <option key={imp} value={imp}>{imp}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => setIsMuestraModalOpen(true)}
            disabled={!puedeCrearMuestra}
            title={!puedeCrear ? 'No tienes permiso para crear muestras' : !puedeCrearMuestra ? 'Primero configura al menos un tipo de muestra con un tubo activo en la pestaña "Tipos de Muestra"' : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isLoadingTiposMuestra ? 'Cargando...' : 'Nueva Muestra'}
          </Button>
        </div>
      </div>

      {!isLoadingTiposMuestra && !hayTiposConTubos && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay tipos de muestra con tubos configurados. Ve a la pestaña <strong>Tipos de Muestra</strong> y crea al menos un tipo con un tubo activo para poder registrar muestras.
          </AlertDescription>
        </Alert>
      )}

      {puedeImprimir && configuracionesEtiqueta.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay configuraciones de etiqueta registradas. Cree una en{' '}
            <strong>Configuración &gt; Etiquetas</strong> para poder imprimir.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          Las muestras se almacenan en cajas criogénicas. Puedes trasladarlas a instituciones externas.
          Las alícuotas se despliegan pulsando el botón circular del borde derecho de la muestra padre.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por etiqueta, participante, tipo..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setResaltadaId(null) }}
            className="pl-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setResaltadaId(null) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              title="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {puedeEscanear && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setErrorEscaneo(null); setEscanerAbierto(true) }}
            className="text-xs"
            title="Leer la etiqueta con la cámara. Si tienes un lector conectado, dispara directamente sobre la etiqueta sin abrir nada."
          >
            <ScanLine className="h-3.5 w-3.5 mr-1" />
            Escanear etiqueta
          </Button>
        )}
        {huerfanasDevueltasCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideDevueltasHuerfanas((prev) => !prev)}
            className={`text-xs ${hideDevueltasHuerfanas ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400 border-blue-500/30'}`}
            title={hideDevueltasHuerfanas
              ? `Mostrar ${huerfanasDevueltasCount} alícuota(s) huérfana(s) devuelta(s)`
              : 'Ocultar alícuotas huérfanas devueltas'}
          >
            {hideDevueltasHuerfanas ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
            {hideDevueltasHuerfanas ? `Mostrar devueltas (${huerfanasDevueltasCount})` : 'Ocultar devueltas'}
          </Button>
        )}

        {/* Toggle histórico: por default el backend NO devuelve muestras que solo estuvieron
            prestadas en el pasado (evita crecimiento indefinido). Este botón activa la vista extendida. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIncluirHistorico((prev) => !prev)}
          className={`text-xs ${incluirHistorico ? 'text-teal-600 dark:text-teal-400 border-teal-500/30' : 'text-muted-foreground'}`}
          title={incluirHistorico
            ? 'Ocultar muestras que solo estuvieron prestadas en el pasado'
            : 'Incluir muestras que estuvieron prestadas y fueron devueltas'}
        >
          <History className="h-3.5 w-3.5 mr-1" />
          {incluirHistorico ? 'Ocultar histórico' : 'Mostrar histórico'}
        </Button>
      </div>

      {filteredPadres.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {padres.length === 0 ? 'No hay muestras registradas' : 'No se encontraron resultados'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {padres.length === 0
                ? 'Registra la primera muestra biológica en el sistema.'
                : 'Intenta con otros términos de búsqueda.'}
            </p>
            {padres.length === 0 && (
              <Button
                onClick={() => setIsMuestraModalOpen(true)}
                disabled={!puedeCrearMuestra}
                title={!puedeCrear ? 'No tienes permiso para crear muestras' : !puedeCrearMuestra ? 'Primero configura al menos un tipo de muestra con un tubo activo' : undefined}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isLoadingTiposMuestra ? 'Cargando...' : 'Registrar Primera Muestra'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /*
         * Grid plano — cada padre ocupa 1 celda, sus alícuotas (si están
         * expandidas) fluyen como celdas adicionales a continuación,
         * naturalmente hacia la derecha y a la siguiente fila si es necesario.
         * CSS Grid stretch por defecto iguala las alturas dentro de cada fila.
         */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPadres.map((muestra) => {
            const esAlicuotaHuerfana = muestra.idMuestraPadre != null
            const alicuotas  = alicuotasByPadre.get(muestra.id) ?? []
            const isExpanded = expandedIds.has(muestra.id)

            return (
              <Fragment key={muestra.id}>
                <MarcoLocalizada id={muestra.id} resaltada={resaltadaId === muestra.id}>
                  {esAlicuotaHuerfana ? (
                    <AlicuotaCard
                      muestra={muestra}
                      trasladoInfo={trasladosActivos.get(muestra.id)}
                      actions={actions}
                    />
                  ) : (
                    <PadreCard
                      muestra={muestra}
                      numAlicuotas={alicuotas.length}
                      trasladoInfo={trasladosActivos.get(muestra.id)}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpanded(muestra.id)}
                      actions={actions}
                    />
                  )}
                </MarcoLocalizada>

                {/* Celdas adicionales: alícuotas — fluyen en el mismo grid */}
                {!esAlicuotaHuerfana && isExpanded && alicuotas.map((ali) => (
                  <MarcoLocalizada key={ali.id} id={ali.id} resaltada={resaltadaId === ali.id}>
                    <AlicuotaCard
                      muestra={ali}
                      trasladoInfo={trasladosActivos.get(ali.id)}
                      actions={actions}
                    />
                  </MarcoLocalizada>
                ))}
              </Fragment>
            )
          })}
        </div>
      )}

      <EscanearEtiquetaModal
        open={escanerAbierto}
        onOpenChange={(v) => { setEscanerAbierto(v); if (!v) setErrorEscaneo(null) }}
        onCodigo={resolverEtiqueta}
        errorBusqueda={errorEscaneo}
        buscando={buscarPorEtiqueta.isPending}
      />

      <MuestraFormModal
        open={isMuestraModalOpen}
        onOpenChange={handleModalClose}
        muestra={editingMuestra}
      />
      <GenerarAlicuotasModal
        open={generarAlicuotasMuestra !== null}
        onOpenChange={(open) => !open && setGenerarAlicuotasMuestra(null)}
        muestra={generarAlicuotasMuestra}
      />
      {/* Confirmación antes de abrir el modal de traslado */}
      <AlertDialog open={pendingTraslado !== null} onOpenChange={(open) => !open && setPendingTraslado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Iniciar traslado de {pendingTraslado?.etiqueta}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a trasladar la muestra <strong>{pendingTraslado?.etiqueta}</strong> a otra institución.
              Al confirmar el traslado, la muestra quedará en estado <strong>En tránsito</strong> y su
              posición actual en caja se liberará automáticamente.
              ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTraslado}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Sí, iniciar traslado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      <UbicacionMuestra3DModal
        open={ubicacion3DMuestra !== null}
        onOpenChange={(open) => !open && setUbicacion3DMuestra(null)}
        idMuestra={ubicacion3DMuestra?.id ?? null}
        etiqueta={ubicacion3DMuestra?.etiqueta}
      />
      <DocumentosDialog
        open={docMuestraId !== null}
        onOpenChange={(open) => !open && setDocMuestraId(null)}
        entidad="muestra"
        muestraId={docMuestraId ?? 0}
        titulo="Documentos de la muestra"
        descripcion="Sube y consulta los archivos adjuntos a esta muestra biológica."
        usuarioUUID={userUuid}
        canDelete={puedeEliminarDocs}
        canUpload={canUploadMuestra}
      />

      {/* Sheet — Estudios de calidad (EstudiosMuestra) */}
      <Sheet
        open={resultadosMuestra !== null}
        onOpenChange={(open) => !open && setResultadosMuestra(null)}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Estudios de calidad
            </SheetTitle>
            <SheetDescription>
              Muestra: <span className="font-mono font-medium">{resultadosMuestra?.etiqueta}</span>
              {resultadosMuestra?.paciente && (
                <> — {resultadosMuestra.paciente.nombreCompleto}</>
              )}
            </SheetDescription>
          </SheetHeader>

          {resultadosMuestra && (
            <div className="px-4 pb-8">
              <EstudiosMuestraPanel muestra={resultadosMuestra} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {browserPrintData && (
        <PrintableLabelsView
          open={true}
          etiquetas={browserPrintData.etiquetas}
          configuracion={browserPrintData.configuracion}
          onClose={() => setBrowserPrintData(null)}
        />
      )}

      {acomodoRollo && (
        <AcomodoCarrilesDialog
          open={true}
          etiquetas={acomodoRollo.etiquetas}
          carriles={acomodoRollo.configuracion.carrilesRolloEfectivo || acomodoRollo.configuracion.carrilesRollo || 1}
          onClose={() => setAcomodoRollo(null)}
          onImprimir={enviarAcomodo}
          imprimiendo={enviandoAcomodo}
        />
      )}

    </div>
  )
}
