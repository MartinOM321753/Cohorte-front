import { useMemo, useState } from 'react'
import { Loader2, Table2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useActualizarBloque, useDependenciaDeBloque, usePreguntasDeBloque,
} from '../hooks/useCuestionarios'
import { OPERADOR_ETIQUETAS } from '../api/cuestionarios.types'
import type {
  BloqueCuestionario, OperadorDependencia, PresentacionSeccion,
} from '../api/cuestionarios.types'

/**
 * Los dos ajustes que son del bloque entero y no de cada pregunta.
 *
 * <h3>El salto del papel</h3>
 *
 * Los «pase a la pregunta 25» del papel no son por pregunta: son por bloque. El
 * «Ninguna» que encabeza la 112 apaga sus ciento treinta y cinco celdas. Capturarlo
 * pregunta por pregunta no es trabajoso, es que **nadie lo haría**, y quien lo
 * intentara se saltaría alguna sin que nada lo delatara.
 *
 * Por eso la llave se elige entre las preguntas del propio bloque y se aplica de una
 * vez. El servidor excluye la llave de sí misma.
 *
 * <h3>Y el «es distinto de»</h3>
 *
 * Hay dos clases de salto. Unos son una igualdad —«si contestó Sí, pase a la 25»—. El
 * otro es una casilla de descarte: marcar «Ninguna» significa que el resto no se
 * preguntó, y eso no se puede escribir como igualdad porque habría que enumerar todo
 * lo que no es «Ninguna».
 */
/**
 * Las tres formas de pintar un bloque, con la diferencia que de verdad importa.
 *
 * Antes esto era un interruptor de dos estados —rejilla sí o no— y faltaba la tercera,
 * que es la más común del instrumento. Un bloque que estaba en tabla de escala, al
 * encender y apagar el interruptor, acababa en lista y no había forma de devolverlo:
 * se perdía la tabla sin que nada fallara. Pasó con la 12 y la 70.
 */
const PRESENTACIONES: Record<PresentacionSeccion, { etiqueta: string; detalle: string }> = {
  LISTA: {
    etiqueta: 'Lista',
    detalle: 'Una pregunta debajo de otra. Es lo que sirve para la gran mayoría.',
  },
  ESCALA: {
    etiqueta: 'Tabla de escala',
    detalle: 'Un renglón por pregunta y una columna por respuesta, las mismas para todo '
      + 'el bloque: los veintidós alimentos con sus frecuencias, el Barthel. Es la forma '
      + 'más común del cuestionario y no necesita nada más que las opciones.',
  },
  MATRIZ: {
    etiqueta: 'Rejilla',
    detalle: 'Cada celda es una pregunta distinta, con su fila y su columna: las quince '
      + 'actividades por nueve días de la 112. Hace falta decir qué celda ocupa cada '
      + 'pregunta; si no, no hay tabla que pintar.',
  },
}

interface Props {
  idTipo: number
  bloque: BloqueCuestionario
  onCerrar: () => void
}

