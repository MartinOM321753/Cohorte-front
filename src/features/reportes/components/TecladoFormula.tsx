import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, GitBranch, List, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type { OpcionVariable, VariableDisponible } from '../formulas.types'

/** Una variable ya declarada en la fórmula, con sus valores si tiene un conjunto cerrado. */
export interface VariableEnFormula {
  nombre: string
  clave: string
  opciones?: OpcionVariable[]
}

/**
 * Cómo se lee cada comparador, para quien no escribe fórmulas.
 *
 * <p>El símbolo se guarda, pero en la pantalla se lee en palabras: «es mayor que» se
 * elige sin dudar, «&gt;=» hay que pararse a pensarlo.</p>
 */
const COMPARADORES = [
  { simbolo: '=',  rotulo: 'es igual a' },
  { simbolo: '<>', rotulo: 'es distinto de' },
  { simbolo: '<',  rotulo: 'es menor que' },
  { simbolo: '<=', rotulo: 'es menor o igual que' },
  { simbolo: '>',  rotulo: 'es mayor que' },
  { simbolo: '>=', rotulo: 'es mayor o igual que' },
]

/**
 * Con un conjunto cerrado de valores solo se puede preguntar si es uno u otro.
 *
 * Vale igual para un texto —«Derecha» no es menor que «Izquierda»— y para el sexo, que
 * por dentro es 1 o 0 pero no admite un «mayor que» con sentido.
 */
const COMPARADORES_DE_OPCIONES = ['=', '<>']

const OPERACIONES = [
  { texto: ' + ', rotulo: '+', ayuda: 'Sumar' },
  { texto: ' - ', rotulo: '−', ayuda: 'Restar' },
  { texto: ' * ', rotulo: '×', ayuda: 'Multiplicar' },
  { texto: ' / ', rotulo: '÷', ayuda: 'Dividir' },
  { texto: '²',   rotulo: 'x²', ayuda: 'Al cuadrado' },
  { texto: ' ^ ', rotulo: 'xⁿ', ayuda: 'Elevar a una potencia' },
  { texto: '()',  rotulo: '( )', ayuda: 'Agrupar', dentro: 1 },
]

const FUNCIONES = [
  { texto: 'raiz()',         rotulo: '√', ayuda: 'Raíz cuadrada', dentro: 1 },
  { texto: 'abs()',          rotulo: '|x|', ayuda: 'Valor absoluto, siempre positivo', dentro: 1 },
  { texto: 'redondear(, 2)', rotulo: 'Redondear', ayuda: 'Recorta el valor a los decimales indicados', dentro: 5 },
  { texto: 'min()',          rotulo: 'Mínimo', ayuda: 'El menor de varios valores', dentro: 1 },
  { texto: 'max()',          rotulo: 'Máximo', ayuda: 'El mayor de varios valores', dentro: 1 },
  { texto: 'promedio()',     rotulo: 'Promedio', ayuda: 'La media de varios valores', dentro: 1 },
]

/**
 * Los botones con los que se arma una fórmula sin saber escribirla.
 *
 * <p>La expresión se puede seguir tecleando a mano —quien ya sabe va más rápido así—
 * pero nadie debería tener que aprenderse la sintaxis para multiplicar dos datos. Los
 * botones ponen el símbolo en el sitio y dejan el cursor donde toca seguir.</p>
 */
