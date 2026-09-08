import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Info, Plus, Play, Trash2, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'

import { PanelCondicion, TecladoFormula } from './TecladoFormula'

import {
  useProbarFormula, useRevisarFormula, useVariablesDisponibles,
} from '../hooks/useFormulas'
import type {
  AvisoFormula, FormulaReporte, FormulaReporteRequest, PruebaFormula,
  VariableDisponible, VariableFormula,
} from '../formulas.types'

interface EditorFormulaProps {
  abierto: boolean
  onCerrar: () => void
  /** Null para crear una nueva. */
  formula: FormulaReporte | null
  onGuardar: (body: FormulaReporteRequest) => void
  guardando?: boolean
}

/** Las funciones que el motor entiende, para tenerlas a la vista al escribir. */
const FUNCIONES = [
  { forma: 'si(condición, valorSí, valorNo)', que: 'Elige entre dos valores' },
  { forma: 'min(a, b, …)', que: 'El menor' },
  { forma: 'max(a, b, …)', que: 'El mayor' },
  { forma: 'promedio(a, b, …)', que: 'La media' },
  { forma: 'redondear(valor, decimales)', que: 'Recorta el valor, no solo lo que se ve' },
  { forma: 'raiz(valor)', que: 'Raíz cuadrada' },
  { forma: 'abs(valor)', que: 'Valor absoluto' },
]

/** Un nombre corto y utilizable a partir del rótulo del catálogo. */
function nombreSugerido(rotulo: string, yaUsados: string[]): string {
  const limpio = rotulo
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim().split(/\s+/)
    .filter(Boolean)

  const base = limpio
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join('') || 'variable'

  if (!yaUsados.includes(base)) return base
  let n = 2
  while (yaUsados.includes(`${base}${n}`)) n += 1
  return `${base}${n}`
}

