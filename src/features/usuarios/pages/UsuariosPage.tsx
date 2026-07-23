import { useState } from 'react'
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
import { useGetUsuariosPaginados } from '../hooks/useGetUsuarios'
import { UsuariosTable } from '../components/UsuariosTable'
import { UsuarioFormModal } from '../components/UsuarioFormModal'
import { UsuarioDetailDrawer } from '../components/UsuarioDetailDrawer'
import { useReenviarInvitacion, useToggleActivo } from '../hooks/useMutateUsuario'
import { useAuthStore } from '@/stores/authStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { Usuario } from '../types/usuario.types'
import type { PaginationState } from '@tanstack/react-table'

const PAGE_SIZE = 10

export default function UsuariosPage() {
  const { user } = useAuthStore()
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('USUARIOS_CREAR')
  const puedeEditar = hasPermiso('USUARIOS_EDITAR')
  const toggleActivoMutation = useToggleActivo()
  const reenviarInvitacionMutation = useReenviarInvitacion()

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm.trim(), 350)

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const { data, isLoading } = useGetUsuariosPaginados({
    page: pagination.pageIndex,
    size: pagination.pageSize,
    buscar: debouncedSearch || undefined,
  })

  const usuarios = data?.content ?? []
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null)
  const [usuarioToToggle, setUsuarioToToggle] = useState<Usuario | null>(null)
  const [reenviandoInvitacionUuid, setReenviandoInvitacionUuid] = useState<string | null>(null)

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
          puedeCrear ? (
            <Button
              onClick={handleOpenCreate}
              className="gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px] h-9"
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              Nuevo usuario
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[340px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--imss-ink-300)]" strokeWidth={1.75} />
          <Input
            placeholder="Buscar por nombre, usuario, rol o correo..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 pl-8 text-[13px]"
          />
        </div>

        {!isLoading && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--imss-ink-300)]">
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>
              {totalElements} usuario{totalElements !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <UsuariosTable
        data={usuarios}
        isLoading={isLoading}
        onView={handleView}
        onEdit={puedeEditar ? handleEdit : undefined}
        onToggleActivo={puedeEditar ? handleToggleActivo : undefined}
        onReenviarInvitacion={puedeEditar ? handleReenviarInvitacion : undefined}
        reenviandoInvitacionUuid={reenviandoInvitacionUuid}
        currentInstitucionId={user?.institucion?.id}
        currentUserUuid={user?.uuid}
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={totalPages}
        totalElements={totalElements}
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
                ? `Desactivar a ${[usuarioToToggle.persona.nombre, usuarioToToggle.persona.segundoNombre, usuarioToToggle.persona.apellidoPaterno].filter(Boolean).join(' ')}? No podra iniciar sesion ni realizar solicitudes.`
                : `Activar a ${[usuarioToToggle?.persona.nombre, usuarioToToggle?.persona.segundoNombre, usuarioToToggle?.persona.apellidoPaterno].filter(Boolean).join(' ')}? Recuperara acceso al sistema.`
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
