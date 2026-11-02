import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  ReferenceLine,
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
import { tooltipTema, useChartColors } from '@/lib/chartTheme'
import { chartDefs } from './chartDefs'
import { useCorrelacion } from '../hooks/useAnalisis'
import type { Dimension, FiltrosAnalisis } from '../types/analisis.types'

interface Props {
  metricaX: string
  metricaY: string | null
  grupo: Dimension | null
  filtros: FiltrosAnalisis
}

/**
 * Nube de correlación entre dos métricas numéricas, con recta de ajuste y R².
 * Los puntos individuales solo llegan si el usuario tiene permiso de export
 * crudo; si no, se muestran la recta y el R² (agregados).
 */
export function VistaCorrelacion({ metricaX, metricaY, grupo, filtros }: Props) {
  const colores = useChartColors()
  const tip = tooltipTema(colores)
  const paleta = [colores.line, colores.line2, colores.line3, colores.line4, colores.success, colores.warning]

  const { data: cor, isFetching } = useCorrelacion(
    { metricaX, metricaY: metricaY ?? '', grupo, filtros },
    { enabled: !!metricaY },
  )

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, { x: number; y: number }[]>()
    for (const p of cor?.puntos ?? []) {
      const arr = mapa.get(p.grupo) ?? []
      arr.push({ x: p.x, y: p.y })
      mapa.set(p.grupo, arr)
    }
    return Array.from(mapa.entries())
  }, [cor])

  if (!metricaY) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[14px] text-muted-foreground">
          Elija una segunda variable (Y) para cruzarla con la primera.
        </CardContent>
      </Card>
    )
  }

  if (isFetching && !cor) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (!cor || cor.n === 0 || cor.pendiente == null) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[14px] text-muted-foreground">
          No hay suficientes participantes con ambas variables para calcular la correlación. Recuerde
          que se ocultan los grupos con menos de 5 participantes.
        </CardContent>
      </Card>
    )
  }

  const b = cor.pendiente ?? 0
  const a = cor.intercepto ?? 0
  const minX = cor.minX ?? 0
  const maxX = cor.maxX ?? 1
  const fit = (x: number) => a + b * x
  // Signo que une el intercepto con el término de la pendiente (depende de b, no de a).
  const signo = b >= 0 ? '+' : '−'

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-[14px]">
              {cor.metricaYEtiqueta} frente a {cor.metricaXEtiqueta}
            </CardTitle>
            <Badge variant="secondary">R² = {fmt(cor.r2)}</Badge>
            <Badge variant="outline">n = {cor.n.toLocaleString('es-MX')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
              {chartDefs('corr', paleta)}
              <CartesianGrid strokeDasharray="2 6" stroke={colores.grid} strokeOpacity={0.5} />
              <XAxis
                type="number"
                dataKey="x"
                name={cor.metricaXEtiqueta}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: colores.muted }}
                label={{ value: etiquetaEje(cor.metricaXEtiqueta, cor.unidadX), position: 'insideBottom', offset: -8, fontSize: 11, fill: colores.muted }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={cor.metricaYEtiqueta}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: colores.muted }}
                label={{ value: etiquetaEje(cor.metricaYEtiqueta, cor.unidadY), angle: -90, position: 'insideLeft', fontSize: 11, fill: colores.muted }}
              />
              <ZAxis range={[46, 46]} />
              <Tooltip
                {...tip}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v: number) => v.toLocaleString('es-MX')}
              />
              {porGrupo.length > 1 ? (
                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              ) : null}
              {porGrupo.map(([g, puntos], i) => (
                <Scatter key={g} name={g} data={puntos} fill={`url(#corr-dot-${i % paleta.length})`} fillOpacity={0.75} />
              ))}
              <ReferenceLine
                ifOverflow="extendDomain"
                stroke={colores.line2}
                strokeWidth={2.5}
                filter="url(#corr-glow)"
                segment={[
                  { x: minX, y: fit(minX) },
                  { x: maxX, y: fit(maxX) },
                ]}
              />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span>
              Ajuste: <span className="font-medium text-foreground">Y ≈ {fmt(a)} {signo} {fmt(Math.abs(b))}·X</span>
            </span>
            {!cor.puntosIncluidos ? (
              <span>Los puntos individuales se ocultan (requieren permiso de exportación de datos crudos).</span>
            ) : null}
            {cor.nSuprimido > 0 ? (
              <span>{cor.nSuprimido.toLocaleString('es-MX')} ocultos en grupos de menos de 5.</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function etiquetaEje(nombre: string, unidad: string | null): string {
  return unidad ? `${nombre} (${unidad})` : nombre
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}
