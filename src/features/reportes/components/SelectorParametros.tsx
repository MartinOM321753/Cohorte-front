import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useGetParametrosByTipo } from '@/features/estudios/hooks/useEstudios'
import { cn } from '@/lib/utils'

interface Props {
  idTipoEstudio: number | null
  /** Ids elegidos. Vacío significa «todos», no «ninguno». */
  seleccion: number[]
  onCambiar: (seleccion: number[]) => void
}

/**
 * Qué parámetros muestra un bloque de resultados.
 *
 * <p>La lista vacía significa <b>todos</b>, y es lo que conviene por defecto: una
 * plantilla que no elige nada sigue funcionando cuando al catálogo se le añade un
 * parámetro, en lugar de dejarlo fuera para siempre sin que nadie lo note.</p>
 */
export function SelectorParametros({ idTipoEstudio, seleccion, onCambiar }: Props) {
  const { data: parametros, isLoading } = useGetParametrosByTipo(idTipoEstudio)

  if (idTipoEstudio == null) {
    return (
      <p className="text-[11px] leading-tight text-muted-foreground">
        Esta plantilla no está ligada a un tipo de estudio, así que el bloque muestra
        todo lo que cada estudio haya medido. Para poder elegir parámetros, liga la
        plantilla a un tipo.
      </p>
    )
  }

  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground">Cargando parámetros…</p>
  }

  const lista = parametros ?? []
  if (lista.length === 0) {
    return <p className="text-[11px] text-muted-foreground">Ese tipo de estudio no tiene parámetros.</p>
  }

  const todos = seleccion.length === 0

  function alternar(id: number) {
    // Al tocar el primero se parte de «todos», que es la lista completa: si se
    // partiera de vacío, marcar uno significaría lo contrario de lo que parece.
    const base = todos ? lista.map((p) => p.id) : seleccion
    const nueva = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    // Si acaban marcados todos, se vuelve a «todos» para que la plantilla siga
    // recogiendo los parámetros que se añadan más adelante.
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
                    Fuera de uso — solo aparecerá en estudios que ya lo midieron
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
