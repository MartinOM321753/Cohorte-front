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
import { Grid3X3, Package, TestTube } from 'lucide-react'
import { useGetPosicionesByCaja } from '../hooks/useBiobanco'
import { Caja } from '@/types/api'

interface PosicionesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja: Caja | null
}

export function PosicionesModal({ open, onOpenChange, caja }: PosicionesModalProps) {
  const [selectedPosicion, setSelectedPosicion] = useState<any>(null)

  const { data: posiciones, isLoading } = useGetPosicionesByCaja(caja?.id || 0)

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
          className="grid gap-1 p-4 border rounded-lg bg-muted/20"
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
                      ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }
                    ${selectedPosicion?.id === posicion?.id ? 'ring-2 ring-primary' : ''}
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

        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center">
              <TestTube className="h-2 w-2" />
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
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Posición {selectedPosicion.fila}-{selectedPosicion.columna}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado:</span>
            <Badge variant={selectedPosicion.ocupada ? 'default' : 'secondary'}>
              {selectedPosicion.ocupada ? 'Ocupada' : 'Libre'}
            </Badge>
          </div>

          {selectedPosicion.ocupada && selectedPosicion.muestra && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <span className="font-medium">Muestra:</span>
              </div>
              <div className="text-sm space-y-1 pl-6">
                <div><span className="font-medium">Etiqueta:</span> {selectedPosicion.muestra.etiqueta}</div>
                <div><span className="font-medium">Valor:</span> {selectedPosicion.muestra.valor} {selectedPosicion.muestra.unidad}</div>
                <div><span className="font-medium">Fecha:</span> {new Date(selectedPosicion.muestra.fechaRecoleccion).toLocaleDateString()}</div>
              </div>
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