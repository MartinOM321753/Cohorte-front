import { useMemo } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { tooltipTema, useChartColors } from '@/lib/chartTheme'
import { chartDefs } from './chartDefs'
import type { CeldaAgregada, SerieAgregada } from '../types/analisis.types'

type TipTema = ReturnType<typeof tooltipTema>
type Colores = ReturnType<typeof useChartColors>

function etiquetaCelda(c: CeldaAgregada): string {
  const vals = Object.values(c.dimensiones)
  return vals.length ? vals.join(' · ') : 'Total'
}

// Ejes y grilla con estética común «futurista»: líneas finas punteadas, sin ejes
// duros, tipografía atenuada.
const EJE = { fontSize: 11 } as const
function gridProps(grid: string) {
  return { strokeDasharray: '2 6', vertical: false, stroke: grid, strokeOpacity: 0.5 } as const
}
function ejeX(muted: string, extra?: Record<string, unknown>) {
  return { axisLine: false, tickLine: false, tick: { ...EJE, fill: muted }, ...extra }
}
function ejeY(muted: string) {
  return { axisLine: false, tickLine: false, tick: { ...EJE, fill: muted } }
}

export function VistaSerie({ serie }: { serie: SerieAgregada }) {
  const colores = useChartColors()
  const tip = tooltipTema(colores)
  const paleta = [colores.line, colores.line2, colores.line3, colores.line4, colores.success, colores.warning]

  if (serie.celdas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[14px] text-muted-foreground">
          No hay datos suficientes para esta combinación. Recuerde que los grupos con menos de{' '}
          {serie.kAnonimo} participantes se ocultan por privacidad.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <NotaPrivacidad serie={serie} />
      {serie.agregacion === 'RESUMEN' && <VistaResumen serie={serie} colores={colores} tip={tip} />}
      {serie.agregacion === 'FUERA_DE_RANGO' && <VistaFueraDeRango serie={serie} colores={colores} tip={tip} />}
      {serie.agregacion === 'DISTRIBUCION' && <VistaDistribucion serie={serie} colores={colores} paleta={paleta} tip={tip} />}
      {serie.agregacion === 'FRECUENCIA' && <VistaFrecuencia serie={serie} colores={colores} paleta={paleta} tip={tip} />}
      {serie.agregacion === 'TEMPORAL' && <VistaTemporal serie={serie} colores={colores} paleta={paleta} tip={tip} />}
      {serie.agregacion === 'MAPA_CALOR' && <VistaMapaCalor serie={serie} primary={colores.primary} />}
    </div>
  )
}

function NotaPrivacidad({ serie }: { serie: SerieAgregada }) {
  return (
    <p className="text-[12px] text-muted-foreground">
      {serie.nTotal.toLocaleString('es-MX')} mediciones analizadas
      {serie.nSuprimido > 0 ? (
        <>
          {' · '}
          {serie.nSuprimido.toLocaleString('es-MX')} ocultas en grupos de menos de {serie.kAnonimo}
        </>
      ) : null}
      {serie.unidad ? ` · unidad: ${serie.unidad}` : ''}
    </p>
  )
}

