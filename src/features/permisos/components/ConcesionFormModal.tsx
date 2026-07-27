import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useCatalogo, useConcederPermiso, useRestringirPermiso } from '../hooks/usePermisos'
import { codigoAEtiqueta, moduloAEtiqueta } from '@/config/permisoLabels'
import type { PermisoDTO } from '../types/permiso.types'

interface Props {
  uuid: string
  tipo: 'CONCESION' | 'RESTRICCION'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConcesionFormModal({ uuid, tipo, open, onOpenChange }: Props) {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('PERMISOS_EDITAR'))
  const { data: catalogo } = useCatalogo()
  const concederMut = useConcederPermiso(uuid)
  const restringirMut = useRestringirPermiso(uuid)
  const mutation = tipo === 'CONCESION' ? concederMut : restringirMut

  const [codigoPermiso, setCodigoPermiso] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const allPermisos: PermisoDTO[] = catalogo
    ? Object.values(catalogo).flat()
    : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!codigoPermiso) return
    mutation.mutate(
      { codigoPermiso, motivo: motivo || undefined, fechaFin: fechaFin || null },
      {
        onSuccess: () => {
          setCodigoPermiso('')
          setMotivo('')
          setFechaFin('')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {tipo === 'CONCESION' ? 'Conceder permiso individual' : 'Restringir permiso'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[12px]">Permiso</Label>
            <Select value={codigoPermiso} onValueChange={setCodigoPermiso}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar permiso..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {allPermisos.map((p) => (
                  <SelectItem key={p.codigo} value={p.codigo}>
                    <span className="text-[12px]">{codigoAEtiqueta(p.codigo)}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {moduloAEtiqueta(p.modulo)} · {p.codigo}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[12px]">Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Razón de la concesión/restricción..."
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-[12px]">Fecha de expiración (opcional — vacío = permanente)</Label>
            <Input
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!codigoPermiso || mutation.isPending || !puedeEditar}
              variant={tipo === 'RESTRICCION' ? 'destructive' : 'default'}
            >
              {mutation.isPending ? <Spinner className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {tipo === 'CONCESION' ? 'Conceder' : 'Restringir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
