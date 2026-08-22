import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Loader2, Upload, Wand2, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CeldaCarga } from '@/features/estudios/components/CeldaCarga'
import {
  confirmarCargaExamenes, previsualizarCargaExamenes, revalidarCargaExamenes,
} from '../api/cargaMasivaExamenes.api'
import type {
  PoliticaDuplicados, PrevisualizacionCargaExamenes, ResultadoCarga, TablaCarga,
} from '@/types/api'

/** Tamaño legible; los bytes crudos no le dicen nada a nadie. */
function tamano(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Carga masiva de resultados de laboratorio.
 *
 * <p>Igual que la de estudios en el recorrido —subir, revisar, corregir,
 * guardar— pero sin elegir tipo: un archivo de laboratorio trae varios exámenes
 * a la vez y cada columna se resuelve por su alias.</p>
 *
 * <p>Y con otra unidad de cuenta. Aquí cada celda es un resultado independiente,
 * así que se cuentan resultados y no filas: decir "3 filas listas" cuando cada
 * fila trae cinco exámenes no dice cuánto se va a escribir.</p>
 */
export function CargaMasivaExamenesTab() {
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [previa, setPrevia] = useState<PrevisualizacionCargaExamenes | null>(null)
  const [tabla, setTabla] = useState<TablaCarga | null>(null)
  // El archivo tal como se leyó: `tabla` cambia con cada corrección y para poder
  // decir "en el archivo venía X" hace falta la versión que nadie ha tocado.
  const [tablaOriginal, setTablaOriginal] = useState<TablaCarga | null>(null)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)
  const [politica, setPolitica] = useState<PoliticaDuplicados>('OMITIR')
  const [cargando, setCargando] = useState(false)
  const [soloConProblemas, setSoloConProblemas] = useState(false)

  // ── Elegir el archivo ────────────────────────────────────────────────────

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
    limpiarAnalisis()
  }

  const soltarArchivo = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegirArchivo(e.dataTransfer.files[0])
  }, [])

  /** Lo analizado deja de valer en cuanto cambia el archivo o se guarda. */
  function limpiarAnalisis() {
    setPrevia(null)
    setTabla(null)
    setTablaOriginal(null)
    setResultado(null)
  }

  function reiniciar() {
    setArchivo(null)
    limpiarAnalisis()
    if (inputArchivo.current) inputArchivo.current.value = ''
  }

  // ── Llamadas ─────────────────────────────────────────────────────────────

  async function subir() {
    if (!archivo) return
    setCargando(true)
    try {
      const r = await previsualizarCargaExamenes(archivo)
      setPrevia(r)
      setTabla(r.tabla)
      setTablaOriginal(r.tabla)
    } catch (e: any) {
      limpiarAnalisis()
      toast.error(e?.response?.data?.message ?? 'No se pudo leer el archivo')
    } finally {
      setCargando(false)
    }
  }

  async function revalidar() {
    if (!tabla) return
    setCargando(true)
    try {
      const r = await revalidarCargaExamenes(tabla)
      setPrevia(r)
      setResultado(null)
      if (r.resumen.resultadosConError === 0 && r.resumen.filasInservibles === 0) {
        toast.success('Ya no queda nada por corregir')
      } else {
        toast.warning('Todavía hay datos por corregir')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo revalidar')
    } finally {
      setCargando(false)
    }
  }

  async function confirmar() {
    if (!tabla) return
    setCargando(true)
    try {
      const r = await confirmarCargaExamenes(tabla, politica)
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

  // ── Corregir ─────────────────────────────────────────────────────────────

  const editarCelda = useCallback((iFila: number, iCol: number, valor: string) => {
    setTabla((prev) => prev && ({
      ...prev,
      filas: prev.filas.map((f, i) =>
        i === iFila ? f.map((c, j) => (j === iCol ? valor : c)) : f),
    }))
  }, [])

  const corregirColumna = useCallback((iCol: number, valor: string, filas: Set<number>) => {
    setTabla((prev) => prev && ({
      ...prev,
      filas: prev.filas.map((f, i) =>
        filas.has(i) ? f.map((c, j) => (j === iCol ? valor : c)) : f),
    }))
  }, [])

  // ── Índice de errores ────────────────────────────────────────────────────

  const erroresPorCelda = useMemo(() => {
    const mapa = new Map<string, string>()
    if (!previa) return mapa
    const colDe = new Map(previa.columnas.map((c) => [c.idExamen, c.indice]))
    previa.filas.forEach((f, iFila) => {
      f.valores.forEach((v) => {
        if (v.error) mapa.set(`${iFila}:${colDe.get(v.idExamen)}`, v.error)
      })
      if (f.errorFecha) mapa.set(`${iFila}:${previa.indiceFecha}`, f.errorFecha)
      if (f.errorParticipante) mapa.set(`${iFila}:${previa.indiceFolio}`, f.errorParticipante)
    })
    return mapa
  }, [previa])

  const filasConErrorPorColumna = useMemo(() => {
    const mapa = new Map<number, Set<number>>()
    erroresPorCelda.forEach((_, clave) => {
      const [iFila, iCol] = clave.split(':').map(Number)
      if (!mapa.has(iCol)) mapa.set(iCol, new Set())
      mapa.get(iCol)!.add(iFila)
    })
    return mapa
  }, [erroresPorCelda])

  /** Celdas duplicadas, para marcarlas sin tratarlas como error. */
  const duplicadasPorCelda = useMemo(() => {
    const set = new Set<string>()
    if (!previa) return set
    const colDe = new Map(previa.columnas.map((c) => [c.idExamen, c.indice]))
    previa.filas.forEach((f, iFila) => {
      f.valores.forEach((v) => {
        if (v.idResultadoExistente) set.add(`${iFila}:${colDe.get(v.idExamen)}`)
      })
    })
    return set
  }, [previa])

  const estructuraRota = previa && previa.problemasDeEstructura.length > 0
  const listo = previa
    && previa.resumen.resultadosConError === 0
    && previa.resumen.filasInservibles === 0

  const columnasVisibles = useMemo(() => {
    if (!previa) return []
    const cols: Array<{ indice: number; titulo: string; sub?: string; esFecha?: boolean }> = []
    if (previa.indiceFolio >= 0) cols.push({ indice: previa.indiceFolio, titulo: 'Participante' })
    if (previa.indiceFecha >= 0) cols.push({ indice: previa.indiceFecha, titulo: 'Fecha', esFecha: true })
    previa.columnas.forEach((c) => cols.push({
      indice: c.indice,
      titulo: c.unidad ? `${c.nombreExamen} (${c.unidad})` : c.nombreExamen,
      sub: c.encabezado,
    }))
    return cols
  }, [previa])

  const indicesVisibles = useMemo(() => {
    if (!tabla || !previa) return []
    const todas = tabla.filas.map((_, i) => i)
    if (!soloConProblemas) return todas
    return todas.filter((i) => {
      const f = previa.filas[i]
      return f && (f.errorParticipante || f.errorFecha || f.valores.some((v) => v.error))
    })
  }, [tabla, previa, soloConProblemas])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cargar resultados de laboratorio</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Sube el archivo que entrega el laboratorio. Cada columna se reconoce por los
            alias del examen; no hace falta elegir nada. Nada se registra hasta que lo confirmes.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {archivo ? (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{archivo.name}</p>
                <p className="text-[11px] text-muted-foreground">{tamano(archivo.size)}</p>
              </div>
              <Button
                type="button" variant="ghost" size="icon"
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
              El archivo no se puede usar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px] text-destructive">
            {previa!.problemasDeEstructura.map((p, i) => <p key={i}>{p}</p>)}
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
                  {resultado.detalle.map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 text-muted-foreground">{d.numeroDeFila}</td>
                      <td className="px-2 py-1">{d.folio} — {d.nombreParticipante}</td>
                      <td className="px-2 py-1">{d.fecha?.replace('T', ' ')}</td>
                      <td className={cn('px-2 py-1',
                        d.accion === 'OMITIDO' && 'text-amber-700 dark:text-amber-400')}>
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
          <Card className={listo ? 'border-emerald-500/40' : 'border-amber-500/40'}>
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-[13px]">
              <span className="flex items-center gap-2 font-medium">
                {listo
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 text-amber-600" />}
                {listo
                  ? `${previa.resumen.resultadosListos} resultado(s) listos para registrar`
                  : `${previa.resumen.resultadosConError} resultado(s) y `
                    + `${previa.resumen.filasInservibles} fila(s) necesitan corrección`}
              </span>

              <span className="text-muted-foreground">
                {previa.resumen.columnasReconocidas} examen(es) reconocidos en {previa.resumen.totalFilas} fila(s)
              </span>

              {/* Los huecos son normales en laboratorio, pero conviene decir cuántos
                  se van a omitir para que nadie los dé por cargados. */}
              {previa.resumen.celdasVacias > 0 && (
                <span className="text-muted-foreground">
                  {previa.resumen.celdasVacias} celda(s) en blanco se omitirán
                </span>
              )}

              {previa.columnasIgnoradas.length > 0 && (
                <span className="text-muted-foreground">
                  Sin reconocer: {previa.columnasIgnoradas.join(', ')}
                </span>
              )}

              {previa.fechaAmbigua && (
                <span className="text-amber-700 dark:text-amber-400">
                  Las fechas admiten dos lecturas; se interpretaron como{' '}
                  {previa.ordenDeFecha === 'DIA_MES' ? 'día/mes' : 'mes/día'}. Verifícalo.
                </span>
              )}

              <Button size="sm" variant="outline" onClick={revalidar} disabled={cargando} className="ml-auto">
                {cargando && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Volver a validar
              </Button>
            </CardContent>
          </Card>

          {/* Que el archivo no traiga parte del catálogo es normal —un perfil de
              lípidos no incluye la glucosa—, así que se informa sin alarmar. */}
          {previa.examenesNoIncluidos.length > 0 && (
            <p className="px-1 text-[12px] text-muted-foreground">
              El archivo no trae {previa.examenesNoIncluidos.length} examen(es) del catálogo:{' '}
              {previa.examenesNoIncluidos.slice(0, 8).join(', ')}
              {previa.examenesNoIncluidos.length > 8 && '…'}
            </p>
          )}

          {previa.resumen.resultadosDuplicados > 0 && (
            <Card className="border-amber-500/40">
              <CardContent className="space-y-2 py-4 text-[13px]">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  {previa.resumen.resultadosDuplicados} resultado(s) ya están registrados
                  para ese participante, examen y día
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant={politica === 'OMITIR' ? 'default' : 'outline'}
                          onClick={() => setPolitica('OMITIR')}>
                    No tocarlos
                  </Button>
                  <Button size="sm" variant={politica === 'REEMPLAZAR' ? 'destructive' : 'outline'}
                          onClick={() => setPolitica('REEMPLAZAR')}>
                    Reemplazar sus valores
                  </Button>
                </div>
                {politica === 'REEMPLAZAR' && (
                  <p className="text-destructive">
                    Los valores que ya estaban registrados se perderán.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={confirmar}
              disabled={cargando || !listo
                || previa.resumen.resultadosListos + previa.resumen.resultadosDuplicados === 0}
              title={!listo ? 'Corrige los datos marcados antes de guardar' : undefined}
            >
              {cargando
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Guardar {previa.resumen.resultadosListos
                + (politica === 'REEMPLAZAR' ? previa.resumen.resultadosDuplicados : 0)} resultado(s)
            </Button>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-base">Datos leídos</CardTitle>
              <Button size="sm" variant={soloConProblemas ? 'default' : 'outline'}
                      onClick={() => setSoloConProblemas((v) => !v)}>
                {soloConProblemas ? 'Ver todas las filas' : 'Ver solo las que fallan'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead className="sticky top-0 z-10 bg-muted">
                    <tr>
                      <th className="border-b px-2 py-2 text-left font-medium text-muted-foreground">Fila</th>
                      {columnasVisibles.map((c) => (
                        <th key={c.indice}
                          className={cn('border-b px-2 py-2 text-left align-top',
                            c.esFecha ? 'min-w-[380px]' : 'min-w-[130px]')}>
                          <div className="font-medium">{c.titulo}</div>
                          {c.sub && <div className="font-normal text-muted-foreground">{c.sub}</div>}
                          <CorregirColumna
                            indice={c.indice}
                            filasConError={filasConErrorPorColumna.get(c.indice)}
                            onCorregir={corregirColumna}
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
                          const duplicada = duplicadasPorCelda.has(`${iFila}:${c.indice}`)
                          const esFolio = c.indice === previa.indiceFolio
                          return (
                            <td key={c.indice} className="border-b px-1 py-1 align-top">
                              {/* Los valores de laboratorio son siempre numericos, asi
                                  que aqui el unico control especial es el de la fecha. */}
                              <div className={cn(!error && duplicada && 'rounded ring-1 ring-amber-500/60')}
                                   title={!error && duplicada ? 'Ya hay un resultado registrado' : undefined}>
                                <CeldaCarga
                                  tipo={c.esFecha ? undefined : 'NUMERICO'}
                                  esFecha={c.esFecha}
                                  fechaNormalizada={previa.filas[iFila]?.fecha}
                                  crudoOriginal={tablaOriginal?.filas[iFila]?.[c.indice]}
                                  valor={tabla.filas[iFila]?.[c.indice] ?? ''}
                                  error={error}
                                  onChange={(v) => editarCelda(iFila, c.indice, v)}
                                />
                              </div>
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
        </>
      )}
    </div>
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
      <Button size="sm" className="h-6 px-2 text-[11px]"
              onClick={() => { onCorregir(indice, valor, filasConError); setAbierto(false) }}>
        <FileUp className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setAbierto(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
