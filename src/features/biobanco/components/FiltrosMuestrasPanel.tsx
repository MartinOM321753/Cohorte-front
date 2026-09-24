/**
 * FiltrosMuestrasPanel
 *
 * Filtros del listado de muestras: fecha de recolección, tipo de muestra, sexo
 * del participante y rango de folio.
 *
 * El panel solo recoge los criterios; quien filtra es el servidor. Cuando el
 * listado llegaba completo daba igual dónde se aplicaran, pero ahora se carga
 * de veinte en veinte: filtrar aquí respondería sobre las tarjetas descargadas
 * y escondería el resto sin decirlo, que es peor que no tener filtros.
 */
import { useMemo } from 'react'
import { Filter, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-time-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import type { TipoMuestra } from '@/types/api'

export interface FiltrosMuestra {
  /** Fecha de recolección, formato YYYY-MM-DD. */
  fechaDesde: string
  fechaHasta: string
  /**
   * Nombres de tipo de muestra; vacío = todos.
   *
   * Por nombre y no por id a propósito: los tipos son por institución, así que
   * «Heces» existe como registro distinto en cada una. Filtrando por id, una
   * muestra de Heces prestada por otra sede desaparecía del listado aunque
   * fuera, para cualquiera que lo mire, exactamente el tipo que se pidió.
   */
  tipos: string[]
  /** 'M', 'F' o '' para ambos. */
  sexo: string
  /** Folio de participante; se comparan como números, no como texto. */
  folioDesde: string
  folioHasta: string
}

export const FILTROS_VACIOS: FiltrosMuestra = {
  fechaDesde: '',
  fechaHasta: '',
  tipos: [],
  sexo: '',
  folioDesde: '',
  folioHasta: '',
}

export function contarFiltrosActivos(f: FiltrosMuestra): number {
  let n = 0
  if (f.fechaDesde || f.fechaHasta) n++
  if (f.tipos.length > 0) n++
  if (f.sexo) n++
  if (f.folioDesde || f.folioHasta) n++
  return n
}

/**
 * Folio a número, solo para avisar de un rango al revés.
 *
 * Los folios vienen rellenos de ceros (`000502`), así que compararlos como
 * texto daría que `000502` es menor que `0006`. El filtro de verdad lo aplica
 * el servidor; aquí basta con detectar que el usuario escribió los extremos
 * cambiados.
 */
function folioANumero(folio: string | null | undefined): number | null {
  if (!folio) return null
  const digitos = folio.replace(/\D/g, '')
  if (!digitos) return null
  const n = parseInt(digitos, 10)
  return Number.isFinite(n) ? n : null
}

interface Props {
  filtros: FiltrosMuestra
  onChange: (filtros: FiltrosMuestra) => void
  tiposMuestra: TipoMuestra[]
}

export function FiltrosMuestrasPanel({ filtros, onChange, tiposMuestra }: Props) {
  const activos = useMemo(() => contarFiltrosActivos(filtros), [filtros])

  const set = <K extends keyof FiltrosMuestra>(campo: K, valor: FiltrosMuestra[K]) =>
    onChange({ ...filtros, [campo]: valor })

  const alternarTipo = (nombre: string) =>
    set(
      'tipos',
      filtros.tipos.includes(nombre)
        ? filtros.tipos.filter((x) => x !== nombre)
        : [...filtros.tipos, nombre],
    )

  // Dos instituciones pueden tener un tipo con el mismo nombre; en la lista
  // debe aparecer una sola vez.
  const nombresTipo = useMemo(
    () => [...new Set(tiposMuestra.map((t) => t.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [tiposMuestra],
  )

  // Un rango al revés no devuelve nada nunca; más vale decirlo que dejar la
  // pantalla vacía sin explicación.
  const rangoFechaInvertido = !!filtros.fechaDesde && !!filtros.fechaHasta
    && filtros.fechaDesde > filtros.fechaHasta
  const folioDesdeNum = folioANumero(filtros.folioDesde)
  const folioHastaNum = folioANumero(filtros.folioHasta)
  const rangoFolioInvertido = folioDesdeNum != null && folioHastaNum != null
    && folioDesdeNum > folioHastaNum

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`text-xs ${activos > 0 ? 'border-primary/40 text-primary' : 'text-muted-foreground'}`}
          >
            <Filter className="mr-1 h-3.5 w-3.5" />
            Filtros
            {activos > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {activos}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        {/* Alto acotado y con desplazamiento propio: el panel es mas alto que
            el hueco que suele quedar bajo el boton, y sin esto Radix lo volteaba
            hacia arriba y recortaba los campos de fecha contra el borde. */}
        <PopoverContent
          align="start"
          collisionPadding={12}
          className="@container max-h-[min(60vh,24rem)] w-[min(92vw,22rem)] space-y-4 overflow-y-auto p-4"
        >
          {/* Fecha de recolección --------------------------------------- */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Fecha de recolección</Label>
            <div className="grid grid-cols-1 gap-2 @xs:grid-cols-2">
              <DatePicker
                value={filtros.fechaDesde}
                onChange={(v) => set('fechaDesde', v)}
                placeholder="Desde"
                className="h-8 text-xs"
              />
              <DatePicker
                value={filtros.fechaHasta}
                onChange={(v) => set('fechaHasta', v)}
                placeholder="Hasta"
                className="h-8 text-xs"
              />
            </div>
            {rangoFechaInvertido && (
              <p className="text-[11px] text-destructive">
                La fecha inicial es posterior a la final: no habrá resultados.
              </p>
            )}
          </div>

          <Separator />

          {/* Tipo de muestra -------------------------------------------- */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Tipo de muestra
              {filtros.tipos.length > 0 && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({filtros.tipos.length} seleccionado{filtros.tipos.length === 1 ? '' : 's'})
                </span>
              )}
            </Label>
            {nombresTipo.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Sin tipos configurados.</p>
            ) : (
              <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                {nombresTipo.map((nombre) => (
                  <label
                    key={nombre}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={filtros.tipos.includes(nombre)}
                      onCheckedChange={() => alternarTipo(nombre)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate">{nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Sexo del participante -------------------------------------- */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Sexo del participante</Label>
            <div className="flex gap-1.5">
              {[
                { valor: '', etiqueta: 'Ambos' },
                { valor: 'F', etiqueta: 'Mujer' },
                { valor: 'M', etiqueta: 'Hombre' },
              ].map((opcion) => (
                <Button
                  key={opcion.valor || 'ambos'}
                  type="button"
                  variant={filtros.sexo === opcion.valor ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => set('sexo', opcion.valor)}
                >
                  {opcion.etiqueta}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Rango de folio --------------------------------------------- */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Rango de folio</Label>
            <div className="grid grid-cols-1 gap-2 @xs:grid-cols-2">
              <Input
                inputMode="numeric"
                value={filtros.folioDesde}
                onChange={(e) => set('folioDesde', e.target.value)}
                placeholder="Desde"
                className="h-8 text-xs"
              />
              <Input
                inputMode="numeric"
                value={filtros.folioHasta}
                onChange={(e) => set('folioHasta', e.target.value)}
                placeholder="Hasta"
                className="h-8 text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Se comparan como números: 1 a 100 incluye del 000001 al 000100.
            </p>
            {rangoFolioInvertido && (
              <p className="text-[11px] text-destructive">
                El folio inicial es mayor que el final: no habrá resultados.
              </p>
            )}
          </div>

          {activos > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground"
                onClick={() => onChange(FILTROS_VACIOS)}
              >
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Atajo para quitarlos sin abrir el panel ----------------------- */}
      {activos > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => onChange(FILTROS_VACIOS)}
          title="Quitar todos los filtros"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
