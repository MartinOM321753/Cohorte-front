import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, Send,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeErrorApi } from '@/lib/apiErrors'
import { cn } from '@/lib/utils'
import {
  enviarMiCuestionario, getAvance, getBloqueParticipante, getFaltantesParticipante,
  type PreguntaParticipante,
} from '../api/misCuestionarios.api'
import { useAutoguardado } from '../hooks/useAutoguardado'
import { AyudaPregunta } from './AyudaPregunta'
import { IndicadorGuardado } from './IndicadorGuardado'
import { EscalaPreguntas, type RenglonEscala } from './EscalaPreguntas'
import {
  calcularBloqueadas, calcularHabilitadas, renglonesConAlgoQueContestar,
} from '../dominio/habilitacion'
import { RejillaPreguntas, type CeldaRejilla } from './RejillaPreguntas'

/**
 * El cuestionario tal como lo contesta el participante.
 *
 * <h3>No hay botón de guardar</h3>
 *
 * A propósito. Un botón de guardar invita a pensar que lo no guardado se pierde, y con
 * doscientas preguntas por delante eso es lo contrario de lo que queremos que sienta. Cada
 * respuesta se guarda sola en el dispositivo en cuanto se toca, y el indicador dice en qué
 * estado está. El único botón del final es «terminar», que es otra cosa: cerrar el
 * cuestionario.
 *
 * <h3>Se pinta un bloque a la vez</h3>
 *
 * El instrumento puede tener más de cien bloques y miles de preguntas. Además de que el
 * navegador no lo soportaría de una vez, contestar una lista interminable en un teléfono
 * es desmoralizante: por bloques hay avance visible y un sitio al que volver.
 */
interface Props {
  idCuestionario: number
  nombre: string
  onSalir: () => void
}

