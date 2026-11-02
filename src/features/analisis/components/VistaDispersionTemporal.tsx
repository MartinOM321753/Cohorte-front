import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useChartColors } from '@/lib/chartTheme'
import { chartDefs } from './chartDefs'
import { useDispersionTemporal } from '../hooks/useAnalisis'
import type { Dimension, FiltrosAnalisis, Granularidad } from '../types/analisis.types'

interface Props {
  metrica: string
  grupo: Dimension | null
  granularidad: Granularidad
  filtros: FiltrosAnalisis
}

/**
 * Dispersión temporal: por cada corte de seguimiento se dibuja la nube de puntos
 * (si el usuario tiene permiso de crudo) y una línea de tendencia con la media de
 * cada corte. El eje X son los cortes ordenados; los puntos llevan un ligero
 * «jitter» horizontal para no amontonarse en una sola columna.
 */
export function VistaDispersionTemporal({ metrica, grupo, granularidad, filtros }: Props) {
  const colores = useChartColors()
  const paleta = [colores.line, colores.line2, colores.line3, colores.line4, colores.success, colores.warning]
  const { data, isFetching } = useDispersionTemporal({ metrica, grupo, granularidad, filtros })

  const { series, cortes } = useMemo(() => {
    if (!data) return { series: [] as SerieXY[], cortes: [] as string[] }
    const idx = new Map(data.cortes.map((c, i) => [c, i]))
    const s: SerieXY[] = data.series.map((serie) => ({
      grupo: serie.grupo,
      puntos: serie.puntos.map((p) => ({
        x: (idx.get(p.corte) ?? 0) + (Math.random() - 0.5) * 0.5,
        y: p.valor,
        corte: p.corte,
      })),
      tendencia: serie.tendencia.map((t) => ({ x: idx.get(t.corte) ?? 0, y: t.media, corte: t.corte })),
    }))
    return { series: s, cortes: data.cortes }
  }, [data])

  if (isFetching && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (!data || cortes.length === 0 || data.series.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[14px] text-muted-foreground">
          No hay cortes de seguimiento con suficientes participantes para esta variable. Recuerde que
          se ocultan los cortes con menos de 5 participantes; con pocos datos o todos en la misma
          fecha, la serie se colapsa en un solo corte.
        </CardContent>
      </Card>
    )
  }

  const varias = series.length > 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-[14px]">
            Dispersión por corte de seguimiento{data.unidad ? ` (${data.unidad})` : ''}
          </CardTitle>
          <Badge variant="outline">n = {data.n.toLocaleString('es-MX')}</Badge>
          {!data.puntosIncluidos ? <Badge variant="secondary">solo tendencia</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
            {chartDefs('disp', paleta)}
            <CartesianGrid strokeDasharray="2 6" stroke={colores.grid} strokeOpacity={0.5} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, cortes.length - 0.5]}
              ticks={cortes.map((_, i) => i)}
              tickFormatter={(i: number) => cortes[i] ?? ''}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colores.muted }}
              label={{ value: 'Cortes de seguimiento', position: 'insideBottom', offset: -10, fontSize: 11, fill: colores.muted }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colores.muted }}
              label={data.unidad ? { value: data.unidad, angle: -90, position: 'insideLeft', fontSize: 11, fill: colores.muted } : undefined}
            />
            <ZAxis range={[34, 34]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<TooltipDisp />} />
            {varias ? (
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
            ) : null}
            {series.map((s, i) =>
              s.puntos.length ? (
                <Scatter
                  key={'p-' + s.grupo}
                  name={s.grupo}
                  data={s.puntos}
                  fill={`url(#disp-dot-${i % paleta.length})`}
                  fillOpacity={0.55}
                  legendType={s.puntos.length ? 'circle' : 'none'}
                />
              ) : null,
            )}
            {series.map((s, i) => (
              <Scatter
                key={'t-' + s.grupo}
                name={s.grupo + ' · tendencia'}
                data={s.tendencia}
                fill={paleta[i % paleta.length]}
                line={{ stroke: paleta[i % paleta.length], strokeWidth: 2.6, filter: 'url(#disp-glow)' }}
                lineType="joint"
                legendType={varias && series.every((x) => x.puntos.length === 0) ? 'circle' : 'none'}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span>La línea une la media de cada corte; los puntos son mediciones individuales.</span>
          {!data.puntosIncluidos ? (
            <span>Los puntos individuales se ocultan (requieren permiso de exportación de datos crudos).</span>
          ) : null}
          {data.nSuprimido > 0 ? (
            <span>{data.nSuprimido.toLocaleString('es-MX')} ocultos en cortes de menos de 5.</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

interface PuntoXY {
  x: number
  y: number
  corte: string
}
interface SerieXY {
  grupo: string
  puntos: PuntoXY[]
  tendencia: PuntoXY[]
}

/** Tooltip tema-seguro: muestra el corte y el valor del punto apuntado. */
function TooltipDisp({ active, payload }: { active?: boolean; payload?: { payload: PuntoXY }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 text-[12px] text-popover-foreground shadow-md">
      <div className="font-medium">{p.corte}</div>
      <div>{p.y.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</div>
    </div>
  )
}
