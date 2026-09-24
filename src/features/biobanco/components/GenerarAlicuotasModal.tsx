import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlaskConical, TestTube, Check, AlertCircle, Info } from 'lucide-react'
import { useGetTiposMuestraActivos, useGenerarLoteAlicuotas, useGetTipoInstitucion } from '../hooks/useBiobanco'
import { PlanAlicuotasPanel } from './PlanAlicuotasPanel'
import { MuestraDetalleDTO, TipoMuestraResumen, TuboMuestraResumen } from '@/types/api'

/**
 * La receta con la que ya se creó el lote de esta muestra.
 *
 * Cuando existe, el modal trabaja en modo «completar»: el tipo y el tubo ya
 * están decididos y no se vuelven a preguntar. Ofrecer los selectores ahí
 * permitiría cerrar un lote de Heces/Tubo 01 con viales de otro tubo, y como la
 * etiqueta se construye con el número de hueco y el total del tubo, dos tubos
 * con el mismo número de alícuotas generarían además etiquetas idénticas.
 */
export interface LoteExistente {
  tipo: TipoMuestraResumen
  tubo: TuboMuestraResumen
}

interface GenerarAlicuotasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
  /** Receta del lote ya creado; ausente = lote nuevo, hay que elegirla. */
  loteExistente?: LoteExistente | null
}

