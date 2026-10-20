import { useMemo } from 'react'

import { cn } from '@/lib/utils'

/**
 * Las preguntas de un bloque pintadas como la tabla de escala que son en el papel:
 * un renglón por pregunta y una columna por respuesta.
 *
 * <h3>En qué se diferencia de la rejilla</h3>
 *
 * En {@link RejillaPreguntas} cada celda es una pregunta distinta. Aquí no: cada
 * **renglón** es la pregunta y las columnas son sus respuestas, las mismas para todo
 * el bloque. En el papel se ven igual; por dentro no se parecen.
 *
 * <h3>Por qué hace falta</h3>
 *
 * Es la forma más común del instrumento —la frecuencia alimentaria, el AGES, el
 * índice de Barthel, las escalas de depresión—, cerca de mil preguntas. En lista,
 * cada una repetiría sus nueve o diez opciones una debajo de otra; contestar
 * veintidós alimentos así es ilegible, porque se pierde la referencia de qué escala
 * se está usando en cuanto se pasa del tercer renglón.
 *
 * <h3>Se contesta con radios de verdad</h3>
 *
 * Cada renglón es un grupo de radios con el mismo `name`, que es lo que hace que el
 * teclado y el lector de pantalla lo recorran como lo que es: una pregunta con
 * varias respuestas, no veintidós casillas sueltas. El encabezado de cada columna va
 * en un `<th scope="col">` y el de cada renglón en un `<th scope="row">`, para que al
 * llegar a una celda se anuncien los dos.
 */

export interface RenglonEscala {
  id: number
  texto: string
  /** Su pregunta llave la dejó fuera: se ve, pero no se contesta. */
  deshabilitado?: boolean
  /** Lo que haya que advertir del escáner, si hay algo. */
  aviso?: string | null
}

interface Props {
  /** Las columnas, en el orden del catálogo, que es el del papel. */
  opciones: Array<{ codigo: string; etiqueta: string }>
  renglones: RenglonEscala[]
  valores: Record<number, string>
  soloLectura?: boolean
  onChange: (idPregunta: number, valor: string) => void
}

export function EscalaPreguntas({
  opciones, renglones, valores, soloLectura, onChange,
}: Props) {
  // Una tabla de dos columnas no aporta nada sobre una lista, y sin opciones no hay
  // tabla posible.
  const util = useMemo(() => opciones.length >= 2 && renglones.length >= 2,
    [opciones.length, renglones.length])

  if (!util) return null

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[14rem] bg-muted/50 px-3 py-2 text-left font-medium"
            >
              <span className="sr-only">Pregunta</span>
            </th>
            {opciones.map((o) => (
              <th
                key={o.codigo}
                scope="col"
                className="min-w-[4.5rem] px-2 py-2 text-center text-xs font-medium leading-tight"
              >
                {o.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renglones.map((r) => (
            <tr
              key={r.id}
              title={r.aviso ?? undefined}
              className={cn(
                'border-b last:border-0 even:bg-muted/20',
                r.deshabilitado && 'opacity-55',
                r.aviso && 'bg-amber-100/70 dark:bg-amber-950/40',
              )}
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-sm font-normal even:bg-muted/20"
              >
                {r.texto}
              </th>
              {opciones.map((o) => (
                <td key={o.codigo} className="px-2 py-1.5 text-center align-middle">
                  <input
                    type="radio"
                    name={`escala-${r.id}`}
                    value={o.codigo}
                    checked={valores[r.id] === o.codigo}
                    disabled={soloLectura || r.deshabilitado}
                    aria-label={`${r.texto}: ${o.etiqueta}`}
                    className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                    // Volver a pulsar la respuesta elegida la quita. Sin esto, una
                    // marca puesta por error en una pregunta no obligatoria no se
                    // puede deshacer, y en una tabla de veintidós renglones eso pasa.
                    onClick={() => onChange(r.id, valores[r.id] === o.codigo ? '' : o.codigo)}
                    onChange={() => { /* lo hace onClick, para poder desmarcar */ }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
