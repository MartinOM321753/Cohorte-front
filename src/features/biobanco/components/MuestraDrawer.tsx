import { useState } from 'react'
import {
  Edit, Trash2, FlaskConical, ArrowRightFromLine, History,
  ClipboardList, Paperclip, Printer, Ban, Boxes, PackageCheck,
  X, MapPin, Thermometer, TestTube, Calendar, Droplets,
  Building2, Tag, BatteryLow,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn, formatDate } from '@/lib/utils'
import { etiquetaPosicionCaja } from '../lib/posicionCaja'
import type { MuestraDetalleDTO } from '@/types/api'

type EstadoActivo = 'ENVIADA' | 'RECIBIDA' | 'EN_DEVOLUCION'
interface TrasladoInfo {
  idTraslado: number
  institucionNombre: string
  estado: EstadoActivo
  institucionOrigenId: number
  institucionDestinoId: number
}

interface DrawerActions {
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
  onAlicuotarTubo: (m: MuestraDetalleDTO) => void
  onUbicarLote: (m: MuestraDetalleDTO) => void
  onDelete: (id: number) => void
  onDarBaja: (id: number, motivo: string) => void
  onPrintEtiqueta: (id: number) => void
  onPrintAlicuotas: (id: number) => void
  onPrintLoteCompleto: (id: number) => void
  onVerUbicacion3D: (m: MuestraDetalleDTO) => void
}

interface MuestraDrawerProps {
  muestra: MuestraDetalleDTO | null
  onClose: () => void
  trasladoInfo?: TrasladoInfo
  actions: DrawerActions
  numAlicuotas?: number
  alicuotasPendientes?: number
}

