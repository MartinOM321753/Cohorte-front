import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useGetParametrosByTipo } from '@/features/estudios/hooks/useEstudios'
import { useGetExamenes } from '@/features/estudios/hooks/useExamenes'
import { cn } from '@/lib/utils'

/** De dónde salen las filas que se pueden marcar. */
export type OrigenSeleccion =
  | { tipo: 'estudio'; idTipoEstudio: number | null }
  | { tipo: 'examenes' }

interface Props {
  origen: OrigenSeleccion
  /** Ids elegidos. Vacío significa «todos», no «ninguno». */
  seleccion: number[]
  onCambiar: (seleccion: number[]) => void
}

/** Una fila marcable, venga de donde venga. */
interface Opcion {
  id: number
  nombre: string
  unidad?: string
  activo?: boolean
}

/**
 * Qué filas muestra un bloque: los parámetros de un estudio o los analitos de
 * laboratorio.
 *
 * <p>La lista vacía significa <b>todos</b>, y es lo que conviene por defecto: una
 * plantilla que no elige nada sigue funcionando cuando al catálogo se le añade un
 * parámetro, en lugar de dejarlo fuera para siempre sin que nadie lo note.</p>
 */
export function SelectorParametros({ origen, seleccion, onCambiar }: Props) {
  const esEstudio = origen.tipo === 'estudio'
  const idTipo = esEstudio ? origen.idTipoEstudio : null

  const parametros = useGetParametrosByTipo(idTipo)
  const examenes = useGetExamenes()

  const cargando = esEstudio ? parametros.isLoading : examenes.isLoading

  const lista: Opcion[] = esEstudio
    ? (parametros.data ?? []).map((p) => ({
        id: p.id, nombre: p.nombre, unidad: p.unidad, activo: p.activo,
      }))
    : (examenes.data ?? []).map((e) => ({
        id: e.id, nombre: e.nombreExamen, unidad: e.unidad, activo: e.activo,
      }))

  if (esEstudio && idTipo == null) {
    return (
      <p className="text-[11px] leading-tight text-muted-foreground">
        Este bloque no dice de qué estudio sale, así que muestra todo lo que el estudio
        haya medido.
      </p>
    )
  }

  if (cargando) {
    return <p className="text-[11px] text-muted-foreground">Cargando…</p>
  }

  if (lista.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {esEstudio ? 'Ese tipo de estudio no tiene parámetros.' : 'No hay exámenes en el catálogo.'}
      </p>
    )
  }

  const todos = seleccion.length === 0

  function alternar(id: number) {
    // Al tocar el primero se parte de «todos», que es la lista completa: si se
    // partiera de vacío, marcar uno significaría lo contrario de lo que parece.
    const base = todos ? lista.map((p) => p.id) : seleccion
    const nueva = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    // Si acaban marcados todos, se vuelve a «todos» para que la plantilla siga
    // recogiendo lo que se añada más adelante.
    onCambiar(nueva.length === lista.length ? [] : nueva)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {todos ? 'Se muestran todos' : `${seleccion.length} de ${lista.length}`}
        </span>
        {!todos && (
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
                  onClick={() => onCambiar([])}>
            Mostrar todos
          </Button>
        )}
      </div>

      <div className="max-h-52 space-y-1 overflow-auto rounded-md border p-2">
        {lista.map((p) => {
          const marcado = todos || seleccion.includes(p.id)
          return (
            <label key={p.id}
                   className={cn('flex items-start gap-2 text-[12px]', p.activo === false && 'opacity-60')}>
              <Checkbox checked={marcado} onCheckedChange={() => alternar(p.id)} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block truncate">
                  {p.nombre}{p.unidad ? ` (${p.unidad})` : ''}
                </span>
                {p.activo === false && (
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    Fuera de uso — solo aparecerá si ya se midió
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
