import { useMemo } from 'react'
import { Link2, ChevronDown, Lock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  SECCIONES,
  type Seccion,
  type Accion,
  type Subseccion,
  esAccionActiva,
  esAccionCompartida,
  esAccionImprescindibleBloqueada,
  esPermisoRequeridoPorOtraAccion,
  getUbicacionesDePermiso,
} from '@/config/permisoSecciones'

interface Props {
  /** Sección actualmente seleccionada en el sidebar */
  seccionActiva: string
  /** Códigos de permisos actualmente activos */
  permisosActivos: Set<string>
  /** Se llama con el nuevo Set completo tras cualquier cambio */
  onChange: (nuevo: Set<string>) => void
  /** Sub-secciones expandidas (id compuesto: `seccionId:subseccionId`) */
  expandidas: Set<string>
  onToggleExpandida: (id: string) => void
  /** Modo lectura para roles que no deben editarse (ej. PACIENTE) */
  readOnly?: boolean
}

export function SeccionEditor({
  seccionActiva,
  permisosActivos,
  onChange,
  expandidas,
  onToggleExpandida,
  readOnly = false,
}: Props) {
  const seccion = useMemo<Seccion | undefined>(
    () => SECCIONES.find((s) => s.id === seccionActiva),
    [seccionActiva],
  )

  if (!seccion) {
    return <div className="p-6 text-[13px] text-muted-foreground">Selecciona una sección</div>
  }

  function toggleAccion(sub: Subseccion, accion: Accion) {
    if (readOnly) return
    if (esAccionImprescindibleBloqueada(sub, accion, permisosActivos)) return
    const activa = esAccionActiva(accion, permisosActivos)
    const next = new Set(permisosActivos)
    if (activa) {
      accion.permisos.forEach((p) => {
        if (esPermisoRequeridoPorOtraAccion(p, seccion!.id, sub.id, accion.id, permisosActivos)) return
        next.delete(p)
      })
    } else {
      accion.permisos.forEach((p) => next.add(p))
    }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <seccion.icono className="h-5 w-5 text-[var(--imss-green-500)]" />
          <h2 className="text-[16px] font-semibold">{seccion.nombre}</h2>
        </div>
        <p className="text-[12px] text-muted-foreground">{seccion.descripcion}</p>
      </div>

      <div className="space-y-3">
        {seccion.subsecciones.map((sub) => {
          const subKey = `${seccion.id}:${sub.id}`
          const expanded = expandidas.has(subKey)
          const total = sub.acciones.length
          const activas = sub.acciones.filter((a) => esAccionActiva(a, permisosActivos)).length

          return (
            <div key={sub.id} className="rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => onToggleExpandida(subKey)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[13px] font-semibold truncate">{sub.nombre}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {activas}/{total}
                  </Badge>
                  {sub.descripcion && (
                    <span className="text-[11px] text-muted-foreground truncate hidden md:inline">
                      · {sub.descripcion}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>

              {expanded && (
                <div className="border-t border-border px-4 py-2 space-y-1">
                  {sub.acciones.map((accion) => {
                    const activa = esAccionActiva(accion, permisosActivos)
                    const bloqueada = esAccionImprescindibleBloqueada(sub, accion, permisosActivos)
                    const compartida = accion.permisos.some((p) => esAccionCompartida(p))
                    const otrasUbicaciones = compartida
                      ? accion.permisos.flatMap((p) =>
                          getUbicacionesDePermiso(p).filter(
                            (u) => u.seccionId !== seccion.id || u.subseccionId !== sub.id || u.accionId !== accion.id,
                          ),
                        )
                      : []

                    return (
                      <label
                        key={accion.id}
                        className={`flex items-start gap-3 py-2 px-2 -mx-2 rounded transition-colors ${
                          readOnly
                            ? 'cursor-default opacity-70'
                            : bloqueada
                              ? 'cursor-not-allowed bg-emerald-500/5'
                              : 'cursor-pointer hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          checked={activa}
                          onCheckedChange={() => toggleAccion(sub, accion)}
                          disabled={readOnly || bloqueada}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px]">{accion.label}</span>
                            {bloqueada && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                                    <Lock className="h-3 w-3" />
                                    Imprescindible
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-[11px]">
                                    Este permiso es la base de la sub-sección. No se puede quitar
                                    mientras hay otras acciones activas — sin él, la vista falla al
                                    cargar. Para removerlo desmarca primero las demás acciones.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {accion.imprescindible && !bloqueada && !activa && (
                              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium">
                                Base de la sub-sección
                              </span>
                            )}
                            {compartida && otrasUbicaciones.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                                    <Link2 className="h-3 w-3" />
                                    Compartido
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-[11px] font-semibold mb-1">
                                    Permiso compartido — al desactivar, se preserva si otra acción lo necesita:
                                  </p>
                                  <ul className="text-[11px] space-y-0.5">
                                    {otrasUbicaciones.slice(0, 6).map((u, i) => (
                                      <li key={i}>
                                        • {u.seccionNombre} → {u.subseccionNombre} → {u.accionLabel}
                                      </li>
                                    ))}
                                    {otrasUbicaciones.length > 6 && (
                                      <li className="italic">+ {otrasUbicaciones.length - 6} más</li>
                                    )}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {accion.descripcion && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{accion.descripcion}</p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
