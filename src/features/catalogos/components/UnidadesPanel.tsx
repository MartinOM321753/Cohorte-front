import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/tables/DataTable'
import { useGetAllUnidades, useCreateUnidad, useUpdateUnidad, useToggleUnidad } from '../hooks/useUnidades'
import { useAuthStore } from '@/stores/authStore'
import { UnidadMedida } from '@/types/api'

export function UnidadesPanel() {
  const canEdit = useAuthStore((s) => s.hasPermiso('CATALOGOS_EDITAR'))
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

  // Activas primero, luego inactivas
  const sorted = [...unidades].sort((a, b) => Number(b.activo) - Number(a.activo))

  const columns: ColumnDef<UnidadMedida>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-mono text-[13px] font-medium">{row.original.nombre}</span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.activo ? (
          <Badge variant="default" className="text-[11px]">Activa</Badge>
        ) : (
          <Badge variant="outline" className="text-[11px]">Inactiva</Badge>
        ),
    },
    ...(canEdit ? [{
      id: 'acciones',
      header: '',
      cell: ({ row }: { row: { original: UnidadMedida } }) => {
        const u = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} title="Editar nombre">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => toggleMutation.mutate(u.id)}
              disabled={toggleMutation.isPending}
              title={u.activo ? 'Desactivar' : 'Activar'}
            >
              {u.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )
      },
    }] as ColumnDef<UnidadMedida>[] : []),
  ]

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
          {canEdit && (
            <Button size="sm" onClick={() => { setCreateNombre(''); setCreateError(''); setOpenCreate(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva unidad
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando unidades…
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No se pudieron cargar las unidades.</AlertDescription>
          </Alert>
        ) : (
          <DataTable
            columns={columns}
            data={sorted}
            pageSize={8}
            getRowClassName={(u) => (!u.activo ? 'opacity-60' : '')}
            emptyMessage="Sin unidades registradas. Crea la primera."
          />
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
