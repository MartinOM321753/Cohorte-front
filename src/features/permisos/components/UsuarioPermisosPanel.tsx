import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Plus, Trash2, X, Sparkles, Code2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
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
import {
  usePermisosUsuario,
  useRolesConPermisos,
  useAsignarRol,
  useQuitarRol,
  useQuitarPermisoIndividual,
} from '../hooks/usePermisos'
import { ModuloPermisosEditor } from './ModuloPermisosEditor'
import { ModoAvanzado } from './ModoAvanzado'
import { codigoAEtiqueta } from '@/config/permisoLabels'
import { ROL_LABELS, getRolBadgeClass } from '@/features/usuarios/types/usuario.types'
import { formatDate } from '@/lib/utils'

interface Props {
  uuid: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsuarioPermisosPanel({ uuid, open, onOpenChange }: Props) {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('PERMISOS_EDITAR'))
  const { data: resumen, isLoading } = usePermisosUsuario(open ? uuid : null)
  const { data: allRoles } = useRolesConPermisos()
  const asignarMut = useAsignarRol(uuid ?? '')
  const quitarRolMut = useQuitarRol(uuid ?? '')
  const quitarIndMut = useQuitarPermisoIndividual(uuid ?? '')

  const [addRolId, setAddRolId] = useState<string>('')
  const [modoAvanzado, setModoAvanzado] = useState(false)

  const availableRoles = (allRoles ?? []).filter(
    (r) => !resumen?.roles.some((ur) => ur.idRol === r.id) && r.nombre !== 'PACIENTE',
  )

  // Set inmutable de permisos efectivos actuales (solo lectura)
  const permisosEfectivos = useMemo(() => {
    const s = new Set<string>()
    resumen?.permisosEfectivos.forEach((p) => s.add(p.codigo))
    return s
  }, [resumen])

  function handleAsignarRol() {
    if (!addRolId) return
    asignarMut.mutate({ idRol: Number(addRolId) }, { onSuccess: () => setAddRolId('') })
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[860px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-[15px]">
              {resumen ? `${resumen.nombreCompleto || resumen.username}` : 'Cargando…'}
            </SheetTitle>
            {resumen && (
              <p className="text-[12px] text-muted-foreground font-mono">
                {resumen.username} · {resumen.uuid.slice(0, 8)}
              </p>
            )}
          </SheetHeader>

          {isLoading && <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>}

          {resumen && (
            <div className="space-y-6 px-6 py-4">
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
                      {puedeEditar && (
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
                      )}
                    </div>
                  ))}
                </div>

                {puedeEditar && availableRoles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={addRolId} onValueChange={setAddRolId}>
                      <SelectTrigger className="h-8 text-[12px] w-[220px]">
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

              {/* ── Permisos por módulo (conceder / restringir en la misma vista) ── */}
              <section className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => setModoAvanzado((v) => !v)}
                  >
                    {modoAvanzado ? (
                      <><Sparkles className="h-3.5 w-3.5" /> Vista por módulos</>
                    ) : (
                      <><Code2 className="h-3.5 w-3.5" /> Modo avanzado</>
                    )}
                  </Button>
                </div>

                {modoAvanzado ? (
                  <>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 flex items-start gap-2 text-[11px]">
                      <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-amber-800 dark:text-amber-300">
                        Vista de solo lectura de la lista cruda de permisos. Para conceder o restringir,
                        vuelve a la vista por módulos.
                      </p>
                    </div>
                    <ModoAvanzado
                      permisosActivos={permisosEfectivos}
                      onChange={() => { /* read-only */ }}
                      readOnly
                    />
                  </>
                ) : uuid && (
                  <ModuloPermisosEditor uuid={uuid} resumen={resumen} puedeEditar={puedeEditar} />
                )}
              </section>

              <Separator />

              {/* ── Resumen de permisos individuales activos ── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Permisos individuales
                  </h3>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={pi.tipo === 'RESTRICCION' ? 'destructive' : 'default'} className="text-[10px]">
                              {pi.tipo === 'CONCESION' ? 'Concedido' : 'Restringido'}
                            </Badge>
                            <span className="text-[12px] font-medium">{codigoAEtiqueta(pi.codigoPermiso)}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{pi.codigoPermiso}</span>
                          </div>
                          {pi.motivo && <p className="mt-1 text-muted-foreground">{pi.motivo}</p>}
                          <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                            {pi.fechaFin && <span>Expira: {formatDate(pi.fechaFin)}</span>}
                            {pi.otorgadoPorUsername && <span>Por: {pi.otorgadoPorUsername}</span>}
                          </div>
                        </div>
                        {puedeEditar && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => quitarIndMut.mutate(pi.id)}
                            disabled={quitarIndMut.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
