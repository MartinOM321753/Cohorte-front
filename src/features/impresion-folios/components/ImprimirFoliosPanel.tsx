import { useEffect, useMemo, useState } from 'react'
import { Hash, List, Printer } from 'lucide-react'
import { toast } from 'sonner'
import bwipjs from 'bwip-js/browser'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

import { HojaEtiquetas } from '@/components/print/HojaEtiquetas'
import { ESTILOS_HOJA } from '@/components/print/hojaImpresion'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import type { ConfiguracionEtiquetaResponse, TipoCodigo } from '@/types/api'

// ─── Tipos y constantes ──────────────────────────────────────────────────────

type Modo = 'rango' | 'lista'

const CLAVE_ULTIMA_CONFIG = 'impresion-folios:ultima-configuracion'
const MIN_FUENTE = 4
const MAX_FUENTE = 24

const TIPOS_CODIGO: { valor: TipoCodigo; nombre: string }[] = [
  { valor: 'QR_CODE', nombre: 'QR' },
  { valor: 'DATAMATRIX', nombre: 'DataMatrix' },
  { valor: 'CODE_128', nombre: 'Code 128' },
]

const BCID: Record<TipoCodigo, string> = {
  QR_CODE: 'qrcode',
  DATAMATRIX: 'datamatrix',
  CODE_128: 'code128',
}

// ─── Generación de símbolo ───────────────────────────────────────────────────

const svgCache = new Map<string, string | null>()

function generarSvgFolio(folio: string, tipo: TipoCodigo, escala: number): string | null {
  const clave = `${tipo}|${escala}|${folio}`
  const enCache = svgCache.get(clave)
  if (enCache !== undefined) return enCache

  let svg: string | null = null
  try {
    const raw = bwipjs.toSVG({
      bcid: BCID[tipo],
      text: folio,
      scale: Math.max(1, Math.round(escala)),
      includetext: false,
    })
    svg = raw.replace(
      '<svg',
      '<svg preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:100%"',
    )
  } catch {
    svg = null
  }

  svgCache.set(clave, svg)
  return svg
}

// ─── Casilla de etiqueta ─────────────────────────────────────────────────────

