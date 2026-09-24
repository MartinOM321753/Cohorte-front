import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, AlertTriangle, CheckCircle2, Download, FileSpreadsheet,
  FileUp, Loader2, Upload, Wand2, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import { cn } from '@/lib/utils'
import { CeldaCarga } from '@/features/estudios/components/CeldaCarga'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'
import {
  confirmarCargaMuestras, descargarPlantillaMuestras,
  previsualizarCargaMuestras, revalidarCargaMuestras,
} from '../api/cargaMasivaMuestras.api'
import type {
  CampoMuestraCarga, PrevisualizacionCargaMuestras, ResultadoCargaMuestras, TablaCarga,
} from '@/types/api'

/**
 * Carga masiva de muestras y alícuotas.
 *
 * <p>Deliberadamente en dos pasos: primero se ve lo que se guardaría y solo
 * después se confirma. Aquí importa más que en la carga de estudios, porque un
 * archivo mal interpretado no solo mete datos equivocados: además <b>ocupa
 * huecos físicos</b> de las cajas, y deshacerlo significa abrir congeladores.</p>
 *
 * <p>Toda la validación la hace el servidor. Esta pantalla no decide si «300» es
 * un volumen válido ni si un hueco está libre: manda la tabla y vuelve a
 * preguntar. Lo único que resuelve por su cuenta es la <b>hora por omisión</b>,
 * porque la regla del horario vive aquí —en {@code ultimoMomentoValido}, sobre
 * la configuración de la institución— y tenerla también en Java significaría
 * mantener dos copias que acabarían diciendo cosas distintas.</p>
 */

/** Orden en el que se enseñan las columnas, sea cual sea el del archivo. */
const ORDEN_COLUMNAS: CampoMuestraCarga[] = [
  'FOLIO', 'TIPO_MUESTRA', 'TUBO', 'FECHA', 'NUMERO_ALICUOTA',
  'VOLUMEN', 'UNIDAD', 'CODIGO_CAJA', 'POSICION', 'OBSERVACIONES',
]

const TITULOS: Record<CampoMuestraCarga, string> = {
  FOLIO: 'Participante',
  TIPO_MUESTRA: 'Tipo',
  TUBO: 'Tubo',
  FECHA: 'Fecha de toma',
  NUMERO_ALICUOTA: 'N.º alícuota',
  VOLUMEN: 'Volumen',
  UNIDAD: 'Unidad',
  CODIGO_CAJA: 'Caja',
  POSICION: 'Hueco',
  OBSERVACIONES: 'Observaciones',
}

