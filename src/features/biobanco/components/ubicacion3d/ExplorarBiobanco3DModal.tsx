import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Crosshair, Layers, Loader2, Refrigerator } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  useGetUbicacion3D,
  useGetVista3DCaja,
  useGetVista3DPiso,
  useGetVista3DRefrigerador,
} from '../../hooks/useBiobanco'
import { BoxView } from './BoxView'
import { CLASES_DIALOGO_3D, Marco3D } from './Marco3D'
import { FloorView } from './FloorView'
import { FridgeView } from './FridgeView'
import { PanelCaja, PanelPiso, PanelPosicion, PanelRefrigerador } from './paneles'
import { PositionView } from './PositionView'
import type { Ubicacion3DCaja } from './ubicacion3d.types'

/** Nivel abierto en el explorador. */
type Nivel = 0 | 1 | 2 | 3

/**
 * Recorrido libre del biobanco en 3D: refrigerador → piso → caja → posición,
 * sin partir de ninguna muestra.
 *
 * <p>Un clic selecciona la pieza y el panel lateral pasa a describirla; el
 * segundo entra en ella. Las flechas y el breadcrumb suben y bajan de nivel, y
 * cada nivel solo se pide al servidor cuando se entra: recorrer un mueble entero
 * no debe descargar todas sus cajas.
 *
 * <p>Se puede abrir por cualquier extremo — desde un refrigerador o desde una
 * caja suelta —; en el segundo caso la caja trae los identificadores de su piso
 * y su refrigerador, y con eso el breadcrumb reconstruye la ruta de vuelta.
 */