function CasillaFolio({
  folio,
  tipo,
  escala,
  fontPt,
  mostrarTexto,
}: {
  folio: string
  tipo: TipoCodigo
  escala: number
  fontPt: number
  mostrarTexto: boolean
}) {
  const svg = useMemo(() => generarSvgFolio(folio, tipo, escala), [folio, tipo, escala])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.8mm',
        gap: '0.3mm',
        overflow: 'hidden',
      }}
    >
      {svg ? (
        <div
          style={{ flex: '1 1 auto', width: '100%', minHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <span style={{ fontSize: '7pt', color: '#dc2626' }}>[código inválido]</span>
      )}
      {mostrarTexto && (
        <span
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: `${fontPt}pt`,
            fontWeight: 700,
            lineHeight: 1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {folio}
        </span>
      )}
    </div>
  )
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function formatearFolio(n: number): string {
  return String(n).padStart(6, '0')
}

function parsearListaFolios(texto: string): string[] {
  return texto
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function ImprimirFoliosPanel() {
  const [modo, setModo] = useState<Modo>('rango')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [listaTexto, setListaTexto] = useState('')
  const [copias, setCopias] = useState(1)
  const [configId, setConfigId] = useState('')
  const [tipoCodigo, setTipoCodigo] = useState<TipoCodigo>('QR_CODE')
  const [escala, setEscala] = useState(3)
  const [fontPt, setFontPt] = useState(8)
  const [mostrarTexto, setMostrarTexto] = useState(true)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  const { data: configuraciones } = useGetConfiguracionesActivas()

  const configsHoja = useMemo(
    () => (configuraciones ?? []).filter((c) => c.tipoMedio !== 'ROLLO_ZEBRA'),
    [configuraciones],
  )

  const config: ConfiguracionEtiquetaResponse | undefined = useMemo(
    () => configsHoja.find((c) => String(c.id) === configId),
    [configsHoja, configId],
  )

  useEffect(() => {
    if (configsHoja.length === 0 || configId) return

    let ultima: string | null = null
    try {
      ultima = localStorage.getItem(CLAVE_ULTIMA_CONFIG)
    } catch {
      ultima = null
    }

    const elegida =
      configsHoja.find((c) => String(c.id) === ultima) ??
      configsHoja.find((c) => c.predeterminada) ??
      (configsHoja.length === 1 ? configsHoja[0] : undefined)

    if (elegida) setConfigId(String(elegida.id))
  }, [configsHoja, configId])

  useEffect(() => {
    if (!configId) return
    try {
      localStorage.setItem(CLAVE_ULTIMA_CONFIG, configId)
    } catch {}
  }, [configId])

  const folios: string[] = useMemo(() => {
    if (modo === 'rango') {
      const d = parseInt(desde, 10)
      const h = parseInt(hasta, 10)
      if (!Number.isFinite(d) || !Number.isFinite(h) || d < 1 || h < d) return []
      if (h - d + 1 > 5000) return []
      const arr: string[] = []
      for (let i = d; i <= h; i++) arr.push(formatearFolio(i))
      return arr
    }
    return parsearListaFolios(listaTexto)
  }, [modo, desde, hasta, listaTexto])

  const foliosExpandidos: string[] = useMemo(() => {
    if (copias <= 1) return folios
    const arr: string[] = []
    for (const f of folios) {
      for (let c = 0; c < copias; c++) arr.push(f)
    }
    return arr
  }, [folios, copias])

  const rangoExcedido = modo === 'rango' && (() => {
    const d = parseInt(desde, 10)
    const h = parseInt(hasta, 10)
    return Number.isFinite(d) && Number.isFinite(h) && h - d + 1 > 5000
  })()

  const listoParaImprimir = foliosExpandidos.length > 0 && !!config

  const firma = useMemo(
    () => `folios|${modo}|${folios.join(',')}|${copias}|${tipoCodigo}|${escala}|${fontPt}|${mostrarTexto}`,
    [modo, folios, copias, tipoCodigo, escala, fontPt, mostrarTexto],
  )

  function handleVistaPrevia() {
    if (!listoParaImprimir) return
    if (foliosExpandidos.length > 10000) {
      toast.error('El lote excede 10 000 etiquetas. Reduzca el rango o las copias.')
      return
    }
    setVistaPrevia(true)
  }

  return (
    <Card>
      <style>{ESTILOS_HOJA}</style>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Imprimir folios de participantes
        </CardTitle>
        <CardDescription>
          Imprima etiquetas con el folio del participante codificado en QR, DataMatrix
          o Code 128. Elija un rango o una lista de folios, las copias por folio y
          mande a imprimir.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {configsHoja.length === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No hay configuraciones de etiqueta para hoja. Cree una en
              <strong> Configuración de etiquetas</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Configuración de hoja ── */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[16rem] space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Configuración de etiqueta (hoja)
            </Label>
            <Select value={configId} onValueChange={(v) => v && setConfigId(v)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Seleccionar configuración" />
              </SelectTrigger>
              <SelectContent>
                {configsHoja.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                    {c.predeterminada ? ' *' : ''} — {c.anchoMm}×{c.altoMm} mm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[10rem] space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Tipo de código</Label>
            <Select value={tipoCodigo} onValueChange={(v) => setTipoCodigo(v as TipoCodigo)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_CODIGO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Selector de modo ── */}
        <div className="flex gap-2">
          <Button
            variant={modo === 'rango' ? 'default' : 'outline'}
            size="sm"
            className={modo === 'rango' ? 'gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]' : 'gap-1.5'}
            onClick={() => setModo('rango')}
          >
            <Hash className="h-3.5 w-3.5" />
            Por rango
          </Button>
          <Button
            variant={modo === 'lista' ? 'default' : 'outline'}
            size="sm"
            className={modo === 'lista' ? 'gap-1.5 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)]' : 'gap-1.5'}
            onClick={() => setModo('lista')}
          >
            <List className="h-3.5 w-3.5" />
            Por lista
          </Button>
        </div>

        {/* ── Entrada de folios ── */}
        {modo === 'rango' ? (
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Folio desde</Label>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-9 w-32 text-[13px] font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Folio hasta</Label>
              <Input
                type="number"
                min={1}
                placeholder="100"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-9 w-32 text-[13px] font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Copias por folio</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={copias}
                onChange={(e) => setCopias(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                className="h-9 w-24 text-[13px]"
              />
            </div>
            {folios.length > 0 && (
              <p className="text-[12px] text-muted-foreground pb-1">
                {folios.length} folio(s) × {copias} copia(s) = <strong>{foliosExpandidos.length}</strong> etiqueta(s)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Folios (uno por línea, o separados por coma)
              </Label>
              <Textarea
                placeholder={'000001\n000002\n000015'}
                value={listaTexto}
                onChange={(e) => setListaTexto(e.target.value)}
                className="h-28 font-mono text-[13px]"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Copias por folio</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={copias}
                  onChange={(e) => setCopias(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  className="h-9 w-24 text-[13px]"
                />
              </div>
              {folios.length > 0 && (
                <p className="text-[12px] text-muted-foreground pb-1">
                  {folios.length} folio(s) × {copias} copia(s) = <strong>{foliosExpandidos.length}</strong> etiqueta(s)
                </p>
              )}
            </div>
          </div>
        )}

        {rangoExcedido && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              El rango excede 5 000 folios. Redúzcalo para continuar.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Controles de presentación ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Escala del símbolo */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground">Escala del símbolo</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-[12px]"
                onClick={() => setEscala(Math.max(1, escala - 1))}
              >
                −
              </Button>
              <span className="w-8 text-center font-mono text-[12px]">{escala}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-[12px]"
                onClick={() => setEscala(Math.min(10, escala + 1))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Mostrar texto */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarTexto}
              onChange={(e) => setMostrarTexto(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-[12px] text-muted-foreground">Mostrar folio como texto</span>
          </label>

          {/* Tamaño de letra */}
          {mostrarTexto && (
            <div className="flex items-center gap-2">
              <Label className="text-[12px] text-muted-foreground">Letra</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setFontPt(Math.max(MIN_FUENTE, fontPt - 1))}
                >
                  A−
                </Button>
                <span className="w-12 text-center font-mono text-[12px]">{fontPt} pt</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setFontPt(Math.min(MAX_FUENTE, fontPt + 1))}
                >
                  A+
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Vista previa a tamaño real ── */}
        {config && folios.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[12px] uppercase tracking-wider text-muted-foreground">
              Tamaño real
            </Label>
            <div
              className="casilla"
              style={{
                position: 'relative',
                width: `${config.anchoMm}mm`,
                height: `${config.altoMm}mm`,
                border: '1px dashed #d1d5db',
                borderRadius: '2px',
              }}
            >
              <CasillaFolio
                folio={folios[0]}
                tipo={tipoCodigo}
                escala={escala}
                fontPt={fontPt}
                mostrarTexto={mostrarTexto}
              />
            </div>
            <p className="max-w-[20rem] text-[11px] leading-snug text-muted-foreground">
              Así saldrá el primer folio a tamaño real. El punteado no se imprime.
              Ajuste la escala del símbolo para que el código quepa en la etiqueta.
            </p>
          </div>
        )}

        {/* ── Botón de impresión ── */}
        <div className="flex justify-end">
          <Button
            className="gap-2"
            disabled={!listoParaImprimir}
            onClick={handleVistaPrevia}
          >
            <Printer className="h-4 w-4" />
            Vista previa ({foliosExpandidos.length})
          </Button>
        </div>
      </CardContent>

      {vistaPrevia && config && (
        <HojaEtiquetas
          open
          onClose={() => setVistaPrevia(false)}
          total={foliosExpandidos.length}
          configuracion={config}
          firma={firma}
          titulo="Folios de participantes"
          nombreDe={(i) => `Folio ${foliosExpandidos[i]}`}
          renderCasilla={(i) => (
            <CasillaFolio
              folio={foliosExpandidos[i]}
              tipo={tipoCodigo}
              escala={escala}
              fontPt={fontPt}
              mostrarTexto={mostrarTexto}
            />
          )}
        />
      )}
    </Card>
  )
}
