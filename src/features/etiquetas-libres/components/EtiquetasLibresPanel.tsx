import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, FileSpreadsheet, Printer, RotateCcw, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

import { HojaEtiquetas } from '@/components/print/HojaEtiquetas'
import { ESTILOS_HOJA } from '@/components/print/hojaImpresion'
import { layoutCuadricula, MIN_FUENTE_PT } from '@/components/print/layoutCuadricula'
import { crearMedidorTexto } from '@/components/print/medirTexto'
import { useGetConfiguracionesActivas } from '@/features/configuracion/hooks/useEtiquetas'
import { mensajeErrorApi } from '@/lib/apiErrors'
import type { ConfiguracionEtiquetaResponse } from '@/types/api'

import { leerArchivoEtiquetas, type TablaEtiquetas } from '../api/etiquetasLibres.api'
import {
  configCuadriculaDe,
  contenidoDeFila,
  disenoInicial,
  fontPtInicial,
  type DisenoEtiqueta,
  type FilaConProblema,
} from '../disenoEtiqueta'
import { CasillaCuadricula } from './CasillaCuadricula'
import { DisenadorCuadricula } from './DisenadorCuadricula'
import { GaleriaDisenos } from './GaleriaDisenos'

/**
 * Imprime etiquetas con los datos de un archivo externo.
 *
 * Cada fila del archivo es una etiqueta, y el usuario decide en qué parte de la
 * etiqueta cae cada columna dividiéndola en una cuadrícula. No hay códigos de
 * barras ni campos con papel fijo: lo que está en la celda es lo que se imprime.
 *
 * Nada se guarda. El archivo se lee, se diseña, se revisa y se manda a la
 * impresora; para repetir se vuelve a subir. Es lo que garantiza que lo impreso
 * corresponda a lo que hoy dice la hoja de cálculo y no a una copia de hace un
 * mes.
 */
