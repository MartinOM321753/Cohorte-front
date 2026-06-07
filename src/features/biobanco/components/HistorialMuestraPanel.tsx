/**
 * HistorialMuestraPanel
 * Muestra el historial cronológico de cambios de campos en una Muestra.
 */
import { AlertCircle, Clock, MoveRight } from 'lucide-react'

import type { MuestraDetalleDTO } from '@/types/api'
import { useGetHistorialMuestra } from '../hooks/useEstudiosMuestra'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'

const CAMPO_LABELS: Record<string, string> = {
  valor:          'Cantidad/Volumen',
  unidad:         'Unidad',
  observaciones:  'Observaciones',
  posicionCaja:   'Posición en caja',
  tipoMuestra:    'Tipo de muestra',
  tuboMuestra:    'Tubo de muestra',
}

interface Props {
  muestra: MuestraDetalleDTO
}

export function HistorialMuestraPanel({ muestra }: Props) {
  const { data: historial = [], isLoading, isError } = useGetHistorialMuestra(muestra.id)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Historial de cambios
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Muestra: <span className="font-medium">{muestra.etiqueta}</span>
        </p>
      </div>

      <Separator />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
          <Spinner className="h-4 w-4" /> Cargando historial…
        </div>
      )}

      {/* Error */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al cargar el historial.</AlertDescription>
        </Alert>
      )}

      {/* Empty */}
      {!isLoading && !isError && historial.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 opacity-30" />
          <div>
            <p className="font-medium text-sm">Sin cambios registrados</p>
            <p className="text-xs mt-1">El historial se genera automáticamente al editar la muestra.</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && !isError && historial.length > 0 && (
        <div className="space-y-3">
          {historial.map(h => {
            const fecha = new Date(h.fechaCambio).toLocaleString('es-MX', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
            const campoLabel = CAMPO_LABELS[h.campo] ?? h.campo

            return (
              <div key={h.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs font-medium">{campoLabel}</Badge>
                  <span className="text-xs text-muted-foreground">{fecha}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground max-w-[40%] truncate">
                    {h.valorAnterior ?? <em>vacío</em>}
                  </span>
                  <MoveRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium max-w-[40%] truncate">
                    {h.valorNuevo ?? <em>vacío</em>}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Por: <span className="font-medium">{h.usuario}</span>
                  {h.motivo && <> · {h.motivo}</>}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
