import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Save, Sparkles, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useActualizarPermisosRol } from '../hooks/usePermisos'
import { SECCIONES, limpiarPermisosHuerfanos } from '@/config/permisoSecciones'
import { SeccionEditor } from './SeccionEditor'
import { SeccionesSidebar } from './SeccionesSidebar'
import { ModoAvanzado } from './ModoAvanzado'
import type { RolConPermisosDTO } from '../types/permiso.types'

interface Props {
  rol: RolConPermisosDTO
  onSaved: () => void
}

export function RolPermisoEditor({ rol, onSaved }: Props) {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('PERMISOS_EDITAR'))
  const mutation = useActualizarPermisosRol()
  const esRolPaciente = rol.nombre === 'PACIENTE'
  const readOnly = esRolPaciente || !puedeEditar

  const initialCodes = useMemo(
    () => limpiarPermisosHuerfanos(new Set(rol.permisos.map((p) => p.codigo))),
    [rol.permisos],
  )
  const [selected, setSelected] = useState<Set<string>>(initialCodes)
  const [seccionActiva, setSeccionActiva] = useState<string>(SECCIONES[0].id)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [modoAvanzado, setModoAvanzado] = useState(false)

  const isDirty = useMemo(() => {
    if (selected.size !== initialCodes.size) return true
    for (const c of selected) if (!initialCodes.has(c)) return true
    return false
  }, [selected, initialCodes])

  function toggleExpandida(id: string) {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    const limpio = limpiarPermisosHuerfanos(selected)
    mutation.mutate(
      { idRol: rol.id, body: { codigosPermisos: Array.from(limpio) } },
      { onSuccess: onSaved },
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header con toggle */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2 text-[12px]">
            {esRolPaciente && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                Solo lectura · gestionado por el sistema
              </Badge>
            )}
            <span className="text-muted-foreground">
              {selected.size} permisos activos
            </span>
            {isDirty && !readOnly && (
              <Badge variant="outline" className="text-[10px]">Cambios sin guardar</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] gap-1"
              onClick={() => setModoAvanzado((v) => !v)}
            >
              {modoAvanzado ? (
                <><Sparkles className="h-3.5 w-3.5" /> Vista por secciones</>
              ) : (
                <><Code2 className="h-3.5 w-3.5" /> Modo avanzado</>
              )}
            </Button>
            <Button
              size="sm"
              disabled={!isDirty || mutation.isPending || readOnly}
              onClick={handleSave}
              className="h-7 text-[11px]"
            >
              {mutation.isPending ? <Spinner className="h-3.5 w-3.5 mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Guardar
            </Button>
          </div>
        </div>

        {/* Body */}
        {modoAvanzado ? (
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <ModoAvanzado
              permisosActivos={selected}
              onChange={setSelected}
              readOnly={readOnly}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row min-h-[500px]">
            <SeccionesSidebar
              activaId={seccionActiva}
              onSelect={setSeccionActiva}
              permisosActivos={selected}
            />
            <div className="flex-1 p-5 max-h-[70vh] overflow-y-auto">
              <SeccionEditor
                seccionActiva={seccionActiva}
                permisosActivos={selected}
                onChange={setSelected}
                expandidas={expandidas}
                onToggleExpandida={toggleExpandida}
                readOnly={readOnly}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
