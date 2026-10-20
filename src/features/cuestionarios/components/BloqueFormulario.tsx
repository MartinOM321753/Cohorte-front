import { useEffect, useMemo, useState } from 'react'
import { Loader2, RotateCcw, Save } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CampoPregunta } from './CampoPregunta'
import { EscalaPreguntas, type RenglonEscala } from './EscalaPreguntas'
import { calcularBloqueadas, calcularHabilitadas } from '../dominio/habilitacion'
import { RejillaPreguntas, type CeldaRejilla } from './RejillaPreguntas'
import { useBloqueLleno, useGuardarBloque } from '../hooks/useCuestionarios'
import type { MarcaAusencia } from '../api/cuestionarios.types'

/**
 * Un bloque del cuestionario, para contestar.
 *
 * <h3>El estado vive aquí, no en un formulario con esquema</h3>
 *
 * No hay react-hook-form ni un zod sobre todos los campos. En estudios eso funciona
 * porque un tipo tiene decenas de parámetros; aquí el instrumento pasa de dos mil
 * preguntas y un esquema construido al vuelo sobre todas ellas se rearma en cada
 * pulsación. Lo que hay es un mapa de `idVariable → texto`, y la validación la hace el
 * servidor, que es donde están las reglas de verdad.
 *
 * <h3>Se guarda el bloque completo</h3>
 *
 * Lo que no va en la lista, el servidor lo borra. Por eso se mandan también las
 * preguntas vacías: es lo que permite que desmarcar una casilla tenga efecto. Las
 * deshabilitadas por su pregunta llave no se mandan —no se preguntaron— y tampoco se
 * pintan como contestables.
 *
 * <h3>Los bloques que en el papel son una tabla se pintan como tabla</h3>
 *
 * Cuando el bloque viene marcado como rejilla, sus celdas van a {@link RejillaPreguntas}
 * y lo que no es una celda —el «Ninguna» y el «Otro, especifique» de la 112— se pinta
 * debajo, como siempre. Lo que se guarda es lo mismo: una respuesta por pregunta.
 */
interface Props {
  idCuestionario: number
  idBloque: number
  soloLectura?: boolean
}

