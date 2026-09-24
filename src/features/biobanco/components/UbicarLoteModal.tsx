/**
 * UbicarLoteModal
 *
 * Asigna posición a todas las alícuotas pendientes de una muestra padre en una
 * sola operación, en lugar de hueco por hueco.
 *
 * El reparto lo calcula esta pantalla —es la que tiene la rejilla pintada y sabe
 * qué huecos están libres— y el servidor recibe la lista ya resuelta. Así el
 * contrato del backend es uno solo y auditable, en vez de un catálogo de
 * estrategias de llenado que se queda corto en cuanto alguien quiere otra.
 *
 * La operación es todo o nada: si un hueco se ocupó mientras el usuario decidía,
 * no queda medio lote ubicado.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Info, Loader2, PackageCheck } from 'lucide-react'

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
import { cn } from '@/lib/utils'
import type { MuestraDetalleDTO, PosicionCaja } from '@/types/api'

import { useGetCajas, useGetPosicionesByCaja, useGetAlicuotasPendientes, useUbicarLoteAlicuotas } from '../hooks/useBiobanco'
import { descripcionPosicionCaja, etiquetaPosicionCaja, letraFila } from '../lib/posicionCaja'

type Recorrido = 'FILA' | 'COLUMNA'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
}

export function UbicarLoteModal({ open, onOpenChange, muestra }: Props) {
  const [idCaja, setIdCaja] = useState<string>('')
  const [recorrido, setRecorrido] = useState<Recorrido>('FILA')
  const [idPosicionInicial, setIdPosicionInicial] = useState<number | null>(null)

  const { data: cajas } = useGetCajas()
  const { data: posiciones, isLoading: cargandoPosiciones } = useGetPosicionesByCaja(
    idCaja ? parseInt(idCaja) : 0,
  )
  const { data: pendientes = [], isLoading: cargandoPendientes } = useGetAlicuotasPendientes(
    muestra?.id ?? 0,
    { enabled: open && !!muestra },
  )
  const ubicarMutation = useUbicarLoteAlicuotas()

  const filas = useMemo(
    () => (posiciones ? [...new Set(posiciones.map((p) => p.fila))].sort((a, b) => a - b) : []),
    [posiciones],
  )
  const columnas = useMemo(
    () => (posiciones ? [...new Set(posiciones.map((p) => p.columna))].sort((a, b) => a - b) : []),
    [posiciones],
  )

  const posMap = useMemo(() => {
    const m: Record<string, PosicionCaja> = {}
    posiciones?.forEach((p) => { m[`${p.fila}-${p.columna}`] = p })
    return m
  }, [posiciones])

  /**
   * Huecos libres en el orden en que se van a llenar, saltando los ocupados.
   *
   * Por filas se recorre A1, A2, A3…; por columnas A1, B1, C1… Es la diferencia
   * entre cómo está rotulada la caja y cómo se colocan físicamente los viales
   * en la gradilla, y cada laboratorio lo hace a su manera.
   */
  const libresEnOrden = useMemo(() => {
    if (!posiciones) return []
    const ordenadas: PosicionCaja[] = []
    if (recorrido === 'FILA') {
      filas.forEach((f) => columnas.forEach((c) => {
        const p = posMap[`${f}-${c}`]
        if (p) ordenadas.push(p)
      }))
    } else {
      columnas.forEach((c) => filas.forEach((f) => {
        const p = posMap[`${f}-${c}`]
        if (p) ordenadas.push(p)
      }))
    }
    const desde = idPosicionInicial != null
      ? ordenadas.findIndex((p) => p.id === idPosicionInicial)
      : 0
    return ordenadas.slice(desde < 0 ? 0 : desde).filter((p) => !p.ocupada)
  }, [posiciones, filas, columnas, posMap, recorrido, idPosicionInicial])

  /** Qué alícuota cae en qué hueco. Es exactamente lo que se manda al servidor. */
  const asignaciones = useMemo(
    () => pendientes.slice(0, libresEnOrden.length).map((alicuota, i) => ({
      alicuota,
      posicion: libresEnOrden[i],
    })),
    [pendientes, libresEnOrden],
  )

  const posicionDeAlicuota = useMemo(() => {
    const m: Record<number, number> = {}
    asignaciones.forEach(({ alicuota, posicion }) => { m[posicion.id] = alicuota.id })
    return m
  }, [asignaciones])

  // Sin caja elegida no hay huecos que contar: avisar entonces de que "solo hay
  // 0 libres" es alarmar por algo que el usuario todavia no ha hecho.
  const faltanHuecos = !!idCaja && !cargandoPosiciones && pendientes.length > libresEnOrden.length
  const volumenADescontar = asignaciones.reduce((acc, a) => acc + (a.alicuota.valor ?? 0), 0)
  const restanteEnPadre = Math.max(0, (muestra?.valor ?? 0) - volumenADescontar)

  useEffect(() => {
    if (!open) {
      setIdCaja('')
      setIdPosicionInicial(null)
      setRecorrido('FILA')
    }
  }, [open])

  const confirmar = async () => {
    if (!muestra || asignaciones.length === 0) return
    await ubicarMutation.mutateAsync(
      {
        idMuestraPadre: muestra.id,
        asignaciones: asignaciones.map(({ alicuota, posicion }) => ({
          idAlicuota: alicuota.id,
          idPosicionCaja: posicion.id,
        })),
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const unidad = muestra?.unidad ?? ''

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="@container max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4" />
            Ubicar lote de alícuotas
          </DialogTitle>
          <DialogDescription>
            Muestra: <span className="font-mono font-medium">{muestra?.etiqueta}</span>
            {' · '}
            {cargandoPendientes
              ? 'contando pendientes…'
              : `${pendientes.length} alícuota${pendientes.length === 1 ? '' : 's'} sin ubicar`}
          </DialogDescription>
        </DialogHeader>

        {!cargandoPendientes && pendientes.length === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Todas las alícuotas de esta muestra ya tienen posición asignada.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Caja criogénica</Label>
                <Select
                  value={idCaja}
                  onValueChange={(v) => { setIdCaja(v); setIdPosicionInicial(null) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una caja…" />
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

              <div className="space-y-2">
                <Label>Orden de llenado</Label>
                <Select value={recorrido} onValueChange={(v) => setRecorrido(v as Recorrido)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FILA">Por filas (A1, A2, A3…)</SelectItem>
                    <SelectItem value="COLUMNA">Por columnas (A1, B1, C1…)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {idCaja && (
              <div className="space-y-2">
                <Label>
                  Rejilla
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Seleccione el hueco donde empieza el lote
                  </span>
                </Label>

                {cargandoPosiciones ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando posiciones…
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          <th className="w-8" />
                          {columnas.map((col) => (
                            <th key={col} className="h-7 w-10 pb-1 text-center text-xs font-medium text-muted-foreground">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((fila) => (
                          <tr key={fila}>
                            <td className="w-8 pr-2 text-right text-xs font-medium text-muted-foreground">
                              {letraFila(fila)}
                            </td>
                            {columnas.map((col) => {
                              const pos = posMap[`${fila}-${col}`]
                              const idAlicuota = pos ? posicionDeAlicuota[pos.id] : undefined
                              const ordinal = idAlicuota
                                ? asignaciones.findIndex((a) => a.alicuota.id === idAlicuota) + 1
                                : 0
                              const esInicio = pos?.id === idPosicionInicial

                              return (
                                <td key={col} className="p-0.5">
                                  <button
                                    type="button"
                                    disabled={!pos || pos.ocupada}
                                    onClick={() => pos && !pos.ocupada && setIdPosicionInicial(pos.id)}
                                    title={
                                      pos
                                        ? pos.ocupada
                                          ? `${descripcionPosicionCaja(fila, col)} — Ocupada`
                                          : descripcionPosicionCaja(fila, col)
                                        : ''
                                    }
                                    className={cn(
                                      'h-9 w-9 rounded border text-xs font-medium transition-colors',
                                      !pos && 'cursor-default border-muted bg-muted opacity-30',
                                      pos && pos.ocupada && 'cursor-not-allowed border-border bg-muted text-muted-foreground opacity-50',
                                      pos && !pos.ocupada && !ordinal && 'cursor-pointer border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
                                      ordinal > 0 && 'cursor-pointer border-blue-600 bg-blue-500 text-white',
                                      esInicio && 'ring-2 ring-blue-300',
                                    )}
                                  >
                                    {ordinal > 0 ? ordinal : pos ? etiquetaPosicionCaja(fila, col) : ''}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded border border-green-300 bg-green-50" />
                        Libre
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded border border-blue-600 bg-blue-500" />
                        Alícuota del lote (en orden)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded border border-border bg-muted opacity-50" />
                        Ocupada
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Consecuencia antes del clic, no después ---------------------- */}
            {asignaciones.length > 0 && (
              <div className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Se ubicarán {asignaciones.length} alícuotas</span>
                  <Badge variant="outline" className="text-[10px]">
                    {asignaciones[0] && etiquetaPosicionCaja(asignaciones[0].posicion.fila, asignaciones[0].posicion.columna)}
                    {asignaciones.length > 1 && ' … '}
                    {asignaciones.length > 1 && etiquetaPosicionCaja(
                      asignaciones[asignaciones.length - 1].posicion.fila,
                      asignaciones[asignaciones.length - 1].posicion.columna,
                    )}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Se descontarán <strong>{fmt(volumenADescontar)} {unidad}</strong> de la muestra padre.
                  Quedará en <strong>{fmt(restanteEnPadre)} {unidad}</strong>
                  {restanteEnPadre <= 0.000001 && ', y se registrará como agotada'}.
                </p>
              </div>
            )}

            {faltanHuecos && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Solo hay {libresEnOrden.length} hueco(s) libre(s) a partir de la posición elegida y hacen
                falta {pendientes.length}. Elija otra caja o ubique el resto por separado.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={asignaciones.length === 0 || ubicarMutation.isPending}
          >
            {ubicarMutation.isPending
              ? 'Ubicando…'
              : `Ubicar ${asignaciones.length || ''} alícuota${asignaciones.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fmt(valor: number): string {
  if (!Number.isFinite(valor)) return '0'
  return String(parseFloat(valor.toFixed(4)))
}
