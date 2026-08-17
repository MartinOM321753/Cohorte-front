import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Printer, Ruler, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  calcularCalibracion,
  ESTILOS_CALIBRACION,
  HojaCalibracion,
  type ResultadoCalibracion,
} from './HojaCalibracion'
import {
  candidatosPorOmision,
  ESTILOS_VERNIER,
  HojaVernier,
} from './HojaVernier'
import { ESTILOS_HOJA, imprimirHoja, resolverGeometria } from './hojaImpresion'
import type { ConfiguracionEtiquetaResponse } from '@/types/api'

/** Lo que el vernier resuelve: el paso real de la hoja y su corrimiento. */
export interface ResultadoVernier {
  pasoHorizontalMm: number
  ajusteXMm: number
}

interface CalibracionDialogProps {
  configuracion: ConfiguracionEtiquetaResponse
  open: boolean
  onClose: () => void
  /** Guarda la corrección en la configuración. */
  onAplicar: (resultado: ResultadoCalibracion) => void
  /** Guarda el paso y el corrimiento leídos en la hoja vernier. */
  onAplicarVernier: (resultado: ResultadoVernier) => void
  guardando?: boolean
}

/** Campo de medida en milímetros; vacío mientras el operador no haya medido. */
function CampoMedida({
  id,
  etiqueta,
  nominal,
  valor,
  onChange,
}: {
  id: string
  etiqueta: string
  nominal: number
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[12px]">
        {etiqueta}
      </Label>
      <Input
        id={id}
        type="number"
        step="0.1"
        inputMode="decimal"
        placeholder={nominal.toFixed(1)}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground">Debería medir {nominal.toFixed(1)} mm</p>
    </div>
  )
}

/**
 * Calibración de la hoja contra la impresora.
 *
 * El controlador de cada impresora desplaza y encoge la página por su área no
 * imprimible, y el diálogo del navegador puede reescalarla además por su cuenta.
 * Nada de eso es visible desde la aplicación, así que se mide en el papel: se
 * imprime una hoja con marcas en posiciones conocidas, se comparan con una regla
 * y de la diferencia se despeja la corrección.
 */
