import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { type Usuario, getNombreCompleto, getRolBadgeClass } from '../types/usuario.types'

interface UsuariosTableProps {
  data: Usuario[]
  isLoading: boolean
  onView: (usuario: Usuario) => void
  onEdit: (usuario: Usuario) => void
}

export function UsuariosTable({ data, isLoading, onView, onEdit }: UsuariosTableProps) {
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
        const nombre = row.original.rol?? '—'
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
          <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
            Inactivo
          </span>
        ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
            title="Ver detalle"
            onClick={() => onView(row.original)}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--imss-ink-300)] hover:text-[var(--imss-ink-900)]"
            title="Editar usuario"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
        </div>
      ),
    },
  ]

  return <DataTable columns={columns} data={data} isLoading={isLoading} />
}
