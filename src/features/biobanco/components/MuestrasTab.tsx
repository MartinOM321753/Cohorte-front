import { useState, useMemo, Fragment } from 'react'
import {
  Plus, Edit, Trash2, Search, TestTube, AlertCircle,
  Paperclip, ArrowRightFromLine, History, FlaskConical,
  ChevronDown, ChevronUp, MapPinOff, ClipboardList, X, Printer, Tag,
} from 'lucide-react'
import { useGetMuestras, useDeleteMuestra, useGetAllTraslados, useCancelarPrestamo, useGetTiposMuestraActivos, useListarImpresoras, useImprimirEtiqueta, useImprimirAlicuotas, useImprimirLoteCompleto } from '../hooks/useBiobanco'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import { MuestraFormModal } from './MuestraFormModal'
import { GenerarAlicuotasModal } from './GenerarAlicuotasModal'
import { TrasladarMuestraModal } from './TrasladarMuestraModal'
import { HistorialTrasladosModal } from './HistorialTrasladosModal'
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
interface TrasladoInfo { idTraslado: number; institucionNombre: string; estado: EstadoActivo }

function activeBadge(estado: EstadoActivo) {
  switch (estado) {
    case 'ENVIADA':       return { label: 'En tránsito',   cls: 'border-amber-500/40  text-amber-700  dark:text-amber-400  bg-amber-500/10'  }
    case 'RECIBIDA':      return { label: 'Recibida',      cls: 'border-blue-500/40   text-blue-700   dark:text-blue-400   bg-blue-500/10'   }
    case 'EN_DEVOLUCION': return { label: 'En devolución', cls: 'border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10' }
  }
}

function activeCardBorder(estado: EstadoActivo) {
  switch (estado) {
    case 'ENVIADA':       return 'border-amber-500/40'
    case 'RECIBIDA':      return 'border-blue-500/40'
    case 'EN_DEVOLUCION': return 'border-orange-500/40'
  }
}

function activeBox(estado: EstadoActivo) {
  switch (estado) {
    case 'ENVIADA':       return { wrap: 'bg-amber-500/10  border-amber-500/20',  title: 'text-amber-700  dark:text-amber-300',  body: 'text-amber-600  dark:text-amber-400'  }
    case 'RECIBIDA':      return { wrap: 'bg-blue-500/10   border-blue-500/20',   title: 'text-blue-700   dark:text-blue-300',   body: 'text-blue-600   dark:text-blue-400'   }
    case 'EN_DEVOLUCION': return { wrap: 'bg-orange-500/10 border-orange-500/20', title: 'text-orange-700 dark:text-orange-300', body: 'text-orange-600 dark:text-orange-400' }
  }
}

// ── Acciones compartidas ──────────────────────────────────────────────────────

interface SharedActions {
  isAdmin: boolean
  userUuid: string
  canUpload: boolean
  myInstitucionId?: number
  onEdit: (m: MuestraDetalleDTO) => void
  onTrasladoClick: (m: MuestraDetalleDTO) => void
  onCancelarEnvio: (idTraslado: number) => void
  onHistorial: (m: MuestraDetalleDTO) => void
  onDocumentos: (id: number) => void
  onResultados: (m: MuestraDetalleDTO) => void
  onGenerarAlicuotas: (m: MuestraDetalleDTO) => void
  onDelete: (id: number) => void
  onPrintEtiqueta: (id: number) => void
  onPrintAlicuotas: (id: number) => void
  onPrintLoteCompleto: (id: number) => void
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
  const esTrasladada = !!trasladoInfo
  const isPrestada = muestra.estadoMuestra === 'PRESTADA'
  const noEsMia = muestra.idInstitucion != null
    && actions.myInstitucionId != null
    && muestra.idInstitucion !== actions.myInstitucionId
  const noEnMiPosesion = muestra.idInstitucionActual != null
    && actions.myInstitucionId != null
    && muestra.idInstitucionActual !== actions.myInstitucionId
  const noEditable = isPrestada || noEsMia || noEnMiPosesion
  const puedeEnviar = !esTrasladada && !noEnMiPosesion && actions.isAdmin
  const puedeCancel = trasladoInfo?.estado === 'ENVIADA' && actions.isAdmin
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
            <AlertDialogFooter>
              <AlertDialogCancel>Mantener envío</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => actions.onCancelarEnvio(trasladoInfo!.idTraslado)}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                Sí, cancelar envío
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