export function DialogoBloque({ idTipo, bloque, onCerrar }: Props) {
  const { data: preguntas = [], isLoading } = usePreguntasDeBloque(bloque.id)
  const dependencia = useDependenciaDeBloque(idTipo, bloque.id)

  // Una rejilla sin celdas no se pinta, y eso hay que decirlo aqui.
  const celdas = preguntas.filter((p) => p.filaMatriz && p.columnaMatriz).length
  const actualizar = useActualizarBloque(idTipo)

  // Se parte de lo que ya tiene el bloque: si todas sus preguntas (menos la llave)
  // comparten dependencia, esa es la regla vigente y hay que poder verla, no volver a
  // escribirla de memoria.
  const vigente = useMemo(() => {
    const conLlave = preguntas.filter((p) => p.dependeDe)
    if (conLlave.length === 0) return null
    const primera = conLlave[0]
    const todasIgual = conLlave.every((p) =>
      p.dependeDe === primera.dependeDe
      && p.valorHabilitante === primera.valorHabilitante
      && p.operadorDependencia === primera.operadorDependencia)
    return todasIgual ? primera : null
  }, [preguntas])

  const [llave, setLlave] = useState<string>('')
  const [operador, setOperador] = useState<OperadorDependencia>('IGUAL')
  const [valor, setValor] = useState('')
  const [tocado, setTocado] = useState(false)

  // Mientras nadie toque el formulario, lo que se ve es lo que hay guardado.
  const llaveActual = tocado ? llave : (vigente?.dependeDe ?? '')
  const operadorActual = tocado ? operador : (vigente?.operadorDependencia ?? 'IGUAL')
  const valorActual = tocado ? valor : (vigente?.valorHabilitante ?? '')

  function cambiar(nueva: { llave?: string; operador?: OperadorDependencia; valor?: string }) {
    if (!tocado) {
      setLlave(llaveActual)
      setOperador(operadorActual)
      setValor(valorActual)
      setTocado(true)
    }
    if (nueva.llave !== undefined) setLlave(nueva.llave)
    if (nueva.operador !== undefined) setOperador(nueva.operador)
    if (nueva.valor !== undefined) setValor(nueva.valor)
  }

  const preguntaLlave = preguntas.find((p) => p.codigo === llaveActual)
  const afectadas = preguntas.filter((p) => p.codigo !== llaveActual).length

  function aplicar() {
    dependencia.mutate({
      dependeDe: llaveActual || null,
      valorHabilitante: llaveActual ? (valorActual || null) : null,
      operadorDependencia: operadorActual,
    }, { onSuccess: () => setTocado(false) })
  }

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onCerrar() }}>
      <DialogContent className="@container sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {bloque.nombre}
            <Badge variant="secondary">{bloque.totalVariables} preguntas</Badge>
            {bloque.pagina != null && (
              <Badge variant="outline">Página {bloque.pagina} del papel</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Lo que vale para todo el bloque. Lo de cada pregunta se edita en su propia ficha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Presentación ───────────────────────────────────────────────── */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="presentacion" className="flex items-center gap-1.5 text-sm">
              <Table2 className="size-4" />
              Cómo se pinta el bloque
            </Label>

            <Select
              value={bloque.presentacion}
              disabled={actualizar.isPending}
              onValueChange={(valor) => actualizar.mutate({
                idBloque: bloque.id,
                datos: {
                  nombre: bloque.nombre,
                  descripcion: bloque.descripcion,
                  pagina: bloque.pagina,
                  orden: bloque.orden,
                  presentacion: valor as PresentacionSeccion,
                },
              })}
            >
              <SelectTrigger id="presentacion">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['LISTA', 'ESCALA', 'MATRIZ'] as const).map((p) => (
                  <SelectItem key={p} value={p}>{PRESENTACIONES[p].etiqueta}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              {PRESENTACIONES[bloque.presentacion].detalle}
            </p>

            {/* La rejilla necesita saber qué celda ocupa cada pregunta, y eso no lo
                da esta pantalla. Sin el aviso, elegirla parece no hacer nada: el
                bloque queda marcado como rejilla y se sigue pintando en lista. */}
            {bloque.presentacion === 'MATRIZ' && celdas === 0 && !isLoading && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Ninguna de las {bloque.totalVariables} preguntas de este bloque tiene fila
                y columna, así que la rejilla no se va a pintar. Se ponen en la ficha de
                cada pregunta; o las deduce la carga del catálogo cuando el enunciado viene
                escrito «Fila-Columna», como «Cigarros-Gasolinera».
              </p>
            )}
            {bloque.presentacion === 'MATRIZ' && celdas > 0 && (
              <p className="text-xs text-muted-foreground">
                {celdas} de {bloque.totalVariables} preguntas tienen su celda; el resto se
                pinta debajo de la tabla.
              </p>
            )}
          </div>

          {/* ── Dependencia ────────────────────────────────────────────────── */}
          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <Label className="text-sm">El salto del papel</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Las preguntas de este bloque solo se hacen cuando la pregunta llave esté
                contestada así. Sin esto, quien marque «Ninguna» aparecerá con todas las
                demás sin contestar, y la completitud del cuestionario deja de servir.
              </p>
            </div>

            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="grid gap-3 @sm:grid-cols-3">
                <div className="space-y-1.5 @sm:col-span-3">
                  <Label htmlFor="llave" className="text-xs">Pregunta llave</Label>
                  <Select
                    value={llaveActual || '\u0000'}
                    onValueChange={(v) => cambiar({ llave: v === '\u0000' ? '' : v, valor: '' })}
                  >
                    <SelectTrigger id="llave">
                      <SelectValue placeholder="Sin dependencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={'\u0000'}>Sin dependencia</SelectItem>
                      {preguntas.map((p) => (
                        <SelectItem key={p.id} value={p.codigo}>
                          <span className="font-mono text-xs">{p.codigo}</span>
                          {p.pregunta ? ` — ${p.pregunta}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="operador" className="text-xs">Se pregunta si</Label>
                  <Select
                    value={operadorActual}
                    disabled={!llaveActual}
                    onValueChange={(v) => cambiar({ operador: v as OperadorDependencia })}
                  >
                    <SelectTrigger id="operador">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IGUAL">{OPERADOR_ETIQUETAS.IGUAL}</SelectItem>
                      <SelectItem value="DISTINTO">{OPERADOR_ETIQUETAS.DISTINTO}</SelectItem>
                      <SelectItem value="EN">{OPERADOR_ETIQUETAS.EN}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 @sm:col-span-2">
                  <Label htmlFor="valor" className="text-xs">Esta respuesta</Label>
                  {operadorActual === 'EN' ? (
                    // Con «es alguno de» la respuesta es una lista, asi que no cabe
                    // un desplegable de una sola opcion. Se escriben los codigos
                    // separados por |, que es como viaja al servidor.
                    <Input
                      id="valor"
                      value={valorActual}
                      disabled={!llaveActual}
                      placeholder="Codigos separados por |, por ejemplo 2|3"
                      onChange={(e) => cambiar({ valor: e.target.value })}
                    />
                  ) : preguntaLlave && preguntaLlave.opciones.length > 0 ? (
                    <Select
                      value={valorActual}
                      disabled={!llaveActual}
                      onValueChange={(v) => cambiar({ valor: v })}
                    >
                      <SelectTrigger id="valor">
                        <SelectValue placeholder="Elija la respuesta" />
                      </SelectTrigger>
                      <SelectContent>
                        {preguntaLlave.opciones.map((o) => (
                          <SelectItem key={o.id} value={o.codigo}>
                            <span className="font-mono text-xs">{o.codigo}</span> — {o.etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="valor"
                      value={valorActual}
                      disabled={!llaveActual}
                      placeholder="Código de la respuesta"
                      onChange={(e) => cambiar({ valor: e.target.value })}
                    />
                  )}
                </div>
              </div>
            )}

            {llaveActual && (
              <p className="text-xs text-muted-foreground">
                Se le pondrá a <strong>{afectadas}</strong> pregunta(s). La llave{' '}
                <span className="font-mono">{llaveActual}</span> queda fuera: no puede depender
                de sí misma.
              </p>
            )}
            {!llaveActual && tocado && (
              <p className="text-xs text-muted-foreground">
                Se quitará la dependencia de las {preguntas.length} preguntas del bloque.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
          <Button
            disabled={dependencia.isPending || isLoading || (!tocado && !vigente)}
            onClick={aplicar}
          >
            {dependencia.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Aplicar a todo el bloque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
