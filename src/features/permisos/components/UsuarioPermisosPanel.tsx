import { useState } from 'react'
import { Plus, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { usePermisosUsuario, useRolesConPermisos, useAsignarRol, useQuitarRol, useQuitarPermisoIndividual } from '../hooks/usePermisos'
import type { PermisoEfectivoDTO } from '../types/permiso.types'
import { PermisoEfectivoBadge } from './PermisoEfectivosBadge'
import { ConcesionFormModal } from './ConcesionFormModal'
import { ROL_LABELS, getRolBadgeClass } from '@/features/usuarios/types/usuario.types'
import { formatDate } from '@/lib/utils'

interface Props {
  uuid: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsuarioPermisosPanel({ uuid, open, onOpenChange }: Props) {
  const { data: resumen, isLoading } = usePermisosUsuario(open ? uuid : null)
  const { data: allRoles } = useRolesConPermisos()
  const asignarMut = useAsignarRol(uuid ?? '')
  const quitarRolMut = useQuitarRol(uuid ?? '')
  const quitarIndMut = useQuitarPermisoIndividual(uuid ?? '')

  const [addRolId, setAddRolId] = useState<string>('')
  const [concesionOpen, setConcesionOpen] = useState(false)
  const [restriccionOpen, setRestriccionOpen] = useState(false)

  const availableRoles = (allRoles ?? []).filter(
    (r) => !resumen?.roles.some((ur) => ur.idRol === r.id),
  )

  function handleAsignarRol() {
    if (!addRolId) return
    asignarMut.mutate({ idRol: Number(addRolId) }, { onSuccess: () => setAddRolId('') })
  }

  // Group effective permissions by module
  const grouped = (resumen?.permisosEfectivos ?? []).reduce<Record<string, PermisoEfectivoDTO[]>>(
    (acc, p) => {
      ;(acc[p.modulo] ??= []).push(p)
      return acc
    },
    {},
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[15px]">
              {resumen ? `${resumen.nombreCompleto || resumen.username}` : 'Cargando...'}
            </SheetTitle>
            {resumen && (
              <p className="text-[12px] text-muted-foreground font-mono">{resumen.username} · {resumen.uuid.slice(0, 8)}</p>
            )}
          </SheetHeader>

          {isLoading && <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>}

          {resumen && (
            <div className="space-y-6 px-4 py-4">
              {/* ── Roles asignados ── */}
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Roles asignados
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {resumen.roles.map((r) => (
                    <div key={r.idUsuarioRol} className="flex items-center gap-1">
                      <Badge className={getRolBadgeClass(r.nombre) + ' text-[11px]'}>
                        {ROL_LABELS[r.nombre] ?? r.nombre}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Quitar rol {r.nombre}</AlertDialogTitle>
                            <AlertDialogDescription>
                              El usuario perderá todos los permisos heredados de este rol.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => quitarRolMut.mutate(r.idRol)}>
                              Quitar rol
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>

                {availableRoles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={addRolId} onValueChange={setAddRolId}>
                      <SelectTrigger className="h-8 text-[12px] w-[200px]">
                        <SelectValue placeholder="Agregar rol..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {ROL_LABELS[r.nombre] ?? r.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8" disabled={!addRolId || asignarMut.isPending} onClick={handleAsignarRol}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Asignar
                    </Button>
                  </div>
                )}
              </section>

              <Separator />

              {/* ── Permisos individuales ── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Permisos individuales
                  </h3>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setConcesionOpen(true)}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Conceder
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" onClick={() => setRestriccionOpen(true)}>
                      <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Restringir
                    </Button>
                  </div>
                </div>

                {resumen.permisosIndividuales.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic py-2">Sin permisos individuales</p>
                ) : (
                  <div className="space-y-2">
                    {resumen.permisosIndividuales.map((pi) => (
                      <div
                        key={pi.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-[12px] ${
                          pi.tipo === 'RESTRICCION' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={pi.tipo === 'RESTRICCION' ? 'destructive' : 'default'} className="text-[10px]">
                              {pi.tipo === 'CONCESION' ? 'Concedido' : 'Restringido'}
                            </Badge>
                            <span className="font-mono text-[11px]">{pi.codigoPermiso}</span>
                          </div>
                          {pi.motivo && <p className="mt-1 text-muted-foreground">{pi.motivo}</p>}
                          <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                            {pi.fechaFin && <span>Expira: {formatDate(pi.fechaFin)}</span>}
                            {pi.otorgadoPorUsername && <span>Por: {pi.otorgadoPorUsername}</span>}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => quitarIndMut.mutate(pi.id)}
                          disabled={quitarIndMut.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* ── Permisos efectivos ── */}
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Permisos efectivos ({resumen.permisosEfectivos.length})
                </h3>
                <div className="space-y-3">
                  {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([modulo, permisos]) => (
                      <div key={modulo}>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">{modulo}</p>
                        <div className="space-y-0.5 pl-2">
                          {permisos.map((p) => (
                            <PermisoEfectivoBadge key={p.codigo} permiso={p} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {uuid && (
        <>
          <ConcesionFormModal uuid={uuid} tipo="CONCESION" open={concesionOpen} onOpenChange={setConcesionOpen} />
          <ConcesionFormModal uuid={uuid} tipo="RESTRICCION" open={restriccionOpen} onOpenChange={setRestriccionOpen} />
        </>
      )}
    </>
  )
}
