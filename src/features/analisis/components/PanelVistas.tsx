import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { BookmarkPlus, FolderOpen, Trash2 } from 'lucide-react'
import { useEliminarVista, useGuardarVista, useVistas } from '../hooks/useAnalisis'
import type { ConfigVista } from '../types/analisis.types'

interface Props {
  configActual: ConfigVista | null
  onCargar: (c: ConfigVista) => void
}

// Barra compacta de vistas guardadas: dos botones (Guardar · Abrir). El listado
// vive dentro de un popover para no ocupar altura en el riel del catálogo.
export function PanelVistas({ configActual, onCargar }: Props) {
  const { data: vistas = [] } = useVistas()
  const guardar = useGuardarVista()
  const eliminar = useEliminarVista()
  const [abierto, setAbierto] = useState(false)

  const onGuardar = () => {
    if (!configActual) return
    const nombre = window.prompt('Nombre de la vista')
    if (!nombre || !nombre.trim()) return
    guardar.mutate({ nombre: nombre.trim(), configuracion: JSON.stringify(configActual) })
  }

  const cargar = (configuracion: string) => {
    try {
      onCargar(JSON.parse(configuracion) as ConfigVista)
      setAbierto(false)
    } catch {
      /* configuración ilegible: se ignora */
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        className="h-9 gap-1.5 rounded-lg"
        onClick={onGuardar}
        disabled={!configActual || guardar.isPending}
        title="Guardar la configuración actual"
      >
        <BookmarkPlus className="h-4 w-4" /> Guardar
      </Button>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 gap-1.5 rounded-lg" title="Abrir una vista guardada">
            <FolderOpen className="h-4 w-4" /> Vistas{vistas.length ? ` (${vistas.length})` : ''}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          {vistas.length === 0 ? (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              Aún no hay vistas. Use «Guardar» para almacenar la configuración actual.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {vistas.map((v) => (
                <div key={v.uuid} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => cargar(v.configuracion)}
                    className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/90 hover:bg-primary/10 hover:text-foreground"
                  >
                    {v.nombre}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar.mutate(v.uuid)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar ${v.nombre}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
