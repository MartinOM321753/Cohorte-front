import { AlertTriangle, FileWarning, HelpCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AyudaPregunta } from './AyudaPregunta'
import { OPERADOR_ETIQUETAS } from '../api/cuestionarios.types'
import type { MarcaAusencia, VariableCuestionario } from '../api/cuestionarios.types'

/**
 * Una pregunta del cuestionario, renderizada según su tipo.
 *
 * <h3>El valor es siempre texto</h3>
 *
 * El componente entrega y recibe una cadena, no un número ni un booleano. Es lo que
 * manda el servidor y lo que el servidor interpreta, y tener dos interpretaciones —una
 * aquí y otra allá— es exactamente cómo se consigue que la pantalla acepte algo que
 * después se guarda distinto. El `0` de una casilla, el `99` de un escape y el código de
 * una opción son todos cadenas y el intérprete del servidor decide qué significan.
 *
 * <h3>Las marcas de ausencia se muestran, no se esconden</h3>
 *
 * Una respuesta que el escáner no pudo leer se ve: el campo queda vacío y al lado
 * aparece de qué se trata. Mostrarla como un campo vacío sin más haría que el capturista
 * la tomara por «no contestó» y pasara de largo, cuando el dato está en el papel
 * esperando a que alguien lo teclee. Hoy eso le pasa a casi nueve de cada diez campos de
 * texto del instrumento.
 */

/** Qué decirle al capturista de una celda sin valor. */
const AUSENCIAS: Record<MarcaAusencia, { texto: string; grave: boolean } | null> = {
  NINGUNA: null,
  SIN_RESPUESTA: { texto: 'El participante no marcó', grave: false },
  EN_BLANCO: { texto: 'El escáner leyó la región en blanco', grave: false },
  // Es lo que le pasa a casi toda casilla de una rejilla: en la 112 un participante
  // normal marca cuatro o cinco de ciento cinco. No es un hueco, es un «no».
  CERO_MARCAS: { texto: 'No la marcó', grave: false },
  NO_AUTORIZADO: {
    texto: 'El reconocimiento de escritura no estaba licenciado: el dato está en el papel, sin leer',
    grave: true,
  },
  ERROR_LECTURA: { texto: 'Error de lectura de la región', grave: true },
}

interface Props {
  variable: VariableCuestionario
  valor: string
  marca: MarcaAusencia
  /** Referencia de la celda del volcado, cuando vino de un archivo. */
  celdaOrigen?: string | null
  /** Lo que decía la celda cuando no se pudo interpretar. */
  valorCrudo?: string | null
  deshabilitado?: boolean
  onChange: (valor: string) => void
}