export function BloqueFormulario({ idCuestionario, idBloque, soloLectura }: Props) {
  const { data: bloque, isLoading } = useBloqueLleno(idCuestionario, idBloque)
  const guardar = useGuardarBloque(idCuestionario)

  /** Lo que el usuario lleva escrito, por pregunta. */
  const [valores, setValores] = useState<Record<number, string>>({})

  /** Lo que venía del servidor, para saber si hay cambios sin guardar. */
  const originales = useMemo(() => {
    const mapa: Record<number, string> = {}
    if (!bloque) return mapa
    for (const v of bloque.variables) mapa[v.id] = ''
    for (const r of bloque.respuestas) mapa[r.idVariable] = valorDe(r)
    return mapa
  }, [bloque])

  const marcas = useMemo(() => {
    const mapa: Record<number, MarcaAusencia> = {}
    for (const r of bloque?.respuestas ?? []) mapa[r.idVariable] = r.marcaAusencia
    return mapa
  }, [bloque])

  const detalles = useMemo(() => {
    const mapa: Record<number, { celda: string | null; crudo: string | null }> = {}
    for (const r of bloque?.respuestas ?? []) {
      mapa[r.idVariable] = { celda: r.celdaOrigen, crudo: r.valorCrudo }
    }
    return mapa
  }, [bloque])

  // Al cambiar de bloque hay que partir de lo que el servidor trae, no de lo que el
  // usuario escribió en el bloque anterior.
  useEffect(() => setValores(originales), [originales])

  /**
   * Lo mismo que en el formulario del participante, y aquí hacía más falta: al guardar
   * se mandan solo las habilitadas, así que con la lista vieja lo que el capturista
   * acababa de habilitar no se guardaba hasta la pasada siguiente.
   */
  const habilitadas = useMemo(
    () => calcularHabilitadas(
      bloque?.variables ?? [], valores, bloque?.variablesHabilitadas ?? []),
    [bloque, valores],
  )

  const bloqueadas = useMemo(
    () => calcularBloqueadas(bloque?.variables ?? [], valores),
    [bloque, valores],
  )

  const hayCambios = useMemo(
    () => Object.keys(originales).some((id) => (valores[+id] ?? '') !== originales[+id]),
    [valores, originales],
  )

  const pendientes = useMemo(
    () => Object.values(marcas).filter((m) => m === 'NO_AUTORIZADO' || m === 'ERROR_LECTURA').length,
    [marcas],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    )
  }
  if (!bloque) return null

  function alGuardar() {
    const respuestas = bloque!.variables
      .filter((v) => v.tipo !== 'GRUPO' && habilitadas.has(v.id))
      .map((v) => ({ idVariable: v.id, valor: valores[v.id] ?? '' }))
    guardar.mutate({ idBloque, respuestas })
  }

  const contestables = bloque.variables.filter((v) => v.tipo !== 'GRUPO')
  const sinPreguntar = contestables.filter((v) => !habilitadas.has(v.id)).length

  const enRejilla = bloque.seccion.presentacion === 'MATRIZ'
  const esCelda = (v: { filaMatriz: string | null; columnaMatriz: string | null }) =>
    enRejilla && !!v.filaMatriz && !!v.columnaMatriz

  const celdas: CeldaRejilla[] = bloque.variables.filter(esCelda).map((v) => ({
    id: v.id,
    fila: v.filaMatriz as string,
    columna: v.columnaMatriz as string,
    tipo: v.tipo,
    opciones: v.opciones,
    deshabilitada: !habilitadas.has(v.id) || bloqueadas.has(v.id),
    aviso: avisoDe(marcas[v.id] ?? 'NINGUNA'),
  }))
  const sueltas = bloque.variables.filter((v) => !esCelda(v))

  // La otra tabla: un renglon por pregunta y una columna por opcion. Las columnas
  // salen del catalogo de la primera pregunta que las tenga, que es el que todas
  // comparten; lo que no encaje se pinta debajo como siempre.
  const enEscala = bloque.seccion.presentacion === 'ESCALA'
  const columnas = enEscala
    ? (bloque.variables.find((v) => v.tipo === 'OPCION_UNICA' && v.opciones.length >= 2)
        ?.opciones ?? [])
    : []
  const mismasOpciones = (v: { tipo: string; opciones: Array<{ codigo: string }> }) =>
    v.tipo === 'OPCION_UNICA' && v.opciones.length === columnas.length
    && v.opciones.every((o, i) => o.codigo === columnas[i].codigo)

  const renglones: RenglonEscala[] = enEscala
    ? bloque.variables.filter(mismasOpciones).map((v) => ({
      id: v.id,
      texto: v.pregunta ?? v.codigo,
      deshabilitado: soloLectura || !habilitadas.has(v.id),
      aviso: avisoDe(marcas[v.id] ?? 'NINGUNA'),
    }))
    : []
  const fueraDeEscala = enEscala
    ? bloque.variables.filter((v) => !mismasOpciones(v))
    : sueltas

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {bloque.seccion.titulo ?? bloque.seccion.nombre}
              {bloque.seccion.titulo && (
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  {bloque.seccion.nombre}
                </span>
              )}
            </CardTitle>
            {bloque.seccion.descripcion && (
              <p className="mt-1 text-sm text-muted-foreground">{bloque.seccion.descripcion}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {bloque.seccion.pagina != null && (
              <Badge variant="outline">Página {bloque.seccion.pagina} del papel</Badge>
            )}
            <Badge variant="secondary">{contestables.length} preguntas</Badge>
            {pendientes > 0 && (
              <Badge className="bg-amber-500 text-amber-50 hover:bg-amber-500">
                {pendientes} sin leer
              </Badge>
            )}
            {sinPreguntar > 0 && (
              <Badge variant="outline">{sinPreguntar} no se preguntan</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {celdas.length > 0 && (
          <RejillaPreguntas
            celdas={celdas}
            valores={valores}
            soloLectura={soloLectura}
            onChange={(id, valor) => setValores((previos) => ({ ...previos, [id]: valor }))}
          />
        )}

        {renglones.length > 0 && (
          <EscalaPreguntas
            opciones={columnas}
            renglones={renglones}
            valores={valores}
            soloLectura={soloLectura}
            onChange={(id, valor) => setValores((previos) => ({ ...previos, [id]: valor }))}
          />
        )}

        {fueraDeEscala.map((variable) => (
          <CampoPregunta
            key={variable.id}
            variable={variable}
            valor={valores[variable.id] ?? ''}
            marca={marcas[variable.id] ?? 'NINGUNA'}
            celdaOrigen={detalles[variable.id]?.celda}
            valorCrudo={detalles[variable.id]?.crudo}
            deshabilitado={soloLectura || !habilitadas.has(variable.id)}
            onChange={(valor) => setValores((previos) => ({ ...previos, [variable.id]: valor }))}
          />
        ))}

        {!soloLectura && (
          <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur">
            <span className="text-xs text-muted-foreground">
              {hayCambios ? 'Hay cambios sin guardar' : 'Todo guardado'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hayCambios || guardar.isPending}
                onClick={() => setValores(originales)}
              >
                <RotateCcw className="mr-1.5 size-4" />
                Descartar
              </Button>
              <Button size="sm" disabled={!hayCambios || guardar.isPending} onClick={alGuardar}>
                {guardar.isPending
                  ? <Loader2 className="mr-1.5 size-4 animate-spin" />
                  : <Save className="mr-1.5 size-4" />}
                Guardar bloque
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Lo que hay que advertir de una celda de la rejilla, o null si no hay nada.
 *
 * Solo las dos marcas que significan «el dato está en el papel y nadie lo ha
 * tecleado». Las otras tres son respuestas legítimas del participante —no marcó, la
 * región vino en blanco, cero marcas— y señalarlas llenaría la tabla de amarillo sin
 * decir nada: en una rejilla de ciento treinta y cinco casillas, casi todas están sin
 * marcar y eso es lo normal.
 */
function avisoDe(marca: MarcaAusencia): string | null {
  if (marca === 'NO_AUTORIZADO') {
    return 'El reconocimiento de escritura no estaba licenciado: el dato esta en el papel, sin leer'
  }
  if (marca === 'ERROR_LECTURA') return 'Error de lectura de la region'
  return null
}

/**
 * El texto que le corresponde a una respuesta en el formulario.
 *
 * Una celda con marca de ausencia se muestra vacía: su valor no es un dato del
 * participante, y ponerlo en el campo lo convertiría en uno en cuanto alguien guardara el
 * bloque sin tocarla.
 */
function valorDe(r: {
  marcaAusencia: MarcaAusencia
  valorCodigo: string | null
  valorNumerico: number | null
  valorTexto: string | null
  valorFecha: string | null
}): string {
  if (r.marcaAusencia !== 'NINGUNA') return ''
  if (r.valorCodigo != null) return r.valorCodigo
  if (r.valorNumerico != null) return String(r.valorNumerico)
  if (r.valorFecha != null) return r.valorFecha
  return r.valorTexto ?? ''
}
