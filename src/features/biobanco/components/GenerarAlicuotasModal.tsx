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
import { useGetTiposMuestraActivos, useGenerarAlicuotasEnReceptora, useGetTipoInstitucion } from '../hooks/useBiobanco'
import { MuestraDetalleDTO } from '@/types/api'

interface GenerarAlicuotasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
}

export function GenerarAlicuotasModal({ open, onOpenChange, muestra }: GenerarAlicuotasModalProps) {
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null)
  const [selectedTuboId, setSelectedTuboId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: tiposMuestra = [] } = useGetTiposMuestraActivos()
  const generarMutation = useGenerarAlicuotasEnReceptora()
  const { data: tipoExistente } = useGetTipoInstitucion(muestra?.id ?? 0, { enabled: open && !!muestra })

  const selectedTipo = tiposMuestra.find((t) => t.id === selectedTipoId)
  const tubosDisponibles = selectedTipo?.tubos.filter((t) => t.activo) ?? []

  const handleClose = () => {
    setSelectedTipoId(null)
    setSelectedTuboId(null)
    setError(null)
    onOpenChange(false)
  }

  const handleGenerar = async () => {
    if (!muestra) return
    if (!selectedTipoId) { setError('Selecciona un tipo de muestra'); return }
    if (!selectedTuboId) { setError('Selecciona un tubo'); return }

    await generarMutation.mutateAsync(
      { idMuestra: muestra.id, data: { idTipoMuestra: selectedTipoId, idTuboMuestra: selectedTuboId } },
      { onSuccess: handleClose }
    )
  }

  const selectedTubo = tubosDisponibles.find((t) => t.id === selectedTuboId)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Generar Alícuotas
          </DialogTitle>
          <DialogDescription>
            Muestra: <span className="font-mono font-medium">{muestra?.etiqueta}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {tipoExistente && (
            <div className="flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Tipo asignado previamente: <strong>{tipoExistente.tipoMuestra.nombre}</strong> / <strong>{tipoExistente.tuboMuestra.nombre}</strong>.
                Se generará un nuevo lote de alícuotas.
              </span>
            </div>
          )}

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

          {/* Preview */}
          {selectedTubo && selectedTubo.numeroAlicuotas > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Se generarán <strong>{selectedTubo.numeroAlicuotas} alícuotas</strong> de tipo
                &quot;{selectedTipo?.nombre}&quot; para la muestra {muestra?.etiqueta}.
              </span>
            </div>
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
          <Button onClick={handleGenerar} disabled={generarMutation.isPending}>
            {generarMutation.isPending ? 'Generando...' : 'Generar Alícuotas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
