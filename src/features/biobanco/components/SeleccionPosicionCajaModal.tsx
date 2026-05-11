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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useGetCajas, useGetPosicionesByCaja } from '../hooks/useBiobanco'
import { PosicionCaja } from '@/types/api'

interface SeleccionPosicionCajaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (result: { idPosicionCaja: number; cajaLabel: string }) => void
}

function colLabel(col: number): string {
  return String.fromCharCode(64 + col)
}

export function SeleccionPosicionCajaModal({
  open,
  onOpenChange,
  onConfirm,
}: SeleccionPosicionCajaModalProps) {
  const [selectedCajaId, setSelectedCajaId] = useState<string>('')
  const [selectedPosicion, setSelectedPosicion] = useState<PosicionCaja | null>(null)

  const { data: cajas } = useGetCajas()
  const { data: posiciones, isLoading: loadingPosiciones } = useGetPosicionesByCaja(
    selectedCajaId ? parseInt(selectedCajaId) : 0
  )

  const filas = posiciones ? [...new Set(posiciones.map((p) => p.fila))].sort((a, b) => a - b) : []
  const columnas = posiciones ? [...new Set(posiciones.map((p) => p.columna))].sort((a, b) => a - b) : []

  const posMap: Record<string, PosicionCaja> = {}
  posiciones?.forEach((p) => { posMap[`${p.fila}-${p.columna}`] = p })

  const handleCajaChange = (value: string) => {
    setSelectedCajaId(value)
    setSelectedPosicion(null)
  }

  const handleConfirm = () => {
    if (!selectedPosicion || !selectedCajaId) return
    const caja = cajas?.find((c) => c.id.toString() === selectedCajaId)
    const label = `Caja ${caja?.codigoCaja ?? selectedCajaId} — Fila ${selectedPosicion.fila} Col ${colLabel(selectedPosicion.columna)}`
    onConfirm({ idPosicionCaja: selectedPosicion.id, cajaLabel: label })
    handleClose()
  }

  const handleClose = () => {
    setSelectedCajaId('')
    setSelectedPosicion(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Posición en Caja</DialogTitle>
          <DialogDescription>
            Elige la caja criogénica y luego selecciona una posición libre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Caja criogénica</Label>
            <Select value={selectedCajaId} onValueChange={handleCajaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una caja..." />
              </SelectTrigger>
              <SelectContent>
                {cajas?.map((caja) => (
                  <SelectItem key={caja.id} value={caja.id.toString()}>
                    {caja.codigoCaja} — {caja.tipoCaja}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCajaId && (
            <div className="space-y-3">
              <Label>Posición</Label>
              {loadingPosiciones ? (
                <p className="text-sm text-muted-foreground">Cargando posiciones...</p>
              ) : filas.length > 0 && columnas.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="inline-block">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          <th className="w-8" />
                          {columnas.map((col) => (
                            <th
                              key={col}
                              className="w-10 h-7 text-center text-xs text-muted-foreground font-medium pb-1"
                            >
                              {colLabel(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((fila) => (
                          <tr key={fila}>
                            <td className="w-8 text-xs text-muted-foreground text-right pr-2 font-medium">
                              {fila}
                            </td>
                            {columnas.map((col) => {
                              const pos = posMap[`${fila}-${col}`]
                              const isSelected = selectedPosicion?.id === pos?.id
                              const isOcupada = pos?.ocupada

                              return (
                                <td key={col} className="p-0.5">
                                  <button
                                    type="button"
                                    disabled={!pos || isOcupada}
                                    onClick={() => {
                                      if (pos && !isOcupada) setSelectedPosicion(pos)
                                    }}
                                    title={
                                      pos
                                        ? isOcupada
                                          ? `Fila ${fila} ${colLabel(col)} — Ocupada`
                                          : `Fila ${fila} ${colLabel(col)}`
                                        : ''
                                    }
                                    className={cn(
                                      'w-9 h-9 rounded border text-xs font-medium transition-colors',
                                      !pos && 'bg-muted border-muted opacity-30 cursor-default',
                                      pos && isOcupada && 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50',
                                      pos && !isOcupada && !isSelected && 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 cursor-pointer',
                                      pos && !isOcupada && isSelected && 'bg-blue-500 border-blue-600 text-white cursor-pointer ring-2 ring-blue-300',
                                    )}
                                  >
                                    {pos ? `${fila}${colLabel(col)}` : ''}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
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
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Esta caja no tiene posiciones disponibles.</p>
              )}

              {selectedPosicion && (
                <p className="text-sm font-medium text-blue-700">
                  Seleccionada: Fila {selectedPosicion.fila}, Col {colLabel(selectedPosicion.columna)}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selectedPosicion}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