export function ExplorarBiobanco3DModal({
  idRefrigeradorInicial = null,
  idCajaInicial = null,
  open,
  onOpenChange,
}: {
  idRefrigeradorInicial?: number | null
  /** Entrada directa por una caja: el explorador abre en el nivel de caja. */
  idCajaInicial?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [nivel, setNivel] = useState<Nivel>(0)
  const [idRefrigerador, setIdRefrigerador] = useState<number | null>(null)
  const [idPiso, setIdPiso] = useState<number | null>(null)
  const [idCaja, setIdCaja] = useState<number | null>(null)

  const [pisoSeleccionado, setPisoSeleccionado] = useState<number | null>(null)
  const [huecoSeleccionado, setHuecoSeleccionado] = useState<number | null>(null)
  const [posicionSeleccionada, setPosicionSeleccionada] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setIdRefrigerador(idRefrigeradorInicial)
    setIdPiso(null)
    setIdCaja(idCajaInicial)
    setNivel(idCajaInicial != null ? 2 : 0)
    setPisoSeleccionado(null)
    setHuecoSeleccionado(null)
    setPosicionSeleccionada(null)
  }, [open, idRefrigeradorInicial, idCajaInicial])

  // Cada escena se pide solo cuando su nivel está a la vista. Entrar por una
  // caja suelta no debe descargar de paso el piso y el refrigerador enteros.
  const refrigerador = useGetVista3DRefrigerador(idRefrigerador, { enabled: open && nivel === 0 })
  const piso = useGetVista3DPiso(idPiso, { enabled: open && nivel === 1 })
  const caja = useGetVista3DCaja(idCaja, { enabled: open && nivel >= 2 })

  // Al entrar por una caja suelta no conocemos su piso ni su refrigerador hasta
  // que responde el servidor; en cuanto lo hace, el breadcrumb queda completo.
  useEffect(() => {
    const d = caja.data
    if (!d) return
    if (idPiso == null && d.idPiso != null) setIdPiso(d.idPiso)
    if (idRefrigerador == null && d.idRefrigerador != null) setIdRefrigerador(d.idRefrigerador)
  }, [caja.data, idPiso, idRefrigerador])

  const posicionFoco = useMemo(() => {
    if (!caja.data) return null
    return caja.data.posiciones.find((p) => p.id === posicionSeleccionada) ?? null
  }, [caja.data, posicionSeleccionada])

  // La ficha completa de la muestra alojada solo se pide al abrir su posición.
  const muestraEnFoco = useGetUbicacion3D(
    open && nivel === 3 ? (posicionFoco?.idMuestra ?? null) : null,
  )

  const pasos = useMemo(
    () => [
      // Los rótulos caen de vuelta a lo que la caja sabe de su propia ruta, para
      // que el breadcrumb esté completo sin haber pedido esas escenas todavía.
      {
        nombre: refrigerador.data?.codigo ?? caja.data?.codigoRefrigerador ?? 'Refrigerador',
        icono: Refrigerator,
        habilitado: idRefrigerador != null,
      },
      {
        nombre: (() => {
          const numero = piso.data?.numeroPiso ?? caja.data?.numeroPiso
          return numero ? `Piso ${numero}` : 'Piso'
        })(),
        icono: Layers,
        habilitado: idPiso != null,
      },
      { nombre: caja.data?.codigoCaja ?? 'Caja', icono: Box, habilitado: idCaja != null },
      {
        nombre: posicionFoco ? `F${posicionFoco.fila}·C${posicionFoco.columna}` : 'Posición',
        icono: Crosshair,
        habilitado: posicionFoco != null,
      },
    ],
    [refrigerador.data, piso.data, caja.data, idRefrigerador, idPiso, idCaja, posicionFoco],
  )

  const ir = useCallback(
    (destino: number) => {
      if (destino < 0 || destino > 3) return
      if (!pasos[destino]?.habilitado) return
      setNivel(destino as Nivel)
    },
    [pasos],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') ir(nivel - 1)
      if (e.key === 'ArrowRight') ir(nivel + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, ir, nivel])

  const cargando =
    (nivel === 0 && refrigerador.isLoading) ||
    (nivel === 1 && piso.isLoading) ||
    (nivel >= 2 && caja.isLoading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CLASES_DIALOGO_3D}>
        <Marco3D
          titulo="Explorar el biobanco"
          descripcion="Recorre el refrigerador nivel por nivel: toca para ver el detalle, vuelve a tocar para entrar."
          pasos={pasos}
          indiceActivo={nivel}
          onIr={ir}
          escena={
            cargando ? (
              <Cargando />
            ) : nivel === 0 && refrigerador.data ? (
              <FridgeView
                refrigerador={refrigerador.data}
                pisoSeleccionado={pisoSeleccionado}
                onSeleccionar={setPisoSeleccionado}
                onEntrar={(id) => {
                  setIdPiso(id)
                  setIdCaja(null)
                  setHuecoSeleccionado(null)
                  setPosicionSeleccionada(null)
                  setNivel(1)
                }}
                puedeEntrar={() => true}
              />
            ) : nivel === 1 && piso.data ? (
              <FloorView
                piso={piso.data}
                cajaSeleccionada={huecoSeleccionado}
                onSeleccionar={setHuecoSeleccionado}
                onEntrar={(id) => {
                  setIdCaja(id)
                  setPosicionSeleccionada(null)
                  setNivel(2)
                }}
                puedeEntrar={() => true}
              />
            ) : nivel === 2 && caja.data ? (
              <BoxView
                caja={caja.data}
                posicionSeleccionada={posicionSeleccionada}
                onSeleccionar={setPosicionSeleccionada}
                onEntrar={(id) => {
                  setPosicionSeleccionada(id)
                  setNivel(3)
                }}
              />
            ) : nivel === 3 && caja.data && posicionFoco ? (
              <PositionView
                caja={caja.data}
                fila={posicionFoco.fila}
                columna={posicionFoco.columna}
              />
            ) : (
              <VacioEscena />
            )
          }
          panel={
            nivel === 0 && refrigerador.data ? (
              <PanelRefrigerador
                refrigerador={refrigerador.data}
                pisoSeleccionado={pisoSeleccionado}
              />
            ) : nivel === 1 && piso.data ? (
              <PanelPiso piso={piso.data} huecoSeleccionado={huecoSeleccionado} />
            ) : nivel === 2 && caja.data ? (
              <PanelCaja caja={caja.data} posicionSeleccionada={posicionSeleccionada} />
            ) : nivel === 3 && caja.data && posicionFoco ? (
              <PanelPosicion
                caja={caja.data as Ubicacion3DCaja}
                fila={posicionFoco.fila}
                columna={posicionFoco.columna}
                muestra={muestraEnFoco.data?.muestra}
                cargandoMuestra={muestraEnFoco.isLoading}
              />
            ) : null
          }
        />
      </DialogContent>
    </Dialog>
  )
}

function Cargando() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Cargando escena…
    </div>
  )
}

function VacioEscena() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      No se pudo cargar este nivel del biobanco.
    </div>
  )
}
