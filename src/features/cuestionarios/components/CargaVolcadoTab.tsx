import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, FileUp, Loader2, Upload, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { mensajeErrorApi } from '@/lib/apiErrors'
import { cn } from '@/lib/utils'
import {
  confirmarVolcado, consultarCargaVolcado, previsualizarVolcado,
} from '../api/cuestionarios.api'
import { useCargasDeVolcado, useTodosLosTipos } from '../hooks/useCuestionarios'
import type { InformeCargaVolcado, PrevisualizacionVolcado } from '../api/cuestionarios.types'

/**
 * Carga del volcado que produce Remark al escanear las hojas en papel.
 *
 * <h3>En dos pasos, y el primero no escribe nada</h3>
 *
 * Un volcado trae miles de celdas por participante y se carga una sola vez; el archivo
 * después se pierde. Lo que esta pantalla hace primero es el trabajo completo —leer,
 * emparejar columnas, interpretar cada celda— sin guardar, para que la decisión de
 * confirmar la tome alguien que ya sabe qué va a pasar.
 *
 * <h3>La plantilla se elige aquí; de la etiqueta solo sale el folio</h3>
 *
 * Remark exporta un volcado por plantilla, así que de qué cuestionario es el archivo lo
 * sabe quien lo sube, y se dice en el selector. La columna de etiqueta sirve para una sola
 * cosa: saber de qué participante es cada fila, y para eso da igual que traiga la etiqueta
 * completa —`C1/000001/F4`— o el folio pelado —`000001`—, que las dos formas llegan.
 *
 * Antes mandaba la etiqueta y el instrumento se deducía de ella. La idea era que no se
 * cargara el general como si fuera el minimental, donde los mismos códigos significan otra
 * cosa; pero el precio era rechazar archivos buenos por cómo estaban rotulados, y esa
 * protección ya está en la propia previsualización: las columnas se emparejan con el
 * catálogo de la plantilla elegida, así que un archivo subido en la plantilla equivocada
 * aparece con casi ninguna columna emparejada antes de que se escriba nada.
 *
 * <h3>La carga no se espera: se sigue</h3>
 *
 * Al confirmar, el servidor contesta de inmediato con una tarea y la carga sigue por su
 * cuenta. Es por tamaño: cada fila del volcado es un cuestionario de dos mil respuestas,
 * así que un archivo de cientos de participantes tarda minutos, más de lo que una
 * petición aguanta abierta. Esta pantalla pregunta por la tarea cada segundo y medio y
 * enseña el avance; si se cierra, la carga sigue igual y después se puede volver a ver
 * cómo acabó.
 */
