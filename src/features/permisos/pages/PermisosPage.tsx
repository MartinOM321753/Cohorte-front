import { useState } from 'react'
import { Search, Shield, Users, ClipboardList } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axiosInstance'
import { RolesTab } from '../components/RolesTab'
import { BitacoraPermisosTab } from '../components/BitacoraPermisosTab'
import { UsuarioPermisosPanel } from '../components/UsuarioPermisosPanel'
import { ROL_LABELS, getRolBadgeClass } from '@/features/usuarios/types/usuario.types'

interface UserRow {
  uuid: string
  username: string
  persona: {
    nombre: string
    apellidoPaterno: string
    apellidoMaterno: string
  } | null
  rol: { nombre: string } | null
  activo: boolean
}

interface UsersResp {
  data: UserRow[]
  message: string
  error: boolean
}

function buildNombreCompleto(u: UserRow): string {
  if (!u.persona) return u.username
  return [u.persona.nombre, u.persona.apellidoPaterno, u.persona.apellidoMaterno]
    .filter(Boolean).join(' ') || u.username
}

function useUsuariosSimple() {
  return useQuery({
    queryKey: ['permisos', 'usuarios-list'],
    queryFn: async () => {
      const res = await api.get<UsersResp>('/users')
      return res.data.data
    },
  })
}

function UsuariosTab() {
  const { data: users, isLoading } = useUsuariosSimple()
  const [search, setSearch] = useState('')
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  const filtered = (users ?? []).filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    const nombre = buildNombreCompleto(u).toLowerCase()
    return u.username.toLowerCase().includes(q) || nombre.includes(q)
  })

  return (
    <>
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="pl-9 h-9 text-[13px]"
          />
        </div>

        {isLoading && <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>}

        {!isLoading && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol legado</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-[13px] py-8">
                      Sin resultados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const rolName = u.rol?.nombre ?? '—'
                    const nombre = buildNombreCompleto(u)
                    return (
                      <TableRow key={u.uuid} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUuid(u.uuid)}>
                        <TableCell className="text-[13px] font-medium">{u.username}</TableCell>
                        <TableCell className="text-[13px] max-w-[250px] truncate" title={nombre}>
                          {nombre}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRolBadgeClass(rolName) + ' text-[11px]'}>
                            {ROL_LABELS[rolName] ?? rolName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.activo ? 'default' : 'secondary'} className="text-[10px]">
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px]"
                            onClick={(e) => { e.stopPropagation(); setSelectedUuid(u.uuid) }}
                          >
                            Ver permisos
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <UsuarioPermisosPanel
        uuid={selectedUuid}
        open={!!selectedUuid}
        onOpenChange={(open) => { if (!open) setSelectedUuid(null) }}
      />
    </>
  )
}

export default function PermisosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permisos y roles</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Administra roles, permisos individuales y revisa la bitacora de cambios.
        </p>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" /> Roles
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="bitacora" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Bitacora
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-6">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="bitacora" className="mt-6">
          <BitacoraPermisosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