export function TecladoFormula({
  onInsertar, onArmarCondicion, deshabilitado,
}: {
  /** Mete el texto donde esté el cursor; `retroceso` deja el cursor dentro. */
  onInsertar: (texto: string, retroceso?: number) => void
  onArmarCondicion: () => void
  deshabilitado?: boolean
}) {
  return (
    <div className="grid gap-2 rounded-md border bg-[var(--muted)]/30 p-2">
      <Grupo titulo="Operaciones">
        {OPERACIONES.map((o) => (
          <Tecla key={o.rotulo} ayuda={o.ayuda} deshabilitado={deshabilitado}
                 onClick={() => onInsertar(o.texto, o.dentro ?? 0)}>
            {o.rotulo}
          </Tecla>
        ))}
      </Grupo>

      <Grupo titulo="Funciones">
        {FUNCIONES.map((f) => (
          <Tecla key={f.rotulo} ayuda={f.ayuda} deshabilitado={deshabilitado}
                 onClick={() => onInsertar(f.texto, f.dentro)}>
            {f.rotulo}
          </Tecla>
        ))}
      </Grupo>

      <Grupo titulo="Condición">
        <Button
          type="button" variant="outline" size="sm"
          className="h-7 gap-1.5 px-2 text-[12px]" disabled={deshabilitado}
          title="Armar una regla que dé un valor u otro según el participante"
          onClick={onArmarCondicion}
        >
          <GitBranch className="h-3.5 w-3.5" strokeWidth={1.75} />
          Armar una condición
        </Button>
      </Grupo>
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {titulo}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Tecla({
  children, ayuda, onClick, deshabilitado,
}: {
  children: React.ReactNode
  ayuda: string
  onClick: () => void
  deshabilitado?: boolean
}) {
  return (
    <Button
      type="button" variant="outline" size="sm"
      className="h-7 min-w-9 px-2 font-mono text-[12px]"
      title={ayuda} disabled={deshabilitado} onClick={onClick}
    >
      {children}
    </Button>
  )
}

/**
 * Arma un «si» por partes, sin escribir la sintaxis.
 *
 * <p>Se presenta en tres secciones porque así es como se piensa la regla: <b>si</b>
 * algo se compara con algo, <b>entonces</b> vale una cosa, <b>si no</b> vale otra.</p>
 *
 * <p><b>No es un diálogo</b>, sino un panel que ocupa el sitio del editor dentro del
 * mismo cuadro. Apilar un modal sobre otro dejaba los desplegables de dentro sin
 * responder —las variables y las opciones no se podían elegir— y además hacía falta un
 * apaño para tapar el de detrás. Sustituyendo la vista no hay nada apilado, y el editor
 * vuelve intacto al cerrar porque nunca se desmonta.</p>
 */
export function PanelCondicion({
  declaradas, disponibles, onDeclarar, onInsertar, onCancelar,
}: {
  /** Las que la fórmula ya tiene. */
  declaradas: VariableEnFormula[]
  /** Todo el catálogo: desde aquí se puede tomar un parámetro que aún no se usaba. */
  disponibles: VariableDisponible[]
  /** Da de alta un parámetro como variable y devuelve el nombre corto que le tocó. */
  onDeclarar: (v: VariableDisponible) => string
  onInsertar: (texto: string) => void
  onCancelar: () => void
}) {
  const [izquierda, setIzquierda] = useState('')
  const [comparador, setComparador] = useState('=')
  const [derecha, setDerecha] = useState('')
  const [siSeCumple, setSiSeCumple] = useState('')
  const [siNo, setSiNo] = useState('')

  /** Las declaradas, más las que se vayan tomando del catálogo mientras se arma. */
  const [tomadas, setTomadas] = useState<VariableEnFormula[]>([])
  const enUso = useMemo(() => {
    const todas = [...declaradas]
    for (const t of tomadas) {
      if (!todas.some((d) => d.nombre === t.nombre)) todas.push(t)
    }
    return todas
  }, [declaradas, tomadas])

  function tomarDelCatalogo(v: VariableDisponible): string {
    const yaEsta = enUso.find((u) => u.clave === v.clave)
    if (yaEsta) return yaEsta.nombre

    const nombre = onDeclarar(v)
    setTomadas((previas) => [...previas, { nombre, clave: v.clave, opciones: v.opciones }])
    return nombre
  }

  const opcionesComparables = enUso.find(
    (v) => v.nombre === izquierda.trim())?.opciones ?? []
  const comparaOpciones = opcionesComparables.length > 0

  // Si el comparador elegido deja de tener sentido al escoger la variable, se vuelve
  // al de igualdad: «mayor que» sobre un conjunto cerrado no significa nada.
  useEffect(() => {
    if (comparaOpciones && !COMPARADORES_DE_OPCIONES.includes(comparador)) setComparador('=')
  }, [comparaOpciones, comparador])

  const completa = izquierda.trim() !== '' && derecha.trim() !== ''
    && siSeCumple.trim() !== '' && siNo.trim() !== ''

  const texto = `si(${izquierda.trim() || '…'} ${comparador} ${derecha.trim() || '…'}, `
    + `${siSeCumple.trim() || '…'}, ${siNo.trim() || '…'})`

  const comparadoresOfrecidos = comparaOpciones
    ? COMPARADORES.filter((c) => COMPARADORES_DE_OPCIONES.includes(c.simbolo))
    : COMPARADORES

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                onClick={onCancelar} aria-label="Volver a la fórmula">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-sm font-semibold">Armar una condición</p>
          <p className="text-xs text-muted-foreground">
            Una regla que da un valor u otro según el participante. Por ejemplo, una
            ecuación distinta para mujeres y para hombres.
          </p>
        </div>
      </div>

      <Seccion titulo="Si">
        <div className="grid gap-2 @sm:grid-cols-[1fr_auto_1fr] @sm:items-center">
          <Operando valor={izquierda} onCambiar={setIzquierda} enUso={enUso}
                    disponibles={disponibles} onTomar={tomarDelCatalogo} marcador="Sexo" />
          <Select value={comparador} onValueChange={setComparador}>
            <SelectTrigger className="h-8 w-full px-2 font-mono @sm:w-[52px] @sm:justify-center">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {comparadoresOfrecidos.map((c) => (
                <SelectItem key={c.simbolo} value={c.simbolo}>
                  <span className="font-mono">{c.simbolo}</span>
                  <span className="ml-2 text-muted-foreground">{c.rotulo}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Operando valor={derecha} onCambiar={setDerecha} enUso={enUso}
                    disponibles={disponibles} onTomar={tomarDelCatalogo}
                    opciones={opcionesComparables}
                    marcador={comparaOpciones ? 'Elija un valor' : '1'} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {comparaOpciones
            ? 'Esta variable tiene un conjunto cerrado de valores, así que solo se puede '
              + 'preguntar si es uno u otro. Elija de la lista, o escriba otro valor.'
            : 'Puede comparar una variable con un número, o dos variables entre sí.'}
        </p>
      </Seccion>

      <Seccion titulo="Entonces vale">
        <Operando valor={siSeCumple} onCambiar={setSiSeCumple} enUso={enUso}
                  disponibles={disponibles} onTomar={tomarDelCatalogo}
                  marcador="2.11 * estatura - 5.78 * edad" />
      </Seccion>

      <Seccion titulo="Si no, vale">
        <Operando valor={siNo} onCambiar={setSiNo} enUso={enUso}
                  disponibles={disponibles} onTomar={tomarDelCatalogo}
                  marcador="7.57 * estatura - 5.02 * edad" />
      </Seccion>

      <div className="grid gap-1">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          Quedará así
        </Label>
        <code className={cn(
          'block overflow-x-auto rounded border bg-[var(--muted)]/50 p-2 font-mono text-[11.5px]',
          !completa && 'text-muted-foreground',
        )}>
          {texto}
        </code>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="button" disabled={!completa} onClick={() => onInsertar(texto)}>
          Insertar en la fórmula
        </Button>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-md border p-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--primary)]">
        {titulo}
      </span>
      {children}
    </div>
  )
}

/**
 * Un hueco de la condición.
 *
 * <p>Se puede escribir a mano, elegir una variable que la fórmula ya use, <b>tomar un
 * parámetro del catálogo</b> —que queda declarado como variable sin salir de aquí— o
 * elegir uno de los valores del parámetro que se está comparando.</p>
 *
 * <p>Lo de tomar del catálogo es lo que faltaba: obligar a declarar antes todas las
 * variables y solo después armar la regla es al revés de como se piensa, porque uno
 * descubre qué dato necesita justo al escribir la condición.</p>
 */
function Operando({
  valor, onCambiar, enUso, disponibles, onTomar, opciones = [], marcador,
}: {
  valor: string
  onCambiar: (v: string) => void
  enUso: VariableEnFormula[]
  disponibles: VariableDisponible[]
  onTomar: (v: VariableDisponible) => string
  opciones?: OpcionVariable[]
  marcador: string
}) {
  const [buscado, setBuscado] = useState('')

  const sinUsar = useMemo(() => {
    const usadas = new Set(enUso.map((v) => v.clave))
    const texto = buscado.trim().toLowerCase()
    return disponibles
      .filter((d) => !usadas.has(d.clave))
      .filter((d) => texto === '' || d.rotulo.toLowerCase().includes(texto)
        || (d.subgrupo ?? '').toLowerCase().includes(texto))
      .slice(0, 40)
  }, [disponibles, enUso, buscado])

  function poner(texto: string) {
    onCambiar(texto)
    setBuscado('')
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={marcador}
        className="h-8 font-mono text-[12px]"
      />
      <DropdownMenu onOpenChange={(a) => !a && setBuscado('')}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
                  title="Elegir un dato o un valor">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[360px] w-[300px] overflow-y-auto">
          {opciones.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
                <List className="h-3 w-3" />
                Valores que admite
              </DropdownMenuLabel>
              {opciones.map((o) => (
                <DropdownMenuItem key={o.etiqueta} className="text-[12px]"
                                  onSelect={() => poner(o.valorEnFormula)}>
                  {o.etiqueta}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {enUso.length > 0 && (
            <>
              <DropdownMenuLabel className="text-[11px]">En esta fórmula</DropdownMenuLabel>
              {enUso.map((v) => (
                <DropdownMenuItem key={v.clave} className="gap-2 font-mono text-[12px]"
                                  onSelect={() => poner(v.nombre)}>
                  {v.nombre}
                  {v.opciones && v.opciones.length > 0 && (
                    <Badge variant="secondary" className="ml-auto font-sans text-[10px]">
                      valores fijos
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
            <Plus className="h-3 w-3" />
            Tomar un dato del catálogo
          </DropdownMenuLabel>
          <div className="px-2 pb-1.5">
            <Input
              value={buscado}
              onChange={(e) => setBuscado(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Buscar…"
              className="h-7 text-[12px]"
            />
          </div>
          {sinUsar.length === 0 ? (
            <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
              No hay más datos con ese nombre.
            </div>
          ) : (
            sinUsar.map((d) => (
              <DropdownMenuItem key={d.clave} className="flex-col items-start gap-0 text-[12px]"
                                onSelect={() => poner(onTomar(d))}>
                <span className="flex w-full items-center gap-2">
                  {d.rotulo}
                  {d.opciones && d.opciones.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">valores fijos</Badge>
                  )}
                  {d.unidad && <span className="ml-auto text-[10px] text-muted-foreground">{d.unidad}</span>}
                </span>
                {d.subgrupo && (
                  <span className="text-[10px] text-muted-foreground">{d.subgrupo}</span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
