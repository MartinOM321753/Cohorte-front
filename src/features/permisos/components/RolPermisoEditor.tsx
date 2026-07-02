import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useCatalogo, useActualizarPermisosRol } from '../hooks/usePermisos'
import type { RolConPermisosDTO, PermisoDTO } from '../types/permiso.types'

interface Props {
  rol: RolConPermisosDTO
  onSaved: () => void
}

export function RolPermisoEditor({ rol, onSaved }: Props) {
  const { data: catalogo, isLoading } = useCatalogo()
  const mutation = useActualizarPermisosRol()

  const initialCodes = useMemo(() => new Set(rol.permisos.map((p) => p.codigo)), [rol.permisos])
  const [selected, setSelected] = useState<Set<string>>(initialCodes)
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set())

  const modulos = useMemo(() => {
    if (!catalogo) return []
    return Object.entries(catalogo).sort(([a], [b]) => a.localeCompare(b))
  }, [catalogo])

  const isDirty = useMemo(() => {
    if (selected.size !== initialCodes.size) return true
    for (const c of selected) if (!initialCodes.has(c)) return true
    return false
  }, [selected, initialCodes])

  function togglePermiso(codigo: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function toggleModulo(_modulo: string, permisos: PermisoDTO[]) {
    const codes = permisos.map((p) => p.codigo)
    const allSelected = codes.every((c) => selected.has(c))
    setSelected((prev) => {
      const next = new Set(prev)
      codes.forEach((c) => (allSelected ? next.delete(c) : next.add(c)))
      return next
    })
  }

  function toggleExpand(modulo: string) {
    setExpandedModulos((prev) => {
      const next = new Set(prev)
      if (next.has(modulo)) next.delete(modulo)
      else next.add(modulo)
      return next
    })
  }

  function handleSave() {
    mutation.mutate(
      { idRol: rol.id, body: { codigosPermisos: Array.from(selected) } },
      { onSuccess: onSaved },
    )
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>

  return (
    <div className="space-y-3">
      {modulos.map(([modulo, permisos]) => {
        const selectedCount = permisos.filter((p) => selected.has(p.codigo)).length
        const expanded = expandedModulos.has(modulo)

        return (
          <div key={modulo} className="rounded-lg border border-border">
            <button
              onClick={() => toggleExpand(modulo)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedCount === permisos.length}
                  onCheckedChange={() => toggleModulo(modulo, permisos)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-[13px] font-semibold">{modulo}</span>
                <Badge variant="secondary" className="text-[11px]">
                  {selectedCount}/{permisos.length}
                </Badge>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expanded && (
              <div className="border-t border-border px-4 py-2 space-y-1">
                {permisos.map((p) => (
                  <label key={p.codigo} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/30 rounded px-2 -mx-2">
                    <Checkbox
                      checked={selected.has(p.codigo)}
                      onCheckedChange={() => togglePermiso(p.codigo)}
                    />
                    <div className="min-w-0">
                      <span className="text-[12px] font-mono text-muted-foreground">{p.codigo}</span>
                      {p.descripcion && (
                        <span className="ml-2 text-[12px] text-muted-foreground">— {p.descripcion}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex justify-end pt-2">
        <Button
          size="sm"
          disabled={!isDirty || mutation.isPending}
          onClick={handleSave}
        >
          {mutation.isPending ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar permisos
        </Button>
      </div>
    </div>
  )
}