export function CampoPregunta({
  variable, valor, marca, celdaOrigen, valorCrudo, deshabilitado, onChange,
}: Props) {
  const ausencia = AUSENCIAS[marca]
  const sinDocumentar = !variable.documentada || !variable.pregunta

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        deshabilitado && 'opacity-55',
        ausencia?.grave && 'border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/20',
        sinDocumentar && 'border-dashed',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="font-mono text-xs text-muted-foreground">{variable.codigo}</span>
            {variable.pregunta ?? (
              <span className="italic text-muted-foreground">
                Sin enunciado documentado
              </span>
            )}
            {variable.obligatoria && <span className="text-destructive">*</span>}
          </Label>

          {variable.unidad && (
            <p className="mt-1 text-xs text-muted-foreground">En {variable.unidad}</p>
          )}
          {variable.dependeDe && (
            <p className="mt-1 text-xs text-muted-foreground">
              Se pregunta si {variable.dependeDe}{' '}
              {OPERADOR_ETIQUETAS[variable.operadorDependencia ?? 'IGUAL']}{' '}
              {variable.valorHabilitante ?? '—'}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {sinDocumentar && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 border-dashed text-xs">
                  <HelpCircle className="size-3" />
                  Sin documentar
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                El volcado produce esta columna pero ningún catálogo trae su enunciado.
                Se guarda igual; falta redactarla.
              </TooltipContent>
            </Tooltip>
          )}
          {celdaOrigen && (
            <Badge variant="secondary" className="font-mono text-xs">{celdaOrigen}</Badge>
          )}
        </div>
      </div>

      {ausencia && (
        <div
          className={cn(
            'mb-3 flex items-start gap-2 rounded-md px-2.5 py-2 text-xs',
            ausencia.grave
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {ausencia.grave
            ? <FileWarning className="mt-0.5 size-3.5 shrink-0" />
            : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
          <span>{ausencia.texto}</span>
        </div>
      )}

      {valorCrudo && (
        <p className="mb-3 text-xs text-muted-foreground">
          El archivo decía <span className="font-mono">{valorCrudo}</span>, que no encaja con
          el catálogo de esta pregunta.
        </p>
      )}

      <AyudaPregunta
        instruccion={variable.instruccion}
        figura={variable.figura}
        className="mb-3"
      />

      <Control
        variable={variable}
        valor={valor}
        deshabilitado={deshabilitado}
        onChange={onChange}
      />
    </div>
  )
}

function Control({ variable, valor, deshabilitado, onChange }: {
  variable: VariableCuestionario
  valor: string
  deshabilitado?: boolean
  onChange: (valor: string) => void
}) {
  switch (variable.tipo) {
    // Un encabezado de grupo no se contesta: en el papel no tiene casillas.
    case 'GRUPO':
      return (
        <p className="text-xs italic text-muted-foreground">
          Encabezado de grupo; no se contesta.
        </p>
      )

    case 'CASILLA':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`v-${variable.id}`}
            // El código de la casilla marcada sale del catálogo cuando lo hay. Fijar
            // un «1» aquí daría por sabido lo que el instrumento decide: hay casillas
            // que el volcado escribe con 2.
            checked={valor !== '' && valor !== '0'}
            disabled={deshabilitado}
            onCheckedChange={(marcada) =>
              onChange(marcada ? (variable.opciones[0]?.codigo ?? '1') : '')}
          />
          <Label htmlFor={`v-${variable.id}`} className="cursor-pointer text-sm font-normal">
            {variable.opciones[0]?.etiqueta ?? 'Sí'}
          </Label>
        </div>
      )

    case 'OPCION_UNICA':
    case 'OPCION_MULTIPLE':
      if (variable.opciones.length === 0) {
        return (
          <Input
            value={valor}
            disabled={deshabilitado}
            placeholder="Código de la respuesta"
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
      return (
        <RadioGroup
          value={valor}
          disabled={deshabilitado}
          // Volver a pulsar la opción elegida la quita. Sin esto, una respuesta puesta
          // por error en una pregunta no obligatoria no se puede deshacer.
          onValueChange={(v) => onChange(v === valor ? '' : v)}
          className="gap-2"
        >
          {variable.opciones.map((o) => (
            <div key={o.id} className="flex items-start gap-2">
              <RadioGroupItem value={o.codigo} id={`o-${o.id}`} className="mt-0.5" />
              <Label htmlFor={`o-${o.id}`} className="cursor-pointer text-sm font-normal">
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">{o.codigo}</span>
                {o.etiqueta}
                {o.esEscape && (
                  <Badge variant="outline" className="ml-2 text-[10px]">no sustantiva</Badge>
                )}
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
            disabled={deshabilitado}
            min={variable.valorMin ?? undefined}
            max={variable.valorMax ?? undefined}
            placeholder={rangoComoTexto(variable)}
            onChange={(e) => onChange(e.target.value)}
          />
          {/* Los escapes se ofrecen como botones: teclear «99» de memoria es como se
              acaba metiendo un 99 que el participante no dijo. */}
          {variable.opciones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {variable.opciones.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => onChange(valor === o.codigo ? '' : o.codigo)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs transition-colors',
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
      return (
        <Input
          type="date"
          value={valor}
          disabled={deshabilitado}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'TEXTO':
    default:
      return (
        <Input
          value={valor}
          disabled={deshabilitado}
          maxLength={variable.longitudMax ?? undefined}
          placeholder={variable.longitudMax ? `Hasta ${variable.longitudMax} caracteres` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function rangoComoTexto(variable: VariableCuestionario): string | undefined {
  const { valorMin: min, valorMax: max } = variable
  if (min == null && max == null) return undefined
  if (min != null && max != null) return `De ${min} a ${max}`
  return min != null ? `Desde ${min}` : `Hasta ${max}`
}
