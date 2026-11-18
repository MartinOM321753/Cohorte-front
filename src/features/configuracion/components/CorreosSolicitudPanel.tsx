import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Mail, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  useCorreosSolicitud,
  useAgregarCorreoSolicitud,
  useToggleCorreoSolicitud,
  useEliminarCorreoSolicitud,
} from '../hooks/useCorreosSolicitud'

export default function CorreosSolicitudPanel() {
  const { data: correos, isLoading } = useCorreosSolicitud()
  const agregar = useAgregarCorreoSolicitud()
  const toggle = useToggleCorreoSolicitud()
  const eliminar = useEliminarCorreoSolicitud()

  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')

  const handleAgregar = () => {
    if (!email.trim()) return
    agregar.mutate(
      { email: email.trim(), nombre: nombre.trim() || undefined },
      { onSuccess: () => { setEmail(''); setNombre('') } }
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-emerald-700" />
          <div>
            <CardTitle>Correos para solicitudes de acceso a datos</CardTitle>
            <CardDescription>
              Los correos destino reciben una notificación cada vez que se envía una solicitud de acceso a la base de datos desde el sitio público.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="flex flex-col @sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="correo-destino-email" className="sr-only">Correo</Label>
            <Input
              id="correo-destino-email"
              type="email"
              placeholder="correo@institucion.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgregar()}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="correo-destino-nombre" className="sr-only">Nombre (opcional)</Label>
            <Input
              id="correo-destino-nombre"
              placeholder="Nombre (opcional)"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgregar()}
            />
          </div>
          <Button
            onClick={handleAgregar}
            disabled={agregar.isPending || !email.trim()}
            size="sm"
          >
            {agregar.isPending ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-1" />}
            Agregar
          </Button>
        </div>

        {agregar.isError && (
          <p className="text-sm text-destructive">
            {(agregar.error as Error)?.message || 'Error al agregar correo'}
          </p>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !correos?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay correos destino configurados. Las solicitudes se guardarán pero no se enviarán notificaciones.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {correos.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.nombre || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? 'default' : 'secondary'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={c.activo ? 'Desactivar' : 'Activar'}
                        onClick={() => toggle.mutate(c.id)}
                        disabled={toggle.isPending}
                      >
                        {c.activo
                          ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        onClick={() => eliminar.mutate(c.id)}
                        disabled={eliminar.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
