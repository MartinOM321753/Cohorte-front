import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGetPosicionesByPiso } from '../hooks/useBiobanco'
import { PosicionPiso } from '@/types/api'
import { CheckCircle2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PosicionPisoSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idPiso: number
  pisoLabel: string
  onSelect: (posicion: PosicionPiso) => void
}

export function PosicionPisoSelectorModal({
  open,
  onOpenChange,
  idPiso,
  pisoLabel,
  onSelect,
}: PosicionPisoSelectorModalProps) {
  const [selectedPosicion, setSelectedPosicion] = useState<PosicionPiso | null>(null)
  const [activeAltura, setActiveAltura] = useState<string>('')

  const { data: posiciones, isLoading } = useGetPosicionesByPiso(open ? idPiso : 0)

  const { alturas, filas, columnas, posicionMap } = useMemo(() => {
    if (!posiciones || posiciones.length === 0) {
      return { alturas: [], filas: [], columnas: [], posicionMap: {} }
    }

    const alturaSet = new Set<string>()
    const filaSet = new Set<string>()
    const columnaSet = new Set<string>()
    const map: Record<string, Record<string, Record<string, PosicionPiso>>> = {}

    for (const pos of posiciones) {
      alturaSet.add(pos.altura)
      filaSet.add(pos.fila)
      columnaSet.add(pos.columna)
      if (!map[pos.altura]) map[pos.altura] = {}
      if (!map[pos.altura][pos.fila]) map[pos.altura][pos.fila] = {}
      map[pos.altura][pos.fila][pos.columna] = pos
    }

    return {
      alturas: [...alturaSet].sort(),
      filas: [...filaSet].sort(),
      columnas: [...columnaSet].sort(),
      posicionMap: map,
    }
  }, [posiciones])

  useEffect(() => {
    if (alturas.length > 0 && !activeAltura) {
      setActiveAltura(alturas[0])
    }
  }, [alturas, activeAltura])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedPosicion(null)
      setActiveAltura('')
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedPosicion) {
      onSelect(selectedPosicion)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Seleccionar Posición — {pisoLabel}
          </DialogTitle>
          <DialogDescription>
            Selecciona una posición libre (verde) para asignar la caja. Las posiciones grises están ocupadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Cargando posiciones...
            </div>
          ) : !posiciones || posiciones.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No hay posiciones configuradas para este piso.
            </div>
          ) : (
            <>
              {/* Altitude selector tabs */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Nivel de altura (profundidad)</p>
                <div className="flex gap-2 flex-wrap">
                  {alturas.map((altura) => (
                    <button
                      key={altura}
                      type="button"
                      onClick={() => setActiveAltura(altura)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                        activeAltura === altura
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-accent'
                      }`}
                    >
                      Altura {altura}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2D grid for the active altitude level */}
              {activeAltura && (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-3">
                    Mostrando posiciones en altura <strong>{activeAltura}</strong>
                  </p>
                  <div className="overflow-auto">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          {/* Empty corner */}
                          <th className="w-8 p-1" />
                          {columnas.map((col) => (
                            <th
                              key={col}
                              className="text-xs text-center text-muted-foreground px-1 py-0.5 font-semibold w-10"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((fila) => (
                          <tr key={fila}>
                            <td className="text-xs text-muted-foreground pr-1 font-semibold text-right w-8">
                              {fila}
                            </td>
                            {columnas.map((col) => {
                              const pos = posicionMap[activeAltura]?.[fila]?.[col]

                              if (!pos) {
                                return (
                                  <td key={col} className="p-0.5">
                                    <div className="w-9 h-9 rounded border border-dashed border-border/30 bg-muted/10" />
                                  </td>
                                )
                              }

                              const isSelected = selectedPosicion?.id === pos.id
                              const isOcupada = pos.ocupada

                              return (
                                <td key={col} className="p-0.5">
                                  <button
                                    type="button"
                                    disabled={isOcupada}
                                    onClick={() => setSelectedPosicion(pos)}
                                    title={
                                      isOcupada
                                        ? `Fila ${fila} Col ${col} — Ocupada`
                                        : `Fila ${fila} Col ${col} — Altura ${activeAltura}`
                                    }
                                    className={cn(
                                      'w-9 h-9 rounded border text-xs font-medium transition-colors',
                                      isOcupada
                                        ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                                        : isSelected
                                        ? 'bg-blue-500 border-blue-600 text-white cursor-pointer ring-2 ring-blue-300'
                                        : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 cursor-pointer',
                                    )}
                                  >
                                    {fila}{col}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-50 border border-green-300 inline-block" />
                  Libre
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-muted border border-border inline-block opacity-50" />
                  Ocupada
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500 border border-blue-600 inline-block" />
                  Seleccionada
                </span>
              </div>

              {/* Selected position info */}
              {selectedPosicion && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Posición seleccionada: Fila <strong>{selectedPosicion.fila}</strong>, Columna{' '}
                    <strong>{selectedPosicion.columna}</strong>, Altura{' '}
                    <strong>{selectedPosicion.altura}</strong>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedPosicion}>
            Confirmar Posición
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
