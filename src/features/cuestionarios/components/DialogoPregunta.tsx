import { useState } from 'react'
import { GripVertical, Loader2, Plus, Trash2, X } from 'lucide-react'

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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActualizarPregunta, useCrearPregunta, useEliminarPregunta } from '../hooks/useCuestionarios'
import {
  OPERADOR_ETIQUETAS, TIPOS_CON_OPCIONES, TIPO_VARIABLE_ETIQUETAS,
} from '../api/cuestionarios.types'
import type {
  BloqueCuestionario, OperadorDependencia, TipoVariable, VariableCuestionario, VariableRequest,
} from '../api/cuestionarios.types'

/**
 * La ficha de una pregunta: su enunciado, su tipo, sus opciones, su rango y su ayuda.
 *
 * <h3>Por qué hace falta aunque el catálogo se cargue de un archivo</h3>
 *
 * El catálogo entra por la plantilla de los investigadores, y eso seguirá siendo la
 * forma de cargar dos mil preguntas de una vez. Pero corregir **una** —el enunciado con
 * una errata, un rango que quedó al revés, una instrucción que falta, una opción mal
 * redactada— por la plantilla significa rehacer el archivo, volver a cargarlo entero y
 * esperar a que alguien pueda hacerlo. En la práctica eso convierte cada corrección en
 * una petición a otra persona, y las correcciones que dependen de otra persona no se
 * hacen: se quedan como «ya sabemos que dice mal».
 *
 * <h3>Lo que esta pantalla no decide</h3>
 *
 * Los límites de verdad están en el servidor y no se pueden rodear desde aquí: no deja
 * renombrar el código de una pregunta que ya tiene respuestas —las respuestas guardadas
 * se identifican por él— ni quitar una opción que alguien ya marcó. Esta pantalla no
 * repite esas comprobaciones: enseña el motivo que el servidor devuelve. Repetirlas aquí
 * daría dos verdades que se separarían con el tiempo.
 *
 * <h3>El salto se pone aquí para una pregunta y en el bloque para todas</h3>
 *
 * Los «pase a la 25» del papel suelen apagar un bloque entero, y para eso está el
 * diálogo del bloque. Aquí se pone el de una pregunta suelta, que es el otro caso real.
 */
interface Props {
  idTipo: number
  /** Null para crear. */
  pregunta: VariableCuestionario | null
  bloques: BloqueCuestionario[]
  puedeEliminar: boolean
  onCerrar: () => void
}

interface OpcionEnEdicion {
  codigo: string
  etiqueta: string
  esEscape: boolean
}

const SIN_BLOQUE = 'ninguno'