// ── Resumen: barras de media + tabla de estadísticos ──────────────────────────
function VistaResumen({ serie, colores, tip }: { serie: SerieAgregada; colores: Colores; tip: TipTema }) {
  const data = serie.celdas.map((c) => ({ nombre: etiquetaCelda(c), media: c.media ?? 0, n: c.n }))
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[14px]">Media por grupo{serie.unidad ? ` (${serie.unidad})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              {chartDefs('vr', [colores.line])}
              <CartesianGrid {...gridProps(colores.grid)} />
              <XAxis dataKey="nombre" interval={0} angle={data.length > 4 ? -15 : 0} textAnchor={data.length > 4 ? 'end' : 'middle'} height={data.length > 4 ? 56 : 30} {...ejeX(colores.muted)} />
              <YAxis {...ejeY(colores.muted)} />
              <Tooltip {...tip} cursor={{ fill: colores.primary, fillOpacity: 0.06 }} formatter={(v: number) => v.toLocaleString('es-MX')} />
              <Bar dataKey="media" fill="url(#vr-bar-0)" stroke={colores.line} strokeOpacity={0.5} radius={[6, 6, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Grupo</th>
                <th className="px-3 py-2 text-right font-medium">n</th>
                <th className="px-3 py-2 text-right font-medium">Media</th>
                <th className="px-3 py-2 text-right font-medium">Mediana</th>
                <th className="px-3 py-2 text-right font-medium">P25</th>
                <th className="px-3 py-2 text-right font-medium">P75</th>
                <th className="px-3 py-2 text-right font-medium">Mín</th>
                <th className="px-3 py-2 text-right font-medium">Máx</th>
                <th className="px-3 py-2 text-right font-medium">Desv.</th>
              </tr>
            </thead>
            <tbody>
              {serie.celdas.map((c, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2">{etiquetaCelda(c)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.n.toLocaleString('es-MX')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.media)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.mediana)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.p25)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.p75)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.min)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.max)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.desv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  )
}

// ── Fuera de rango: barras apiladas ───────────────────────────────────────────
function VistaFueraDeRango({ serie, colores, tip }: { serie: SerieAgregada; colores: Colores; tip: TipTema }) {
  const data = serie.celdas.map((c) => ({
    nombre: etiquetaCelda(c),
    'En rango': c.enRango ?? 0,
    'Fuera de rango': c.fueraDeRango ?? 0,
    'Sin referencia': c.sinReferencia ?? 0,
  }))
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[14px]">Clasificación por rango de referencia (según sexo)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            {chartDefs('vfr', [colores.success, colores.danger, colores.ink300])}
            <CartesianGrid {...gridProps(colores.grid)} />
            <XAxis dataKey="nombre" interval={0} angle={data.length > 4 ? -15 : 0} textAnchor={data.length > 4 ? 'end' : 'middle'} height={data.length > 4 ? 56 : 30} {...ejeX(colores.muted)} />
            <YAxis {...ejeY(colores.muted)} />
            <Tooltip {...tip} cursor={{ fill: colores.primary, fillOpacity: 0.06 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="En rango" stackId="a" fill="url(#vfr-bar-0)" maxBarSize={64} />
            <Bar dataKey="Fuera de rango" stackId="a" fill="url(#vfr-bar-1)" maxBarSize={64} />
            <Bar dataKey="Sin referencia" stackId="a" fill="url(#vfr-bar-2)" radius={[5, 5, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Distribución: histograma (1 grupo) o líneas por grupo (varios) ────────────
function VistaDistribucion({ serie, colores, paleta, tip }: { serie: SerieAgregada; colores: Colores; paleta: string[]; tip: TipTema }) {
  const data = useMemo(() => {
    const base = serie.celdas[0]?.histograma ?? []
    return base.map((bin, i) => {
      const fila: Record<string, number | string> = {
        bin: `${fmt(bin.desde)}`,
      }
      serie.celdas.forEach((c) => {
        fila[etiquetaCelda(c)] = c.histograma?.[i]?.conteo ?? 0
      })
      return fila
    })
  }, [serie])

  const claves = serie.celdas.map(etiquetaCelda)
  const unaSola = claves.length === 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[14px]">Distribución{serie.unidad ? ` (${serie.unidad})` : ''}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          {unaSola ? (
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              {chartDefs('vd', paleta)}
              <CartesianGrid {...gridProps(colores.grid)} />
              <XAxis dataKey="bin" {...ejeX(colores.muted)} />
              <YAxis {...ejeY(colores.muted)} />
              <Tooltip {...tip} cursor={{ fill: colores.primary, fillOpacity: 0.06 }} />
              <Bar dataKey={claves[0]} radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill="url(#vd-bar-0)" />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              {chartDefs('vd', paleta)}
              <CartesianGrid {...gridProps(colores.grid)} />
              <XAxis dataKey="bin" {...ejeX(colores.muted)} />
              <YAxis {...ejeY(colores.muted)} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {claves.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={paleta[i % paleta.length]}
                  dot={false}
                  strokeWidth={2.4}
                  filter="url(#vd-glow)"
                  activeDot={{ r: 5, strokeWidth: 0, fill: paleta[i % paleta.length], filter: 'url(#vd-glow)' }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Frecuencia (categóricas) — se usa en Fase 3 ───────────────────────────────
function VistaFrecuencia({ serie, colores, paleta, tip }: { serie: SerieAgregada; colores: Colores; paleta: string[]; tip: TipTema }) {
  const categorias = Array.from(
    new Set(serie.celdas.flatMap((c) => (c.categorias ?? []).map((x) => x.categoria))),
  )
  const data = serie.celdas.map((c) => {
    const fila: Record<string, number | string> = { nombre: etiquetaCelda(c) }
    for (const cat of categorias) {
      fila[cat] = c.categorias?.find((x) => x.categoria === cat)?.conteo ?? 0
    }
    return fila
  })
  const ultima = categorias.length - 1
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[14px]">Frecuencias</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            {chartDefs('vf', paleta)}
            <CartesianGrid {...gridProps(colores.grid)} />
            <XAxis dataKey="nombre" interval={0} {...ejeX(colores.muted)} />
            <YAxis {...ejeY(colores.muted)} />
            <Tooltip {...tip} cursor={{ fill: colores.primary, fillOpacity: 0.06 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {categorias.map((cat, i) => (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="a"
                fill={`url(#vf-bar-${i % paleta.length})`}
                radius={i === ultima ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={64}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Evolución temporal: línea(s) de media por corte + banda P25–P75 ───────────
function VistaTemporal({ serie, colores, paleta, tip }: { serie: SerieAgregada; colores: Colores; paleta: string[]; tip: TipTema }) {
  const { data, series } = useMemo(() => {
    const claves: string[] = []
    const porCorte = new Map<string, Record<string, number | number[] | string>>()
    for (const c of serie.celdas) {
      const corte = c.dimensiones['corte'] ?? '—'
      const resto = Object.entries(c.dimensiones).filter(([k]) => k !== 'corte').map(([, v]) => v)
      const key = resto.length ? resto.join(' · ') : 'Media'
      if (!claves.includes(key)) claves.push(key)
      const fila = porCorte.get(corte) ?? { corte }
      fila[key] = c.media ?? 0
      porCorte.set(corte, fila)
    }
    if (claves.length === 1) {
      for (const c of serie.celdas) {
        const corte = c.dimensiones['corte'] ?? '—'
        const fila = porCorte.get(corte)
        if (fila && c.p25 != null && c.p75 != null) fila['banda'] = [c.p25, c.p75]
      }
    }
    return { data: Array.from(porCorte.values()), series: claves }
  }, [serie])

  const unaSola = series.length === 1
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[14px]">
          Evolución en el tiempo{serie.unidad ? ` (${serie.unidad})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            {chartDefs('vt', paleta)}
            <CartesianGrid {...gridProps(colores.grid)} />
            <XAxis dataKey="corte" {...ejeX(colores.muted)} />
            <YAxis {...ejeY(colores.muted)} />
            <Tooltip
              {...tip}
              formatter={(v: number | number[]) =>
                Array.isArray(v) ? `${fmt(v[0])} – ${fmt(v[1])}` : v.toLocaleString('es-MX')
              }
            />
            {!unaSola ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
            {unaSola ? (
              <Area dataKey="banda" name="P25–P75" stroke="none" fill="url(#vt-area-0)" isAnimationActive={false} />
            ) : null}
            {series.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={paleta[i % paleta.length]}
                strokeWidth={2.6}
                filter="url(#vt-glow)"
                dot={{ r: 3, strokeWidth: 0, fill: paleta[i % paleta.length] }}
                activeDot={{ r: 5, strokeWidth: 0, fill: paleta[i % paleta.length], filter: 'url(#vt-glow)' }}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Mapa de calor: dos dimensiones × media de la métrica ──────────────────────
function VistaMapaCalor({ serie, primary }: { serie: SerieAgregada; primary: string }) {
  const dims = serie.dimensiones.filter((d) => d !== 'corte')
  if (dims.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-[14px] text-muted-foreground">
          Elija dos dimensiones de desglose (p. ej. institución y rango de edad) para cruzarlas en el
          mapa de calor.
        </CardContent>
      </Card>
    )
  }
  const [dimFila, dimCol] = dims
  const filas: string[] = []
  const cols: string[] = []
  const celdaPorClave = new Map<string, { media: number; n: number }>()
  let min = Infinity
  let max = -Infinity
  for (const c of serie.celdas) {
    const rf = c.dimensiones[dimFila] ?? '—'
    const cc = c.dimensiones[dimCol] ?? '—'
    if (!filas.includes(rf)) filas.push(rf)
    if (!cols.includes(cc)) cols.push(cc)
    const m = c.media ?? 0
    celdaPorClave.set(rf + '||' + cc, { media: m, n: c.n })
    min = Math.min(min, m)
    max = Math.max(max, m)
  }
  filas.sort(ordenDim)
  cols.sort(ordenDim)
  const escala = (m: number) => (max === min ? 0.5 : (m - min) / (max - min))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[14px]">
          Mapa de calor — media{serie.unidad ? ` (${serie.unidad})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-[12px]">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-medium text-muted-foreground">
                {etiquetaDim(dimFila)} \ {etiquetaDim(dimCol)}
              </th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-1 text-center font-medium text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((rf) => (
              <tr key={rf}>
                <td className="px-2 py-1 font-medium text-foreground/90">{rf}</td>
                {cols.map((cc) => {
                  const v = celdaPorClave.get(rf + '||' + cc)
                  if (!v) return <td key={cc} className="px-2 py-2 text-center text-muted-foreground/40">—</td>
                  const t = escala(v.media)
                  return (
                    <td
                      key={cc}
                      className="rounded-md px-2 py-2 text-center tabular-nums transition-transform hover:scale-[1.04]"
                      style={{
                        backgroundColor: conAlfa(primary, 0.12 + t * 0.8),
                        color: t > 0.55 ? '#fff' : 'inherit',
                        boxShadow: t > 0.6 ? `0 0 10px ${conAlfa(primary, 0.35)}` : undefined,
                      }}
                      title={`n = ${v.n.toLocaleString('es-MX')}`}
                    >
                      {fmt(v.media)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          El color representa la media de cada cruce; pase el cursor para ver el tamaño del grupo (n).
          Los cruces con menos de {serie.kAnonimo} participantes se ocultan.
        </p>
      </CardContent>
    </Card>
  )
}

function etiquetaDim(d: string): string {
  return d === 'sexo' ? 'Sexo' : d === 'rango_edad' ? 'Edad' : d === 'institucion' ? 'Institución' : d
}

/** Orden natural por prefijo numérico (rangos de edad, cortes); «Sin dato»/«Otras» al final. */
function ordenDim(a: string, b: string): number {
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  const va = Number.isNaN(na) ? Infinity : na
  const vb = Number.isNaN(nb) ? Infinity : nb
  if (va !== vb) return va - vb
  return a.localeCompare(b, 'es')
}

/** Convierte un color hex (#rrggbb) a rgba con el alfa dado; si no es hex, lo usa tal cual. */
function conAlfa(color: string, alfa: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alfa.toFixed(3)})`
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}
