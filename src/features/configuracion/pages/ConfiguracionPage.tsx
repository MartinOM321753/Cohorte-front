import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AlertCircle, Pencil, Plus, PowerOff, Power } from 'lucide-react'
import EtiquetasConfigPanel from '../components/EtiquetasConfigPanel'
import HorariosConfigPanel from '../components/HorariosConfigPanel'
import { useGetAllUnidades, useCreateUnidad, useUpdateUnidad, useToggleUnidad } from '@/features/catalogos/hooks/useUnidades'
import { UnidadMedida } from '@/types/api'

// ─── Unidades admin sub-panel ─────────────────────────────────────────────────
function UnidadesPanel() {
  const { data: unidades = [], isLoading, isError } = useGetAllUnidades()
  const createMutation = useCreateUnidad()
  const updateMutation = useUpdateUnidad()
  const toggleMutation = useToggleUnidad()

  const [openCreate, setOpenCreate] = useState(false)
  const [createNombre, setCreateNombre] = useState('')
  const [createError, setCreateError] = useState('')

  const [editTarget, setEditTarget] = useState<UnidadMedida | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editError, setEditError] = useState('')

  const activas = unidades.filter((u) => u.activo)
  const inactivas = unidades.filter((u) => !u.activo)

  function handleCreate() {
    const trimmed = createNombre.trim()
    if (!trimmed) { setCreateError('El nombre es obligatorio'); return }
    if (trimmed.length > 30) { setCreateError('Máximo 30 caracteres'); return }
    setCreateError('')
    createMutation.mutate(
      { nombre: trimmed },
      {
        onSuccess: () => { setOpenCreate(false); setCreateNombre('') },
        onError: (err: any) => setCreateError(err?.response?.data?.message || 'Error al crear'),
      }
    )
  }

  function handleUpdate() {
    if (!editTarget) return
    const trimmed = editNombre.trim()
    if (!trimmed) { setEditError('El nombre es obligatorio'); return }
    if (trimmed.length > 30) { setEditError('Máximo 30 caracteres'); return }
    setEditError('')
    updateMutation.mutate(
      { id: editTarget.id, data: { nombre: trimmed } },
      {
        onSuccess: () => setEditTarget(null),
        onError: (err: any) => setEditError(err?.response?.data?.message || 'Error al actualizar'),
      }
    )
  }

  function openEdit(u: UnidadMedida) {
    setEditTarget(u)
    setEditNombre(u.nombre)
    setEditError('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Unidades de Medida</CardTitle>
            <CardDescription>
              Catálogo personalizado. Las unidades inactivas no se muestran en los formularios.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => { setCreateNombre(''); setCreateError(''); setOpenCreate(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva unidad
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando unidades…
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No se pudieron cargar las unidades.</AlertDescription>
            </Alert>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-28 text-center">Estado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activas.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="text-xs">Activa</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar nombre">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMutation.mutate(u.id)}
                        disabled={toggleMutation.isPending}
                        title="Desactivar"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {inactivas.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={3} className="bg-muted/30 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Inactivas ({inactivas.length})
                      </span>
                    </TableCell>
                  </TableRow>
                  {inactivas.map((u) => (
                    <TableRow key={u.id} className="opacity-60">
                      <TableCell className="font-mono">{u.nombre}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">Inactiva</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar nombre">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMutation.mutate(u.id)}
                            disabled={toggleMutation.isPending}
                            title="Activar"
                            className="text-muted-foreground hover:text-green-600"
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {unidades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Sin unidades registradas. Crea la primera.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* ── Modal crear ─────────── */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva unidad de medida</DialogTitle>
            <DialogDescription>
              Ingresa el nombre (p.ej. mg/dL, UI/mL, %). Máximo 30 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              placeholder="Ej. mg/dL"
              value={createNombre}
              maxLength={30}
              onChange={(e) => { setCreateNombre(e.target.value); setCreateError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className={createError ? 'border-destructive' : ''}
            />
            {createError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal editar ─────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar unidad</DialogTitle>
            <DialogDescription>
              Cambia el nombre de <span className="font-mono font-medium">{editTarget?.nombre}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              value={editNombre}
              maxLength={30}
              onChange={(e) => { setEditNombre(e.target.value); setEditError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              className={editError ? 'border-destructive' : ''}
            />
            {editError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {editError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Configuración</h1>
        <p className="section-subtitle">
          Configuración del sistema y ajustes generales de la aplicación
        </p>
      </div>

      <RoleGuard allowedRoles={['ADMINISTRADOR']}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Acceso restringido a administradores. Los cambios aquí afectan a todo el sistema.
          </AlertDescription>
        </Alert>

        {/* ── Unidades de medida ── */}
        <UnidadesPanel />

        <Separator />

        {/* ── Configuración de horario de citas ── */}
        <HorariosConfigPanel />

        <Separator />

        {/* ── Configuración de etiquetas ── */}
        <EtiquetasConfigPanel />

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
              <CardDescription>Detalles de la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm space-y-2">
              <div><strong>Aplicación:</strong> IMSS Cohorte</div>
              <div><strong>Versión:</strong> 1.0.0</div>
              <div><strong>Ambiente:</strong> Desarrollo</div>
              <div><strong>Ambiente:</strong> {import.meta.env.MODE}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Parámetros globales</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Nombre de la institución<br />
              ✓ Logo y colores<br />
              ✓ Configuración regional<br />
              ✓ Zona horaria
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios y Permisos</CardTitle>
              <CardDescription>Gestión de accesos</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Crear y gestionar usuarios<br />
              ✓ Asignar roles<br />
              ✓ Resetear contraseñas<br />
              ✓ Desactivar cuentas
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Respaldo y Mantenimiento</CardTitle>
              <CardDescription>Operaciones administrativas</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Generar respaldos<br />
              ✓ Ver logs del sistema<br />
              ✓ Limpiar caché<br />
              ✓ Revisar estadísticas
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Backend</CardTitle>
            <CardDescription>Configuración de conexión</CardDescription>
          </CardHeader>
          <CardContent className="text-slate-600 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>URL API:</strong><br/>
                {import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}
              </div>
              <div>
                <strong>Estado:</strong><br/>
                <span className="text-green-600">✓ Conectado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </RoleGuard>
    </div>
  )
}
