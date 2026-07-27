import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { useCatalogo } from '../hooks/usePermisos'
import { detectarPermisosNoCategorizados } from '@/config/permisoSecciones'
import { moduloAEtiqueta } from '@/config/permisoLabels'

interface Props {
  permisosActivos: Set<string>
  onChange: (nuevo: Set<string>) => void
  readOnly?: boolean
}

export function ModoAvanzado({ permisosActivos, onChange, readOnly = false }: Props) {
  const { data: catalogo } = useCatalogo()

  const modulos = useMemo(() => {
    if (!catalogo) return []
    return Object.entries(catalogo).sort(([a], [b]) => a.localeCompare(b))
  }, [catalogo])

  const noCategorizados = useMemo(() => {
    if (!catalogo) return []
    const todos: string[] = []
    Object.values(catalogo).forEach((permisos) => {
      permisos.forEach((p) => todos.push(p.codigo))
    })
    return detectarPermisosNoCategorizados(todos)
  }, [catalogo])

  function togglePermiso(codigo: string) {
    if (readOnly) return
    const next = new Set(permisosActivos)
    if (next.has(codigo)) next.delete(codigo)
    else next.add(codigo)
    onChange(next)
  }

  if (!catalogo) return null

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-2 text-[12px]">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">Modo avanzado</p>
          <p className="text-amber-700 dark:text-amber-400 mt-0.5">
            Lista cruda de permisos por código. Úsalo solo si necesitas ajustar permisos que no están en el mapa de secciones.
            {noCategorizados.length > 0 && (
              <> Detectados <strong>{noCategorizados.length}</strong> permisos no categorizados en el mapa.</>
            )}
          </p>
        </div>
      </div>

      {modulos.map(([modulo, permisos]) => (
        <div key={modulo} className="rounded-lg border border-border">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
            <span className="text-[13px] font-semibold">{moduloAEtiqueta(modulo)}</span>
            <span className="ml-2 text-[11px] text-muted-foreground font-mono">{modulo}</span>
          </div>
          <div className="px-4 py-2 space-y-1">
            {permisos.map((p) => (
              <label
                key={p.codigo}
                className={`flex items-center gap-3 py-1.5 rounded px-2 -mx-2 ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-muted/30'}`}
              >
                <Checkbox
                  checked={permisosActivos.has(p.codigo)}
                  onCheckedChange={() => togglePermiso(p.codigo)}
                  disabled={readOnly}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] font-mono text-muted-foreground">{p.codigo}</span>
                  {p.descripcion && (
                    <span className="ml-2 text-[12px]">— {p.descripcion}</span>
                  )}
                </div>
                {noCategorizados.includes(p.codigo) && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                    Sin sección
                  </Badge>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
