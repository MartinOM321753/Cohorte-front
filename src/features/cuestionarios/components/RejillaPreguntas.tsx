import { useMemo } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TipoVariable } from '../api/cuestionarios.types'

/**
 * Las preguntas de un bloque pintadas como la rejilla que son en el papel.
 *
 * <h3>Por qué no basta con la lista</h3>
 *
 * La pregunta 112 son quince actividades por nueve columnas —los siete días, el tiempo
 * y la intensidad—. Aplanada a una lista salen ciento treinta y siete campos en fila
 * india: «Caminar Lunes», «Caminar Martes», «Caminar Miércoles»… Para el personal que
 * cotejea una hoja ya contestada es incómodo; para el participante es peor, porque
 * **deja de reconocer su propia tabla** y tiene que reconstruir de memoria a qué
 * renglón pertenece cada campo.
 *
 * <h3>Lo que la rejilla no cambia</h3>
 *
 * Cada celda sigue siendo una pregunta con su propia respuesta: no se guarda distinto
 * ni se agrupa nada. Esto es presentación y nada más, y por eso recibe las celdas ya
 * resueltas en vez de adivinarlas aquí — quien decide qué va en cada hueco es el
 * catálogo, al cargarse.
 *
 * <h3>En pantallas angostas</h3>
 *
 * La tabla no se reflowea a tarjetas: se desplaza en horizontal con la columna de los
 * renglones fija. Partirla en tarjetas devolvería justo el problema que la rejilla
 * resuelve —una lista de celdas sueltas sin la tabla que las ordena—, y la columna fija
 * es lo que permite saber de qué renglón es lo que se está marcando.
 */

export interface CeldaRejilla {
  id: number
  fila: string
  columna: string
  tipo: TipoVariable
  opciones: Array<{ codigo: string; etiqueta: string }>
  /** Su pregunta llave la dejó fuera: se ve, pero no se contesta. */
  deshabilitada?: boolean
  /**
   * Lo que la celda tendría que decir del escáner, si hay algo que decir.
   *
   * En la lista, cada pregunta explica con todas sus letras por qué no tiene valor
   * —«el reconocimiento de escritura no estaba licenciado: el dato está en el papel»—.
   * En una rejilla no cabe ese texto, y perderlo sería lo peor de los dos mundos: la
   * celda se vería vacía y el capturista la tomaría por «no contestó» en vez de ir a
   * buscarla al papel. Así que se conserva como señal y el texto va en el título.
   */
  aviso?: string | null
}

interface Props {
  celdas: CeldaRejilla[]
  valores: Record<number, string>
  soloLectura?: boolean
  onChange: (idPregunta: number, valor: string) => void
}

export function RejillaPreguntas({ celdas, valores, soloLectura, onChange }: Props) {
  // El orden de filas y columnas es el de llegada, que es el del catálogo y por tanto
  // el del papel. Ordenarlas alfabéticamente pondría el domingo antes que el lunes.
  const { filas, columnas, porCelda } = useMemo(() => {
    const filas: string[] = []
    const columnas: string[] = []
    const porCelda = new Map<string, CeldaRejilla>()

    for (const c of celdas) {
      if (!filas.includes(c.fila)) filas.push(c.fila)
      if (!columnas.includes(c.columna)) columnas.push(c.columna)
      porCelda.set(`${c.fila}\u0000${c.columna}`, c)
    }
    return { filas, columnas, porCelda }
  }, [celdas])

  if (celdas.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[11rem] bg-muted/50 px-3 py-2 text-left font-medium"
            >
              <span className="sr-only">Renglón</span>
            </th>
            {columnas.map((c) => (
              <th
                key={c}
                scope="col"
                className="min-w-[5.5rem] px-2 py-2 text-center text-xs font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f} className="border-b last:border-0 even:bg-muted/20">
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-[16rem] truncate bg-background px-3 py-2 text-left font-normal even:bg-muted/20"
                title={f}
              >
                {f}
              </th>
              {columnas.map((c) => {
                const celda = porCelda.get(`${f}\u0000${c}`)
                return (
                  <td
                    key={c}
                    title={celda?.aviso ?? undefined}
                    className={cn(
                      'px-2 py-1.5 text-center align-middle',
                      celda?.aviso && 'bg-amber-100/70 dark:bg-amber-950/40',
                    )}
                  >
                    {celda
                      ? (
                        <Celda
                          celda={celda}
                          valor={valores[celda.id] ?? ''}
                          soloLectura={soloLectura}
                          onChange={(v) => onChange(celda.id, v)}
                        />
                      )
                      // Un hueco que la rejilla no tiene. Se deja vacío en vez de
                      // ponerle un control muerto: en el papel ahí no hay nada.
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Celda({ celda, valor, soloLectura, onChange }: {
  celda: CeldaRejilla
  valor: string
  soloLectura?: boolean
  onChange: (valor: string) => void
}) {
  const inerte = soloLectura || celda.deshabilitada

  if (celda.tipo === 'CASILLA' || celda.tipo === 'OPCION_MULTIPLE') {
    return (
      <Checkbox
        checked={valor !== '' && valor !== '0'}
        disabled={inerte}
        aria-label={`${celda.fila}, ${celda.columna}`}
        // El código de la casilla marcada sale del catálogo cuando lo hay: fijar un «1»
        // daría por sabido lo que decide el instrumento, y hay casillas que el volcado
        // escribe con 2.
        onCheckedChange={(marcada) =>
          onChange(marcada ? (celda.opciones[0]?.codigo ?? '1') : '')}
      />
    )
  }

  if (celda.opciones.length > 0) {
    return (
      <Select
        value={valor}
        disabled={inerte}
        // Un valor vacío no se puede representar como opción del Select, así que se
        // ofrece quitarlo con su propia entrada. Sin eso, una respuesta puesta por
        // error en una celda no obligatoria no se podría deshacer.
        onValueChange={(v) => onChange(v === '\u0000' ? '' : v)}
      >
        <SelectTrigger
          className={cn('h-8 w-full min-w-[5rem] text-xs', !valor && 'text-muted-foreground')}
          aria-label={`${celda.fila}, ${celda.columna}`}
        >
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {valor !== '' && (
            <SelectItem value={'\u0000'} className="text-muted-foreground">Sin respuesta</SelectItem>
          )}
          {celda.opciones.map((o) => (
            <SelectItem key={o.codigo} value={o.codigo} className="text-xs">
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      value={valor}
      disabled={inerte}
      aria-label={`${celda.fila}, ${celda.columna}`}
      className="h-8 min-w-[5rem] text-center text-xs"
      inputMode={celda.tipo === 'NUMERO' || celda.tipo === 'NUMERO_CON_ESCAPE'
        ? 'numeric' : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