/** Tamaño legible; los bytes crudos no le dicen nada a nadie. */
function tamano(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CargaMasivaMuestrasTab() {
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<PrevisualizacionCargaMuestras | null>(null)
  const [tabla, setTabla] = useState<TablaCarga | null>(null)
  // El archivo tal como se leyó. Se guarda aparte porque `tabla` cambia con cada
  // corrección, y para poder decir «en el archivo venía X» hace falta la versión
  // que nadie ha tocado.
  const [tablaOriginal, setTablaOriginal] = useState<TablaCarga | null>(null)
  const [resultado, setResultado] = useState<ResultadoCargaMuestras | null>(null)
  const [cargando, setCargando] = useState(false)

  // La fecha que se aplica a las filas sin fecha, y la hora que se pone a las
  // que traen día pero no hora. Arranca en el último instante válido del
  // horario configurado, igual que el formulario de registro.
  const [fechaPorOmision, setFechaPorOmision] = useState<string>('')
  useEffect(() => {
    setFechaPorOmision((v) => v || ultimoMomentoValido(horarioActivo))
  }, [horarioActivo])

  const diasDeshabilitados = useMemo(() => {
    if (!horarioActivo) return undefined
    const dias: number[] = []
    if (!horarioActivo.domingo) dias.push(0)
    if (!horarioActivo.lunes) dias.push(1)
    if (!horarioActivo.martes) dias.push(2)
    if (!horarioActivo.miercoles) dias.push(3)
    if (!horarioActivo.jueves) dias.push(4)
    if (!horarioActivo.viernes) dias.push(5)
    if (!horarioActivo.sabado) dias.push(6)
    return dias.length > 0 ? dias : undefined
  }, [horarioActivo])

  // ── Elegir el archivo ────────────────────────────────────────────────────

  const [arrastrando, setArrastrando] = useState(false)

  function limpiarLectura() {
    setPrevia(null)
    setTabla(null)
    setTablaOriginal(null)
    setResultado(null)
  }

  /**
   * Comprueba extensión y tamaño antes de subir nada.
   *
   * El servidor los rechaza igual, pero esperar a que suban diez megas para
   * decir que el formato no vale es tiempo perdido, y con una conexión mala
   * mucho tiempo perdido.
   */
  function elegirArchivo(f: File | undefined) {
    if (!f) return
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.csv', '.xlsx'].includes(ext)) {
      toast.error('Formato no admitido. Suba un CSV o un Excel (.xlsx).')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede pasar de 10 MB.')
      return
    }
    setArchivo(f)
    // La previsualización anterior era de otro archivo; dejarla en pantalla
    // haría creer que corresponde al recién elegido.
    limpiarLectura()
  }

  const soltarArchivo = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegirArchivo(e.dataTransfer.files[0])
  }, [])

  function reiniciar() {
    setArchivo(null)
    limpiarLectura()
    if (inputArchivo.current) inputArchivo.current.value = ''
  }

  // ── Leer, corregir, confirmar ────────────────────────────────────────────

  const primeraCarga = useRef(true)

  async function subir() {
    if (!archivo) return
    setCargando(true)
    try {
      const r = await previsualizarCargaMuestras(archivo, fechaPorOmision || undefined)
      setPrevia(r)
      setTabla(r.tabla)
      setTablaOriginal(r.tabla)
      primeraCarga.current = true
    } catch (e: any) {
      limpiarLectura()
      toast.error(e?.response?.data?.message ?? 'No se pudo leer el archivo')
    } finally {
      setCargando(false)
    }
  }

  const editarCelda = useCallback((iFila: number, iCol: number, valor: string) => {
    setTabla((prev) => {
      if (!prev) return prev
      const filas = prev.filas.map((f, i) =>
        i === iFila ? f.map((c, j) => (j === iCol ? valor : c)) : f)
      return { ...prev, filas }
    })
  }, [])

  /**
   * Escribe el mismo valor en toda una columna, pero solo donde hay error.
   *
   * Sobrescribir también las celdas correctas destruiría datos buenos, que es
   * justo lo que nadie espera al pulsar «corregir la columna».
   */
  const corregirColumna = useCallback((iCol: number, valor: string, filas: Set<number>) => {
    setTabla((prev) => {
      if (!prev) return prev
      const nuevas = prev.filas.map((f, i) =>
        filas.has(i) ? f.map((c, j) => (j === iCol ? valor : c)) : f)
      return { ...prev, filas: nuevas }
    })
  }, [])

  async function revalidar(avisar = true) {
    if (!tabla) return
    setCargando(true)
    try {
      const r = await revalidarCargaMuestras(tabla, fechaPorOmision || undefined)
      setPrevia(r)
      setResultado(null)
      if (!avisar) return
      if (r.resumen.filasConProblemas === 0) {
        toast.success('Ya no queda nada por corregir')
      } else {
        toast.warning(`Todavía hay ${r.resumen.filasConProblemas} fila(s) por corregir`)
      }
    } catch (e: any) {
      if (avisar) toast.error(e?.response?.data?.message ?? 'No se pudo revalidar')
    } finally {
      setCargando(false)
    }
  }

  /**
   * Revalida sola en cuanto el usuario deja de escribir.
   *
   * La validación sigue siendo del servidor, pero obligar a pulsar un botón
   * para ver si la corrección sirvió deja el error rojo en pantalla mientras el
   * valor ya está bien. La espera evita una petición por tecla.
   */
  useEffect(() => {
    if (!tabla || !previa) return
    if (primeraCarga.current) { primeraCarga.current = false; return }
    const t = setTimeout(() => { void revalidar(false) }, 600)
    return () => clearTimeout(t)
    // Solo la tabla y la fecha: incluir `previa` haría un ciclo, porque
    // revalidar la sustituye.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, fechaPorOmision])

  async function confirmar() {
    if (!tabla) return
    setCargando(true)
    try {
      const r = await confirmarCargaMuestras(tabla, fechaPorOmision || undefined)
      setResultado(r)
      toast.success(`${r.alicuotasCreadas} alícuota(s) en ${r.padresCreadas} lote(s)`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo guardar la carga')
    } finally {
      setCargando(false)
    }
  }

  async function descargarPlantilla() {
    try {
      await descargarPlantillaMuestras()
    } catch {
      toast.error('No se pudo descargar la plantilla')
    }
  }

  // ── Índices de problemas, para pintarlos ─────────────────────────────────

  const { erroresPorCelda, avisosPorCelda, erroresDeFila, filasConErrorPorColumna } = useMemo(() => {
    const errores = new Map<string, string>()
    const avisos = new Map<string, string>()
    const deFila = new Map<number, string[]>()
    const porColumna = new Map<number, Set<number>>()
    if (!previa) return {
      erroresPorCelda: errores, avisosPorCelda: avisos,
      erroresDeFila: deFila, filasConErrorPorColumna: porColumna,
    }

    previa.filas.forEach((f, iFila) => {
      f.errores.forEach((p) => {
        // Un problema sin campo es de la fila entera —una etiqueta repetida, por
        // ejemplo— y no tiene celda donde pintarse.
        if (p.campo == null) {
          deFila.set(iFila, [...(deFila.get(iFila) ?? []), p.mensaje])
          return
        }
        const iCol = previa.indices[p.campo]
        if (iCol == null) return
        errores.set(`${iFila}:${iCol}`, p.mensaje)
        if (!porColumna.has(iCol)) porColumna.set(iCol, new Set())
        porColumna.get(iCol)!.add(iFila)
      })
      f.avisos.forEach((p) => {
        if (p.campo == null) return
        const iCol = previa.indices[p.campo]
        if (iCol != null) avisos.set(`${iFila}:${iCol}`, p.mensaje)
      })
    })
    return {
      erroresPorCelda: errores, avisosPorCelda: avisos,
      erroresDeFila: deFila, filasConErrorPorColumna: porColumna,
    }
  }, [previa])

  const estructuraRota = previa && previa.problemasDeEstructura.length > 0

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cargar muestras desde un archivo</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Una fila por vial. Se revisa antes de guardar: nada se registra —ni se ocupa
            ningún hueco— hasta que lo confirme.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={descargarPlantilla}>
            <Download className="mr-2 h-4 w-4" />
            Descargar la plantilla
          </Button>

          {archivo ? (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{archivo.name}</p>
                <p className="text-[11px] text-muted-foreground">{tamano(archivo.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={reiniciar}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputArchivo.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputArchivo.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltarArchivo}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
                arrastrando
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-muted/30',
              )}
            >
              <Upload className="h-8 w-8 opacity-50" />
              <div className="text-center text-[13px]">
                <span className="font-medium text-foreground">Haga clic</span> o arrastre el archivo aquí
              </div>
              <p className="text-[11px] opacity-60">CSV o Excel (.xlsx) — máximo 10 MB</p>
              <input
                ref={inputArchivo}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">Fecha para las filas que no la traigan</label>
            <DateTimePicker
              value={fechaPorOmision}
              onChange={setFechaPorOmision}
              placeholder="Seleccione la fecha y la hora"
              timeStepMinutes={1}
              minHour={horarioActivo?.horaInicio ?? 8}
              maxHour={horarioActivo?.horaFin != null ? horarioActivo.horaFin - 1 : 17}
              disabledDaysOfWeek={diasDeshabilitados}
            />
            {/* La hora es lo que casi nunca trae una hoja de cálculo, y una muestra
                «tomada a las 00:00» es una hora que nadie escribió. */}
            <p className="text-[11px] text-muted-foreground">
              También se usa su <strong>hora</strong> para las filas que traen día pero no hora.
              El día de cada fila se respeta siempre.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={subir} disabled={!archivo || cargando}>
              {cargando
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Upload className="mr-2 h-4 w-4" />}
              Leer archivo
            </Button>
            {previa && (
              <Button variant="ghost" onClick={reiniciar}>
                <X className="mr-2 h-4 w-4" />Empezar de nuevo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {estructuraRota && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-4 w-4" />
              El archivo no tiene la estructura que espera la carga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px]">
            {previa!.problemasDeEstructura.map((p, i) => (
              <p key={i} className="text-destructive">{p}</p>
            ))}
            <p className="text-muted-foreground">
              Descargue la plantilla y compare los títulos de las columnas.
            </p>
          </CardContent>
        </Card>
      )}

      {resultado && <Resultado resultado={resultado} onReiniciar={reiniciar} />}

      {previa && !estructuraRota && tabla && !resultado && (
        <>
          <Resumen previa={previa} onRevalidar={() => revalidar()} cargando={cargando} />

          <Lotes previa={previa} />

          <div className="flex justify-end">
            <Button
              onClick={confirmar}
              disabled={cargando || previa.resumen.filasConProblemas > 0
                || previa.resumen.totalFilas === 0}
              title={previa.resumen.filasConProblemas > 0
                ? 'Corrija los datos marcados antes de guardar'
                : undefined}
            >
              {cargando
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Guardar {previa.resumen.totalFilas} vial(es) en {previa.resumen.lotes} lote(s)
            </Button>
          </div>

          <TablaEditable
            previa={previa}
            tabla={tabla}
            tablaOriginal={tablaOriginal}
            minHour={horarioActivo?.horaInicio}
            maxHour={horarioActivo?.horaFin != null ? horarioActivo.horaFin - 1 : undefined}
            diasDeshabilitados={diasDeshabilitados}
            erroresPorCelda={erroresPorCelda}
            avisosPorCelda={avisosPorCelda}
            erroresDeFila={erroresDeFila}
            filasConErrorPorColumna={filasConErrorPorColumna}
            onEditarCelda={editarCelda}
            onCorregirColumna={corregirColumna}
          />
        </>
      )}
    </div>
  )
}

// ── Resumen ────────────────────────────────────────────────────────────────

function Resumen({ previa, onRevalidar, cargando }: {
  previa: PrevisualizacionCargaMuestras
  onRevalidar: () => void
  cargando: boolean
}) {
  const r = previa.resumen
  const listo = r.filasConProblemas === 0
  return (
    <Card className={listo ? 'border-emerald-500/40' : 'border-amber-500/40'}>
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-[13px]">
        <span className="flex items-center gap-2 font-medium">
          {listo
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            : <AlertCircle className="h-4 w-4 text-amber-600" />}
          {listo
            ? `${r.totalFilas} vial(es) listos en ${r.lotes} lote(s)`
            : `${r.filasConProblemas} de ${r.totalFilas} fila(s) necesitan corrección`}
        </span>

        <span className="text-muted-foreground">
          {r.vialesConPosicion} con hueco · {r.vialesSinPosicion} sin ubicar
        </span>

        {/* Que cientos de viales se guarden con un volumen que nadie escribió es
            correcto y está decidido, pero tiene que verse. */}
        {r.volumenesHeredados > 0 && (
          <span className="text-muted-foreground">
            {r.volumenesHeredados} sin volumen en el archivo: se tomará el del tubo
          </span>
        )}

        {/* Se dice una vez y no fila a fila: ninguna hoja de cálculo trae hora, y
            marcarlas todas enterraría los avisos que sí señalan algo raro. */}
        {r.filasSinHora > 0 && (
          <span className="text-muted-foreground">
            {r.filasSinHora} sin hora en el archivo: se les pone la de arriba
          </span>
        )}

        {r.filasConAvisos > 0 && (
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {r.filasConAvisos} con avisos
          </span>
        )}

        {previa.columnasIgnoradas.length > 0 && (
          <span className="text-muted-foreground">
            Se ignorarán: {previa.columnasIgnoradas.join(', ')}
          </span>
        )}

        {/* La ambigüedad de la fecha no es un error, pero conviene decirlo: el
            archivo admite las dos lecturas y se eligió una. */}
        {previa.fechaAmbigua && (
          <span className="text-amber-700 dark:text-amber-400">
            Las fechas admiten dos lecturas; se interpretaron como{' '}
            {previa.ordenDeFecha === 'DIA_MES' ? 'día/mes' : 'mes/día'}. Verifíquelo.
          </span>
        )}

        <Button size="sm" variant="outline" onClick={onRevalidar} disabled={cargando} className="ml-auto">
          {cargando && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Volver a validar
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Lotes ──────────────────────────────────────────────────────────────────

/**
 * Los lotes que se crearían.
 *
 * <p>Sin esto la pantalla solo podría decir «619 viales» y nadie vería que
 * además nacen 101 muestras padre —el registro de los tubos de los que
 * salieron—, que es lo que más sorprende de esta carga.</p>
 */
function Lotes({ previa }: { previa: PrevisualizacionCargaMuestras }) {
  const [abierto, setAbierto] = useState(false)
  if (previa.lotes.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">
            {previa.lotes.length} muestra(s) padre
          </CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Una por cada participante, tipo, tubo y día. Es el registro del tubo del que
            salieron los viales: nace sin posición y, si todos llegan ubicados, ya agotada.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Ocultar' : 'Ver los lotes'}
        </Button>
      </CardHeader>
      {abierto && (
        <CardContent className="p-0">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Etiqueta</th>
                  <th className="px-2 py-1.5 text-left font-medium">Participante</th>
                  <th className="px-2 py-1.5 text-left font-medium">Tipo / tubo</th>
                  <th className="px-2 py-1.5 text-left font-medium">Viales</th>
                  <th className="px-2 py-1.5 text-left font-medium">Volumen</th>
                  <th className="px-2 py-1.5 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {previa.lotes.map((l) => (
                  <tr key={l.clave} className="border-t align-top">
                    <td className="px-2 py-1 font-mono text-[11px]">{l.etiquetaPadre}</td>
                    <td className="px-2 py-1">
                      {l.folio}
                      {l.nombreParticipante && (
                        <div className="text-[11px] text-muted-foreground">{l.nombreParticipante}</div>
                      )}
                    </td>
                    <td className="px-2 py-1">{l.tipoMuestra} · {l.tubo}</td>
                    <td className="px-2 py-1">{l.viales} de {l.configuradas}</td>
                    <td className="px-2 py-1">
                      {l.volumenTotal ?? '—'}{l.unidad ? ` ${l.unidad}` : ''}
                    </td>
                    <td className="px-2 py-1">
                      {l.quedaraAgotada
                        ? <span className="text-muted-foreground">Agotada</span>
                        : <span className="text-amber-700 dark:text-amber-400">Con volumen reservado</span>}
                      {l.avisos.map((a, i) => (
                        <div key={i} className="text-[11px] text-amber-700 dark:text-amber-400">{a}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Resultado ──────────────────────────────────────────────────────────────

function Resultado({ resultado, onReiniciar }: {
  resultado: ResultadoCargaMuestras
  onReiniciar: () => void
}) {
  return (
    <Card className="border-emerald-500/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Carga guardada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-[13px]">
        <p>
          {resultado.alicuotasCreadas} alícuota(s) en {resultado.padresCreadas} lote(s)
          {resultado.alicuotasUbicadas > 0 && `, ${resultado.alicuotasUbicadas} con hueco asignado`}
          {resultado.padresAgotadas > 0 && `. ${resultado.padresAgotadas} muestra(s) padre quedaron agotadas`}
        </p>
        {/* El detalle por fila es lo que permite ir a buscar un vial concreto a
            su caja; un total suelto no sirve para eso. */}
        <div className="max-h-64 overflow-auto rounded border">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Fila</th>
                <th className="px-2 py-1 text-left font-medium">Etiqueta</th>
                <th className="px-2 py-1 text-left font-medium">Tipo / tubo</th>
                <th className="px-2 py-1 text-left font-medium">Hueco</th>
              </tr>
            </thead>
            <tbody>
              {resultado.detalle.map((d) => (
                <tr key={d.idMuestra} className="border-t">
                  <td className="px-2 py-1 text-muted-foreground">{d.numeroDeFila}</td>
                  <td className="px-2 py-1 font-mono text-[11px]">{d.etiqueta}</td>
                  <td className="px-2 py-1">{d.tipoMuestra} · {d.tubo}</td>
                  <td className="px-2 py-1">
                    {d.posicion ?? <span className="text-muted-foreground">sin ubicar</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" onClick={onReiniciar}>Cargar otro archivo</Button>
      </CardContent>
    </Card>
  )
}

// ── Tabla editable ─────────────────────────────────────────────────────────

function TablaEditable({
  previa, tabla, tablaOriginal, erroresPorCelda, avisosPorCelda, erroresDeFila,
  filasConErrorPorColumna, onEditarCelda, onCorregirColumna,
  minHour, maxHour, diasDeshabilitados,
}: {
  previa: PrevisualizacionCargaMuestras
  tabla: TablaCarga
  tablaOriginal: TablaCarga | null
  minHour?: number
  maxHour?: number
  diasDeshabilitados?: number[]
  erroresPorCelda: Map<string, string>
  avisosPorCelda: Map<string, string>
  erroresDeFila: Map<number, string[]>
  filasConErrorPorColumna: Map<number, Set<number>>
  onEditarCelda: (iFila: number, iCol: number, valor: string) => void
  onCorregirColumna: (iCol: number, valor: string, filas: Set<number>) => void
}) {
  // Solo se enseñan las columnas que significan algo, y en el orden de la
  // plantilla: las informativas y las ignoradas ocuparían ancho para nada.
  const columnas = useMemo(() => ORDEN_COLUMNAS
    .map((campo) => ({ campo, indice: previa.indices[campo] }))
    .filter((c): c is { campo: CampoMuestraCarga; indice: number } => c.indice != null),
    [previa])

  const [soloConProblemas, setSoloConProblemas] = useState(false)

  const visibles = useMemo(() => {
    const todas = tabla.filas.map((_, i) => i)
    if (!soloConProblemas) return todas
    return todas.filter((i) => previa.filas[i]?.errores.length > 0)
  }, [tabla, previa, soloConProblemas])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base">Viales leídos</CardTitle>
        <Button
          size="sm"
          variant={soloConProblemas ? 'default' : 'outline'}
          onClick={() => setSoloConProblemas((v) => !v)}
        >
          {soloConProblemas ? 'Ver todas las filas' : 'Ver solo las que fallan'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* La tabla se desplaza dentro de su propio contenedor: con diez columnas
            no cabe, y dejar que empuje la página rompería el resto del layout. */}
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th className="border-b px-2 py-2 text-left font-medium text-muted-foreground">Fila</th>
                {columnas.map((c) => (
                  <th
                    key={c.campo}
                    className={cn('border-b px-2 py-2 text-left align-top',
                      c.campo === 'FECHA' ? 'min-w-[395px]' : 'min-w-[120px]')}
                  >
                    <div className="font-medium">{TITULOS[c.campo]}</div>
                    <div className="font-normal text-muted-foreground">
                      {tabla.encabezados[c.indice]}
                    </div>
                    <CorregirColumna
                      indice={c.indice}
                      filasConError={filasConErrorPorColumna.get(c.indice)}
                      onCorregir={onCorregirColumna}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((iFila) => {
                const fila = previa.filas[iFila]
                const problemasDeFila = erroresDeFila.get(iFila)
                return (
                  <tr key={iFila} className="hover:bg-muted/40">
                    <td className="border-b px-2 py-1 align-top text-muted-foreground">
                      {tabla.numerosDeFila[iFila]}
                      {problemasDeFila?.map((m, i) => (
                        <div key={i} className="max-w-[200px] text-[11px] leading-tight text-destructive">
                          {m}
                        </div>
                      ))}
                    </td>
                    {columnas.map((c) => {
                      const error = erroresPorCelda.get(`${iFila}:${c.indice}`)
                      const aviso = avisosPorCelda.get(`${iFila}:${c.indice}`)
                      return (
                        <td key={c.campo} className="border-b px-1 py-1 align-top">
                          <CeldaCarga
                            esFecha={c.campo === 'FECHA'}
                            fechaNormalizada={fila?.fecha}
                            crudoOriginal={tablaOriginal?.filas[iFila]?.[c.indice]}
                            minHour={minHour}
                            maxHour={maxHour}
                            diasDeshabilitados={diasDeshabilitados}
                            valor={tabla.filas[iFila]?.[c.indice] ?? ''}
                            error={error}
                            onChange={(v) => onEditarCelda(iFila, c.indice, v)}
                          />
                          {/* El nombre resuelto es la única forma de notar que un
                              folio correcto apunta a otra persona. */}
                          {c.campo === 'FOLIO' && !error && fila?.nombreParticipante && (
                            <div
                              className="truncate px-1 pt-0.5 text-[11px] text-muted-foreground"
                              title={fila.nombreParticipante}
                            >
                              {fila.nombreParticipante}
                            </div>
                          )}
                          {c.campo === 'NUMERO_ALICUOTA' && !error && fila?.etiquetaPrevista && (
                            <div
                              className="truncate px-1 pt-0.5 font-mono text-[10px] text-muted-foreground"
                              title={fila.etiquetaPrevista}
                            >
                              {fila.etiquetaPrevista}
                            </div>
                          )}
                          {c.campo === 'VOLUMEN' && !error && fila?.volumenHeredado && (
                            <div className="px-1 pt-0.5 text-[11px] text-muted-foreground">
                              del tubo: {fila.volumen}{fila.unidad ? ` ${fila.unidad}` : ''}
                            </div>
                          )}
                          {!error && aviso && (
                            <div className="px-1 pt-0.5 text-[11px] leading-tight text-amber-700 dark:text-amber-400">
                              {aviso}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Escribe el mismo valor en todas las celdas con error de una columna.
 *
 * <p>Es lo que hace manejable un archivo de seiscientas filas: cuando el tubo se
 * llama distinto en el catálogo, el error está en las seiscientas y corregirlas
 * una a una no es una opción.</p>
 */
function CorregirColumna({ indice, filasConError, onCorregir }: {
  indice: number
  filasConError?: Set<number>
  onCorregir: (iCol: number, valor: string, filas: Set<number>) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [valor, setValor] = useState('')

  if (!filasConError || filasConError.size === 0) return null

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-1 flex items-center gap-1 text-[11px] font-normal text-amber-700 hover:underline dark:text-amber-400"
      >
        <Wand2 className="h-3 w-3" />
        Corregir las {filasConError.size} en conjunto
      </button>
    )
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <Input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Valor"
        className="h-6 text-[11px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onCorregir(indice, valor, filasConError); setAbierto(false) }
          if (e.key === 'Escape') setAbierto(false)
        }}
      />
      <Button
        size="sm"
        className="h-6 px-2 text-[11px]"
        onClick={() => { onCorregir(indice, valor, filasConError); setAbierto(false) }}
      >
        <FileUp className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setAbierto(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
