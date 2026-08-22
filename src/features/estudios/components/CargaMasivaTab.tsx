import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, Check, CheckCircle2, ChevronsUpDown, FileSpreadsheet, FileUp,
  Loader2, Upload, Wand2, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CeldaCarga } from './CeldaCarga'
import { confirmarCarga, previsualizarCarga, revalidarCarga } from '../api/cargaMasiva.api'
import { useGetTiposEstudio } from '../hooks/useEstudios'
import type {
  ColumnaReconocida, PoliticaDuplicados, PrevisualizacionCarga, ResultadoCarga, TablaCarga,
} from '@/types/api'

/**
 * Carga masiva de resultados de estudios.
 *
 * <p>Deliberadamente en dos pasos: primero se ve lo que se guardaría, y solo
 * después se confirma. Un archivo mal interpretado mete cientos de mediciones
 * equivocadas de golpe, y revisarlas antes cuesta mucho menos que deshacerlas.</p>
 *
 * <p>Toda la validación la hace el servidor. La pantalla no decide si "72,5" es
 * un número: manda la tabla corregida y vuelve a preguntar. Si validara por su
 * cuenta acabaría teniendo reglas distintas de las que de verdad mandan.</p>
 */
/** Tamano legible; los bytes crudos no le dicen nada a nadie. */
function tamano(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CargaMasivaTab() {
  const { data: tipos = [] } = useGetTiposEstudio()
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [idTipo, setIdTipo] = useState<string>('')
  const [tipoAbierto, setTipoAbierto] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<PrevisualizacionCarga | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)
  // Omitir por defecto: reemplazar destruye lo ya registrado y tiene que
  // elegirse a proposito.
  const [politica, setPolitica] = useState<PoliticaDuplicados>('OMITIR')

  // La tabla que el usuario va editando. Vive aquí y no en la previsualización
  // porque cambia con cada tecla, mientras que la previsualización solo se
  // renueva al revalidar.
  const [tabla, setTabla] = useState<TablaCarga | null>(null)
  // El archivo tal como se leyó. Se guarda aparte porque `tabla` va cambiando con
  // cada corrección, y para poder decir "en el archivo venía X" hace falta la
  // versión que nadie ha tocado.
  const [tablaOriginal, setTablaOriginal] = useState<TablaCarga | null>(null)

  const tiposActivos = useMemo(() => tipos.filter((t) => t.activo !== false), [tipos])

  // ── Elegir el archivo ────────────────────────────────────────────────────

  /**
   * Comprueba extension y tamano antes de subir nada.
   *
   * <p>El servidor los rechaza igual, pero esperar a que suba diez megas para
   * decir que el formato no vale es tiempo perdido y, con una conexion mala,
   * mucho tiempo perdido.</p>
   */
  function elegirArchivo(f: File | undefined) {
    if (!f) return
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.csv', '.xlsx'].includes(ext)) {
      toast.error('Formato no admitido. Sube un CSV o un Excel (.xlsx).')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede pasar de 10 MB.')
      return
    }
    setArchivo(f)
    // La previsualizacion anterior era de otro archivo; dejarla en pantalla
    // haria creer que corresponde al recien elegido.
    setPrevia(null)
    setTabla(null)
    setResultado(null)
  }

  const soltarArchivo = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegirArchivo(e.dataTransfer.files[0])
  }, [])

  function quitarArchivo() {
    setArchivo(null)
    setPrevia(null)
    setTabla(null)
    setResultado(null)
    if (inputArchivo.current) inputArchivo.current.value = ''
  }

  // ── Subir ────────────────────────────────────────────────────────────────

  async function subir() {
    if (!archivo || !idTipo) return
    setCargando(true)
    try {
      const r = await previsualizarCarga(archivo, Number(idTipo))
      setPrevia(r)
      setTabla(r.tabla)
      setTablaOriginal(r.tabla)
    } catch (e: any) {
      setPrevia(null)
      setTabla(null)
      toast.error(e?.response?.data?.message ?? 'No se pudo leer el archivo')
    } finally {
      setCargando(false)
    }
  }

  // ── Corregir ─────────────────────────────────────────────────────────────

  const editarCelda = useCallback((iFila: number, iCol: number, valor: string) => {
    setTabla((prev) => {
      if (!prev) return prev
      const filas = prev.filas.map((f, i) =>
        i === iFila ? f.map((c, j) => (j === iCol ? valor : c)) : f,
      )
      return { ...prev, filas }
    })
  }, [])

  /**
   * Escribe el mismo valor en toda una columna, pero solo donde hay error.
   *
   * Sobrescribir también las celdas correctas destruiría mediciones buenas, que
   * es justo lo que el usuario no espera al pulsar "corregir la columna".
   */
  const corregirColumna = useCallback((iCol: number, valor: string, filasConError: Set<number>) => {
    setTabla((prev) => {
      if (!prev) return prev
      const filas = prev.filas.map((f, i) =>
        filasConError.has(i) ? f.map((c, j) => (j === iCol ? valor : c)) : f,
      )
      return { ...prev, filas }
    })
  }, [])

  async function revalidar() {
    if (!tabla || !previa) return
    setCargando(true)
    try {
      const r = await revalidarCarga(tabla, previa.idTipoEstudio)
      setPrevia(r)
      setResultado(null)
      if (r.resumen.filasConProblemas === 0) {
        toast.success('Ya no queda nada por corregir')
      } else {
        toast.warning(`Todavía hay ${r.resumen.filasConProblemas} fila(s) por corregir`)
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo revalidar')
    } finally {
      setCargando(false)
    }
  }

  async function confirmar() {
    if (!tabla || !previa) return
    setCargando(true)
    try {
      const r = await confirmarCarga(tabla, previa.idTipoEstudio, politica)
      setResultado(r)
      toast.success(
        `${r.registrados} registrado(s)`
        + (r.reemplazados ? `, ${r.reemplazados} reemplazado(s)` : '')
        + (r.omitidosPorDuplicado ? `, ${r.omitidosPorDuplicado} omitido(s)` : ''),
      )
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo guardar la carga')
    } finally {
      setCargando(false)
    }
  }

  function reiniciar() {
    setResultado(null)
    setPrevia(null)
    setTabla(null)
    setTablaOriginal(null)
    setArchivo(null)
    if (inputArchivo.current) inputArchivo.current.value = ''
  }

  // ── Índice de errores por celda, para pintarlos ──────────────────────────

  const erroresPorCelda = useMemo(() => {
    const mapa = new Map<string, string>()
    if (!previa) return mapa
    const colDe = new Map(previa.columnas.map((c) => [c.idParametro, c.indice]))
    previa.filas.forEach((f, iFila) => {
      f.valores.forEach((v) => {
        if (v.error) mapa.set(`${iFila}:${colDe.get(v.idParametro)}`, v.error)
      })
      if (f.errorFecha) mapa.set(`${iFila}:${previa.indiceFecha}`, f.errorFecha)
      if (f.errorParticipante) mapa.set(`${iFila}:${previa.indiceFolio}`, f.errorParticipante)
    })
    return mapa
  }, [previa])

  /** Qué filas tienen error en cada columna, para la corrección en bloque. */
  const filasConErrorPorColumna = useMemo(() => {
    const mapa = new Map<number, Set<number>>()
    erroresPorCelda.forEach((_, clave) => {
      const [iFila, iCol] = clave.split(':').map(Number)
      if (!mapa.has(iCol)) mapa.set(iCol, new Set())
      mapa.get(iCol)!.add(iFila)
    })
    return mapa
  }, [erroresPorCelda])

  const estructuraRota = previa
    && (previa.problemasDeEstructura.length > 0 || previa.parametrosSinColumna.length > 0)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cargar resultados desde un archivo</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Sube el archivo que exporta el instrumento. Se revisa antes de guardar:
            nada se registra hasta que lo confirmes.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">Tipo de estudio</label>
            {/* Buscador y no un desplegable simple: el catálogo pasa de veinte
                plantillas y recorrerlas a ojo es más lento que escribir. */}
            <Popover open={tipoAbierto} onOpenChange={setTipoAbierto}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={tipoAbierto}
                  className="w-full justify-between text-sm font-normal"
                >
                  <span className="truncate">
                    {idTipo
                      ? tiposActivos.find((t) => String(t.id) === idTipo)?.nombre ?? '…'
                      : 'Buscar tipo de estudio…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar tipo de estudio…" />
                  <CommandList>
                    <CommandEmpty>No se encontró el tipo de estudio.</CommandEmpty>
                    <CommandGroup>
                      {tiposActivos.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.nombre}
                          onSelect={() => {
                            setIdTipo(String(t.id))
                            reiniciar()
                            setTipoAbierto(false)
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4 shrink-0',
                            idTipo === String(t.id) ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate">{t.nombre}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

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
                onClick={quitarArchivo}
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
                <span className="font-medium text-foreground">Haz clic</span> o arrastra el archivo aquí
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

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={subir} disabled={!archivo || !idTipo || cargando}>
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

      {/* Problemas de estructura: el archivo no encaja con el tipo y no hay nada
          que corregir celda a celda. */}
      {estructuraRota && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-4 w-4" />
              El archivo no corresponde a “{previa!.nombreTipoEstudio}”
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            {previa!.problemasDeEstructura.map((p, i) => (
              <p key={i} className="text-destructive">{p}</p>
            ))}
            {previa!.parametrosSinColumna.length > 0 && (
              <div>
                <p className="font-medium">
                  Faltan columnas para {previa!.parametrosSinColumna.length} parámetro(s):
                </p>
                <p className="text-muted-foreground">
                  {previa!.parametrosSinColumna.join(', ')}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Todos los parámetros son obligatorios. Añade las columnas al archivo, o
                  configura sus alias en el catálogo para que se reconozcan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card className="border-emerald-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Carga guardada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px]">
            <p>
              {resultado.registrados} registrado(s)
              {resultado.reemplazados > 0 && `, ${resultado.reemplazados} reemplazado(s)`}
              {resultado.omitidosPorDuplicado > 0
                && `, ${resultado.omitidosPorDuplicado} omitido(s) por estar ya registrados`}
            </p>
            {/* El detalle por fila es lo que permite averiguar cuales fueron
                los omitidos; un total suelto no sirve para nada. */}
            <div className="max-h-52 overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Fila</th>
                    <th className="px-2 py-1 text-left font-medium">Participante</th>
                    <th className="px-2 py-1 text-left font-medium">Fecha</th>
                    <th className="px-2 py-1 text-left font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.detalle.map((d) => (
                    <tr key={d.numeroDeFila} className="border-t">
                      <td className="px-2 py-1 text-muted-foreground">{d.numeroDeFila}</td>
                      <td className="px-2 py-1">{d.folio} — {d.nombreParticipante}</td>
                      <td className="px-2 py-1">{d.fecha?.replace('T', ' ')}</td>
                      <td className={`px-2 py-1 ${d.accion === 'OMITIDO' ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                        {d.accion === 'REGISTRADO' ? 'Registrado'
                          : d.accion === 'REEMPLAZADO' ? 'Reemplazado'
                          : 'Omitido (ya existía)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" onClick={reiniciar}>Cargar otro archivo</Button>
          </CardContent>
        </Card>
      )}

      {previa && !estructuraRota && tabla && !resultado && (
        <>
          <ResumenCarga previa={previa} onRevalidar={revalidar} cargando={cargando} />

          {/* Los duplicados no son un error: son una decision. Por eso el bloque
              solo aparece cuando los hay, y con OMITIR ya marcado. */}
          {previa.resumen.filasDuplicadas > 0 && (
            <Card className="border-amber-500/40">
              <CardContent className="space-y-2 py-4 text-[13px]">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  {previa.resumen.filasDuplicadas} de {previa.resumen.totalFilas} fila(s) ya tienen
                  un estudio de este tipo ese mismo día
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={politica === 'OMITIR' ? 'default' : 'outline'}
                    onClick={() => setPolitica('OMITIR')}
                  >
                    No tocarlas
                  </Button>
                  <Button
                    size="sm"
                    variant={politica === 'REEMPLAZAR' ? 'destructive' : 'outline'}
                    onClick={() => setPolitica('REEMPLAZAR')}
                  >
                    Reemplazar sus resultados
                  </Button>
                </div>
                {politica === 'REEMPLAZAR' && (
                  <p className="text-destructive">
                    Los resultados que ya estaban registrados en esos estudios se perderán.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={confirmar}
              disabled={cargando || previa.resumen.filasConProblemas > 0 || previa.resumen.totalFilas === 0}
              title={previa.resumen.filasConProblemas > 0
                ? 'Corrige los datos marcados antes de guardar'
                : undefined}
            >
              {cargando
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Guardar {previa.resumen.totalFilas - (politica === 'OMITIR' ? previa.resumen.filasDuplicadas : 0)} estudio(s)
            </Button>
          </div>

          <TablaEditable
            previa={previa}
            tabla={tabla}
            tablaOriginal={tablaOriginal}
            erroresPorCelda={erroresPorCelda}
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

function ResumenCarga({ previa, onRevalidar, cargando }: {
  previa: PrevisualizacionCarga
  onRevalidar: () => void
  cargando: boolean
}) {
  const listo = previa.resumen.filasConProblemas === 0
  return (
    <Card className={listo ? 'border-emerald-500/40' : 'border-amber-500/40'}>
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-[13px]">
        <span className="flex items-center gap-2 font-medium">
          {listo
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            : <AlertCircle className="h-4 w-4 text-amber-600" />}
          {listo
            ? `${previa.resumen.totalFilas} fila(s) listas para registrar`
            : `${previa.resumen.filasConProblemas} de ${previa.resumen.totalFilas} fila(s) necesitan corrección`}
        </span>

        <span className="text-muted-foreground">
          {previa.resumen.columnasReconocidas} columna(s) reconocidas
        </span>

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
            {previa.ordenDeFecha === 'DIA_MES' ? 'día/mes' : 'mes/día'}. Verifícalo.
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

// ── Tabla editable ─────────────────────────────────────────────────────────

function TablaEditable({
  previa, tabla, tablaOriginal, erroresPorCelda, filasConErrorPorColumna,
  onEditarCelda, onCorregirColumna,
}: {
  previa: PrevisualizacionCarga
  tabla: TablaCarga
  tablaOriginal: TablaCarga | null
  erroresPorCelda: Map<string, string>
  filasConErrorPorColumna: Map<number, Set<number>>
  onEditarCelda: (iFila: number, iCol: number, valor: string) => void
  onCorregirColumna: (iCol: number, valor: string, filas: Set<number>) => void
}) {
  // Solo se muestran las columnas que significan algo. Las ignoradas ocuparían
  // ancho para nada: no se van a guardar ni se pueden corregir.
  const columnasVisibles = useMemo(() => {
    const cols: Array<{
      indice: number; titulo: string; sub?: string
      tipo?: ColumnaReconocida['tipo']; opciones?: string[]; esFecha?: boolean
      idParametro?: number
    }> = []
    if (previa.indiceFolio >= 0) cols.push({ indice: previa.indiceFolio, titulo: 'Participante' })
    if (previa.indiceFecha >= 0) cols.push({ indice: previa.indiceFecha, titulo: 'Fecha', esFecha: true })
    previa.columnas.forEach((c) => cols.push({
      indice: c.indice, titulo: c.nombreParametro, sub: c.encabezado,
      tipo: c.tipo, opciones: c.opciones, idParametro: c.idParametro,
    }))
    return cols
  }, [previa])

  const [soloConProblemas, setSoloConProblemas] = useState(false)

  const indicesVisibles = useMemo(() => {
    const todas = tabla.filas.map((_, i) => i)
    if (!soloConProblemas) return todas
    return todas.filter((i) => previa.filas[i]?.valores.some((v) => v.error)
      || previa.filas[i]?.errorFecha || previa.filas[i]?.errorParticipante)
  }, [tabla, previa, soloConProblemas])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base">Datos leídos</CardTitle>
        <Button
          size="sm"
          variant={soloConProblemas ? 'default' : 'outline'}
          onClick={() => setSoloConProblemas((v) => !v)}
        >
          {soloConProblemas ? 'Ver todas las filas' : 'Ver solo las que fallan'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* La tabla se desplaza dentro de su propio contenedor: con 15 columnas
            no cabe, y dejar que empuje la página rompería el resto del layout. */}
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th className="border-b px-2 py-2 text-left font-medium text-muted-foreground">
                  Fila
                </th>
                {columnasVisibles.map((c) => (
                  <th key={c.indice}
                      className={cn('border-b px-2 py-2 text-left align-top',
                        c.esFecha ? 'min-w-[380px]' : 'min-w-[130px]')}>
                    <div className="font-medium">{c.titulo}</div>
                    {c.sub && <div className="font-normal text-muted-foreground">{c.sub}</div>}
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
              {indicesVisibles.map((iFila) => (
                <tr key={iFila} className="hover:bg-muted/40">
                  <td className="border-b px-2 py-1 text-muted-foreground">
                    {tabla.numerosDeFila[iFila]}
                  </td>
                  {columnasVisibles.map((c) => {
                    const error = erroresPorCelda.get(`${iFila}:${c.indice}`)
                    const esFolio = c.indice === previa.indiceFolio
                    return (
                      <td key={c.indice} className="border-b px-1 py-1 align-top">
                        <CeldaCarga
                          tipo={c.tipo}
                          opciones={c.opciones}
                          esFecha={c.esFecha}
                          fechaNormalizada={previa.filas[iFila]?.fecha}
                          crudoOriginal={tablaOriginal?.filas[iFila]?.[c.indice]}
                          canonico={previa.filas[iFila]?.valores
                            .find((v) => v.idParametro === c.idParametro)?.canonico}
                          valor={tabla.filas[iFila]?.[c.indice] ?? ''}
                          error={error}
                          onChange={(v) => onEditarCelda(iFila, c.indice, v)}
                        />
                        {/* El nombre resuelto es la única forma de notar que un
                            folio correcto apunta a otra persona. */}
                        {esFolio && !error && previa.filas[iFila]?.nombreParticipante && (
                          <div className="truncate px-1 pt-0.5 text-[11px] text-muted-foreground"
                               title={previa.filas[iFila].nombreParticipante!}>
                            {previa.filas[iFila].nombreParticipante}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/** Escribe el mismo valor en todas las celdas con error de una columna. */
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
        Corregir {filasConError.size} de un jalón
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
