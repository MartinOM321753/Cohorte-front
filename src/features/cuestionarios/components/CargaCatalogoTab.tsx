import { useRef, useState } from 'react'
import {
  AlertTriangle, BookOpen, CheckCircle2, FileSpreadsheet, FileUp, Loader2, ShieldAlert, Upload, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { mensajeErrorApi } from '@/lib/apiErrors'
import { cn } from '@/lib/utils'
import { confirmarCatalogo, previsualizarCatalogo } from '../api/cuestionarios.api'
import { useTodosLosTipos } from '../hooks/useCuestionarios'
import type { PrevisualizacionCatalogo } from '../api/cuestionarios.types'

/**
 * Carga el catálogo de un instrumento desde el libro que mantienen los investigadores.
 *
 * <h3>Por qué existe esta pantalla</h3>
 *
 * El instrumento principal tiene más de dos mil preguntas y más de doce mil opciones.
 * Capturarlas a mano no es trabajoso: es inviable, y un catálogo teclead a mano es de donde
 * salieron los errores que hubo que cotejar página por página contra el papel. El catálogo
 * vive en un libro que ellos mantienen y la forma correcta de que entre al sistema es
 * leerlo.
 *
 * <h3>Lo que la previsualización está buscando</h3>
 *
 * No es «cuántas preguntas hay». Es qué cambios tocan respuestas ya guardadas. Retirar una
 * opción que alguien contestó deja un código en la base sin nada que lo explique, y eso
 * bloquea la carga: no se puede aceptar desde aquí, hay que corregirlo en el archivo.
 */
export function CargaCatalogoTab() {
  const { data: tipos = [] } = useTodosLosTipos()
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [idTipo, setIdTipo] = useState<string>('')
  const [nombreCatalogo, setNombreCatalogo] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [previa, setPrevia] = useState<PrevisualizacionCatalogo | null>(null)
  const [cargado, setCargado] = useState<PrevisualizacionCatalogo | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  function elegir(nuevo: File | null) {
    setArchivo(nuevo)
    setPrevia(null)
    setCargado(null)
  }

  async function revisar() {
    if (!archivo || !idTipo) return
    setTrabajando(true)
    try {
      setPrevia(await previsualizarCatalogo(archivo, Number(idTipo), nombreCatalogo || undefined))
      setCargado(null)
    } catch (e) {
      toast.error(mensajeErrorApi(e, 'No se pudo leer el catalogo'))
      setPrevia(null)
    } finally {
      setTrabajando(false)
    }
  }

  async function confirmar() {
    if (!archivo || !idTipo) return
    setTrabajando(true)
    try {
      const r = await confirmarCatalogo(archivo, Number(idTipo), nombreCatalogo || undefined)
      setCargado(r)
      setPrevia(null)
      toast.success('Catálogo cargado')
    } catch (e) {
      toast.error(mensajeErrorApi(e, 'No se pudo cargar el catalogo'))
    } finally {
      setTrabajando(false)
    }
  }

  const bloqueos = previa?.choques.filter((c) => c.bloquea) ?? []
  const avisos = previa?.choques.filter((c) => !c.bloquea) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" />
            Catálogo de los investigadores
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Un .xlsx con dos hojas: <span className="font-mono">Variables</span>, una fila por
            pregunta con su tipo y la columna que le toca en el volcado, y{' '}
            <span className="font-mono">Catalogo</span>, una fila por opción con su código y su
            etiqueta.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Cuestionario de destino</Label>
              <Select value={idTipo} onValueChange={(v) => { setIdTipo(v); elegir(archivo) }}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Elija el cuestionario" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.clave} — {t.nombre} (v{t.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalogo">Catálogo dentro del libro</Label>
              <Input
                id="catalogo"
                placeholder="Catalogo Cuestionario Principal"
                value={nombreCatalogo}
                onChange={(e) => setNombreCatalogo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Solo hace falta si el libro trae varios. Con uno, se detecta solo.
              </p>
            </div>
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
            <p className="text-sm font-medium">Arrastre aquí el libro del catálogo</p>
            <input
              ref={inputArchivo}
              type="file"
              accept=".xlsx"
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
          <CardHeader>
            <CardTitle className="text-base">{previa.nombreCatalogo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <Dato titulo="Preguntas nuevas" valor={previa.variablesNuevas} />
              <Dato titulo="Se actualizan" valor={previa.variablesActualizadas} />
              <Dato titulo="Sin cambio" valor={previa.variablesSinCambio} />
              <Dato titulo="Opciones en total" valor={previa.opciones} />
            </div>

            {previa.seccionesNuevas.length > 0 && (
              <section>
                <h4 className="text-sm font-medium">
                  {previa.seccionesNuevas.length} bloque(s) nuevo(s)
                </h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {previa.seccionesNuevas.slice(0, 50).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                  {previa.seccionesNuevas.length > 50 && (
                    <span className="self-center text-xs text-muted-foreground">
                      …y {previa.seccionesNuevas.length - 50} más
                    </span>
                  )}
                </div>
              </section>
            )}

            {previa.variablesQueSobran.length > 0 && (
              <section className="rounded-lg border p-3">
                <h4 className="text-sm font-medium">
                  {previa.variablesQueSobran.length} pregunta(s) que el archivo no trae
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No se borran. Podrían haberse retirado del instrumento, o el libro podría
                  haberse exportado incompleto, y desde aquí las dos cosas se ven igual.
                  Retirarlas de uso es una decisión que se toma pregunta por pregunta.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {previa.variablesQueSobran.slice(0, 40).map((v) => (
                    <Badge key={v} variant="outline" className="font-mono text-[10px]">{v}</Badge>
                  ))}
                  {previa.variablesQueSobran.length > 40 && (
                    <span className="self-center text-xs text-muted-foreground">
                      …y {previa.variablesQueSobran.length - 40} más
                    </span>
                  )}
                </div>
              </section>
            )}

            {bloqueos.length > 0 && (
              <section className="rounded-lg border border-destructive/60 bg-destructive/5 p-3">
                <h4 className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <ShieldAlert className="size-4" />
                  {bloqueos.length} cambio(s) que dejarían respuestas ilegibles
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No se pueden aceptar desde aquí: el código quedaría guardado en las respuestas
                  sin nada que lo explique. Hay que corregir el archivo.
                </p>
                <ul className="mt-2 space-y-1">
                  {bloqueos.map((c) => (
                    <li key={c.variable} className="text-xs">
                      <span className="font-mono">{c.variable}</span> — {c.detalle}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {avisos.length > 0 && (
              <section className="rounded-lg border border-amber-400/60 p-3">
                <h4 className="flex items-center gap-1.5 text-sm font-medium">
                  <AlertTriangle className="size-4 text-amber-600" />
                  {avisos.length} cambio(s) sobre preguntas con respuestas
                </h4>
                <ul className="mt-2 space-y-1">
                  {avisos.slice(0, 30).map((c) => (
                    <li key={c.variable} className="text-xs">
                      <span className="font-mono">{c.variable}</span> — {c.detalle}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex items-center justify-end border-t pt-4">
              <Button disabled={trabajando || bloqueos.length > 0} onClick={confirmar}>
                {trabajando
                  ? <Loader2 className="mr-1.5 size-4 animate-spin" />
                  : <Upload className="mr-1.5 size-4" />}
                Cargar catálogo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cargado && (
        <Card className="border-emerald-500/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Catálogo cargado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <Dato titulo="Preguntas nuevas" valor={cargado.variablesNuevas} />
              <Dato titulo="Actualizadas" valor={cargado.variablesActualizadas} />
              <Dato titulo="Sin cambio" valor={cargado.variablesSinCambio} />
              <Dato titulo="Opciones" valor={cargado.opciones} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">
        {valor.toLocaleString('es-MX')}
      </p>
    </div>
  )
}
