import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Check, X, CheckCircle2, XCircle, Tag } from 'lucide-react'
import {
  useGetTiposInstitucionTodas,
  useCreateTipoInstitucion,
  useUpdateTipoInstitucion,
  useToggleTipoInstitucion,
} from '../hooks/useInstituciones'
import { TipoInstitucionCatalogo } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Administra el catálogo configurable de tipos de institución (IMSS, INSP, Hospital, etc.). */
export function TiposInstitucionModal({ open, onOpenChange }: Props) {
  const { data: tipos = [], isLoading } = useGetTiposInstitucionTodas({ enabled: open })
  const createMutation = useCreateTipoInstitucion()
  const updateMutation = useUpdateTipoInstitucion()
  const toggleMutation = useToggleTipoInstitucion()

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNombre, setEditingNombre] = useState('')

  const handleCreate = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    await createMutation.mutateAsync({ nombre })
    setNuevoNombre('')
  }

  const startEdit = (tipo: TipoInstitucionCatalogo) => {
    setEditingId(tipo.id)
    setEditingNombre(tipo.nombre)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingNombre('')
  }

  const handleSaveEdit = async (id: number) => {
    const nombre = editingNombre.trim()
    if (!nombre) return
    await updateMutation.mutateAsync({ id, data: { nombre } })
    cancelEdit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Tipos de institución
          </DialogTitle>
          <DialogDescription>
            Catálogo configurable usado para clasificar instituciones (IMSS, INSP, Hospital, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Nombre del nuevo tipo…"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            maxLength={60}
          />
          <Button onClick={handleCreate} disabled={!nuevoNombre.trim() || createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : tipos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay tipos registrados todavía.</p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {tipos.map((tipo) => (
              <div key={tipo.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                {editingId === tipo.id ? (
                  <>
                    <Input
                      value={editingNombre}
                      onChange={(e) => setEditingNombre(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(tipo.id) }}
                      maxLength={60}
                      className="h-8"
                      autoFocus
                    />
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(tipo.id)} title="Guardar">
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit} title="Cancelar">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{tipo.nombre}</span>
                      <Badge variant={tipo.activo ? 'default' : 'secondary'} className="text-[10px]">
                        {tipo.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(tipo)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleMutation.mutate(tipo.id)}
                        title={tipo.activo ? 'Desactivar' : 'Activar'}
                      >
                        {tipo.activo
                          ? <XCircle className="h-4 w-4 text-destructive" />
                          : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
