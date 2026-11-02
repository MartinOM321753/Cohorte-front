import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Pencil, Plus, Search, UserCheck, UserX, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Colaborador } from '@/types/api'
import { useGetColaboradores, useSetColaboradorActivo } from '../hooks/useEntregas'
import { ColaboradorFormModal } from './ColaboradorFormModal'

export function ColaboradoresTab() {
  const puedeCrear = useAuthStore((s) => s.hasPermiso('COLABORADORES_CREAR'))
  const puedeEditar = useAuthStore((s) => s.hasPermiso('COLABORADORES_EDITAR'))
  const { data: colaboradores = [], isLoading } = useGetColaboradores()
  const toggleActivo = useSetColaboradorActivo()

  const [buscar, setBuscar] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Colaborador | null>(null)

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    if (!q) return colaboradores
    return colaboradores.filter((c) =>
      [c.nombreCompleto, c.curp, c.cargo, c.adscripcion, c.email]
        .some((v) => v?.toLowerCase().includes(q)),
    )
  }, [colaboradores, buscar])

  const abrirNuevo = () => { setEditando(null); setModalOpen(true) }
  const abrirEditar = (c: Colaborador) => { setEditando(c); setModalOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Colaboradores
          </h3>
          <p className="text-sm text-muted-foreground">
            Personas físicas que reciben muestras del biobanco en entrega o préstamo.
          </p>
        </div>
        {puedeCrear && (
          <Button onClick={abrirNuevo} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Registrar colaborador
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar por nombre, CURP, cargo…"
          value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          {colaboradores.length === 0
            ? 'Aún no hay colaboradores registrados.'
            : 'Ningún colaborador coincide con la búsqueda.'}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Adscripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id} className={c.activo ? '' : 'opacity-60'}>
                  <TableCell>
                    <div className="font-medium">{c.nombreCompleto}</div>
                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{c.cargo ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.adscripcion ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.esExterno ? 'Externo' : 'Interno'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.activo
                      ? 'text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
                      : 'text-xs bg-muted text-muted-foreground'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                          title="Editar" onClick={() => abrirEditar(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                          title={c.activo ? 'Desactivar' : 'Activar'}
                          disabled={toggleActivo.isPending}
                          onClick={() => toggleActivo.mutate({ id: c.id, activo: !c.activo })}>
                          {c.activo ? <UserX className="h-4 w-4 text-amber-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ColaboradorFormModal open={modalOpen} onOpenChange={setModalOpen} colaborador={editando} />
    </div>
  )
}