export function EditorFormula({
  abierto, onCerrar, formula, onGuardar, guardando,
}: EditorFormulaProps) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [expresion, setExpresion] = useState('')
  const [variables, setVariables] = useState<VariableFormula[]>([])
  const [unidadSalida, setUnidadSalida] = useState('')
  const [decimales, setDecimales] = useState<string>('')
  const [expresionMinimo, setExpresionMinimo] = useState('')
  const [expresionMaximo, setExpresionMaximo] = useState('')

  const [avisos, setAvisos] = useState<AvisoFormula[]>([])
  const [uuidPrueba, setUuidPrueba] = useState<string | null>(null)
  const [prueba, setPrueba] = useState<PruebaFormula | null>(null)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  /**
   * Qué se está viendo dentro del mismo cuadro.
   *
   * Armar una condición sustituye la vista en vez de abrir otro diálogo encima. Apilar
   * modales dejaba los desplegables del asistente sin responder, y el editor vuelve
   * intacto porque nunca se desmonta: solo deja de pintarse.
   */
  const [vista, setVista] = useState<'formula' | 'condicion'>('formula')

  /**
   * La caja de la operación, para poder escribir donde está el cursor.
   *
   * Sin esto los botones tendrían que añadir siempre al final, y armar
   * «(a + b) / c» a base de pulsaciones acabaría siendo más lento que teclearlo.
   */
  const areaExpresion = useRef<HTMLTextAreaElement | null>(null)

  /**
   * Mete texto donde esté el cursor y lo deja listo para seguir.
   *
   * @param retroceso cuántos caracteres retroceder al final, para quedar dentro de
   *                  unos paréntesis recién puestos
   */
  function insertarEnExpresion(texto: string, retroceso = 0) {
    const area = areaExpresion.current
    const inicio = area?.selectionStart ?? expresion.length
    const fin = area?.selectionEnd ?? expresion.length

    setExpresion(expresion.slice(0, inicio) + texto + expresion.slice(fin))

    // Después de que React repinte: si no, el cursor se va al final de la caja.
    requestAnimationFrame(() => {
      area?.focus()
      const posicion = inicio + texto.length - retroceso
      area?.setSelectionRange(posicion, posicion)
    })
  }

  const { data: disponibles } = useVariablesDisponibles({ enabled: abierto })
  const revisar = useRevisarFormula()
  const probar = useProbarFormula()

  // Al abrir se carga la fórmula que toque; al cerrar no se limpia, para que
  // reabrir la misma no parpadee con los campos vacíos.
  useEffect(() => {
    if (!abierto) return
    setNombre(formula?.nombre ?? '')
    setDescripcion(formula?.descripcion ?? '')
    setExpresion(formula?.expresion ?? '')
    setVariables(formula?.variables ?? [])
    setUnidadSalida(formula?.unidadSalida ?? '')
    setDecimales(formula?.decimales != null ? String(formula.decimales) : '')
    setExpresionMinimo(formula?.expresionMinimo ?? '')
    setExpresionMaximo(formula?.expresionMaximo ?? '')
    setAvisos([])
    setPrueba(null)
    setVista('formula')
  }, [abierto, formula])

  const cuerpo = useMemo<FormulaReporteRequest>(() => ({
    nombre: nombre.trim(),
    descripcion: descripcion.trim() || undefined,
    expresion,
    variables,
    expresionMinimo: expresionMinimo.trim() || null,
    expresionMaximo: expresionMaximo.trim() || null,
    unidadSalida: unidadSalida.trim() || null,
    decimales: decimales === '' ? null : Number(decimales),
  }), [nombre, descripcion, expresion, variables, expresionMinimo, expresionMaximo,
       unidadSalida, decimales])

  /**
   * Se revisa mientras se escribe, con un respiro entre teclas.
   *
   * Es el mismo validador que corre en el servidor al guardar; preguntarle aquí es lo
   * que evita que alguien se entere de que su fórmula está rota cuando ya está
   * emitiendo el reporte de un participante.
   */
  useEffect(() => {
    if (!abierto || !expresion.trim()) { setAvisos([]); return }
    const t = setTimeout(() => {
      revisar.mutate(cuerpo, { onSuccess: (r) => setAvisos(r.avisos) })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, expresion, variables, unidadSalida, decimales, expresionMinimo, expresionMaximo])

  const impedimentos = avisos.filter((a) => a.nivel === 'IMPIDE')
  const advertencias = avisos.filter((a) => a.nivel === 'ADVIERTE')
  const sePuedeGuardar = nombre.trim() !== '' && expresion.trim() !== '' && impedimentos.length === 0

  /**
   * Da de alta un dato del catálogo como variable de la fórmula.
   *
   * <p>Devuelve el nombre corto que le tocó para que quien la pidió pueda usarlo en el
   * momento: el asistente de condiciones toma parámetros de aquí mientras se arma la
   * regla, sin obligar a declararlos todos antes.</p>
   */
  function declararVariable(v: VariableDisponible): string {
    const yaEsta = variables.find((x) => x.clave === v.clave)
    if (yaEsta) return yaEsta.nombre

    const nombreCorto = nombreSugerido(v.rotulo, variables.map((x) => x.nombre))
    setVariables((previas) => [...previas, {
      nombre: nombreCorto,
      clave: v.clave,
      unidad: v.unidad || null,
    }])
    return nombreCorto
  }

  function agregarVariable(v: VariableDisponible) {
    const nombreCorto = declararVariable(v)
    setSelectorAbierto(false)
    // Se pone también en la operación, donde esté el cursor: es lo que casi siempre se
    // quiere, y escribirla a mano después es donde aparecen las erratas.
    insertarEnExpresion(expresion.trim() === '' ? nombreCorto : ` ${nombreCorto}`)
  }

  function renombrarVariable(indice: number, nuevo: string) {
    const anterior = variables[indice].nombre
    setVariables((previas) =>
      previas.map((v, i) => (i === indice ? { ...v, nombre: nuevo } : v)))
    // La expresión menciona el nombre viejo: si no se cambia también ahí, la fórmula
    // queda rota justo después de un cambio que parecía inofensivo.
    if (anterior && nuevo) {
      setExpresion((e) => e.replace(new RegExp(`\\b${anterior}\\b`, 'g'), nuevo))
    }
  }

  function cambiarUnidad(indice: number, unidad: string) {
    setVariables((previas) =>
      previas.map((v, i) => (i === indice ? { ...v, unidad } : v)))
  }

  function quitarVariable(indice: number) {
    setVariables((previas) => previas.filter((_, i) => i !== indice))
  }

  function ejecutarPrueba() {
    if (!uuidPrueba) return
    probar.mutate({ uuid: uuidPrueba, body: cuerpo }, { onSuccess: setPrueba })
  }

  const porGrupo = useMemo(() => {
    const grupos = new Map<string, VariableDisponible[]>()
    for (const v of disponibles ?? []) {
      const clave = v.subgrupo ? `${v.grupo} · ${v.subgrupo}` : v.grupo
      if (!grupos.has(clave)) grupos.set(clave, [])
      grupos.get(clave)!.push(v)
    }
    return grupos
  }, [disponibles])

  const detalleDe = (clave: string) => (disponibles ?? []).find((d) => d.clave === clave)

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      {/* Aquí conviven identificación, variables, operación, teclado, referencia,
          revisión y vista previa. En un diálogo estrecho todo eso se lee como una
          columna interminable que obliga a desplazarse para comparar dos cosas. */}
      <DialogContent className="@container w-[95vw] max-w-5xl max-h-[92vh] overflow-y-auto">
        {vista === 'condicion' ? (
          <PanelCondicion
            declaradas={variables.map((v) => ({
              nombre: v.nombre,
              clave: v.clave,
              // Las opciones salen del catálogo, no de la fórmula: es lo que permite
              // ofrecer «Derecha» e «Izquierda» al comparar la mano dominante.
              opciones: disponibles?.find((d) => d.clave === v.clave)?.opciones,
            }))}
            disponibles={disponibles ?? []}
            onDeclarar={declararVariable}
            onCancelar={() => setVista('formula')}
            onInsertar={(texto) => {
              setVista('formula')
              insertarEnExpresion(texto)
            }}
          />
        ) : (
        <>
        <DialogHeader>
          <DialogTitle>{formula ? 'Editar fórmula' : 'Nueva fórmula'}</DialogTitle>
          <DialogDescription>
            {formula
              ? `Versión ${formula.version}. Si cambia el cálculo, la anterior queda archivada.`
              : 'Se da de alta una vez y se puede usar en los reportes que haga falta.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* ── Identificación ──────────────────────────────────────────── */}
          <div className="grid gap-4 @md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="formula-nombre">Nombre</Label>
              <Input
                id="formula-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Índice de masa corporal"
                maxLength={120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="formula-descripcion">Descripción</Label>
              <Input
                id="formula-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Para qué sirve, si el nombre no basta"
                maxLength={500}
              />
            </div>
          </div>

          {/* En pantalla ancha el trabajo se reparte: a la izquierda se arma el
              cálculo, a la derecha se comprueba. Así se puede mirar la vista previa
              sin perder de vista la operación que la produce. */}
          <div className="grid gap-5 @4xl:grid-cols-2 @4xl:items-start">
          <div className="grid gap-5">

          {/* ── Variables ───────────────────────────────────────────────── */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Variables</Label>
              <Popover open={selectorAbierto} onOpenChange={setSelectorAbierto}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Agregar variable
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Buscar un dato…" />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún dato con ese nombre.</CommandEmpty>
                      {[...porGrupo.entries()].map(([grupo, items]) => (
                        <CommandGroup key={grupo} heading={grupo}>
                          {items.map((v) => (
                            <CommandItem
                              key={v.clave}
                              value={`${grupo} ${v.rotulo}`}
                              onSelect={() => agregarVariable(v)}
                            >
                              <span className="flex-1">{v.rotulo}</span>
                              {v.unidad && (
                                <Badge variant="secondary" className="ml-2 text-[10px]">
                                  {v.unidad}
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <p className="text-xs text-muted-foreground">
              Solo se ofrecen los datos numéricos que declaran su unidad. Los de texto y los
              de opciones no se pueden calcular, así que no aparecen.
            </p>

            {variables.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Sin variables. Una fórmula puede ser solo números, pero casi siempre necesita
                algún dato del participante.
              </div>
            ) : (
              <div className="grid gap-2">
                {variables.map((v, i) => {
                  const detalle = detalleDe(v.clave)
                  const opciones = detalle?.unidadesPosibles ?? (v.unidad ? [v.unidad] : [])
                  const cambiaDeUnidad = detalle && v.unidad && v.unidad !== detalle.unidad
                  return (
                    <div
                      key={`${v.clave}-${i}`}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border p-2"
                    >
                      <div className="grid gap-1 min-w-0">
                        <Input
                          value={v.nombre}
                          onChange={(e) => renombrarVariable(i, e.target.value)}
                          className="h-8 font-mono text-[13px]"
                        />
                        <span className="truncate text-xs text-muted-foreground">
                          {detalle
                            ? `${detalle.rotulo}${detalle.subgrupo ? ` · ${detalle.subgrupo}` : ''}`
                            : v.clave}
                        </span>
                      </div>

                      {opciones.length > 1 ? (
                        <Select
                          value={v.unidad ?? ''}
                          onValueChange={(u) => cambiarUnidad(i, u)}
                        >
                          <SelectTrigger className={cn('h-8 w-[110px]', cambiaDeUnidad && 'border-primary')}>
                            <SelectValue placeholder="Unidad" />
                          </SelectTrigger>
                          <SelectContent>
                            {opciones.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}{u === detalle?.unidad ? ' (guardada)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="justify-center w-[110px]">
                          {v.unidad || 'sin unidad'}
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => quitarVariable(i)}
                        aria-label={`Quitar ${v.nombre}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Expresión ───────────────────────────────────────────────── */}
          <div className="grid gap-1.5">
            <Label htmlFor="formula-expresion">Operación</Label>
            <Textarea
              id="formula-expresion"
              ref={areaExpresion}
              value={expresion}
              onChange={(e) => setExpresion(e.target.value)}
              placeholder="peso / estatura²"
              rows={3}
              className="font-mono text-[13px]"
              maxLength={2000}
            />

            {/* Los botones escriben donde está el cursor; la caja se puede seguir
                tecleando a mano, que para quien ya sabe es más rápido. */}
            <TecladoFormula
              onInsertar={insertarEnExpresion}
              onArmarCondicion={() => setVista('condicion')}
            />

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Qué se puede escribir</summary>
              <div className="mt-2 grid gap-1 pl-1">
                <p>
                  Sumar, restar, multiplicar y dividir, paréntesis, y potencias con{' '}
                  <code className="font-mono">^</code> o el superíndice{' '}
                  <code className="font-mono">²</code>.
                </p>
                {FUNCIONES.map((f) => (
                  <p key={f.forma}>
                    <code className="font-mono">{f.forma}</code> — {f.que}
                  </p>
                ))}
              </div>
            </details>
          </div>

          </div>

          <div className="grid gap-5">

          {/* ── Cómo sale ───────────────────────────────────────────────── */}
          <div className="grid gap-4 @md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="formula-unidad">Unidad del resultado</Label>
              <Input
                id="formula-unidad"
                value={unidadSalida}
                onChange={(e) => setUnidadSalida(e.target.value)}
                placeholder="kg/m²"
                maxLength={40}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="formula-decimales">Decimales</Label>
              <Input
                id="formula-decimales"
                type="number"
                min={0}
                max={10}
                value={decimales}
                onChange={(e) => setDecimales(e.target.value)}
                placeholder="Los que traiga el resultado"
              />
            </div>
          </div>

          {/* ── Referencia ──────────────────────────────────────────────── */}
          <div className="grid gap-2 rounded-md border p-3">
            <Label>Referencia</Label>
            <p className="text-xs text-muted-foreground">
              Si el rango depende del participante, se escribe con las mismas variables. El
              peso deseable, por ejemplo, va de <code className="font-mono">18.5 × talla²</code> a{' '}
              <code className="font-mono">24.9 × talla²</code>. Deje vacío el lado que no
              aplique: hay referencias con solo techo o solo piso.
            </p>
            <div className="grid gap-4 @md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="formula-minimo" className="text-xs font-normal text-muted-foreground">
                  Límite mínimo
                </Label>
                <Input
                  id="formula-minimo"
                  value={expresionMinimo}
                  onChange={(e) => setExpresionMinimo(e.target.value)}
                  placeholder="18.5 * talla²"
                  className="font-mono text-[13px]"
                  maxLength={2000}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="formula-maximo" className="text-xs font-normal text-muted-foreground">
                  Límite máximo
                </Label>
                <Input
                  id="formula-maximo"
                  value={expresionMaximo}
                  onChange={(e) => setExpresionMaximo(e.target.value)}
                  placeholder="24.9 * talla²"
                  className="font-mono text-[13px]"
                  maxLength={2000}
                />
              </div>
            </div>
            {(expresionMinimo.trim() !== '' || expresionMaximo.trim() !== '') && (
              <p className="text-xs text-muted-foreground">
                Con la referencia puesta, el diseñador ofrece además el rango ya calculado y
                si el valor cae dentro, por arriba o por abajo.
              </p>
            )}
          </div>

          {/* ── Revisión ────────────────────────────────────────────────── */}
          {(impedimentos.length > 0 || advertencias.length > 0) && (
            <div className="grid gap-1.5">
              {impedimentos.map((a, i) => (
                <div key={`i${i}`} className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[13px]">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <span>{a.mensaje}</span>
                </div>
              ))}
              {advertencias.map((a, i) => (
                <div key={`a${i}`} className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[13px]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>{a.mensaje}</span>
                </div>
              ))}
            </div>
          )}
          {expresion.trim() !== '' && avisos.length === 0 && !revisar.isPending && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-600/30 bg-emerald-600/5 p-2.5 text-[13px]">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>La fórmula se puede leer y todas sus variables existen.</span>
            </div>
          )}

          {/* ── Vista previa ────────────────────────────────────────────── */}
          <div className="grid gap-2 rounded-md border p-3">
            <Label>Probar con un participante</Label>
            <p className="text-xs text-muted-foreground">
              Es la forma de comprobar que la fórmula hace lo que se espera antes de usarla
              en un reporte.
            </p>
            <div className="flex flex-col gap-2 @sm:flex-row">
              <PacienteSearchCombobox
                value={uuidPrueba}
                onChange={setUuidPrueba}
                placeholder="Buscar un participante…"
                className="flex-1"
                modal
              />
              <Button
                variant="secondary"
                onClick={ejecutarPrueba}
                disabled={!uuidPrueba || !expresion.trim() || probar.isPending}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Calcular
              </Button>
            </div>

            {prueba && (
              <div className="grid gap-2 border-t pt-2.5">
                {prueba.calculable ? (
                  <p className="text-lg font-semibold tabular-nums">{prueba.conUnidad}</p>
                ) : (
                  <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      A este participante le falta alguno de los datos, así que la celda
                      saldría vacía. No es un error de la fórmula.
                    </span>
                  </div>
                )}
                <div className="grid gap-0.5">
                  {Object.entries(prueba.variables).map(([nombreVar, valor]) => (
                    <div key={nombreVar} className="flex justify-between gap-3 text-xs">
                      <span className="font-mono text-muted-foreground">{nombreVar}</span>
                      <span className="tabular-nums">{valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button
            onClick={() => onGuardar(cuerpo)}
            disabled={!sePuedeGuardar || guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
