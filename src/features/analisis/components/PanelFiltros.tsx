import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format, isValid, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarIcon,
  CalendarRange,
  ChevronDown,
  Grid3x3,
  Hash,
  Layers,
  LineChart,
  Plus,
  ScatterChart,
  SlidersHorizontal,
  Spline,
  Table2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import type {
  Agregacion,
  Dimension,
  FiltrosAnalisis,
  Granularidad,
  InstitucionAlcance,
  TipoMetrica,
} from '../types/analisis.types'

const AGREGACIONES_NUM: { v: Agregacion; label: string; icon: typeof Table2 }[] = [
  { v: 'RESUMEN', label: 'Resumen', icon: Table2 },
  { v: 'DISTRIBUCION', label: 'Distribución', icon: BarChart3 },
  { v: 'FUERA_DE_RANGO', label: 'Fuera de rango', icon: AlertTriangle },
  { v: 'TEMPORAL', label: 'Evolución', icon: TrendingUp },
  { v: 'DISPERSION_TEMPORAL', label: 'Dispersión', icon: Spline },
  { v: 'MAPA_CALOR', label: 'Mapa de calor', icon: Grid3x3 },
  { v: 'CORRELACION', label: 'Correlación', icon: ScatterChart },
]

const GRANULARIDADES: { v: Granularidad; label: string }[] = [
  { v: 'MES', label: 'Mes' },
  { v: 'TRIMESTRE', label: 'Trimestre' },
  { v: 'ANIO', label: 'Año' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Selector de vista: botones de tipo de análisis + granularidad temporal.
// Vive junto a la gráfica (encima), no con los filtros.
// ─────────────────────────────────────────────────────────────────────────────
interface SelectorVistaProps {
  tipo: TipoMetrica
  agregacion: Agregacion
  setAgregacion: (a: Agregacion) => void
  granularidad: Granularidad
  setGranularidad: (g: Granularidad) => void
}

export function SelectorVista({
  tipo, agregacion, setAgregacion, granularidad, setGranularidad,
}: SelectorVistaProps) {
  if (tipo !== 'NUMERICO') return null
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {AGREGACIONES_NUM.map((a) => {
          const Icono = a.icon
          const activo = agregacion === a.v
          return (
            <Button
              key={a.v}
              size="sm"
              variant={activo ? 'default' : 'outline'}
              className="h-7 gap-1 px-2.5 text-[13px]"
              onClick={() => setAgregacion(a.v)}
            >
              <Icono className="h-3.5 w-3.5" />
              {a.label}
            </Button>
          )
        })}
      </div>

      {agregacion === 'TEMPORAL' || agregacion === 'DISPERSION_TEMPORAL' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <LineChart className="h-3.5 w-3.5" /> Corte:
          </span>
          {GRANULARIDADES.map((g) => (
            <Button
              key={g.v}
              size="sm"
              variant={granularidad === g.v ? 'secondary' : 'ghost'}
              className="h-7 px-2.5"
              onClick={() => setGranularidad(g.v)}
            >
              {g.label}
            </Button>
          ))}
          <span className="text-[11px] text-muted-foreground">
            Desglose por sexo, edad o institución para separar varias series.
          </span>
        </div>
      ) : null}

      {agregacion === 'MAPA_CALOR' ? (
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Grid3x3 className="h-3 w-3" /> Elija dos dimensiones de desglose para cruzarlas.
        </p>
      ) : null}

      {agregacion === 'CORRELACION' ? (
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ScatterChart className="h-3 w-3" /> Elija la segunda variable (Y) junto a la gráfica; la primera dimensión colorea la nube.
        </p>
      ) : null}
    </div>
  )
}

