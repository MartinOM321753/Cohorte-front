import { useEffect, useMemo, useState } from 'react'
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
import { Caja, PosicionCaja } from '@/types/api'
import { descripcionPosicionCaja, etiquetaPosicionCaja, letraFila } from '../lib/posicionCaja'
import { getReservadasEnCaja, reservarPosiciones, liberarReservas } from '../api/biobanco.api'

interface SeleccionPosicionCajaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (result: { idPosicionCaja: number; cajaLabel: string }) => void
  temperatura?: number | null
  tipoMuestraId?: number | null
}

export function SeleccionPosicionCajaModal({
  open,
  onOpenChange,
  onConfirm,
  temperatura,
  tipoMuestraId,
}: SeleccionPosicionCajaModalProps) {
  const [selectedCajaId, setSelectedCajaId] = useState<string>('')
  const [selectedPosicion, setSelectedPosicion] = useState<PosicionCaja | null>(null)
  const [sesionId] = useState(() => crypto.randomUUID())
  const [reservadasPorOtros, setReservadasPorOtros] = useState<Set<number>>(new Set())

  const { data: cajas } = useGetCajas(temperatura)
  const { data: posiciones, isLoading: loadingPosiciones } = useGetPosicionesByCaja(
    selectedCajaId ? parseInt(selectedCajaId) : 0
  )

  const cajasOrdenadas = useMemo(() => {
    if (!cajas) return []
    const conEspacio = cajas.filter(c => (c.posicionesLibres ?? 0) > 0)
    if (!tipoMuestraId) return conEspacio
    return [...conEspacio].sort((a, b) => {
      const aMatch = a.idTipoMuestraRecomendado === tipoMuestraId ? 0 : 1
      const bMatch = b.idTipoMuestraRecomendado === tipoMuestraId ? 0 : 1
      return aMatch - bMatch
    })
  }, [cajas, tipoMuestraId])

  function esTipoRecomendado(caja: Caja): boolean {
    if (!tipoMuestraId) return true
    return caja.idTipoMuestraRecomendado === tipoMuestraId
  }

  const cajaSeleccionada = cajas?.find((c) => c.id.toString() === selectedCajaId)
  const esAtrasFrente = cajaSeleccionada?.ordenLlenado === 'ATRAS_FRENTE'

  const filas = posiciones
    ? [...new Set(posiciones.map((p) => p.fila))].sort((a, b) => esAtrasFrente ? b - a : a - b)
    : []
  const columnas = posiciones ? [...new Set(posiciones.map((p) => p.columna))].sort((a, b) => a - b) : []

  const posMap: Record<string, PosicionCaja> = {}
  posiciones?.forEach((p) => { posMap[`${p.fila}-${p.columna}`] = p })

  useEffect(() => {
    if (!selectedCajaId || !open) { setReservadasPorOtros(new Set()); return }
    let vivo = true
    const consultar = () =>
      getReservadasEnCaja(parseInt(selectedCajaId), sesionId)
        .then((ids) => { if (vivo) setReservadasPorOtros(new Set(ids)) })
        .catch(() => {})
    consultar()
    const timer = setInterval(consultar, 15_000)
    return () => { vivo = false; clearInterval(timer) }
  }, [selectedCajaId, open, sesionId])

  useEffect(() => {
    if (!selectedPosicion) return
    reservarPosiciones([selectedPosicion.id], sesionId).catch(() => {})
  }, [selectedPosicion, sesionId])

  const handleCajaChange = (value: string) => {
    setSelectedCajaId(value)
    setSelectedPosicion(null)
  }

  const handleConfirm = () => {
    if (!selectedPosicion || !selectedCajaId) return
    const caja = cajas?.find((c) => c.id.toString() === selectedCajaId)
    const label = `Caja ${caja?.codigoCaja ?? selectedCajaId} — ${etiquetaPosicionCaja(selectedPosicion.fila, selectedPosicion.columna)}`
    onConfirm({ idPosicionCaja: selectedPosicion.id, cajaLabel: label })
    handleClose()
  }

  const handleClose = () => {
    liberarReservas(sesionId).catch(() => {})
    setSelectedCajaId('')
    setSelectedPosicion(null)
    setReservadasPorOtros(new Set())
    onOpenChange(false)
  }

  const hayNoRecomendadas = tipoMuestraId && cajasOrdenadas.some((c) => !esTipoRecomendado(c))

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
                <SelectValue placeholder="Seleccione una caja" />
              </SelectTrigger>
              <SelectContent>
                {cajasOrdenadas.length === 0 && (
                  <SelectItem value="__none__" disabled>No hay cajas disponibles</SelectItem>
                )}
                {cajasOrdenadas.map((caja) => {
                  const recomendada = esTipoRecomendado(caja)
                  const temp = caja.temperaturaRefrigerador != null ? ` (${caja.temperaturaRefrigerador}°C)` : ''
                  const tipo = caja.nombreTipoMuestraRecomendado ? ` — ${caja.nombreTipoMuestraRecomendado}` : ''
                  return (
                    <SelectItem key={caja.id} value={caja.id.toString()}>
                      <span className={cn(!recomendada && 'text-muted-foreground')}>
                        {caja.codigoCaja}{tipo}{temp}
                        {!recomendada && ' *'}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {hayNoRecomendadas && (
              <p className="text-[11px] text-muted-foreground">
                * Cajas compatibles por temperatura pero de tipo de muestra diferente al recomendado.
              </p>
            )}
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
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((fila) => (
                          <tr key={fila}>
                            <td className="w-8 text-xs text-muted-foreground text-right pr-2 font-medium">
                              {letraFila(fila)}
                            </td>
                            {columnas.map((col) => {
                              const pos = posMap[`${fila}-${col}`]
                              const isSelected = selectedPosicion?.id === pos?.id
                              const isOcupada = pos?.ocupada
                              const reservada = pos ? reservadasPorOtros.has(pos.id) : false

                              return (
                                <td key={col} className="p-0.5">
                                  <button
                                    type="button"
                                    disabled={!pos || isOcupada || reservada}
                                    onClick={() => {
                                      if (pos && !isOcupada && !reservada) setSelectedPosicion(pos)
                                    }}
                                    title={
                                      pos
                                        ? reservada
                                          ? `${descripcionPosicionCaja(fila, col)} — Reservada por otro usuario`
                                          : isOcupada
                                            ? `${descripcionPosicionCaja(fila, col)} — Ocupada`
                                            : descripcionPosicionCaja(fila, col)
                                        : ''
                                    }
                                    className={cn(
                                      'w-9 h-9 rounded border text-xs font-medium transition-colors',
                                      !pos && 'bg-muted border-muted opacity-30 cursor-default',
                                      pos && isOcupada && 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50',
                                      pos && reservada && !isOcupada && 'bg-orange-100 border-orange-400 text-orange-700 cursor-not-allowed opacity-70',
                                      pos && !isOcupada && !reservada && !isSelected && 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 cursor-pointer',
                                      pos && !isOcupada && !reservada && isSelected && 'bg-blue-500 border-blue-600 text-white cursor-pointer ring-2 ring-blue-300',
                                    )}
                                  >
                                    {pos ? etiquetaPosicionCaja(fila, col) : ''}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-green-50 border border-green-300 inline-block" />
                        Libre
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-orange-100 border border-orange-400 inline-block" />
                        Reservada
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
                  Seleccionada: {descripcionPosicionCaja(selectedPosicion.fila, selectedPosicion.columna)}
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
