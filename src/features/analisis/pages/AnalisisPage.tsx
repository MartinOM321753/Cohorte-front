import { useMemo, useState, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Activity, ChevronDown, Download, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  descargarAgregadoCsv,
  descargarCrudo,
  useAgregado,
  useInstitucionesAlcance,
  useMetricas,
} from '../hooks/useAnalisis'
import { PanelFiltros, SelectorVista } from '../components/PanelFiltros'
import { PanelVistas } from '../components/PanelVistas'
import { VistaSerie } from '../components/VistaSerie'
import { VistaCorrelacion } from '../components/VistaCorrelacion'
import { VistaDispersionTemporal } from '../components/VistaDispersionTemporal'
import type {
  Agregacion,
  AgregadoRequest,
  ConfigVista,
  Dimension,
  FiltrosAnalisis,
  Granularidad,
  Metrica,
} from '../types/analisis.types'

export default function AnalisisPage() {
  const { data: metricas = [], isLoading, isError } = useMetricas()
  const { data: instituciones = [] } = useInstitucionesAlcance()
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState<Metrica | null>(null)

  // Estado de análisis, compartido entre filtros y vistas (vive en la página).
  const [agregacion, setAgregacion] = useState<Agregacion>('RESUMEN')
  const [granularidad, setGranularidad] = useState<Granularidad>('MES')
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [filtros, setFiltros] = useState<FiltrosAnalisis>({})
  const [metricaY, setMetricaY] = useState<string | null>(null)
  // Estudios desplegados en el catálogo (colapsados por defecto para compactar).
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const toggleGrupo = (g: string) =>
    setExpandidos((prev) => {
      const n = new Set(prev)
      if (n.has(g)) n.delete(g)
      else n.add(g)
      return n
    })

  // Selecciona una métrica y ajusta la agregación por defecto según su tipo.
  const elegirMetrica = (m: Metrica) => {
    setSeleccion(m)
    setAgregacion(m.tipo === 'NUMERICO' ? 'RESUMEN' : 'FRECUENCIA')
  }

  // Petición de agregado actual, reutilizada por la gráfica y por la exportación.
  const request: AgregadoRequest = useMemo(
    () => ({ metricas: seleccion ? [seleccion.clave] : [], dimensiones, agregacion, granularidad, filtros }),
    [seleccion, dimensiones, agregacion, granularidad, filtros],
  )

  // Configuración actual (para guardar como vista) y carga de una vista guardada.
  const configActual: ConfigVista | null = seleccion
    ? { metricaClave: seleccion.clave, dimensiones, agregacion, filtros, granularidad, metricaY }
    : null

  const cargarVista = (c: ConfigVista) => {
    const m = metricas.find((x) => x.clave === c.metricaClave)
    if (m) setSeleccion(m)
    setAgregacion(c.agregacion)
    setDimensiones(c.dimensiones)
    setFiltros(c.filtros)
    setGranularidad(c.granularidad ?? 'MES')
    setMetricaY(c.metricaY ?? null)
  }

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const filtradas = q
      ? metricas.filter((m) => m.etiqueta.toLowerCase().includes(q) || m.grupo.toLowerCase().includes(q))
      : metricas
    const mapa = new Map<string, Metrica[]>()
    for (const m of filtradas) {
      const arr = mapa.get(m.grupo) ?? []
      arr.push(m)
      mapa.set(m.grupo, arr)
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [metricas, busqueda])

  const esCorrelacion = agregacion === 'CORRELACION'

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera: título breve + acciones (Guardar · Vistas · Exportar) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold leading-tight">Análisis de resultados</h1>
          <p className="text-[13px] text-muted-foreground">Tendencias de la cohorte por institución, sexo, edad y rangos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PanelVistas configActual={configActual} onCargar={cargarVista} />
          <BotonExportar request={request} seleccion={seleccion} esCorrelacion={esCorrelacion} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-[14px] text-muted-foreground">
            No fue posible cargar el catálogo de métricas. Verifique que su institución tenga
            habilitado el módulo de análisis.
          </CardContent>
        </Card>
      ) : metricas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-[14px] text-muted-foreground">
            No hay variables analizables en su alcance todavía. Aparecerán aquí conforme se
            registren estudios, exámenes o somatometría.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] md:items-start">
          {/* ── Catálogo: buscador + lista de estudios desplegables (sin scroll propio) ── */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar variable o estudio…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            <div className="flex flex-col gap-2">
              {grupos.map(([grupo, items]) => {
                // Abierto si el usuario lo desplegó, si hay búsqueda activa o si
                // contiene la métrica seleccionada.
                const abierto =
                  busqueda.trim() !== '' ||
                  expandidos.has(grupo) ||
                  items.some((i) => i.clave === seleccion?.clave)
                return (
                  <div key={grupo} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleGrupo(grupo)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-primary/5"
                    >
                      <span className="text-[12px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                        {grupo}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
                          {items.length}
                        </span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', abierto && 'rotate-180')} />
                      </span>
                    </button>
                    {abierto ? (
                      <div className="flex flex-col gap-0.5 px-2 pb-2.5">
                        {items.map((m) => {
                          const activo = seleccion?.clave === m.clave
                          return (
                            <button
                              key={m.clave}
                              type="button"
                              onClick={() => elegirMetrica(m)}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[14px] transition-colors',
                                activo
                                  ? 'bg-primary font-medium text-primary-foreground'
                                  : 'text-foreground/90 hover:bg-primary/10 hover:text-foreground',
                              )}
                            >
                              <span className="min-w-0 truncate">{m.etiqueta}</span>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {m.unidad ? (
                                  <span className={cn('text-[12px]', activo ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                                    {m.unidad}
                                  </span>
                                ) : null}
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 text-[11px] font-medium uppercase',
                                    activo
                                      ? 'bg-primary-foreground/20 text-primary-foreground'
                                      : m.tipo === 'NUMERICO'
                                        ? 'bg-secondary text-secondary-foreground'
                                        : 'border border-border text-muted-foreground',
                                  )}
                                >
                                  {m.tipo === 'NUMERICO' ? 'num' : 'cat'}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {grupos.length === 0 ? (
                <p className="px-1 text-[13px] text-muted-foreground">Sin coincidencias.</p>
              ) : null}
            </div>
          </div>

          {/* ── Área principal: métrica + controles + filtros + gráfica ── */}
          <div className="flex min-w-0 flex-col gap-4">
            {seleccion ? (
              <AnalisisDeMetrica
                metrica={seleccion}
                agregacion={agregacion}
                request={request}
                dimensiones={dimensiones}
                filtros={filtros}
                metricas={metricas}
                metricaY={metricaY}
                setMetricaY={setMetricaY}
                selector={
                  <SelectorVista
                    tipo={seleccion.tipo}
                    agregacion={agregacion}
                    setAgregacion={setAgregacion}
                    granularidad={granularidad}
                    setGranularidad={setGranularidad}
                  />
                }
                panelFiltros={
                  <PanelFiltros
                    agregacion={agregacion}
                    dimensiones={dimensiones}
                    setDimensiones={setDimensiones}
                    filtros={filtros}
                    setFiltros={setFiltros}
                    instituciones={instituciones}
                  />
                }
              />
            ) : (
              <Card>
                <CardContent className="flex min-h-[320px] items-center justify-center text-center text-[14px] text-muted-foreground">
                  Seleccione una variable del catálogo para analizarla.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Botón Exportar: un solo botón con menú (agregado / crudo) ──────────────────
function BotonExportar({
  request, seleccion, esCorrelacion,
}: {
  request: AgregadoRequest
  seleccion: Metrica | null
  esCorrelacion: boolean
}) {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeExportar = hasPermiso('ANALISIS_EXPORTAR')
  const puedeCrudo = hasPermiso('ANALISIS_EXPORTA_CRUDO')
  const [ocupado, setOcupado] = useState(false)
  const [abierto, setAbierto] = useState(false)

  if (!puedeExportar && !puedeCrudo) return null

  const agregado = async () => {
    setOcupado(true)
    try {
      await descargarAgregadoCsv(request, ',')
      setAbierto(false)
    } finally {
      setOcupado(false)
    }
  }
  const crudo = async (formato: 'csv' | 'xlsx') => {
    setOcupado(true)
    try {
      await descargarCrudo(request, formato)
      setAbierto(false)
    } finally {
      setOcupado(false)
    }
  }

  const deshabilitado = !seleccion || ocupado

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-1.5 rounded-lg" disabled={deshabilitado}>
          <Download className="h-4 w-4" />
          Exportar
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        {puedeExportar ? (
          <ItemMenu onClick={agregado} disabled={esCorrelacion}>
            Resumen agregado (CSV)
          </ItemMenu>
        ) : null}
        {puedeCrudo ? (
          <>
            <ItemMenu onClick={() => crudo('csv')}>Datos a nivel participante (CSV)</ItemMenu>
            <ItemMenu onClick={() => crudo('xlsx')}>Datos a nivel participante (XLSX)</ItemMenu>
          </>
        ) : null}
        {puedeExportar && esCorrelacion ? (
          <p className="px-2 pt-1 text-[11px] text-muted-foreground">
            El resumen agregado no aplica a la vista de correlación.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function ItemMenu({
  onClick, disabled, children,
}: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
        disabled
          ? 'cursor-not-allowed text-muted-foreground/50'
          : 'text-foreground/90 hover:bg-primary/10 hover:text-foreground',
      )}
    >
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
      {children}
    </button>
  )
}

function AnalisisDeMetrica({
  metrica,
  agregacion,
  request,
  dimensiones,
  filtros,
  metricas,
  metricaY,
  setMetricaY,
  selector,
  panelFiltros,
}: {
  metrica: Metrica
  agregacion: Agregacion
  request: AgregadoRequest
  dimensiones: Dimension[]
  filtros: FiltrosAnalisis
  metricas: Metrica[]
  metricaY: string | null
  setMetricaY: (clave: string | null) => void
  selector: ReactNode
  panelFiltros: ReactNode
}) {
  const esCorrelacion = agregacion === 'CORRELACION'
  const esDispersion = agregacion === 'DISPERSION_TEMPORAL'
  const { data: series = [], isFetching } = useAgregado(request, { enabled: !esCorrelacion && !esDispersion })
  const serie = series[0]

  // Otras métricas numéricas del mismo alcance, para el eje Y de la correlación.
  const numericasY = useMemo(
    () => metricas.filter((m) => m.tipo === 'NUMERICO' && m.clave !== metrica.clave),
    [metricas, metrica.clave],
  )

  const rango = (min: number | null, max: number | null) =>
    min == null && max == null
      ? '—'
      : `${min ?? '−∞'}–${max ?? '+∞'}${metrica.unidad ? ' ' + metrica.unidad : ''}`

  return (
    <div className="flex flex-col gap-3">
      {/* Tarjeta de la métrica: insignia + grupo + título + referencias */}
      <Card className="py-0">
        <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/12 text-primary sm:h-11 sm:w-11"
              style={{ clipPath: 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)' }}
              aria-hidden
            >
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {metrica.grupo}
              </p>
              <h2 className="text-[17px] font-semibold leading-tight sm:text-[20px]">
                {metrica.etiqueta}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {metrica.tipo === 'NUMERICO' ? 'Variable numérica' : 'Variable categórica'}
              </p>
            </div>
          </div>

          {/* Referencias: a la derecha, en una sola fila (no columna) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] sm:shrink-0 sm:justify-end">
            <Meta etiqueta="Unidad" valor={metrica.unidad ?? '—'} />
            <Meta etiqueta="Hombres" valor={rango(metrica.refMinHombres, metrica.refMaxHombres)} />
            <Meta etiqueta="Mujeres" valor={rango(metrica.refMinMujeres, metrica.refMaxMujeres)} />
          </div>
        </CardContent>
      </Card>

      {/* Filtros y desglose */}
      {panelFiltros}

      {/* Selector de vista: barra delgada pegada justo encima de la gráfica */}
      {selector}

      {esCorrelacion ? (
        <>
          <Card className="py-0">
            <CardContent className="flex flex-wrap items-center gap-2 p-3 text-[13px]">
              <span className="text-muted-foreground">Cruzar con (Y):</span>
              <select
                className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-background px-2 text-[14px]"
                value={metricaY ?? ''}
                onChange={(e) => setMetricaY(e.target.value || null)}
              >
                <option value="">Elija una variable…</option>
                {numericasY.map((m) => (
                  <option key={m.clave} value={m.clave}>
                    {m.grupo} · {m.etiqueta}
                    {m.unidad ? ` (${m.unidad})` : ''}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
          <VistaCorrelacion
            metricaX={metrica.clave}
            metricaY={metricaY}
            grupo={dimensiones[0] ?? null}
            filtros={filtros}
          />
        </>
      ) : esDispersion ? (
        <VistaDispersionTemporal
          metrica={metrica.clave}
          grupo={dimensiones[0] ?? null}
          granularidad={request.granularidad ?? 'MES'}
          filtros={filtros}
        />
      ) : isFetching && !serie ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : serie ? (
        <VistaSerie serie={serie} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-[14px] text-muted-foreground">
            Sin datos para esta variable en el alcance y filtros actuales.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Meta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="leading-relaxed">
      <span className="text-muted-foreground">{etiqueta} </span>
      <span className="font-semibold text-foreground">{valor}</span>
    </div>
  )
}
