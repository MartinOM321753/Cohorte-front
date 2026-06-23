import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MailCheck, Pencil, PowerOff, Power } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { type Usuario, getNombreCompleto, getRolBadgeClass } from '../types/usuario.types'

interface UsuariosTableProps {
  data: Usuario[]
  isLoading: boolean
  onView: (usuario: Usuario) => void
  onEdit: (usuario: Usuario) => void
  onToggleActivo: (usuario: Usuario) => void
  onReenviarInvitacion: (usuario: Usuario) => void
  reenviandoInvitacionUuid?: string | null
  currentInstitucionId?: number
  currentUserUuid?: string
}

export function UsuariosTable({
  data,
  isLoading,
  onView,
  onEdit,
  onToggleActivo,
  onReenviarInvitacion,
  reenviandoInvitacionUuid,
  currentInstitucionId,
  currentUserUuid,
}: UsuariosTableProps) {
  const columns: ColumnDef<Usuario>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => {
        const u = row.original
        return (
          <div>
            <p className="text-[13px] font-medium text-[var(--imss-ink-900)]">
              {getNombreCompleto(u.persona)}
            </p>
            <p className="text-[11px] text-[var(--imss-ink-300)]">@{u.username}</p>
          </div>
        )
      },
    },
    {
      id: 'rol',
      header: 'Rol',
      cell: ({ row }) => {
        const nombre = row.original.rol?.nombre ?? '—'
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getRolBadgeClass(nombre)}`}
          >
            {nombre}
          </span>
        )
      },
    },
    {
      id: 'email',
      header: 'Correo',
      cell: ({ row }) => (
        <span className="text-[13px] text-[var(--imss-ink-500)]">
          {row.original.persona.email || '—'}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.activo ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
              Activo
            </span>
            {row.original.debeResetear && (
              <span className="inline-flex items-center rounded-full bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-warning-fg)]">
                Invitacion pendiente
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
            Inactivo
          </span>
        ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => {
        const u = row.original
        const isSelf = u.UUID === currentUserUuid
        const isExternalPending =
          u.activo &&
          u.debeResetear &&
          currentInstitucionId != null &&
          u.institucion?.id != null &&
          u.institucion.id !== currentInstitucionId
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
              title="Ver detalle"
              onClick={() => onView(u)}
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
              title={isExternalPending ? 'Usuario pendiente de otra institucion: solo se puede reenviar invitacion' : 'Editar usuario'}
              onClick={() => onEdit(u)}
              disabled={isExternalPending}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
            {u.activo && u.debeResetear && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--status-warning-fg)] hover:text-amber-700"
                title="Reenviar invitacion"
                onClick={() => onReenviarInvitacion(u)}
                disabled={reenviandoInvitacionUuid === u.UUID}
              >
                <MailCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${u.activo ? 'text-[var(--status-danger-fg)] hover:text-red-700' : 'text-[var(--status-success-fg)] hover:text-green-700'}`}
              title={isSelf ? 'No puedes cambiar el estado de tu propia cuenta' : isExternalPending ? 'Usuario pendiente de otra institucion: solo se puede reenviar invitacion' : u.activo ? 'Desactivar usuario' : 'Activar usuario'}
              onClick={() => onToggleActivo(u)}
              disabled={isExternalPending || isSelf}
            >
              {u.activo
                ? <PowerOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                : <Power className="h-3.5 w-3.5" strokeWidth={1.75} />
              }
            </Button>
          </div>
        )
      },
    },
  ]

  return <DataTable columns={columns} data={data} isLoading={isLoading} />
}
