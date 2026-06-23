import { useMemo, useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useGetUsuarios } from '../hooks/useGetUsuarios'
import { UsuariosTable } from '../components/UsuariosTable'
import { UsuarioFormModal } from '../components/UsuarioFormModal'
import { UsuarioDetailDrawer } from '../components/UsuarioDetailDrawer'
import { useReenviarInvitacion, useToggleActivo } from '../hooks/useMutateUsuario'
import { useAuthStore } from '@/stores/authStore'
import type { Usuario } from '../types/usuario.types'

export default function UsuariosPage() {
  const { data: usuarios = [], isLoading } = useGetUsuarios()
  const toggleActivoMutation = useToggleActivo()
  const reenviarInvitacionMutation = useReenviarInvitacion()
  const { user } = useAuthStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null)
  const [usuarioToToggle, setUsuarioToToggle] = useState<Usuario | null>(null)
  const [reenviandoInvitacionUuid, setReenviandoInvitacionUuid] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return usuarios
    return usuarios.filter((u) => {
      const nombre = [
        u.persona.nombre,
        u.persona.apellidoPaterno,
        u.persona.apellidoMaterno,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (
        nombre.includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.rol?.nombre?.toLowerCase().includes(q) ||
        u.persona.email?.toLowerCase().includes(q)
      )
    })
  }, [usuarios, searchTerm])

  function handleView(usuario: Usuario) {
    setSelectedUsuario(usuario)
    setIsDrawerOpen(true)
  }

  function handleEdit(usuario: Usuario) {
    setUsuarioToEdit(usuario)
    setIsFormOpen(true)
  }

  function handleOpenCreate() {
    setUsuarioToEdit(null)
    setIsFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setIsFormOpen(open)
    if (!open) setUsuarioToEdit(null)
  }

  function handleToggleActivo(usuario: Usuario) {
    if (usuario.UUID === user?.uuid) return
    setUsuarioToToggle(usuario)
  }

  function handleReenviarInvitacion(usuario: Usuario) {
    setReenviandoInvitacionUuid(usuario.UUID)
    reenviarInvitacionMutation.mutate(usuario.UUID, {
      onSettled: () => setReenviandoInvitacionUuid(null),
    })
  }

  function confirmToggle() {
    if (!usuarioToToggle) return
    toggleActivoMutation.mutate(usuarioToToggle.id, {
      onSettled: () => setUsuarioToToggle(null),
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Gestion de usuarios"
        subtitle="Administra las cuentas y roles de acceso al sistema"
        actions={
          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px] h-9"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Nuevo usuario
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[340px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--imss-ink-300)]" strokeWidth={1.75} />
          <Input
            placeholder="Buscar por nombre, usuario, rol o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-8 text-[13px]"
          />
        </div>

        {!isLoading && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--imss-ink-300)]">
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>
              {filtered.length} de {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <UsuariosTable
        data={filtered}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onToggleActivo={handleToggleActivo}
        onReenviarInvitacion={handleReenviarInvitacion}
        reenviandoInvitacionUuid={reenviandoInvitacionUuid}
        currentInstitucionId={user?.institucion?.id}
        currentUserUuid={user?.uuid}
      />

      <UsuarioFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        usuario={usuarioToEdit}
      />

      <UsuarioDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        usuario={selectedUsuario}
        onEdit={handleEdit}
      />

      <AlertDialog
        open={!!usuarioToToggle}
        onOpenChange={(open) => { if (!open) setUsuarioToToggle(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {usuarioToToggle?.activo ? 'Desactivar usuario' : 'Activar usuario'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {usuarioToToggle?.activo
                ? `Desactivar a ${usuarioToToggle.persona.nombre} ${usuarioToToggle.persona.apellidoPaterno}? No podra iniciar sesion ni realizar solicitudes.`
                : `Activar a ${usuarioToToggle?.persona.nombre} ${usuarioToToggle?.persona.apellidoPaterno}? Recuperara acceso al sistema.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleActivoMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              disabled={toggleActivoMutation.isPending}
              className={usuarioToToggle?.activo
                ? 'bg-[var(--status-danger-fg)] hover:bg-red-700 text-white'
                : 'bg-[var(--imss-green-500)] hover:bg-[var(--imss-green-700)] text-white'
              }
            >
              {toggleActivoMutation.isPending
                ? 'Procesando...'
                : usuarioToToggle?.activo ? 'Si, desactivar' : 'Si, activar'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