export function CalibracionDialog({
  configuracion: config,
  open,
  onClose,
  onAplicar,
  onAplicarVernier,
  guardando = false,
}: CalibracionDialogProps) {
  const hojaRef = useRef<HTMLDivElement>(null)
  const vernierRef = useRef<HTMLDivElement>(null)
  const geo = useMemo(() => resolverGeometria(config), [config])

  const [pasoElegido, setPasoElegido] = useState('')
  const [corrimientoElegido, setCorrimientoElegido] = useState('')
  const [fino, setFino] = useState(false)

  const candidatos = useMemo(() => candidatosPorOmision(geo, fino), [geo, fino])

  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [c, setC] = useState('')
  const [d, setD] = useState('')

  const nominalA = geo.origenYMm
  const nominalB = geo.origenYMm + (geo.rows - 1) * geo.pasoVerticalMm
  const nominalC = geo.origenXMm
  const nominalD = geo.origenXMm + (geo.cols - 1) * geo.pasoHorizontalMm

  const completo = [a, b, c, d].every((v) => v.trim() !== '' && !Number.isNaN(Number(v)))

  const resultado = useMemo(() => {
    if (!completo) return null
    return calcularCalibracion(geo, config, {
      aMm: Number(a),
      bMm: Number(b),
      cMm: Number(c),
      dMm: Number(d),
    })
  }, [completo, geo, config, a, b, c, d])

  function imprimir() {
    const contenido = hojaRef.current?.innerHTML
    if (!contenido) return
    imprimirHoja(
      contenido,
      geo.hojaAnchoMm,
      geo.hojaAltoMm,
      `Calibración · ${config.nombre}`,
      ESTILOS_CALIBRACION,
    )
  }

  function imprimirVernier() {
    const contenido = vernierRef.current?.innerHTML
    if (!contenido) return
    imprimirHoja(
      contenido,
      geo.hojaAnchoMm,
      geo.hojaAltoMm,
      `Vernier · ${config.nombre}`,
      ESTILOS_VERNIER,
    )
  }

  const pasoNum = Number(pasoElegido)
  const corrimientoNum = Number(corrimientoElegido)
  const vernierListo =
    pasoElegido.trim() !== '' &&
    !Number.isNaN(pasoNum) &&
    pasoNum >= config.anchoMm &&
    corrimientoElegido.trim() !== '' &&
    !Number.isNaN(corrimientoNum)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
        <style>{ESTILOS_HOJA}</style>
        <style>{ESTILOS_CALIBRACION}</style>
        <style>{ESTILOS_VERNIER}</style>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Calibrar «{config.nombre}»
          </DialogTitle>
          <DialogDescription>
            Ajusta la configuración a lo que tu impresora hace de verdad con el papel.
          </DialogDescription>
        </DialogHeader>

        {/* ── Vernier: el paso real de la hoja, sin medir ─────────────────── */}
        <div className="space-y-3 rounded-md border border-sky-500/40 bg-sky-500/5 p-3">
          <div>
            <p className="text-sm font-medium">Paso real de la hoja (método vernier)</p>
            <p className="text-[12px] text-muted-foreground">
              Úsalo cuando las etiquetas se corran de lado conforme avanzan las columnas. No
              necesitas regla ni medir nada: se imprime sobre una hoja de etiquetas real y solo
              tienes que decir qué fila coincide con los troqueles.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={imprimirVernier}>
              <Printer className="h-3.5 w-3.5" />
              Imprimir hoja vernier
            </Button>

            <Button
              variant={fino ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFino((v) => !v)}
              title="Barrido estrecho de 0.125 mm, para cuando el barrido grueso ya dejó poco desfase"
            >
              Ajuste fino
            </Button>

            <div className="space-y-1">
              <Label htmlFor="ver-paso" className="text-[12px]">
                Paso de la fila elegida (banda 1)
              </Label>
              <Input
                id="ver-paso"
                type="number"
                step="0.01"
                inputMode="decimal"
                className="w-36"
                placeholder={geo.pasoHorizontalMm.toFixed(2)}
                value={pasoElegido}
                onChange={(e) => setPasoElegido(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ver-corr" className="text-[12px]">
                Corrimiento elegido (banda 2)
              </Label>
              <Input
                id="ver-corr"
                type="number"
                step="0.1"
                inputMode="decimal"
                className="w-36"
                placeholder="0.0"
                value={corrimientoElegido}
                onChange={(e) => setCorrimientoElegido(e.target.value)}
              />
            </div>

            <Button
              size="sm"
              disabled={!vernierListo || guardando}
              onClick={() =>
                vernierListo &&
                onAplicarVernier({
                  pasoHorizontalMm: pasoNum,
                  ajusteXMm: (config.ajusteXMm || 0) + corrimientoNum,
                })
              }
            >
              <Check className="mr-2 h-4 w-4" />
              Aplicar paso
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Los corrimientos van de {candidatos.corrimientos[0].toFixed(1)} a{' '}
            {candidatos.corrimientos[candidatos.corrimientos.length - 1].toFixed(1)} mm. El extremo
            negativo está acotado porque más a la izquierda cae en la franja de unos 5 mm que la
            impresora no puede marcar. Si ninguna marca alcanza el troquel por la izquierda,
            significa que la primera columna de esa hoja queda parcialmente fuera del alcance de tu
            impresora — no es algo que la configuración pueda corregir.
          </p>

          {pasoElegido.trim() !== '' && !Number.isNaN(pasoNum) && pasoNum < config.anchoMm && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-[12px]">
                Un paso de {pasoNum} mm es menor que el ancho de la etiqueta ({config.anchoMm} mm):
                las etiquetas se encimarían. Revisa la fila que elegiste.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* La hoja vernier se arma fuera de la vista; solo se manda a imprimir. */}
        <div className="hidden" aria-hidden ref={vernierRef}>
          <div
            className="hoja-zoom"
            style={
              {
                '--hoja-ancho': `${geo.hojaAnchoMm}mm`,
                '--hoja-alto': `${geo.hojaAltoMm}mm`,
                '--escala': 1,
              } as React.CSSProperties
            }
          >
            <div className="hoja">
              <HojaVernier config={config} geo={geo} candidatos={candidatos} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Vista previa de la hoja de calibración */}
          <div className="overflow-auto rounded-md border bg-muted/20 p-2" ref={hojaRef}>
            <div
              className="hoja-zoom mx-auto"
              style={
                {
                  '--hoja-ancho': `${geo.hojaAnchoMm}mm`,
                  '--hoja-alto': `${geo.hojaAltoMm}mm`,
                  '--escala': 0.55,
                } as React.CSSProperties
              }
            >
              <div className="hoja">
                <HojaCalibracion config={config} geo={geo} />
              </div>
            </div>
          </div>

          {/* Procedimiento y medidas */}
          <div className="space-y-3">
            <ol className="list-decimal space-y-1 pl-4 text-[12px] text-muted-foreground">
              <li>
                Imprime esta hoja <strong>en papel bond</strong>, no en una hoja de etiquetas.
              </li>
              <li>
                En el diálogo elige <strong>Márgenes: Ninguno</strong> y{' '}
                <strong>Escala: 100 %</strong>.
              </li>
              <li>
                Con una regla, mide desde el <strong>borde del papel</strong> hasta cada línea
                roja y captura lo que midas.
              </li>
            </ol>

            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={imprimir}>
              <Printer className="h-3.5 w-3.5" />
              Imprimir hoja de calibración
            </Button>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <CampoMedida
                id="cal-a"
                etiqueta="A · desde arriba"
                nominal={nominalA}
                valor={a}
                onChange={setA}
              />
              <CampoMedida
                id="cal-b"
                etiqueta="B · desde arriba"
                nominal={nominalB}
                valor={b}
                onChange={setB}
              />
              <CampoMedida
                id="cal-c"
                etiqueta="C · desde la izquierda"
                nominal={nominalC}
                valor={c}
                onChange={setC}
              />
              <CampoMedida
                id="cal-d"
                etiqueta="D · desde la izquierda"
                nominal={nominalD}
                valor={d}
                onChange={setD}
              />
            </div>

            {resultado && !resultado.valido && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-[12px]">{resultado.motivo}</AlertDescription>
              </Alert>
            )}

            {resultado?.valido && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-[12px]">
                <p className="font-medium">Corrección calculada</p>
                <p className="text-muted-foreground">
                  Tu impresora está saliendo al{' '}
                  <strong>{(resultado.escalaHorizontal * 100).toFixed(1)} %</strong> a lo ancho y al{' '}
                  <strong>{(resultado.escalaVertical * 100).toFixed(1)} %</strong> a lo alto.
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Paso horizontal</dt>
                  <dd>
                    {geo.pasoHorizontalMm.toFixed(2)} → {resultado.pasoHorizontalMm.toFixed(2)} mm
                  </dd>
                  <dt className="text-muted-foreground">Paso vertical</dt>
                  <dd>
                    {geo.pasoVerticalMm.toFixed(2)} → {resultado.pasoVerticalMm.toFixed(2)} mm
                  </dd>
                  <dt className="text-muted-foreground">Ajuste X</dt>
                  <dd>
                    {(config.ajusteXMm || 0).toFixed(2)} → {resultado.ajusteXMm.toFixed(2)} mm
                  </dd>
                  <dt className="text-muted-foreground">Ajuste Y</dt>
                  <dd>
                    {(config.ajusteYMm || 0).toFixed(2)} → {resultado.ajusteYMm.toFixed(2)} mm
                  </dd>
                </dl>
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-[12px]">
                Esto corrige lo que la <strong>impresora</strong> le hace a la hoja. No averigua el
                paso real de tu hoja de etiquetas: ese dato viene en la ficha del fabricante y se
                captura en la configuración. Conviene capturarlo primero y calibrar después.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          <Button
            disabled={!resultado?.valido || guardando}
            onClick={() => resultado?.valido && onAplicar(resultado)}
          >
            <Check className="mr-2 h-4 w-4" />
            {guardando ? 'Guardando…' : 'Aplicar corrección'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
