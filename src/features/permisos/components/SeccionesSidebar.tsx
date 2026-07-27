import { useMemo } from 'react'
import { SECCIONES, esAccionActiva } from '@/config/permisoSecciones'

interface Props {
  activaId: string
  onSelect: (id: string) => void
  permisosActivos: Set<string>
}

export function SeccionesSidebar({ activaId, onSelect, permisosActivos }: Props) {
  const conteos = useMemo(() => {
    const m: Record<string, { activas: number; total: number }> = {}
    for (const sec of SECCIONES) {
      let total = 0
      let activas = 0
      for (const sub of sec.subsecciones) {
        for (const acc of sub.acciones) {
          total++
          if (esAccionActiva(acc, permisosActivos)) activas++
        }
      }
      m[sec.id] = { activas, total }
    }
    return m
  }, [permisosActivos])

  return (
    <div className="w-full lg:w-56 shrink-0 border-r border-border bg-muted/20">
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
          Módulos
        </p>
        <nav className="space-y-0.5">
          {SECCIONES.map((sec) => {
            const c = conteos[sec.id] ?? { activas: 0, total: 0 }
            const isActive = sec.id === activaId
            return (
              <button
                key={sec.id}
                onClick={() => onSelect(sec.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] transition-colors ${
                  isActive
                    ? 'bg-[var(--imss-green-500)]/15 text-[var(--imss-green-700)] dark:text-[var(--imss-green-500)] font-medium'
                    : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                <sec.icono className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{sec.nombre}</span>
                <span
                  className={`text-[10px] shrink-0 tabular-nums ${
                    c.activas === 0
                      ? 'text-muted-foreground'
                      : c.activas === c.total
                        ? 'text-[var(--imss-green-700)] dark:text-[var(--imss-green-500)] font-semibold'
                        : 'text-muted-foreground'
                  }`}
                >
                  {c.activas}/{c.total}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