function estadoBadge(m: MuestraDetalleDTO, trasladoInfo?: TrasladoInfo, myInstitucionId?: number) {
  const noEnMiPosesion = m.idInstitucionActual != null && myInstitucionId != null && m.idInstitucionActual !== myInstitucionId
  const esMia = m.idInstitucion != null && m.idInstitucion === myInstitucionId
  if (m.estadoMuestra === 'BAJA') return { label: 'Dada de baja', cls: 'bg-destructive/10 text-destructive border-destructive/30' }
  if (trasladoInfo?.estado === 'ENVIADA') return { label: 'En tránsito', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' }
  if (trasladoInfo?.estado === 'EN_DEVOLUCION') return { label: 'En devolución', cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' }
  if (noEnMiPosesion && esMia) return { label: 'Fuera del biobanco', cls: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30' }
  if (noEnMiPosesion && !esMia) return { label: 'Devuelta', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' }
  if (m.ubicacion) return { label: 'Almacenada', cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' }
  return { label: 'Sin ubicación', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' }
}

export function MuestraDrawer({ muestra, onClose, trasladoInfo, actions, numAlicuotas = 0, alicuotasPendientes = 0 }: MuestraDrawerProps) {
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [bajaMotivo, setBajaMotivo] = useState('')

  if (!muestra) return null

  const esPadre = muestra.idMuestraPadre == null
  const isPrestada = muestra.estadoMuestra === 'PRESTADA'
  const esBaja = muestra.estadoMuestra === 'BAJA'
  const noEsMia = muestra.idInstitucion != null && actions.myInstitucionId != null && muestra.idInstitucion !== actions.myInstitucionId
  const noEnMiPosesion = muestra.idInstitucionActual != null && actions.myInstitucionId != null && muestra.idInstitucionActual !== actions.myInstitucionId
  const noEditable = isPrestada || noEsMia || noEnMiPosesion
  const puedeEnviar = !trasladoInfo && !noEnMiPosesion && actions.puedeTraslado && !esBaja && !muestra.agotada
  const puedeCancel = trasladoInfo?.estado === 'ENVIADA' && actions.puedeCancelarTraslado
  const agotada = Boolean(muestra.agotada) && muestra.estadoMuestra !== 'BAJA'
  const alicuotasConfiguradas = muestra.tuboMuestra?.numeroAlicuotas ?? 0
  const huecosLibres = Math.max(0, alicuotasConfiguradas - numAlicuotas)
  const badge = estadoBadge(muestra, trasladoInfo, actions.myInstitucionId)

  const ubic = muestra.ubicacion

  return (
    <Sheet open={!!muestra} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:w-[460px] sm:max-w-[460px] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b">
          <div className="min-w-0">
            <h3 className="font-mono text-base font-semibold leading-tight truncate">{muestra.etiqueta}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {muestra.tipoMuestra?.nombre ?? 'Sin tipo'}
              {muestra.tuboMuestra && ` · ${muestra.tuboMuestra.nombre}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-muted/50 border-b">
          <Badge variant="outline" className={cn('text-xs', badge.cls)}>{badge.label}</Badge>
          {agotada && (
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <BatteryLow className="h-3 w-3" /> Consumida
            </span>
          )}
          {muestra.numeroEnLote != null && (
            <span className="text-xs text-muted-foreground">
              Lote {muestra.numeroLote} · #{muestra.numeroEnLote}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Información */}
          <div className="px-6 py-4 border-b space-y-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">Información</p>
            <InfoRow label="Etiqueta" value={muestra.etiqueta} mono />
            <InfoRow label="Tipo de muestra" value={muestra.tipoMuestra?.nombre} />
            {muestra.tuboMuestra && <InfoRow label="Tipo de tubo" value={muestra.tuboMuestra.nombre} />}
            <InfoRow label="Volumen" value={muestra.valor != null ? `${muestra.valor} ${muestra.unidad ?? ''}` : '—'} mono />
            {muestra.valorDisponible != null && muestra.valorDisponible !== muestra.valor && (
              <InfoRow label="Disponible" value={`${muestra.valorDisponible} ${muestra.unidad ?? ''}`} mono />
            )}
            <InfoRow label="Recolección" value={muestra.fechaRecoleccion ? formatDate(muestra.fechaRecoleccion) : '—'} />
            {muestra.paciente && <InfoRow label="Participante" value={`${muestra.paciente.folio} · ${muestra.paciente.nombreCompleto}`} />}
            <InfoRow label="Sede" value={muestra.nombreInstitucion ?? '—'} />
            {muestra.observaciones && <InfoRow label="Observaciones" value={muestra.observaciones} />}
          </div>

          {/* Ubicación */}
          <div className="px-6 py-4 border-b space-y-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">Ubicación</p>
            {ubic ? (
              <>
                {ubic.nombreRefrigerador && <InfoRow label="Refrigerador" value={ubic.nombreRefrigerador} />}
                {ubic.pisoRefrigerador != null && <InfoRow label="Piso" value={`Piso ${ubic.pisoRefrigerador}`} />}
                {ubic.codigoCaja && <InfoRow label="Caja" value={ubic.codigoCaja} />}
                {ubic.fila != null && ubic.columna != null && (
                  <InfoRow label="Posición" value={etiquetaPosicionCaja(ubic.fila, ubic.columna)} />
                )}
                {!noEnMiPosesion && !isPrestada && (
                  <button
                    onClick={() => { actions.onVerUbicacion3D(muestra); onClose() }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md px-3 py-1.5 transition-colors"
                  >
                    <Boxes className="h-3.5 w-3.5" /> Ver en vista 3D
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-500" /> Sin posición asignada
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="px-6 py-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">Acciones</p>

            {/* Primarias */}
            {!noEditable && (
              <DrawerBtn icon={Edit} onClick={() => { actions.onEdit(muestra); onClose() }}>
                Editar muestra
              </DrawerBtn>
            )}

            {esPadre && !noEnMiPosesion && !isPrestada && !esBaja && !muestra.agotada && huecosLibres > 0 && (
              <DrawerBtn icon={FlaskConical} onClick={() => { actions.onGenerarAlicuotas(muestra); onClose() }}>
                {numAlicuotas === 0 ? 'Generar alícuotas' : `Completar lote (${huecosLibres} restantes)`}
              </DrawerBtn>
            )}

            {esPadre && muestra.idProtocolo != null && muestra.accionTubo === 'ALICUOTAR'
              && !noEnMiPosesion && !isPrestada && !esBaja && !muestra.agotada
              && (muestra.valorDisponible ?? 0) > 0 && (
              <DrawerBtn icon={FlaskConical} onClick={() => { actions.onAlicuotarTubo(muestra); onClose() }}>
                Alicuotar tubo (nuevo lote)
              </DrawerBtn>
            )}

            {esPadre && !noEnMiPosesion && !isPrestada && alicuotasPendientes > 0 && (
              <DrawerBtn icon={PackageCheck} onClick={() => { actions.onUbicarLote(muestra); onClose() }}>
                Ubicar lote ({alicuotasPendientes} pendientes)
              </DrawerBtn>
            )}

            {puedeEnviar && (
              <DrawerBtn icon={ArrowRightFromLine} onClick={() => { actions.onTrasladoClick(muestra); onClose() }}>
                Trasladar muestra
              </DrawerBtn>
            )}

            <div className="h-px bg-border my-2" />

            {/* Secundarias */}
            <DrawerBtn icon={Paperclip} onClick={() => { actions.onDocumentos(muestra.id); onClose() }}>
              Documentos
            </DrawerBtn>
            <DrawerBtn icon={ClipboardList} onClick={() => { actions.onResultados(muestra); onClose() }}>
              Resultados / estudios
            </DrawerBtn>
            <DrawerBtn icon={History} onClick={() => { actions.onHistorial(muestra); onClose() }}>
              Historial de traslados
            </DrawerBtn>
            <DrawerBtn icon={Printer} onClick={() => { actions.onPrintEtiqueta(muestra.id) }}>
              Imprimir etiqueta
            </DrawerBtn>
            {esPadre && numAlicuotas > 0 && (
              <DrawerBtn icon={Printer} onClick={() => { actions.onPrintLoteCompleto(muestra.id) }}>
                Imprimir lote completo
              </DrawerBtn>
            )}

            {/* Cancelar envío */}
            {puedeCancel && (
              <>
                <div className="h-px bg-border my-2" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors text-left">
                      <X className="h-4 w-4 shrink-0" /> Cancelar envío
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar el envío de {muestra.etiqueta}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La muestra está en tránsito hacia <strong>{trasladoInfo!.institucionNombre}</strong>.
                        Al cancelar, regresará a estado Sin posición.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1.5 py-2">
                      <label className="text-xs font-medium">Motivo</label>
                      <Input placeholder="Motivo (máx. 100)" maxLength={100} value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setCancelMotivo('')}>Mantener</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => { actions.onCancelarEnvio(trasladoInfo!.idTraslado, cancelMotivo.trim()); setCancelMotivo(''); onClose() }}
                        className="bg-rose-600 text-white hover:bg-rose-700"
                        disabled={!cancelMotivo.trim()}
                      >
                        Cancelar envío
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Destructivas */}
            <div className="h-px bg-border my-2" />

            {actions.puedeDarBaja && !noEsMia && !isPrestada && muestra.estadoMuestra !== 'BAJA' && (
              <AlertDialog onOpenChange={(open) => { if (!open) setBajaMotivo('') }}>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left">
                    <Ban className="h-4 w-4 shrink-0" /> Dar de baja
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Dar de baja {muestra.etiqueta}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción es <strong>irreversible</strong>. Se libera su posición, no se podrá prestar, alicuotar ni aplicar estudios.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Motivo (obligatorio)</label>
                    <textarea
                      className="w-full rounded border bg-background px-2 py-1 text-xs"
                      rows={3} maxLength={500} value={bajaMotivo}
                      onChange={(e) => setBajaMotivo(e.target.value)}
                      placeholder="Motivo de la baja..."
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { actions.onDarBaja(muestra.id, bajaMotivo.trim()); onClose() }}
                      disabled={!bajaMotivo.trim()}
                      className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Dar de baja
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
                  disabled={noEditable}
                >
                  <Trash2 className="h-4 w-4 shrink-0" /> Eliminar muestra
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar muestra {muestra.etiqueta}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La muestra será eliminada permanentemente junto con sus alícuotas, estudios e historial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { actions.onDelete(muestra.id); onClose() }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className={cn('text-sm font-medium text-right max-w-[60%] break-words', mono && 'font-mono text-xs')}>{value ?? '—'}</span>
    </div>
  )
}

function DrawerBtn({ icon: Icon, children, onClick, className }: {
  icon: React.ElementType; children: React.ReactNode; onClick: () => void; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm font-medium',
        'text-foreground/80 hover:bg-accent hover:text-foreground transition-colors text-left',
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" /> {children}
    </button>
  )
}

export type { DrawerActions, TrasladoInfo as DrawerTrasladoInfo }