export function FormularioParticipante({ idCuestionario, nombre, onSalir }: Props) {
  const qc = useQueryClient()
  const [idBloque, setIdBloque] = useState<number | null>(null)

  const { estado, invalidos, avisos, registrar, guardarYa, sincronizarSecuencia } =
    useAutoguardado(idCuestionario)

  const { data: bloques = [], isLoading: cargandoAvance } = useQuery({
    queryKey: ['mis-cuestionarios', idCuestionario, 'avance'],
    queryFn: () => getAvance(idCuestionario),
  })

  useEffect(() => {
    if (idBloque == null && bloques.length > 0) setIdBloque(bloques[0].idBloque)
  }, [bloques, idBloque])

  const { data: bloque, isLoading: cargandoBloque } = useQuery({
    queryKey: ['mis-cuestionarios', idCuestionario, 'bloque', idBloque],
    queryFn: () => getBloqueParticipante(idCuestionario, idBloque as number),
    enabled: idBloque != null,
  })

  /** Lo que se ve en los campos. Arranca de lo que trae el servidor. */
  const [valores, setValores] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!bloque) return
    const mapa: Record<number, string> = {}
    for (const p of bloque.preguntas) mapa[p.id] = ''
    for (const r of bloque.respuestas) mapa[r.idVariable] = r.valor
    setValores(mapa)
    // El contador local tiene que quedar por encima de lo que el servidor ya guardo, o
    // retomar el cuestionario en otro dispositivo haria que rechazara todos los cambios.
    sincronizarSecuencia(bloque.respuestas.map((r) => r.secuencia))
  }, [bloque, sincronizarSecuencia])

  /**
   * Qué se le pregunta, con lo que lleva escrito en la pantalla.
   *
   * El servidor manda su propia lista y se usa para las llaves que viven en otro
   * bloque, pero no puede ser la única: la calcula con lo que hay guardado, así que
   * hasta hoy había que guardar y cambiar de bloque para que una pregunta se
   * habilitara. Ver `dominio/habilitacion.ts`.
   */
  const habilitadas = useMemo(
    () => calcularHabilitadas(
      bloque?.preguntas ?? [], valores, bloque?.preguntasHabilitadas ?? []),
    [bloque, valores],
  )

  /**
   * Los descartes que ahora mismo no se pueden marcar porque ya hay algo marcado de
   * lo que descartan. Es la otra mitad del candado; el porqué está en el dominio.
   */
  const bloqueadas = useMemo(
    () => calcularBloqueadas(bloque?.preguntas ?? [], valores),
    [bloque, valores],
  )

  /**
   * Las celdas de la rejilla y lo que va suelto debajo.
   *
   * Un renglón con algo por contestar se pinta entero, con sus celdas apagadas donde
   * la llave las dejó fuera; un renglón donde no queda nada no se pinta. El porqué de
   * esa diferencia está en `renglonesConAlgoQueContestar`.
   */
  const { celdas, sueltas } = useMemo(() => {
    const preguntas = bloque?.preguntas ?? []
    const enRejilla = bloque?.presentacion === 'MATRIZ'
    const esCelda = (p: PreguntaParticipante) =>
      enRejilla && !!p.filaMatriz && !!p.columnaMatriz

    const todas = preguntas.filter(esCelda)
    const vivos = renglonesConAlgoQueContestar(
      todas.map((p) => ({ id: p.id, fila: p.filaMatriz as string })), habilitadas)

    return {
      celdas: todas
        .filter((p) => vivos.has(p.filaMatriz as string))
        .map((p): CeldaRejilla => ({
          id: p.id,
          fila: p.filaMatriz as string,
          columna: p.columnaMatriz as string,
          tipo: p.tipo,
          opciones: p.opciones,
          deshabilitada: !habilitadas.has(p.id) || bloqueadas.has(p.id),
        })),
      sueltas: preguntas.filter((p) => !esCelda(p)),
    }
  }, [bloque, habilitadas, bloqueadas])

  /**
   * La otra tabla: un renglon por pregunta, una columna por respuesta.
   *
   * Es la forma mas comun del cuestionario y la que mas se agradece en pantalla:
   * veintidos alimentos con sus diez frecuencias, en lista, son doscientas veinte
   * opciones una debajo de otra.
   */
  const { columnas, renglones, sueltasDeEscala } = useMemo(() => {
    const preguntas = sueltas
    if (bloque?.presentacion !== 'ESCALA') {
      return { columnas: [], renglones: [] as RenglonEscala[], sueltasDeEscala: preguntas }
    }
    const cols = preguntas.find(
      (p) => p.tipo === 'OPCION_UNICA' && p.opciones.length >= 2)?.opciones ?? []
    const encaja = (p: PreguntaParticipante) =>
      p.tipo === 'OPCION_UNICA' && p.opciones.length === cols.length
      && p.opciones.every((o, i) => o.codigo === cols[i].codigo)
      && habilitadas.has(p.id)

    return {
      columnas: cols,
      renglones: preguntas.filter(encaja).map((p): RenglonEscala => ({
        id: p.id,
        texto: p.pregunta ?? p.codigo,
      })),
      sueltasDeEscala: preguntas.filter((p) => !encaja(p)),
    }
  }, [bloque, sueltas, habilitadas])

  /**
   * Los avisos del servidor, por pregunta.
   *
   * Van pegados a la pregunta y no en una lista aparte a proposito: un aviso lejos de
   * lo que hay que corregir obliga a buscarlo, y buscar es justo lo que no queremos
   * pedirle a quien esta contestando cuarenta minutos de cuestionario.
   */
  const avisoDe = useMemo(() => {
    const mapa: Record<number, { mensaje: string; impideEnviar: boolean }> = {}
    for (const a of avisos) {
      if (a.idPregunta != null) {
        mapa[a.idPregunta] = { mensaje: a.mensaje, impideEnviar: a.impideEnviar }
      }
    }
    return mapa
  }, [avisos])

  /** Cuantos avisos le impiden terminar. Los demas solo se senalan. */
  const bloquean = useMemo(() => avisos.filter((a) => a.impideEnviar).length, [avisos])

  const cambiar = useCallback((id: number, valor: string) => {
    setValores((previos) => ({ ...previos, [id]: valor }))
    registrar(id, valor)
  }, [registrar])

  const enviar = useMutation({
    mutationFn: async () => {
      // Primero se vacía la cola: enviar el cuestionario con cambios sin subir lo cerraría
      // sin las últimas respuestas, y el participante no tendría forma de saberlo.
      await guardarYa()
      const faltan = await getFaltantesParticipante(idCuestionario)
      if (faltan.total > 0) {
        throw new Error(`Faltan ${faltan.total} respuesta(s) obligatoria(s) por contestar.`)
      }
      return enviarMiCuestionario(idCuestionario)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-cuestionarios'] })
      toast.success('Cuestionario enviado. Gracias por su participación.')
      onSalir()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : mensajeErrorApi(e, 'No se pudo enviar')),
  })

  const indice = bloques.findIndex((b) => b.idBloque === idBloque)
  const totalAplicables = bloques.reduce((s, b) => s + b.aplicables, 0)
  const totalRespondidas = bloques.reduce((s, b) => s + b.respondidas, 0)
  const porcentaje = totalAplicables === 0
    ? 0 : Math.round((totalRespondidas / totalAplicables) * 100)

  /** Al cambiar de bloque se vacía la cola y se recalcula el avance. */
  const irABloque = useCallback(async (id: number) => {
    await guardarYa()
    qc.invalidateQueries({ queryKey: ['mis-cuestionarios', idCuestionario, 'avance'] })
    setIdBloque(id)
  }, [guardarYa, qc, idCuestionario])

  if (cargandoAvance) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={onSalir}>
                <ArrowLeft className="mr-1.5 size-4" />
                Mis cuestionarios
              </Button>
              <CardTitle className="text-base">{nombre}</CardTitle>
            </div>
            <IndicadorGuardado estado={estado} onReintentar={() => void guardarYa()} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalRespondidas} de {totalAplicables} preguntas contestadas</span>
              <span>{porcentaje}%</span>
            </div>
            <Progress value={porcentaje} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Secciones</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[min(50vh,420px)]">
              <div className="space-y-0.5 pr-2">
                {bloques.map((b, i) => {
                  const completo = b.aplicables > 0 && b.respondidas >= b.aplicables
                  return (
                    <button
                      key={b.idBloque}
                      type="button"
                      onClick={() => void irABloque(b.idBloque)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                        b.idBloque === idBloque ? 'bg-accent font-medium' : 'hover:bg-accent/50',
                      )}
                    >
                      <span className="truncate">
                        <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                        {b.nombre}
                      </span>
                      {completo
                        ? <Check className="size-3.5 shrink-0 text-emerald-600" />
                        : (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {b.respondidas}/{b.aplicables}
                          </span>
                        )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {cargandoBloque || !bloque ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {bloque.titulo ?? bloque.nombre}
                </CardTitle>
                {bloque.descripcion && (
                  <p className="text-sm text-muted-foreground">{bloque.descripcion}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Un bloque que en el papel es una tabla se pinta como tabla: la 112
                    son quince actividades por nueve columnas, y en fila india el
                    participante deja de reconocer su propio cuestionario. */}
                {celdas.length > 0 && (
                  <RejillaPreguntas
                    celdas={celdas}
                    valores={valores}
                    onChange={(id, v) => cambiar(id, v)}
                  />
                )}

                {renglones.length > 0 && (
                  <EscalaPreguntas
                    opciones={columnas}
                    renglones={renglones}
                    valores={valores}
                    onChange={(id, v) => cambiar(id, v)}
                  />
                )}

                {sueltasDeEscala
                  // Las que su pregunta llave dejo fuera no se muestran. Mostrarlas
                  // atenuadas tendria sentido para el personal, que cotejea contra el
                  // papel; al participante solo le darian preguntas que no le toca
                  // contestar.
                  .filter((p) => p.tipo !== 'GRUPO' && habilitadas.has(p.id))
                  .map((p) => (
                    <Pregunta
                      key={p.id}
                      pregunta={p}
                      valor={valores[p.id] ?? ''}
                      problema={invalidos[p.id]}
                      aviso={avisoDe[p.id]}
                      onChange={(v) => cambiar(p.id, v)}
                    />
                  ))}

                {bloque.preguntas.filter((p) => p.tipo === 'GRUPO').length > 0
                  && bloque.preguntas.every((p) => p.tipo === 'GRUPO' || !habilitadas.has(p.id)) && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    En esta sección no hay nada que contestar según sus respuestas anteriores.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              disabled={indice <= 0}
              onClick={() => void irABloque(bloques[indice - 1].idBloque)}
            >
              <ChevronLeft className="mr-1.5 size-4" />
              Anterior
            </Button>

            {indice >= 0 && indice + 1 < bloques.length ? (
              <Button onClick={() => void irABloque(bloques[indice + 1].idBloque)}>
                Siguiente
                <ChevronRight className="ml-1.5 size-4" />
              </Button>
            ) : (
              <Button
                disabled={enviar.isPending || bloquean > 0}
                onClick={() => enviar.mutate()}
              >
                <Send className="mr-1.5 size-4" />
                Terminar y enviar
              </Button>
            )}
          </div>

          {/* Es mejor que el boton se vea apagado con el motivo al lado que dejarlo
              pulsar y responder con un error: lo primero se entiende, lo segundo
              parece que algo se rompio. */}
          {bloquean > 0 && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Antes de enviarlo hay que revisar{' '}
                {bloquean === 1 ? 'una respuesta' : `${bloquean} respuestas`}. Están
                señaladas en amarillo en su sección.
              </span>
            </p>
          )}

          {indice >= 0 && indice + 1 >= bloques.length && (
            <p className="text-center text-xs text-muted-foreground">
              Al enviarlo ya no podrá cambiar sus respuestas. Puede dejarlo a medias y volver
              después: lo que ha contestado queda guardado.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Una pregunta ────────────────────────────────────────────────────────────

function Pregunta({ pregunta, valor, problema, aviso, onChange }: {
  pregunta: PreguntaParticipante
  valor: string
  problema?: string
  /** Lo que el servidor advierte de esta respuesta. No impide guardar. */
  aviso?: { mensaje: string; impideEnviar: boolean }
  onChange: (valor: string) => void
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        problema && 'border-destructive',
        !problema && aviso && (aviso.impideEnviar
          ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-amber-300/70'),
      )}
    >
      <Label className="text-sm font-medium">
        {pregunta.pregunta ?? pregunta.codigo}
        {pregunta.obligatoria && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {pregunta.unidad && (
        <p className="mt-0.5 text-xs text-muted-foreground">En {pregunta.unidad}</p>
      )}

      <AyudaPregunta
        instruccion={pregunta.instruccion}
        figura={pregunta.figura}
        className="mt-2"
      />

      <div className="mt-3">
        <Control pregunta={pregunta} valor={valor} onChange={onChange} />
      </div>

      {problema && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {problema}
        </p>
      )}

      {!problema && aviso && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {aviso.mensaje}
            {aviso.impideEnviar && (
              <span className="mt-0.5 block text-muted-foreground">
                Hay que resolverlo antes de poder enviar el cuestionario.
              </span>
            )}
          </span>
        </p>
      )}
    </div>
  )
}

function Control({ pregunta, valor, onChange }: {
  pregunta: PreguntaParticipante
  valor: string
  onChange: (valor: string) => void
}) {
  switch (pregunta.tipo) {
    case 'CASILLA':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`p-${pregunta.id}`}
            checked={valor !== '' && valor !== '0'}
            onCheckedChange={(m) => onChange(m ? (pregunta.opciones[0]?.codigo ?? '1') : '')}
          />
          <Label htmlFor={`p-${pregunta.id}`} className="cursor-pointer text-sm font-normal">
            {pregunta.opciones[0]?.etiqueta ?? 'Sí'}
          </Label>
        </div>
      )

    case 'OPCION_UNICA':
    case 'OPCION_MULTIPLE':
      if (pregunta.opciones.length === 0) {
        return <Input value={valor} onChange={(e) => onChange(e.target.value)} />
      }
      return (
        <RadioGroup
          value={valor}
          // Volver a pulsar la opcion elegida la quita: en una pregunta no obligatoria,
          // una respuesta puesta por error tiene que poder deshacerse.
          onValueChange={(v) => onChange(v === valor ? '' : v)}
          className="gap-2.5"
        >
          {pregunta.opciones.map((o) => (
            <div key={o.codigo} className="flex items-start gap-2">
              <RadioGroupItem value={o.codigo} id={`o-${pregunta.id}-${o.codigo}`} className="mt-0.5" />
              <Label
                htmlFor={`o-${pregunta.id}-${o.codigo}`}
                className="cursor-pointer text-sm font-normal"
              >
                {o.etiqueta}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )

    case 'NUMERO':
    case 'NUMERO_CON_ESCAPE':
      return (
        <div className="space-y-2">
          <Input
            type="number"
            inputMode="numeric"
            value={valor}
            min={pregunta.valorMin ?? undefined}
            max={pregunta.valorMax ?? undefined}
            onChange={(e) => onChange(e.target.value)}
          />
          {pregunta.opciones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pregunta.opciones.map((o) => (
                <button
                  key={o.codigo}
                  type="button"
                  onClick={() => onChange(valor === o.codigo ? '' : o.codigo)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs transition-colors',
                    valor === o.codigo
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                >
                  {o.etiqueta}
                </button>
              ))}
            </div>
          )}
        </div>
      )

    case 'FECHA':
      return <Input type="date" value={valor} onChange={(e) => onChange(e.target.value)} />

    case 'TEXTO':
    default:
      return (
        <Input
          value={valor}
          maxLength={pregunta.longitudMax ?? undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}
