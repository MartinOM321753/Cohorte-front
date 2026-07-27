import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useRolesConPermisos } from '../hooks/usePermisos'
import { RolPermisoEditor } from './RolPermisoEditor'
import { ROL_LABELS, getRolBadgeClass } from '@/features/usuarios/types/usuario.types'


export function RolesTab() {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('PERMISOS_EDITAR'))
  const { data: roles, isLoading, refetch } = useRolesConPermisos()
  const [expandedRol, setExpandedRol] = useState<number | null>(null)

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
  }

  if (!roles || roles.length === 0) {
    return <p className="py-8 text-center text-muted-foreground text-[13px]">No hay roles registrados.</p>
  }

  return (
    <div className="space-y-3">
      {roles.map((rol) => {
        const expanded = expandedRol === rol.id
        return (
          <div key={rol.id} className="rounded-lg border border-border bg-card">
            <button
              onClick={() => setExpandedRol(expanded ? null : rol.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-[14px] font-semibold">{ROL_LABELS[rol.nombre] ?? rol.nombre}</span>
                <Badge className={getRolBadgeClass(rol.nombre) + ' text-[11px]'}>
                  {rol.nombre}
                </Badge>
                <span className="text-[12px] text-muted-foreground">
                  {rol.permisos.length} permisos
                </span>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expanded && puedeEditar && (
              <div className="border-t border-border p-5">
                <RolPermisoEditor
                  rol={rol}
                  onSaved={() => refetch()}
                />
              </div>
            )}
            {expanded && !puedeEditar && (
              <div className="border-t border-border p-5">
                <p className="text-xs text-muted-foreground">
                  {rol.permisos.length} permisos asignados. No tienes permiso para editarlos.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