// ── Campo de fecha con el datepicker del proyecto (Popover + Calendar) ─────────
function CampoFecha({
  value, onChange, placeholder,
}: {
  value: string | null | undefined
  onChange: (iso: string | null) => void
  placeholder: string
}) {
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const fecha = parsed && isValid(parsed) ? parsed : undefined
  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('h-8 w-full justify-start gap-1 overflow-hidden px-1.5 text-[11px] font-normal', fecha && 'pr-6', !fecha && 'text-muted-foreground')}
          >
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{fecha ? format(fecha, 'dd/MM/yy', { locale: es }) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fecha}
            onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : null)}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {fecha ? (
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-destructive"
          onClick={() => onChange(null)}
          aria-label="Quitar fecha"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}

// ── Chip de selección (tema-seguro: activo = pastilla de marca) ────────────────
function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
        activo
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-foreground/80 hover:bg-primary/10 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

// ── Grupo compacto: etiqueta con icono + controles en una columna estrecha ─────
function Grupo({
  icon: Icon, label, children, className,
}: { icon: typeof Users; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <div className="flex min-h-8 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de filtros y desglose como barra compacta: cada grupo ocupa lo mínimo y
// los listados largos (instituciones, cortes de edad) viven en popovers.
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  agregacion: Agregacion
  dimensiones: Dimension[]
  setDimensiones: (d: Dimension[]) => void
  filtros: FiltrosAnalisis
  setFiltros: (f: FiltrosAnalisis) => void
  instituciones: InstitucionAlcance[]
}

export function PanelFiltros({
  agregacion, dimensiones, setDimensiones, filtros, setFiltros, instituciones,
}: Props) {
  const toggleDim = (d: Dimension) =>
    setDimensiones(dimensiones.includes(d) ? dimensiones.filter((x) => x !== d) : [...dimensiones, d])

  const toggleInstitucion = (id: number) => {
    const actual = filtros.instituciones ?? []
    const next = actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]
    setFiltros({ ...filtros, instituciones: next })
  }

  const toggleSexo = (s: 'M' | 'F') => {
    const actual = filtros.sexos ?? []
    const next = actual.includes(s) ? actual.filter((x) => x !== s) : [...actual, s]
    setFiltros({ ...filtros, sexos: next })
  }

  const num = (v: string): number | null => (v === '' ? null : Number(v))

  const rangos = filtros.rangosEdad ?? []
  const setRango = (i: number, pos: 0 | 1, v: string) => {
    const copia = rangos.map((r) => [...r] as [number, number])
    copia[i][pos] = Number(v || 0)
    setFiltros({ ...filtros, rangosEdad: copia })
  }
  const agregarRango = () => {
    const ultimo = rangos[rangos.length - 1]
    const base = ultimo ? ultimo[1] + 1 : 18
    setFiltros({ ...filtros, rangosEdad: [...rangos, [base, base + 9]] })
  }
  const quitarRango = (i: number) =>
    setFiltros({ ...filtros, rangosEdad: rangos.filter((_, j) => j !== i) })
  const presetDecenal = () =>
    setFiltros({
      ...filtros,
      rangosEdad: [[18, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79]],
    })

  const verEdad = dimensiones.includes('rango_edad')
  const nInst = filtros.instituciones?.length ?? 0

  return (
    <Card className="py-0">
      <CardContent className="p-2.5">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros y desglose
        </div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Desglosar por (chips) */}
        <Grupo icon={Layers} label="Desglosar">
          <Chip activo={dimensiones.includes('sexo')} onClick={() => toggleDim('sexo')}>
            <Users className="h-3 w-3" /> Sexo
          </Chip>
          <Chip activo={dimensiones.includes('rango_edad')} onClick={() => toggleDim('rango_edad')}>
            <Hash className="h-3 w-3" /> Edad
          </Chip>
          {instituciones.length > 1 ? (
            <Chip activo={dimensiones.includes('institucion')} onClick={() => toggleDim('institucion')}>
              <Building2 className="h-3 w-3" /> Institución
            </Chip>
          ) : null}
        </Grupo>

        {/* Sexo (filtro) */}
        <Grupo icon={Users} label="Sexo">
          <Chip activo={(filtros.sexos ?? []).includes('F')} onClick={() => toggleSexo('F')}>Mujeres</Chip>
          <Chip activo={(filtros.sexos ?? []).includes('M')} onClick={() => toggleSexo('M')}>Hombres</Chip>
        </Grupo>

        {/* Edad min/max */}
        <Grupo icon={Hash} label="Edad (años)">
          <Input
            type="number"
            placeholder="mín"
            className="h-8 w-16 px-2"
            value={filtros.edadMin ?? ''}
            onChange={(e) => setFiltros({ ...filtros, edadMin: num(e.target.value) })}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="máx"
            className="h-8 w-16 px-2"
            value={filtros.edadMax ?? ''}
            onChange={(e) => setFiltros({ ...filtros, edadMax: num(e.target.value) })}
          />
        </Grupo>

        {/* Fechas (datepicker del proyecto): 4ª columna, Desde y Hasta en la misma fila */}
        <Grupo icon={CalendarRange} label="Fechas">
          <div className="flex w-full items-center gap-1.5">
            <CampoFecha
              value={filtros.fechaDesde}
              placeholder="Desde"
              onChange={(iso) => setFiltros({ ...filtros, fechaDesde: iso })}
            />
            <CampoFecha
              value={filtros.fechaHasta}
              placeholder="Hasta"
              onChange={(iso) => setFiltros({ ...filtros, fechaHasta: iso })}
            />
          </div>
        </Grupo>

        {/* Cortes de edad (popover): solo al desglosar por edad */}
        {verEdad ? (
          <Grupo icon={Hash} label="Cortes de edad">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full justify-between gap-1.5">
                  {rangos.length ? `${rangos.length} corte${rangos.length > 1 ? 's' : ''}` : 'Definir'}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-foreground">Cortes de edad</span>
                  <button type="button" onClick={presetDecenal} className="text-[12px] font-medium text-primary hover:underline">
                    Decenales
                  </button>
                </div>
                {rangos.length === 0 ? (
                  <p className="mb-2 text-[12px] text-muted-foreground">
                    Sin cortes: todo irá a un solo grupo. Añada cortes o use «Decenales».
                  </p>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  {rangos.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input type="number" className="h-8 w-14 px-1.5 text-center" value={r[0]} onChange={(e) => setRango(i, 0, e.target.value)} />
                      <span className="text-muted-foreground">–</span>
                      <Input type="number" className="h-8 w-14 px-1.5 text-center" value={r[1]} onChange={(e) => setRango(i, 1, e.target.value)} />
                      <button
                        type="button"
                        onClick={() => quitarRango(i)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Quitar corte"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-1.5 h-7 gap-1 px-2" onClick={agregarRango}>
                  <Plus className="h-3.5 w-3.5" /> Añadir corte
                </Button>
              </PopoverContent>
            </Popover>
          </Grupo>
        ) : null}

        {/* Instituciones (popover): a todo el ancho */}
        {instituciones.length > 1 ? (
          <Grupo icon={Building2} label="Instituciones" className="col-span-full">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full justify-between gap-1.5">
                  {nInst === 0 ? 'Todas las instituciones' : `${nInst} institución${nInst > 1 ? 'es' : ''} seleccionada${nInst > 1 ? 's' : ''}`}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(32rem,90vw)] p-2">
                <div className="grid max-h-60 grid-cols-1 gap-x-4 gap-y-1.5 overflow-y-auto sm:grid-cols-2">
                  {instituciones.map((i) => (
                    <Casilla
                      key={i.id}
                      checked={(filtros.instituciones ?? []).includes(i.id)}
                      onChange={() => toggleInstitucion(i.id)}
                      label={i.nombre}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </Grupo>
        ) : null}

        {/* Bins del histograma */}
        {agregacion === 'DISTRIBUCION' ? (
          <Grupo icon={BarChart3} label="Barras">
            <Input
              type="number"
              className="h-8 w-20 px-2"
              value={filtros.bins ?? ''}
              placeholder="12"
              onChange={(e) => setFiltros({ ...filtros, bins: num(e.target.value) })}
            />
          </Grupo>
        ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function Casilla({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 text-[13px]')}>
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  )
}