export default function EtiquetasLibresPanel() {
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [nombreArchivo, setNombreArchivo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [tabla, setTabla] = useState<TablaEtiquetas | null>(null)
  const [configId, setConfigId] = useState('')
  const [diseno, setDiseno] = useState<DisenoEtiqueta | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  const { data: configuraciones } = useGetConfiguracionesActivas()

  /**
   * Solo hojas. El rollo de la Zebra se imprime por otro camino —ZPL a través
   * del agente local— y ofrecerlo aquí prometería algo que esta pantalla no
   * hace.
   */
  const configsHoja = useMemo(
    () => (configuraciones ?? []).filter((c) => c.tipoMedio !== 'ROLLO_ZEBRA'),
    [configuraciones],
  )

  const config: ConfiguracionEtiquetaResponse | undefined = useMemo(
    () => configsHoja.find((c) => String(c.id) === configId),
    [configsHoja, configId],
  )

  useEffect(() => {
    if (configsHoja.length > 0 && !configId) {
      const pred = configsHoja.find((c) => c.predeterminada)
      setConfigId(String(pred ? pred.id : configsHoja[0].id))
    }
  }, [configsHoja, configId])

  // El tamaño de partida sale de la configuración elegida, no de un número fijo.
  //
  // Depende del id y no del objeto: al refrescarse la consulta, React Query
  // entrega configuraciones nuevas aunque sean las mismas, y con el objeto como
  // dependencia esto le borraría al usuario el tamaño que acabara de elegir a
  // mano, en mitad del diseño y sin motivo visible.
  useEffect(() => {
    if (config) setDiseno((d) => (d ? { ...d, fontPt: fontPtInicial(config) } : d))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id])

  // Una sola instancia con memoria para toda la pantalla: el maquetado mide la
  // misma cadena muchas veces mientras busca el tamaño que cabe.
  const medir = useMemo(() => crearMedidorTexto(), [])

  // ── Carga del archivo ─────────────────────────────────────────────────────

  async function alElegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    if (!config) {
      toast.error('Elija primero una configuración de etiqueta.')
      return
    }

    setCargando(true)
    try {
      const leida = await leerArchivoEtiquetas(archivo)
      setTabla(leida)
      setNombreArchivo(archivo.name)
      setDiseno(disenoInicial(leida, config))
      leida.avisos.forEach((a) => toast.warning(a, { duration: 8000 }))
    } catch (err) {
      setTabla(null)
      setNombreArchivo('')
      setDiseno(null)
      toast.error(mensajeErrorApi(err, 'No se pudo leer el archivo'))
    } finally {
      setCargando(false)
      // Permite volver a elegir el mismo archivo después de corregirlo en Excel.
      if (inputArchivo.current) inputArchivo.current.value = ''
    }
  }

  /**
   * Aplica un diseño y abre la hoja de una vez.
   *
   * Se aplica al ajuste además de imprimir —y no se imprime «de paso»— para que
   * al cerrar la hoja el diseñador muestre lo que se acaba de mandar. Si no,
   * volvería a verse el diseño anterior y no habría forma de saber cuál se usó.
   */
  function imprimirCon(nuevo: DisenoEtiqueta) {
    setDiseno(nuevo)
    setVistaPrevia(true)
  }

  function limpiar() {
    setTabla(null)
    setNombreArchivo('')
    setDiseno(null)
  }

  // ── Revisión previa ───────────────────────────────────────────────────────

  /**
   * Filas cuyo contenido no va a salir completo.
   *
   * Se calcula sobre todas las filas, no sobre una muestra: el valor que no cabe
   * suele ser justo el excepcional, y una revisión que mira solo las primeras
   * diez lo deja pasar. El medidor tiene memoria, así que repetir el maquetado
   * de todas las filas cuesta poco.
   */
  const problemas: FilaConProblema[] = useMemo(() => {
    if (!tabla || !config || !diseno) return []

    const cfg = configCuadriculaDe(config, diseno)
    const salida: FilaConProblema[] = []

    for (let i = 0; i < tabla.filas.length; i++) {
      const contenido = contenidoDeFila(tabla, i, diseno)
      const vacias = contenido.filter((c) => !c.texto.trim()).map((c) => c.clave)
      const maquetado = layoutCuadricula(cfg, contenido, medir)

      if (maquetado.desbordado || vacias.length > 0) {
        salida.push({
          indice: i,
          numeroDeFila: tabla.numerosDeFila[i] ?? i + 2,
          columnas: maquetado.clavesConProblema,
          vacias,
        })
      }
    }

    return salida
  }, [tabla, config, diseno, medir])

  const firma = useMemo(
    () => `${nombreArchivo}|${JSON.stringify(diseno)}`,
    [nombreArchivo, diseno],
  )

  const listoParaImprimir = !!tabla && !!config && !!diseno &&
    diseno.celdas.some((c) => c.columnaArchivo !== null)

  // ── Vista ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <style>{ESTILOS_HOJA}</style>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Etiquetas desde un archivo
        </CardTitle>
        <CardDescription>
          Cada fila del archivo es una etiqueta. Divida la etiqueta en una cuadrícula y coloque
          cada columna donde quiera que salga; dos datos pueden ir uno al lado del otro. Se
          imprime lo que está en la celda, con el formato que tiene en la hoja de cálculo. No se
          guarda nada: para volver a imprimir hay que subir el archivo otra vez.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {configsHoja.length === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No hay ninguna configuración de etiqueta para hoja. Cree una arriba, en
              <strong> Configuración de etiquetas</strong>, antes de imprimir desde un archivo.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Configuración de hoja y archivo ── */}
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

          <input
            ref={inputArchivo}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => alElegirArchivo(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => inputArchivo.current?.click()}
            disabled={cargando || !config}
          >
            {cargando ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {tabla ? 'Elegir otro archivo' : 'Elegir archivo (.xlsx o .csv)'}
          </Button>

          {tabla && (
            <>
              <p className="text-[13px] text-muted-foreground">
                <strong>{nombreArchivo}</strong> · {tabla.filas.length} fila(s) ·{' '}
                {tabla.encabezados.length} columna(s)
              </p>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={limpiar}>
                <RotateCcw className="h-3.5 w-3.5" />
                Quitar
              </Button>
            </>
          )}
        </div>

        {tabla && diseno && config && (
          <>
            <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
              {/* ── Diseño de la etiqueta ── */}
              <section className="space-y-2">
                <Label className="text-[12px] uppercase tracking-wider text-muted-foreground">
                  Ajustar el diseño
                </Label>
                <DisenadorCuadricula tabla={tabla} diseno={diseno} onChange={setDiseno} />
              </section>

              {/* ── Vista previa a tamaño real ── */}
              <section className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-[12px] uppercase tracking-wider text-muted-foreground">
                    Tamaño real
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setDiseno({ ...diseno, fontPt: Math.max(MIN_FUENTE_PT, diseno.fontPt - 0.5) })
                      }
                      aria-label="Reducir el tamaño de letra"
                    >
                      A−
                    </Button>
                    <span className="w-14 text-center font-mono text-[12px]">
                      {diseno.fontPt.toFixed(1)} pt
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setDiseno({ ...diseno, fontPt: Math.min(24, diseno.fontPt + 0.5) })}
                      aria-label="Aumentar el tamaño de letra"
                    >
                      A+
                    </Button>
                  </div>
                </div>

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
                  <CasillaCuadricula
                    tabla={tabla}
                    indiceFila={0}
                    configuracion={config}
                    diseno={diseno}
                    medir={medir}
                    guias
                  />
                </div>

                <p className="max-w-[18rem] text-[11px] leading-snug text-muted-foreground">
                  Así sale la primera fila, a tamaño real. El punteado marca las celdas y no se
                  imprime. Si un valor no cabe, la letra de esa celda baja sola; cuando ni al
                  mínimo alcanza, la fila aparece abajo señalada.
                </p>
              </section>
            </div>

            {/* ── Diseños de partida ── */}
            <section className="space-y-2 border-t pt-4">
              <Label className="text-[12px] uppercase tracking-wider text-muted-foreground">
                Diseños de partida
              </Label>
              <GaleriaDisenos
                tabla={tabla}
                configuracion={config}
                diseno={diseno}
                onElegir={setDiseno}
                onImprimir={imprimirCon}
                medir={medir}
              />
            </section>

            {/* ── Filas con problema ── */}
            {problemas.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-1.5 text-[12px]">
                  <p>
                    <strong>{problemas.length} fila(s)</strong> no van a salir completas. Se
                    señalan por su número de fila en la hoja de cálculo:
                  </p>
                  <ul className="max-h-32 space-y-0.5 overflow-y-auto font-mono">
                    {problemas.slice(0, 20).map((p) => (
                      <li key={p.indice}>
                        Fila {p.numeroDeFila}
                        {p.columnas.length > 0 && ` · no cabe: ${p.columnas.join(', ')}`}
                        {p.vacias.length > 0 && ` · vacía: ${p.vacias.join(', ')}`}
                      </li>
                    ))}
                  </ul>
                  {problemas.length > 20 && <p>y {problemas.length - 20} más.</p>}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                className="gap-2"
                disabled={!listoParaImprimir}
                onClick={() => setVistaPrevia(true)}
              >
                <Printer className="h-4 w-4" />
                Vista previa ({tabla.filas.length})
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {vistaPrevia && tabla && config && diseno && (
        <HojaEtiquetas
          open
          onClose={() => setVistaPrevia(false)}
          total={tabla.filas.length}
          configuracion={config}
          firma={firma}
          titulo={`Etiquetas de ${nombreArchivo}`}
          nombreDe={(i) => `Fila ${tabla.numerosDeFila[i] ?? i + 2}`}
          renderCasilla={(i) => (
            <CasillaCuadricula
              tabla={tabla}
              indiceFila={i}
              configuracion={config}
              diseno={diseno}
              medir={medir}
            />
          )}
        />
      )}
    </Card>
  )
}