export function GenerarAlicuotasModal({
  open,
  onOpenChange,
  muestra,
  loteExistente,
}: GenerarAlicuotasModalProps) {
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null)
  const [selectedTuboId, setSelectedTuboId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [planVolumenes, setPlanVolumenes] = useState<number[] | null>(null)

  const { data: tiposMuestra = [] } = useGetTiposMuestraActivos()
  const generarMutation = useGenerarLoteAlicuotas()
  const { data: tipoExistente } = useGetTipoInstitucion(muestra?.id ?? 0, { enabled: open && !!muestra })

  const completando = !!loteExistente

  const selectedTipo = tiposMuestra.find((t) => t.id === selectedTipoId)
  const tubosDisponibles = selectedTipo?.tubos.filter((t) => t.activo) ?? []

  // En modo completar manda la receta del lote; en modo nuevo, lo que se elija.
  const idTipoEfectivo = completando ? loteExistente!.tipo.id : selectedTipoId
  const idTuboEfectivo = completando ? loteExistente!.tubo.id : selectedTuboId

  /*
   * El tubo con su receta completa. Se busca primero entre los tipos activos
   * porque ahí está la versión viva de la configuración; si el tubo se
   * desactivó después de crear el lote no aparece, y entonces sirve el resumen
   * que la propia alícuota trae consigo.
   */
  const tuboDelLote = completando
    ? tiposMuestra
        .flatMap((t) => t.tubos)
        .find((tb) => tb.id === loteExistente!.tubo.id) ?? loteExistente!.tubo
    : tubosDisponibles.find((t) => t.id === selectedTuboId)

  const handleClose = () => {
    setSelectedTipoId(null)
    setSelectedTuboId(null)
    setError(null)
    setPlanVolumenes(null)
    onOpenChange(false)
  }

  const handleGenerar = async () => {
    if (!muestra) return
    if (!idTipoEfectivo) { setError('Seleccione un tipo de muestra'); return }
    if (!idTuboEfectivo) { setError('Seleccione un tubo'); return }

    await generarMutation.mutateAsync(
      {
        idMuestra: muestra.id,
        data: {
          idTipoMuestra: idTipoEfectivo,
          idTuboMuestra: idTuboEfectivo,
          planAlicuotas: planVolumenes && planVolumenes.length > 0
            ? { volumenes: planVolumenes }
            : undefined,
        },
      },
      { onSuccess: handleClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            {completando ? 'Completar lote de alícuotas' : 'Generar alícuotas'}
          </DialogTitle>
          <DialogDescription>
            Muestra: <span className="font-mono font-medium">{muestra?.etiqueta}</span>
            {muestra?.valorDisponible != null && (
              <> · Disponible:{' '}
                <span className="font-medium">
                  {muestra.valorDisponible} {muestra.unidad}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!completando && tipoExistente && (
            <div className="flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Tipo asignado previamente: <strong>{tipoExistente.tipoMuestra.nombre}</strong> / <strong>{tipoExistente.tuboMuestra.nombre}</strong>.
              </span>
            </div>
          )}

          {/* Modo completar: la receta viene del lote, no se elige ------- */}
          {completando && (
            <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1">
              <p className="text-[11px] text-muted-foreground">
                Se completa el lote que ya existe, con su misma configuración.
              </p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <FlaskConical className="h-3 w-3 text-muted-foreground" />
                  {loteExistente!.tipo.nombre}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <TestTube className="h-3 w-3 text-muted-foreground" />
                  {loteExistente!.tubo.nombre}
                </span>
                {loteExistente!.tubo.numeroAlicuotas != null && loteExistente!.tubo.volumenAlicuota != null && (
                  <span className="text-muted-foreground">
                    {loteExistente!.tubo.numeroAlicuotas} × {loteExistente!.tubo.volumenAlicuota}{' '}
                    {loteExistente!.tubo.unidadVolumen ?? ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {!completando && (
            <>
          {/* Tipo de muestra */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
              Tipo de muestra <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedTipoId != null ? String(selectedTipoId) : ''}
              onValueChange={(v) => {
                setSelectedTipoId(parseInt(v))
                setSelectedTuboId(null)
                setError(null)
              }}
            >
              <SelectTrigger className={error && !selectedTipoId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {tiposMuestra.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                    {t.temperaturaAlmacenamiento && (
                      <span className="text-muted-foreground ml-1 text-xs">· {t.temperaturaAlmacenamiento}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tubos */}
          {selectedTipo && (
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TestTube className="h-3.5 w-3.5" />
                Tubos para &quot;{selectedTipo.nombre}&quot; <span className="text-destructive">*</span>
              </p>

              {tubosDisponibles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin tubos activos configurados</p>
              ) : (
                <div className="space-y-1.5">
                  {tubosDisponibles.map((tb) => {
                    const isSelected = selectedTuboId === tb.id
                    return (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => { setSelectedTuboId(isSelected ? null : tb.id); setError(null) }}
                        className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : error && !selectedTuboId
                              ? 'border-destructive/50 bg-muted/30 hover:bg-muted/60'
                              : 'border-transparent bg-muted/30 hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {isSelected
                              ? <Check className="h-3.5 w-3.5 text-primary" />
                              : <div className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium">{tb.nombre}</span>
                              {tb.prefijoCodigo && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{tb.prefijoCodigo}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              {tb.numeroAlicuotas === 0 ? (
                                <span className="italic">Tubo directo</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  → {tb.numeroAlicuotas} alícuota{tb.numeroAlicuotas !== 1 ? 's' : ''}
                                </span>
                              )}
                              {tb.volumenAlicuota != null && (
                                <span>{tb.volumenAlicuota} {tb.unidadVolumen ?? ''}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {error && selectedTipoId && !selectedTuboId && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {error}
                </p>
              )}
            </div>
          )}
            </>
          )}

          {/* Plan del lote — contra el volumen DISPONIBLE de esta muestra, no
              contra su valor bruto: lo ya prometido a alícuotas sin ubicar no
              se puede prometer dos veces. */}
          {tuboDelLote && (tuboDelLote.numeroAlicuotas ?? 0) > 0 && muestra && (
            <PlanAlicuotasPanel
              tubo={tuboDelLote}
              idMuestra={muestra.id}
              disponible={muestra.valorDisponible}
              onPlanChange={setPlanVolumenes}
            />
          )}

          {/* Con el volumen que queda puede no salir ninguna alícuota completa.
              El reparto en una parcial existe, pero nunca se elige solo: hay que
              pedirlo. Mejor decirlo aquí que dejar que el botón falle. */}
          {tuboDelLote && (tuboDelLote.numeroAlicuotas ?? 0) > 0 && (!planVolumenes || planVolumenes.length === 0) && (
            <p className="text-[11px] text-muted-foreground">
              Elija cómo repartir el volumen disponible para poder generar.
            </p>
          )}

          {error && !selectedTipoId && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleGenerar}
            disabled={generarMutation.isPending || !planVolumenes || planVolumenes.length === 0}
          >
            {generarMutation.isPending
              ? (completando ? 'Completando…' : 'Generando…')
              : completando ? 'Completar lote' : 'Generar alícuotas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