function PadreCard({ muestra, numAlicuotas, trasladoInfo, isExpanded, onToggle, actions }: PadreCardProps) {
  const badge = trasladoInfo ? activeBadge(trasladoInfo.estado) : null
  const box   = trasladoInfo ? activeBox(trasladoInfo.estado) : null
  const esRecibida = muestra.idInstitucionActual === actions.myInstitucionId
    && muestra.idInstitucion != null
    && muestra.idInstitucion !== actions.myInstitucionId
  const noEnMiPosesion = muestra.idInstitucionActual != null
    && actions.myInstitucionId != null
    && muestra.idInstitucionActual !== actions.myInstitucionId
  const esMia = muestra.idInstitucion != null
    && muestra.idInstitucion === actions.myInstitucionId

  return (
    <div className="relative h-full">
      <Card className={`h-full flex flex-col ${noEnMiPosesion ? 'opacity-60' : ''} ${trasladoInfo ? activeCardBorder(trasladoInfo.estado) : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-mono leading-tight">{muestra.etiqueta}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
              {noEnMiPosesion && esMia ? (
                <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400 bg-gray-500/10 text-xs">
                  Fuera
                </Badge>
              ) : noEnMiPosesion && !esMia ? (
                <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs">
                  Devuelta
                </Badge>
              ) : trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
                <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                  {badge!.label}
                </Badge>
              ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
                <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                  {badge!.label}
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
              {esRecibida && !noEnMiPosesion && (
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
          </div>

          {noEnMiPosesion ? (
            <div className={`text-sm rounded-md border px-2 py-1.5 ${esMia ? 'border-gray-300/40 bg-gray-500/5' : 'border-blue-300/40 bg-blue-500/5'}`}>
              <span className={`font-medium ${esMia ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>Ubicación:</span>
              <p className={`text-xs mt-0.5 ${esMia ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                En biobanco de {muestra.nombreInstitucionActual ?? 'otra institución'}
              </p>
            </div>
          ) : trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
            <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
              <span className={`font-medium ${box!.title}`}>En tránsito:</span>
              <p className={`text-xs mt-0.5 ${box!.body}`}>Pendiente de recepción</p>
            </div>
          ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
            <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
              <span className={`font-medium ${box!.title}`}>Devolución:</span>
              <p className={`text-xs mt-0.5 ${box!.body}`}>En proceso de devolución</p>
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
  const badge  = trasladoInfo ? activeBadge(trasladoInfo.estado) : null
  const box    = trasladoInfo ? activeBox(trasladoInfo.estado) : null
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
      ${trasladoInfo ? activeCardBorder(trasladoInfo.estado) : 'border-muted-foreground/40'}
      bg-muted/20
    `}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-mono leading-tight text-muted-foreground">
              {muestra.etiqueta}
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
            {noEnMiPosesion ? (
              <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400 bg-gray-500/10 text-xs">
                Fuera
              </Badge>
            ) : trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
              <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                {badge!.label}
              </Badge>
            ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
              <Badge variant="outline" className={`${badge!.cls} whitespace-nowrap text-xs`}>
                {badge!.label}
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
            {esPrestada && !noEnMiPosesion && (
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

        {noEnMiPosesion ? (
          <div className="text-sm rounded-md border border-gray-300/40 bg-gray-500/5 px-2 py-1.5">
            <span className="font-medium text-gray-500 dark:text-gray-400">Ubicación:</span>
            <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
              {trasladoInfo ? trasladoInfo.institucionNombre : 'Fuera de este biobanco'}
            </p>
          </div>
        ) : trasladoInfo && trasladoInfo.estado === 'ENVIADA' ? (
          <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
            <span className={`font-medium ${box!.title}`}>En tránsito:</span>
            <p className={`text-xs mt-0.5 ${box!.body}`}>Pendiente de recepción</p>
          </div>
        ) : trasladoInfo && trasladoInfo.estado === 'EN_DEVOLUCION' ? (
          <div className={`text-sm rounded-md border px-2 py-1.5 ${box!.wrap}`}>
            <span className={`font-medium ${box!.title}`}>Devolución:</span>
            <p className={`text-xs mt-0.5 ${box!.body}`}>En proceso de devolución</p>
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
  const isAdmin = useAuthStore((s) => s.hasRole('ADMINISTRADOR'))
  const canUploadMuestra = useAuthStore((s) => s.hasRole(['ADMINISTRADOR', 'LABORATORISTA']))

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [isMuestraModalOpen, setIsMuestraModalOpen] = useState(false)
  const [editingMuestra, setEditingMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [docMuestraId, setDocMuestraId] = useState<number | null>(null)
  const [trasladandoMuestra, setTrasladandoMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [pendingTraslado, setPendingTraslado] = useState<MuestraDetalleDTO | null>(null)
  const [historialMuestra, setHistorialMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [resultadosMuestra, setResultadosMuestra] = useState<MuestraDetalleDTO | null>(null)
  const [generarAlicuotasMuestra, setGenerarAlicuotasMuestra] = useState<MuestraDetalleDTO | null>(null)

  const { data: muestras, isLoading } = useGetMuestras()
  const { data: traslados = [] } = useGetAllTraslados()
  const { data: tiposActivos = [] } = useGetTiposMuestraActivos()
  const deleteMuestraMutation = useDeleteMuestra()
  const cancelarPrestamoMutation = useCancelarPrestamo()
  const { data: impresoras = [] } = useListarImpresoras()
  const { data: configuracionesEtiqueta = [] } = useGetConfiguracionesActivas()
  const imprimirEtiquetaMut = useImprimirEtiqueta()
  const imprimirAlicuotasMut = useImprimirAlicuotas()
  const imprimirLoteMut = useImprimirLoteCompleto()

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

  const trasladosActivos = useMemo(() => {
    const ESTADOS_ACTIVOS: EstadoActivo[] = ['ENVIADA', 'RECIBIDA', 'EN_DEVOLUCION']
    const map = new Map<number, TrasladoInfo>()
    traslados.forEach((t) => {
      if ((ESTADOS_ACTIVOS as string[]).includes(t.estado)) {
        map.set(t.muestra.id, {
          idTraslado: t.id,
          institucionNombre: t.institucionDestino.nombre,
          estado: t.estado as EstadoActivo,
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

  const filteredPadres = padres.filter((m) => {
    const term = searchTerm.toLowerCase()
    if (!term) return true
    const pacienteStr = m.paciente ? `${m.paciente.folio} ${m.paciente.nombreCompleto}` : ''
    return (
      m.etiqueta.toLowerCase().includes(term) ||
      (m.unidad ?? '').toLowerCase().includes(term) ||
      pacienteStr.toLowerCase().includes(term) ||
      (m.tipoMuestra?.nombre ?? '').toLowerCase().includes(term) ||
      (m.tuboMuestra?.nombre ?? '').toLowerCase().includes(term)
    )
  })

  const toggleExpanded = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleEdit = (m: MuestraDetalleDTO) => { setEditingMuestra(m); setIsMuestraModalOpen(true) }
  const handleDelete = async (id: number) => { await deleteMuestraMutation.mutateAsync(id) }
  const handleModalClose = () => { setIsMuestraModalOpen(false); setEditingMuestra(null) }

  const handleTrasladoClick = (m: MuestraDetalleDTO) => setPendingTraslado(m)
  const handleConfirmTraslado = () => {
    if (pendingTraslado) { setTrasladandoMuestra(pendingTraslado); setPendingTraslado(null) }
  }

  const handleCancelarEnvio = async (idTraslado: number) => {
    await cancelarPrestamoMutation.mutateAsync({
      idTraslado,
      data: { uuidUsuario: userUuid, motivo: 'Cancelación desde el panel de muestras' },
    })
  }

  const handlePrintEtiqueta = async (id: number) => {
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }
    if (!resolvedConfigId) { toast.error('No hay configuración de etiqueta. Cree una en Configuración > Etiquetas.'); return }
    try {
      await imprimirEtiquetaMut.mutateAsync({ idMuestra: id, impresora: imp, configuracionId: resolvedConfigId })
      toast.success('Etiqueta enviada a la impresora')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al imprimir'
      toast.error(msg)
    }
  }

  const handlePrintAlicuotas = async (id: number) => {
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }
    if (!resolvedConfigId) { toast.error('No hay configuración de etiqueta. Cree una en Configuración > Etiquetas.'); return }
    try {
      const total = await imprimirAlicuotasMut.mutateAsync({ idMuestraPadre: id, impresora: imp, configuracionId: resolvedConfigId })
      toast.success(`${total} etiqueta(s) enviada(s) a la impresora`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al imprimir'
      toast.error(msg)
    }
  }

  const handlePrintLoteCompleto = async (id: number) => {
    const imp = selectedPrinter || impresoras[0]
    if (!imp) { toast.error('No hay impresoras disponibles. Verifique la conexión.'); return }
    if (!resolvedConfigId) { toast.error('No hay configuración de etiqueta. Cree una en Configuración > Etiquetas.'); return }
    try {
      const total = await imprimirLoteMut.mutateAsync({ idMuestraPadre: id, impresora: imp, configuracionId: resolvedConfigId })
      toast.success(`${total} etiqueta(s) enviada(s) a la impresora (padre + alícuotas)`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al imprimir lote'
      toast.error(msg)
    }
  }

  const actions: SharedActions = {
    isAdmin,
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
    onPrintEtiqueta: handlePrintEtiqueta,
    onPrintAlicuotas: handlePrintAlicuotas,
    onPrintLoteCompleto: handlePrintLoteCompleto,
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
        <div className="flex items-center gap-3">
          {configuracionesEtiqueta.length > 0 && (
            <div className="flex items-center gap-1.5 border rounded-md px-2 py-1.5 text-sm">
              <Tag className="h-4 w-4 text-violet-600 shrink-0" />
              <select
                className="bg-transparent outline-none cursor-pointer max-w-[180px] truncate"
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
          {impresoras.length > 0 && (
            <div className="flex items-center gap-1.5 border rounded-md px-2 py-1.5 text-sm">
              <Printer className="h-4 w-4 text-sky-600 shrink-0" />
              <select
                className="bg-transparent outline-none cursor-pointer max-w-[180px] truncate"
                value={selectedPrinter || impresoras[0]}
                onChange={(e) => handleSelectPrinter(e.target.value)}
              >
                {impresoras.map((imp) => (
                  <option key={imp} value={imp}>{imp}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            onClick={() => setIsMuestraModalOpen(true)}
            disabled={!hayTiposConTubos}
            title={!hayTiposConTubos ? 'Primero configura al menos un tipo de muestra con un tubo activo en la pestaña "Tipos de Muestra"' : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Muestra
          </Button>
        </div>
      </div>

      {!hayTiposConTubos && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay tipos de muestra con tubos configurados. Ve a la pestaña <strong>Tipos de Muestra</strong> y crea al menos un tipo con un tubo activo para poder registrar muestras.
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

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por etiqueta, participante, tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
                disabled={!hayTiposConTubos}
                title={!hayTiposConTubos ? 'Primero configura al menos un tipo de muestra con un tubo activo' : undefined}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primera Muestra
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

                {/* Celdas adicionales: alícuotas — fluyen en el mismo grid */}
                {!esAlicuotaHuerfana && isExpanded && alicuotas.map((ali) => (
                  <AlicuotaCard
                    key={ali.id}
                    muestra={ali}
                    trasladoInfo={trasladosActivos.get(ali.id)}
                    actions={actions}
                  />
                ))}
              </Fragment>
            )
          })}
        </div>
      )}

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

    </div>
  )
}
