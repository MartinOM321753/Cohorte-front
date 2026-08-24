import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Box, Crosshair, Layers, Loader2, Refrigerator } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import { useGetUbicacion3D } from '../../hooks/useBiobanco'
import { BoxView } from './BoxView'
import { CLASES_DIALOGO_3D, Marco3D } from './Marco3D'
import { FloorView } from './FloorView'
import { FridgeView } from './FridgeView'
import { PanelCaja, PanelPiso, PanelPosicion, PanelRefrigerador } from './paneles'
import { PositionView } from './PositionView'
import { VISTAS_3D, type Ubicacion3D, type Vista3D } from './ubicacion3d.types'

const PASOS = [
  { nombre: 'Refrigerador', icono: Refrigerator },
  { nombre: 'Piso', icono: Layers },
  { nombre: 'Caja', icono: Box },
  { nombre: 'Posición', icono: Crosshair },
]

/**
 * Visualizador 3D de la ubicación de una muestra o alícuota.
 *
 * <p>Cuatro vistas independientes —refrigerador, piso, caja, posición— sobre la
 * misma respuesta del backend. Navegan por breadcrumb, por las flechas y con las
 * teclas de dirección.
 *
 * <p>Va sobre una muestra concreta: solo se puede entrar al piso y a la caja que
 * la alojan, porque son los únicos niveles cuyos datos trae la respuesta. Para
 * recorrer el biobanco sin objetivo está {@code ExplorarBiobanco3DModal}.
 *
 * <p>El modal no reemplaza la ficha textual de ubicación de la tarjeta de la
 * muestra: la acompaña.
 */