export function DialogoPregunta({ idTipo, pregunta, bloques, puedeEliminar, onCerrar }: Props) {
  const crear = useCrearPregunta(idTipo)
  const actualizar = useActualizarPregunta(idTipo)
  const eliminar = useEliminarPregunta(idTipo)
  const esNueva = pregunta == null

  const [codigo, setCodigo] = useState(pregunta?.codigo ?? '')
  const [columnaVolcado, setColumnaVolcado] = useState(pregunta?.columnaVolcado ?? '')
  const [enunciado, setEnunciado] = useState(pregunta?.pregunta ?? '')
  const [tipo, setTipo] = useState<TipoVariable>(pregunta?.tipo ?? 'OPCION_UNICA')
  const [idSeccion, setIdSeccion] = useState<string>(
    pregunta?.idSeccion != null ? String(pregunta.idSeccion) : SIN_BLOQUE)
  const [paginaPapel, setPaginaPapel] = useState(
    pregunta?.pagina != null ? String(pregunta.pagina) : '')
  const [grupoMultiple, setGrupoMultiple] = useState(pregunta?.grupoMultiple ?? '')

  const [valorMin, setValorMin] = useState(
    pregunta?.valorMin != null ? String(pregunta.valorMin) : '')
  const [valorMax, setValorMax] = useState(
    pregunta?.valorMax != null ? String(pregunta.valorMax) : '')
  const [unidad, setUnidad] = useState(pregunta?.unidad ?? '')
  const [longitudMax, setLongitudMax] = useState(
    pregunta?.longitudMax != null ? String(pregunta.longitudMax) : '')

  const [instruccion, setInstruccion] = useState(pregunta?.instruccion ?? '')
  const [figura, setFigura] = useState(pregunta?.figura ?? '')

  const [dependeDe, setDependeDe] = useState(pregunta?.dependeDe ?? '')
  const [operador, setOperador] = useState<OperadorDependencia>(
    pregunta?.operadorDependencia ?? 'IGUAL')
  const [valorHabilitante, setValorHabilitante] = useState(pregunta?.valorHabilitante ?? '')

  const [filaMatriz, setFilaMatriz] = useState(pregunta?.filaMatriz ?? '')
  const [columnaMatriz, setColumnaMatriz] = useState(pregunta?.columnaMatriz ?? '')
  const [observaciones, setObservaciones] = useState(pregunta?.observaciones ?? '')

  const [obligatoria, setObligatoria] = useState(pregunta?.obligatoria ?? false)
  const [activa, setActiva] = useState(pregunta?.activa ?? true)

  const [opciones, setOpciones] = useState<OpcionEnEdicion[]>(
    (pregunta?.opciones ?? []).map((o) => ({
      codigo: o.codigo, etiqueta: o.etiqueta, esEscape: o.esEscape,
    })))

  const conOpciones = TIPOS_CON_OPCIONES.includes(tipo)
  const numerica = tipo === 'NUMERO' || tipo === 'NUMERO_CON_ESCAPE'
  const trabajando = crear.isPending || actualizar.isPending || eliminar.isPending

  const limpias = opciones
    .map((o) => ({ ...o, codigo: o.codigo.trim(), etiqueta: o.etiqueta.trim() }))
    .filter((o) => o.codigo !== '' || o.etiqueta !== '')
  const opcionSinCodigo = limpias.some((o) => o.codigo === '')
  const rangoAlReves = valorMin !== '' && valorMax !== ''
    && Number(valorMin) > Number(valorMax)

  const impideGuardar = codigo.trim() === '' ? 'La pregunta necesita un código.'
    : opcionSinCodigo ? 'Cada opción necesita su código: es el valor que se guarda.'
      : rangoAlReves ? 'El mínimo del rango es mayor que el máximo.'
        : null

  function numeroODejar(texto: string): number | null {
    const t = texto.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  function textoODejar(texto: string): string | null {
    const t = texto.trim()
    return t === '' ? null : t
  }

  function armar(): VariableRequest {
    return {
      codigo: codigo.trim(),
      columnaVolcado: textoODejar(columnaVolcado),
      pregunta: textoODejar(enunciado),
      tipo,
      idSeccion: idSeccion === SIN_BLOQUE ? null : Number(idSeccion),
      pagina: numeroODejar(paginaPapel),
      grupoMultiple: textoODejar(grupoMultiple),
      dependeDe: textoODejar(dependeDe),
      // Sin pregunta llave no hay valor que habilite: dejarlo escrito haría creer que
      // la regla está puesta cuando no hay nada que comparar.
      valorHabilitante: dependeDe.trim() === '' ? null : textoODejar(valorHabilitante),
      operadorDependencia: operador,
      filaMatriz: textoODejar(filaMatriz),
      columnaMatriz: textoODejar(columnaMatriz),
      obligatoria,
      activa,
      // «Documentada» significa que el catálogo dice qué pregunta es. Quien escribe el
      // enunciado aquí la está documentando, así que se deduce del texto en lugar de
      // dejarle una casilla que haría decir dos cosas distintas al mismo dato.
      documentada: enunciado.trim() !== '',
      valorMin: numerica ? numeroODejar(valorMin) : null,
      valorMax: numerica ? numeroODejar(valorMax) : null,
      longitudMax: tipo === 'TEXTO' ? numeroODejar(longitudMax) : null,
      unidad: numerica ? textoODejar(unidad) : null,
      observaciones: textoODejar(observaciones),
      instruccion: textoODejar(instruccion),
      figura: textoODejar(figura),
      // Cuando el tipo no se contesta con lista, las opciones NO se mandan vacías: se
      // omiten. Mandar una lista vacía las borraría, y un tipo mal elegido por un
      // momento se llevaría por delante el catálogo de respuestas de la pregunta.
      opciones: conOpciones
        ? limpias.map((o) => ({ codigo: o.codigo, etiqueta: o.etiqueta, esEscape: o.esEscape }))
        : undefined,
    }
  }

  function guardar() {
    if (impideGuardar) return
    const datos = armar()
    if (esNueva) {
      crear.mutate(datos, { onSuccess: onCerrar })
    } else {
      actualizar.mutate({ id: pregunta!.id, datos }, { onSuccess: onCerrar })
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onCerrar() }}>
      <DialogContent className="@container max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {esNueva ? 'Nueva pregunta' : pregunta!.codigo}
            {!esNueva && pregunta!.nombreSeccion && (
              <Badge variant="secondary" className="font-normal">
                {pregunta!.nombreSeccion}
              </Badge>
            )}
            {!esNueva && !pregunta!.activa && (
              <Badge variant="outline">retirada de uso</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Lo que vale para esta pregunta. Lo que vale para todo el bloque —el salto del
            papel, la rejilla— se pone en el bloque.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Identidad ──────────────────────────────────────────────────── */}
          <section className="grid gap-4 @sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                className="font-mono"
                placeholder="P112_1"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Con el que se piden los datos. Si ya tiene respuestas guardadas, el
                servidor no deja cambiarlo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="columna">Columna en el volcado</Label>
              <Input
                id="columna"
                className="font-mono"
                placeholder="P112_1"
                value={columnaVolcado}
                onChange={(e) => setColumnaVolcado(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                El encabezado con el que Remark la manda. Vacío si no viene del escáner.
              </p>
            </div>

            <div className="space-y-1.5 @sm:col-span-2">
              <Label htmlFor="enunciado">La pregunta, como está en el papel</Label>
              <Textarea
                id="enunciado"
                rows={3}
                placeholder="¿Alguna vez un médico le dijo que tenía…?"
                value={enunciado}
                onChange={(e) => setEnunciado(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bloque">Bloque</Label>
              <Select value={idSeccion} onValueChange={setIdSeccion}>
                <SelectTrigger id="bloque">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_BLOQUE}>Sin bloque</SelectItem>
                  {bloques.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pagina">Página del papel</Label>
              <Input
                id="pagina"
                inputMode="numeric"
                placeholder="23"
                value={paginaPapel}
                onChange={(e) => setPaginaPapel(e.target.value)}
              />
            </div>
          </section>

          {/* ── Cómo se contesta ───────────────────────────────────────────── */}
          <section className="space-y-4 rounded-lg border p-3">
            <div className="grid gap-4 @sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tipo">Cómo se contesta</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoVariable)}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_VARIABLE_ETIQUETAS) as TipoVariable[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_VARIABLE_ETIQUETAS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(tipo === 'OPCION_MULTIPLE' || tipo === 'CASILLA') && (
                <div className="space-y-1.5">
                  <Label htmlFor="grupo">Grupo de casillas</Label>
                  <Input
                    id="grupo"
                    placeholder="P112"
                    value={grupoMultiple}
                    onChange={(e) => setGrupoMultiple(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Las casillas con el mismo grupo se pueden marcar a la vez.
                  </p>
                </div>
              )}

              {numerica && (
                <>
                  <div className="space-y-1.5">
                    <Label>Rango que admite</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        inputMode="decimal" placeholder="mínimo"
                        value={valorMin} onChange={(e) => setValorMin(e.target.value)}
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        inputMode="decimal" placeholder="máximo"
                        value={valorMax} onChange={(e) => setValorMax(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fuera del rango no se descarta la respuesta: se señala para revisar.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unidad">Unidad</Label>
                    <Input
                      id="unidad" placeholder="años, cigarros, kg"
                      value={unidad} onChange={(e) => setUnidad(e.target.value)}
                    />
                  </div>
                </>
              )}

              {tipo === 'TEXTO' && (
                <div className="space-y-1.5">
                  <Label htmlFor="largo">Caracteres que caben en el papel</Label>
                  <Input
                    id="largo" inputMode="numeric" placeholder="30"
                    value={longitudMax} onChange={(e) => setLongitudMax(e.target.value)}
                  />
                </div>
              )}
            </div>

            {tipo === 'GRUPO' && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Un encabezado no se contesta: en el papel no tiene casillas. Sirve para
                titular las preguntas que vienen debajo.
              </p>
            )}

            {conOpciones && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>
                    {tipo === 'NUMERO_CON_ESCAPE' ? 'Respuestas de escape' : 'Opciones'}
                  </Label>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setOpciones((o) => [
                      ...o, { codigo: '', etiqueta: '', esEscape: tipo === 'NUMERO_CON_ESCAPE' },
                    ])}
                  >
                    <Plus className="mr-1.5 size-4" />
                    Agregar
                  </Button>
                </div>

                {tipo === 'NUMERO_CON_ESCAPE' && (
                  <p className="text-xs text-muted-foreground">
                    Lo que se marca en lugar de escribir un número: «no sabe», «nunca».
                    Su código es el valor que se guarda.
                  </p>
                )}

                {opciones.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    Sin opciones. Agregue las que están impresas en la hoja.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {opciones.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                        <Input
                          className="w-[90px] shrink-0 font-mono"
                          placeholder="1"
                          value={o.codigo}
                          onChange={(e) => setOpciones((lista) => lista.map((x, j) =>
                            j === i ? { ...x, codigo: e.target.value } : x))}
                        />
                        <Input
                          placeholder="Sí"
                          value={o.etiqueta}
                          onChange={(e) => setOpciones((lista) => lista.map((x, j) =>
                            j === i ? { ...x, etiqueta: e.target.value } : x))}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Switch
                                checked={o.esEscape}
                                onCheckedChange={(v) => setOpciones((lista) => lista.map((x, j) =>
                                  j === i ? { ...x, esEscape: v } : x))}
                              />
                              <span className="text-xs text-muted-foreground">escape</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Una respuesta de escape no es una cantidad: «no sabe» no se
                            promedia con los números.
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          type="button" variant="ghost" size="icon" className="shrink-0"
                          onClick={() => setOpciones((lista) => lista.filter((_, j) => j !== i))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  El orden es el de esta lista. Una opción que alguien ya marcó no se puede
                  quitar: cámbiele la etiqueta si lo que quiere es corregir el texto.
                </p>
              </div>
            )}
          </section>

          {/* ── Ayuda a quien contesta ─────────────────────────────────────── */}
          <section className="grid gap-4 @sm:grid-cols-2">
            <div className="space-y-1.5 @sm:col-span-2">
              <Label htmlFor="instruccion">La aclaración que trae el papel</Label>
              <Textarea
                id="instruccion"
                rows={2}
                placeholder="Marque todas las que apliquen."
                value={instruccion}
                onChange={(e) => setInstruccion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se le muestra a quien contesta, junto a la pregunta. Si en el papel está
                impresa y aquí no, contesta sin ella.
              </p>
            </div>

            <div className="space-y-1.5 @sm:col-span-2">
              <Label htmlFor="figura">Figura</Label>
              <Input
                id="figura"
                className="font-mono"
                placeholder="figuras/escala_vello.png"
                value={figura}
                onChange={(e) => setFigura(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ruta dentro de <span className="font-mono">/cuestionarios/</span>. Para las
                preguntas que sin el dibujo no se pueden contestar.
              </p>
            </div>
          </section>

          {/* ── Salto ──────────────────────────────────────────────────────── */}
          <section className="space-y-3 rounded-lg border p-3">
            <div>
              <Label>Solo se pregunta si…</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                El «pase a la…» del papel, cuando es de esta pregunta sola. Si apaga un
                bloque entero, póngalo en el bloque.
              </p>
            </div>
            <div className="grid gap-2 @sm:grid-cols-[1fr_auto_1fr] @sm:items-center">
              <Input
                className="font-mono"
                placeholder="P10"
                value={dependeDe}
                onChange={(e) => setDependeDe(e.target.value)}
              />
              <Select
                value={operador}
                onValueChange={(v) => setOperador(v as OperadorDependencia)}
              >
                <SelectTrigger className="@sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OPERADOR_ETIQUETAS) as OperadorDependencia[]).map((o) => (
                    <SelectItem key={o} value={o}>{OPERADOR_ETIQUETAS[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={operador === 'EN' ? '1|2|3' : '1'}
                value={valorHabilitante}
                disabled={dependeDe.trim() === ''}
                onChange={(e) => setValorHabilitante(e.target.value)}
              />
            </div>
            {operador === 'EN' && (
              <p className="text-xs text-muted-foreground">
                Varios valores separados por <span className="font-mono">|</span>. Es para
                las preguntas con dos flechas distintas que llevan al mismo sitio.
              </p>
            )}
          </section>

          {/* ── Lo de menos uso ────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-lg border p-3">
            <div className="grid gap-4 @sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fila">Fila de la rejilla</Label>
                <Input
                  id="fila" placeholder="Caminar"
                  value={filaMatriz} onChange={(e) => setFilaMatriz(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="columna-matriz">Columna de la rejilla</Label>
                <Input
                  id="columna-matriz" placeholder="Lunes"
                  value={columnaMatriz} onChange={(e) => setColumnaMatriz(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground @sm:col-span-2">
                Solo para los bloques que en el papel son una tabla: dicen qué celda ocupa
                esta pregunta.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observaciones">Notas para el personal</Label>
              <Textarea
                id="observaciones" rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                No se le muestra a quien contesta.
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch id="obligatoria" checked={obligatoria} onCheckedChange={setObligatoria} />
                <Label htmlFor="obligatoria" className="cursor-pointer font-normal">
                  Obligatoria
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="activa" checked={activa} onCheckedChange={setActiva} />
                <Label htmlFor="activa" className="cursor-pointer font-normal">
                  En uso
                </Label>
              </div>
            </div>
          </section>

          {impideGuardar && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {impideGuardar}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 @sm:justify-between">
          {!esNueva && puedeEliminar ? (
            <Button
              type="button"
              variant="outline"
              disabled={trabajando}
              onClick={() => eliminar.mutate(pregunta!.id, { onSuccess: onCerrar })}
            >
              <Trash2 className="mr-1.5 size-4" />
              Retirar de uso
            </Button>
          ) : <span />}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCerrar} disabled={trabajando}>
              Cancelar
            </Button>
            <Button type="button" onClick={guardar} disabled={trabajando || impideGuardar != null}>
              {trabajando && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {esNueva ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