function tamano(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CargaVolcadoTab() {
  const { data: tipos = [] } = useTodosLosTipos()
  const { data: recientes = [], refetch: releerRecientes } = useCargasDeVolcado()
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [idTipo, setIdTipo] = useState<string>('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [previa, setPrevia] = useState<PrevisualizacionVolcado | null>(null)
  const [carga, setCarga] = useState<InformeCargaVolcado | null>(null)
  const [sobrescribir, setSobrescribir] = useState(false)
  const [trabajando, setTrabajando] = useState(false)

  const idCarga = carga?.id ?? null
  const corriendo = carga != null && !carga.termino

  /**
   * Pregunta por la carga mientras no termine.
   *
   * Una consulta que falla no se trata como un fallo de la carga: la carga corre en el
   * servidor y no depende de que esta pantalla la mire. Lo correcto es volver a
   * preguntar —un bache de red no debe hacerle creer a nadie que su archivo se perdió—.
   */
  useEffect(() => {
    if (!corriendo || idCarga == null) return
    let vivo = true
    const reloj = window.setInterval(async () => {
      try {
        const nuevo = await consultarCargaVolcado(idCarga)
        if (!vivo) return
        setCarga(nuevo)
        if (nuevo.estado === 'TERMINADA') {
          toast.success(`${nuevo.cuestionariosCreados} cuestionario(s) cargado(s)`)
          releerRecientes()
        } else if (nuevo.estado === 'FALLIDA') {
          toast.error('La carga se cortó. Abajo está el motivo.')
          releerRecientes()
        }
      } catch {
        // Se reintenta en la siguiente vuelta.
      }
    }, 1500)
    return () => { vivo = false; window.clearInterval(reloj) }
  }, [corriendo, idCarga, releerRecientes])

  function elegir(nuevo: File | null) {
    setArchivo(nuevo)
    setPrevia(null)
    setCarga(null)
    setSobrescribir(false)
  }

  async function revisar() {
    if (!archivo || !idTipo) return
    setTrabajando(true)
    try {
      setPrevia(await previsualizarVolcado(archivo, Number(idTipo)))
      setCarga(null)
    } catch (e) {
      toast.error(mensajeErrorApi(e, 'No se pudo leer el volcado'))
      setPrevia(null)
    } finally {
      setTrabajando(false)
    }
  }

  async function confirmar() {
    if (!archivo || !idTipo) return
    setTrabajando(true)
    try {
      setCarga(await confirmarVolcado(archivo, Number(idTipo), sobrescribir))
      setPrevia(null)
      releerRecientes()
      toast.success('La carga empezó. Aquí se ve el avance.')
    } catch (e) {
      toast.error(mensajeErrorApi(e, 'No se pudo cargar el volcado'))
    } finally {
      setTrabajando(false)
    }
  }

  const seCargan = previa?.filas.filter((f) => f.motivoRechazo == null).length ?? 0
  const yaExisten = previa?.filas.filter((f) => f.yaExiste).length ?? 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">Volcado de Remark</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada cuestionario tiene su plantilla de escaneo, así que el archivo se carga en la
            que le toca. De la columna del folio se toma solo eso: el folio, venga como
            etiqueta completa o pelado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plantilla">Plantilla del volcado</Label>
            <Select
              value={idTipo}
              onValueChange={(v) => { setIdTipo(v); setPrevia(null); setCarga(null) }}
            >
              <SelectTrigger id="plantilla" className="sm:max-w-md">
                <SelectValue placeholder="Elija de qué cuestionario es este volcado" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.clave} — {t.nombre} (v{t.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Contra su catálogo se emparejan las columnas, así que si se equivoca de plantilla
              la revisión lo deja ver: casi ninguna columna va a emparejar.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastrando(false)
              elegir(e.dataTransfer.files?.[0] ?? null)
            }}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              arrastrando && 'border-primary bg-accent/40',
            )}
          >
            <FileUp className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Arrastre aquí el archivo del volcado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Un .xlsx con la hoja de respuestas y, si la trae, la de lecturas en desacuerdo
              </p>
            </div>
            <input
              ref={inputArchivo}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" size="sm" onClick={() => inputArchivo.current?.click()}>
              Elegir archivo
            </Button>
          </div>

          {archivo && (
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{archivo.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tamano(archivo.size)}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" disabled={trabajando || !idTipo} onClick={revisar}>
                  {trabajando && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                  Revisar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => elegir(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {previa && (
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-base">
              {previa.nombreInstrumento}
              {previa.claveDetectada && (
                <Badge variant="secondary" className="ml-2 font-mono">
                  {previa.claveDetectada}
                </Badge>
              )}
            </CardTitle>
            {previa.avisoEtiqueta && (
              <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {previa.avisoEtiqueta} No impide cargar: al participante lo identifica su
                  folio, no el rótulo.
                </span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Hoja de respuestas «{previa.hojaRespuestas}»
              {previa.hojaDiscrepancias
                ? ` · lecturas en desacuerdo en «${previa.hojaDiscrepancias}»`
                : ' · sin hoja de lecturas en desacuerdo'}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-5">
              <Dato
                titulo="Columnas emparejadas"
                valor={`${previa.columnasEmparejadas} de ${previa.totalColumnas}`}
              />
              <Dato titulo="Participantes" valor={String(previa.filas.length)} />
              <Dato titulo="Se van a cargar" valor={String(seCargan)} />
              <Dato
                titulo="Respuestas por revisar"
                valor={String(previa.filas.reduce(
                  (n, f) => n + (f.avisosDeRegla?.length ?? 0), 0))}
              />
              <Dato titulo="Lecturas en desacuerdo" valor={String(previa.discrepancias)} />
            </div>

            {(previa.columnasSinVariable.length > 0 || previa.variablesSinColumna.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {previa.columnasSinVariable.length > 0 && (
                  <ListaCodigos
                    titulo={`${previa.columnasSinVariable.length} columna(s) que el catálogo no reconoce`}
                    nota="Sus datos no se cargan. Si son preguntas reales, hay que documentarlas en el catálogo."
                    codigos={previa.columnasSinVariable}
                  />
                )}
                {previa.variablesSinColumna.length > 0 && (
                  <ListaCodigos
                    titulo={`${previa.variablesSinColumna.length} pregunta(s) que el archivo no trae`}
                    nota="Quedan sin respuesta en los cuestionarios que se carguen."
                    codigos={previa.variablesSinColumna}
                  />
                )}
              </div>
            )}

            <section className="space-y-2">
              <h4 className="text-sm font-medium">Participantes del archivo</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Fila</TableHead>
                    <TableHead>Folio o etiqueta</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead className="text-right">Con valor</TableHead>
                    <TableHead className="text-right">Sin marcar</TableHead>
                    <TableHead className="text-right">Sin leer</TableHead>
                    <TableHead className="text-right">No se preguntan</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previa.filas.map((f) => (
                    <TableRow key={f.numeroFila}>
                      <TableCell className="text-xs text-muted-foreground">{f.numeroFila}</TableCell>
                      <TableCell className="font-mono text-xs">{f.etiqueta ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {f.nombreParticipante ?? '—'}
                        {f.edad != null && (
                          <span className="ml-1.5 text-xs text-muted-foreground">{f.edad} años</span>
                        )}
                        {f.avisosDeRegla?.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="ml-1.5 border-amber-400 text-[10px] text-amber-700 dark:text-amber-400"
                              >
                                {f.avisosDeRegla.length} por revisar
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <ul className="list-disc pl-4">
                                {f.avisosDeRegla.slice(0, 6).map((a) => <li key={a}>{a}</li>)}
                              </ul>
                              {f.avisosDeRegla.length > 6 && (
                                <p className="mt-1">…y {f.avisosDeRegla.length - 6} mas.</p>
                              )}
                              <p className="mt-1.5 border-t pt-1.5">
                                Se carga igual: la hoja ya se contestó en papel. Queda
                                señalado para revisarlo.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {f.avisoCriterio && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="ml-1.5 border-amber-400 text-[10px] text-amber-700 dark:text-amber-400"
                              >
                                fuera de criterio
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {f.avisoCriterio}. Se carga igual: la hoja existe y alguien la
                              contestó. Queda señalado para revisarlo.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{f.conValor}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {f.sinRespuesta}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {f.noAutorizadas + f.conError > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-amber-500 text-amber-50 hover:bg-amber-500">
                                {f.noAutorizadas + f.conError}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {f.noAutorizadas} celda(s) que el reconocimiento de escritura no
                              leyó y {f.conError} con error de lectura. El dato está en el papel;
                              habrá que teclearlo.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {f.noPreguntadas}
                      </TableCell>
                      <TableCell>
                        {f.motivoRechazo == null ? (
                          <Badge className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600">
                            Se carga
                          </Badge>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="gap-1">
                                <AlertCircle className="size-3" />
                                {f.yaExiste ? 'Ya existe' : 'No se carga'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">{f.motivoRechazo}</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            {previa.problemas.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-medium">
                  {previa.problemas.length + previa.problemasOmitidos} celda(s) que no encajan con
                  el catálogo
                </h4>
                <p className="text-xs text-muted-foreground">
                  Se guardan igual, señaladas: el dato llega de un escáner y perderlo por no
                  encajar dejaría sin información y sin la señal de que el catálogo hay que
                  corregirlo.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Celda</TableHead>
                      <TableHead className="w-[110px]">Pregunta</TableHead>
                      <TableHead>Qué pasa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previa.problemas.slice(0, 50).map((p, i) => (
                      <TableRow key={`${p.celda}-${i}`}>
                        <TableCell className="font-mono text-xs">{p.celda}</TableCell>
                        <TableCell className="font-mono text-xs">{p.variable}</TableCell>
                        <TableCell className="text-xs">{p.detalle}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previa.problemas.length + previa.problemasOmitidos > 50 && (
                  <p className="text-xs text-muted-foreground">
                    Se muestran las primeras 50 de{' '}
                    {previa.problemas.length + previa.problemasOmitidos}.
                  </p>
                )}
              </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              {yaExisten > 0 ? (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="sobrescribir"
                    checked={sobrescribir}
                    onCheckedChange={(v) => setSobrescribir(v === true)}
                  />
                  <Label htmlFor="sobrescribir" className="cursor-pointer text-sm font-normal">
                    Reemplazar los {yaExisten} cuestionario(s) que ya existen
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Borra sus respuestas y las vuelve a escribir desde este archivo. Los
                      validados no se tocan: hay que reabrirlos a propósito.
                    </span>
                  </Label>
                </div>
              ) : <span />}

              <Button
                disabled={trabajando || corriendo
                  || (seCargan === 0 && !(sobrescribir && yaExisten > 0))}
                onClick={confirmar}
              >
                {trabajando
                  ? <Loader2 className="mr-1.5 size-4 animate-spin" />
                  : <Upload className="mr-1.5 size-4" />}
                Cargar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {carga && (
        <Card className={cn(
          carga.estado === 'TERMINADA' && 'border-emerald-500/60',
          carga.estado === 'FALLIDA' && 'border-destructive/60',
        )}>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {carga.estado === 'EN_PROCESO' && (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              )}
              {carga.estado === 'TERMINADA' && (
                <CheckCircle2 className="size-5 text-emerald-600" />
              )}
              {carga.estado === 'FALLIDA' && (
                <AlertCircle className="size-5 text-destructive" />
              )}
              {carga.estado === 'EN_PROCESO' ? 'Cargando el volcado'
                : carga.estado === 'TERMINADA' ? 'Volcado cargado'
                  : 'La carga se cortó'}
            </CardTitle>
            {carga.estado === 'EN_PROCESO' && (
              <p className="text-sm text-muted-foreground">
                Puedes cerrar esta pantalla: la carga sigue en el servidor y aquí se puede
                volver a ver cómo acabó.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {carga.estado === 'EN_PROCESO' && (
              <div className="space-y-1.5">
                <Progress
                  value={carga.totalFilas > 0
                    ? (carga.filasProcesadas / carga.totalFilas) * 100
                    : 0}
                />
                <p className="text-xs text-muted-foreground">
                  {carga.totalFilas > 0
                    ? `Participante ${carga.filasProcesadas} de ${carga.totalFilas}`
                    : 'Leyendo el archivo…'}
                </p>
              </div>
            )}

            {carga.mensajeError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {carga.mensajeError}
                <span className="mt-1 block text-destructive/80">
                  Lo que se alcanzó a guardar se queda: son cuestionarios completos. Al volver
                  a cargar el archivo, esos aparecerán como ya existentes.
                </span>
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <Dato titulo="Cuestionarios nuevos" valor={String(carga.cuestionariosCreados)} />
              <Dato
                titulo="Respuestas guardadas"
                valor={carga.respuestasGuardadas.toLocaleString('es-MX')}
              />
              <Dato titulo="Pendientes de leer" valor={String(carga.pendientesDeLectura)} />
              <Dato
                titulo="Lecturas en desacuerdo"
                valor={String(carga.discrepanciasGuardadas)}
              />
            </div>

            {carga.pendientesDeLectura > 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Quedaron {carga.pendientesDeLectura} celda(s) sin leer. Aparecen en la pestaña
                de llenado, en cada cuestionario, y hay que buscarlas en la hoja original y
                teclearlas.
              </p>
            )}

            {carga.filasOmitidas.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-medium">
                  {carga.filasOmitidas.length} participante(s) no se cargaron
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Fila</TableHead>
                      <TableHead className="w-[160px]">Folio o etiqueta</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carga.filasOmitidas.map((f) => (
                      <TableRow key={f.numeroFila}>
                        <TableCell className="text-xs text-muted-foreground">
                          {f.numeroFila}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.etiqueta ?? '—'}</TableCell>
                        <TableCell className="text-xs">{f.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            )}
          </CardContent>
        </Card>
      )}

      {!carga && recientes.length > 0 && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Últimas cargas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Una carga corre en el servidor, no en esta pantalla. Si la cerró mientras
              trabajaba, aquí está: ábrala para ver cómo acabó.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="w-[180px]">Plantilla</TableHead>
                  <TableHead className="w-[150px]">Inicio</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[110px] text-right">Cuestionarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recientes.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setCarga(r)}
                  >
                    <TableCell className="text-xs">{r.nombreArchivo ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.nombreInstrumento}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.inicio).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.estado === 'FALLIDA' ? 'destructive' : 'outline'}
                        className="text-[10px]"
                      >
                        {r.estado === 'EN_PROCESO'
                          ? `en proceso${r.totalFilas > 0
                            ? ` ${r.filasProcesadas}/${r.totalFilas}` : ''}`
                          : r.estado === 'TERMINADA' ? 'terminada' : 'se cortó'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {r.cuestionariosCreados}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{valor}</p>
    </div>
  )
}

function ListaCodigos({ titulo, nota, codigos }: {
  titulo: string
  nota: string
  codigos: string[]
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {codigos.slice(0, 40).map((c) => (
          <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
        ))}
        {codigos.length > 40 && (
          <span className="self-center text-xs text-muted-foreground">
            …y {codigos.length - 40} más
          </span>
        )}
      </div>
    </div>
  )
}