export function UbicacionMuestra3DModal({
  idMuestra,
  etiqueta,
  open,
  onOpenChange,
}: {
  idMuestra: number | null
  etiqueta?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError, error } = useGetUbicacion3D(open ? idMuestra : null)
  const [vista, setVista] = useState<Vista3D>('refrigerador')
  const [pisoSeleccionado, setPisoSeleccionado] = useState<number | null>(null)
  const [huecoSeleccionado, setHuecoSeleccionado] = useState<number | null>(null)
  const [posicionSeleccionada, setPosicionSeleccionada] = useState<number | null>(null)

  // Cada muestra abre su propio recorrido desde el principio; conservar la vista
  // anterior dejaba el modal mostrando la caja de la que se acababa de cerrar.
  useEffect(() => {
    if (open) {
      setVista('refrigerador')
      setPisoSeleccionado(null)
      setHuecoSeleccionado(null)
      setPosicionSeleccionada(null)
    }
  }, [open, idMuestra])

  const indice = VISTAS_3D.indexOf(vista)
  const disponible = !!data?.disponible

  const ir = useCallback((siguiente: number) => {
    if (siguiente < 0 || siguiente >= VISTAS_3D.length) return
    setVista(VISTAS_3D[siguiente])
  }, [])

  useEffect(() => {
    if (!open || !disponible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') ir(indice - 1)
      if (e.key === 'ArrowRight') ir(indice + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, disponible, ir, indice])

  const caja = data?.caja ?? null
  const filaFoco =
    caja?.posiciones.find((p) => p.id === posicionSeleccionada)?.fila ?? caja?.filaDestino ?? null
  const columnaFoco =
    caja?.posiciones.find((p) => p.id === posicionSeleccionada)?.columna ??
    caja?.columnaDestino ??
    null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Sin `inset-auto`: tailwind-merge lo consideraría posterior al
          `sm:left-1/2 sm:top-1/2` del propio DialogContent y lo descartaría,
          dejando el diálogo desplazado media pantalla hacia la izquierda. */}
      <DialogContent className={CLASES_DIALOGO_3D}>
        {isLoading && (
          <div className="flex flex-1 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando ubicación…
          </div>
        )}

        {/* Solo cuando no hay nada que pintar: si una recarga en segundo plano
            falla, la escena ya cargada sigue siendo válida y sustituirla por un
            error dejaría al usuario peor de lo que estaba. */}
        {isError && !data && (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-destructive">
            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'No se pudo obtener la ubicación de la muestra.'}
          </div>
        )}

        {data && !disponible && <SinEscena data={data} />}

        {data && disponible && data.refrigerador && data.piso && caja && (
          <Marco3D
            titulo={`Ubicación de ${data.muestra.etiqueta ?? etiqueta ?? 'la muestra'}`}
            descripcion="Recorrido del biobanco desde el refrigerador hasta la posición exacta."
            pasos={PASOS.map((p) => ({ ...p, habilitado: true }))}
            indiceActivo={indice}
            onIr={ir}
            escena={
              vista === 'refrigerador' ? (
                <FridgeView
                  refrigerador={data.refrigerador}
                  pisoSeleccionado={pisoSeleccionado}
                  onSeleccionar={setPisoSeleccionado}
                  onEntrar={() => setVista('piso')}
                  puedeEntrar={(id) => id === data.refrigerador!.idPisoDestino}
                />
              ) : vista === 'piso' ? (
                <FloorView
                  piso={data.piso}
                  cajaSeleccionada={huecoSeleccionado}
                  onSeleccionar={setHuecoSeleccionado}
                  onEntrar={() => setVista('caja')}
                  puedeEntrar={(idCaja) => idCaja === data.piso!.idCajaDestino}
                />
              ) : vista === 'caja' ? (
                <BoxView
                  caja={caja}
                  posicionSeleccionada={posicionSeleccionada}
                  onSeleccionar={setPosicionSeleccionada}
                  onEntrar={(id) => {
                    setPosicionSeleccionada(id)
                    setVista('posicion')
                  }}
                />
              ) : filaFoco != null && columnaFoco != null ? (
                <PositionView caja={caja} fila={filaFoco} columna={columnaFoco} />
              ) : null
            }
            panel={
              vista === 'refrigerador' ? (
                <PanelRefrigerador
                  refrigerador={data.refrigerador}
                  pisoSeleccionado={pisoSeleccionado}
                />
              ) : vista === 'piso' ? (
                <PanelPiso piso={data.piso} huecoSeleccionado={huecoSeleccionado} />
              ) : vista === 'caja' ? (
                <PanelCaja caja={caja} posicionSeleccionada={posicionSeleccionada} />
              ) : filaFoco != null && columnaFoco != null ? (
                <PanelPosicion
                  caja={caja}
                  fila={filaFoco}
                  columna={columnaFoco}
                  // La ficha completa solo aplica a la muestra buscada; si el
                  // usuario se desvía a otra celda, se muestra lo que la celda
                  // sabe de sí misma.
                  muestra={posicionSeleccionada == null ? data.muestra : undefined}
                />
              ) : null
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Muestra fuera del biobanco o sin posición: se informa, no se dibuja. */
function SinEscena({ data }: { data: Ubicacion3D }) {
  const { muestra, prestamo } = data
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--imss-ochre-500)_16%,transparent)]">
          <AlertTriangle className="h-5 w-5 text-[var(--imss-ochre-700)]" />
        </span>
        <p className="text-sm font-medium text-foreground">{data.mensajeNoDisponible}</p>
        <dl className="mt-1 w-full space-y-2 text-left">
          <Fila label="Muestra" value={muestra.etiqueta} />
          <Fila label="Estado" value={muestra.estadoMuestra} />
          <Fila label="Resguardo actual" value={muestra.institucionActual} />
          {prestamo && (
            <>
              <Fila label="Prestada a" value={prestamo.institucionDestino} />
              <Fila label="Prestada por" value={prestamo.institucionOrigen} />
              <Fila label="Autorizó" value={prestamo.autorizadoPor} />
              <Fila
                label="Fecha del préstamo"
                value={prestamo.fechaTraslado ? formatDate(prestamo.fechaTraslado) : null}
              />
              <Fila
                label="Fecha límite"
                value={prestamo.fechaLimite ? formatDate(prestamo.fechaLimite) : null}
              />
              <Fila label="Motivo" value={prestamo.motivo} />
            </>
          )}
        </dl>
      </div>
    </div>
  )
}

function Fila({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border pb-1.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[12px] font-medium text-foreground">
        {value}
      </dd>
    </div>
  )
}
