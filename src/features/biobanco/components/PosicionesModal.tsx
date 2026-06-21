import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Grid3X3, Package, TestTube, User, Calendar } from 'lucide-react'
import { useGetPosicionesByCaja, useGetMuestras } from '../hooks/useBiobanco'
import { Caja, MuestraDetalleDTO } from '@/types/api'
import { formatDate } from '@/lib/utils'

interface PosicionesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja: Caja | null
}

export function PosicionesModal({ open, onOpenChange, caja }: PosicionesModalProps) {
  const [selectedPosicion, setSelectedPosicion] = useState<any>(null)

  const { data: posiciones, isLoading } = useGetPosicionesByCaja(caja?.id || 0)
  const { data: muestras = [] } = useGetMuestras()

  // Busca la muestra completa (con paciente, fecha, etc.) para la posición seleccionada
  const muestraEnPosicion: MuestraDetalleDTO | null = selectedPosicion?.ocupada
    ? (muestras.find((m) => m.ubicacion?.idPosicionCaja === selectedPosicion.id) ?? null)
    : null

  const handlePosicionClick = (posicion: any) => {
    setSelectedPosicion(posicion)
  }

  const renderGrid = () => {
    if (!caja || !posiciones) return null

    const rows = caja.filas
    const cols = caja.columnas

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Grid {rows}×{cols} - Total: {posiciones.length} posiciones
        </div>

        <div
          className="grid gap-1 p-4 border border-border rounded-lg bg-card"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            maxWidth: '600px',
            margin: '0 auto'
          }}
        >
          {Array.from({ length: rows }, (_, rowIndex) =>
            Array.from({ length: cols }, (_, colIndex) => {
              const posicion = posiciones.find(
                (p: any) => p.fila === rowIndex + 1 && p.columna === colIndex + 1
              )

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square rounded border-2 text-xs font-medium transition-all
                    ${posicion?.ocupada
                      ? 'bg-primary/15 border-primary/50 text-primary hover:bg-primary/25'
                      : 'bg-muted/60 border-muted-foreground/20 text-muted-foreground hover:bg-muted hover:border-muted-foreground/40'
                    }
                    ${selectedPosicion?.id === posicion?.id ? 'ring-2 ring-primary ring-offset-1' : ''}
                  `}
                  onClick={() => posicion && handlePosicionClick(posicion)}
                  title={posicion ? `Fila ${posicion.fila}, Columna ${posicion.columna}` : 'Posición no creada'}
                >
                  {posicion ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{posicion.fila}-{posicion.columna}</span>
                      {posicion.ocupada && <TestTube className="h-3 w-3 mt-1" />}
                    </div>
                  ) : (
                    <span className="opacity-30">?</span>
                  )}
                </button>
              )
            })
          ).flat()}
        </div>

        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted/60 border-2 border-muted-foreground/20 rounded"></div>
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/15 border-2 border-primary/50 rounded flex items-center justify-center">
              <TestTube className="h-2 w-2 text-primary" />
            </div>
            <span>Ocupada</span>
          </div>
        </div>
      </div>
    )
  }

  const renderPosicionDetails = () => {
    if (!selectedPosicion) return null

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Posición {selectedPosicion.fila}-{selectedPosicion.columna}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado:</span>
            <Badge variant={selectedPosicion.ocupada ? 'default' : 'secondary'}>
              {selectedPosicion.ocupada ? 'Ocupada' : 'Libre'}
            </Badge>
          </div>

          {selectedPosicion.ocupada && (
            <div className="pt-2 border-t space-y-2">
              {muestraEnPosicion ? (
                <>
                  {/* Encabezado muestra */}
                  <div className="flex items-center gap-2">
                    <TestTube className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Muestra almacenada</span>
                  </div>

                  {/* Etiqueta + valor */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Etiqueta</p>
                      <p className="font-mono font-semibold">{muestraEnPosicion.etiqueta}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium">{muestraEnPosicion.valor} {muestraEnPosicion.unidad}</p>
                    </div>
                  </div>

                  {/* Fecha de recolección */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Recolectada:</span>
                    <span className="text-xs">{formatDate(muestraEnPosicion.fechaRecoleccion)}</span>
                  </div>

                  {/* Paciente */}
                  {muestraEnPosicion.paciente && (
                    <div className="flex items-start gap-2 text-sm rounded-md bg-muted/40 px-2 py-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Participante</p>
                        <p className="text-sm font-medium">{muestraEnPosicion.paciente.nombreCompleto}</p>
                        <p className="text-xs text-muted-foreground">Folio: {muestraEnPosicion.paciente.folio}</p>
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  {muestraEnPosicion.observaciones && (
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Observaciones</p>
                      <p className="text-xs mt-0.5">{muestraEnPosicion.observaciones}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Posición ocupada — no se encontró detalle de la muestra.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!caja) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Posiciones de {caja.codigoCaja}
          </DialogTitle>
          <DialogDescription>
            Visualiza y gestiona las posiciones de la caja criogénica.
            Haz clic en una posición para ver sus detalles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {renderGrid()}

              {selectedPosicion && (
                <div className="border-t pt-4">
                  {renderPosicionDetails()}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}