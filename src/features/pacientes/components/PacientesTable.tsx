import { ColumnDef } from '@tanstack/react-table'
import { Paciente } from '@/types/api'
import { DataTable } from '@/components/tables/DataTable'
import { formatDate, getFullName } from '@/lib/utils'
import { Eye, Edit2, Trash2, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'
import { PacienteDetailDrawer } from './PacienteDetailDrawer'
import { useDeletePaciente } from '../hooks/useCreatePaciente'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'

interface PacientesTableProps {
  pacientes: Paciente[]
  isLoading?: boolean
  onSchedule?: (paciente: Paciente) => void
}

export function PacientesTable({ pacientes, isLoading, onSchedule }: PacientesTableProps) {
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const deleteMutation = useDeletePaciente()

  const columns: ColumnDef<Paciente>[] = [
    {
      accessorKey: 'folio',
      header: 'Folio',
      cell: ({ row }) => <span className="font-medium">{row.original.folio}</span>,
    },
    {
      accessorKey: 'persona.nombre',
      header: 'Nombre Completo',
      cell: ({ row }) => getFullName(row.original.persona),
    },
    {
      accessorKey: 'persona.email',
      header: 'Email',
      cell: ({ row }) => (
        <a
          href={`mailto:${row.original.persona.email}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.persona.email}
        </a>
      ),
    },
    {
      accessorKey: 'persona.telefono',
      header: 'Teléfono',
      cell: ({ row }) => row.original.persona.telefono || '-',
    },
    {
      accessorKey: 'fechaRegistro',
      header: 'Fecha Registro',
      cell: ({ row }) =>
        row.original.fechaRegistro ? formatDate(row.original.fechaRegistro) : '-',
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedPaciente(row.original)
                    setShowDetail(true)
                  }}
                >
                  <Eye className="h-4 w-4 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalle</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSchedule?.(row.original)}
                >
                  <CalendarPlus className="h-4 w-4 text-emerald-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Agendar cita</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Edit2 className="h-4 w-4 text-amber-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar (próximamente)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(row.original.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={pacientes} isLoading={isLoading} />

      {/* Detail Drawer */}
      {selectedPaciente && (
        <PacienteDetailDrawer
          paciente={selectedPaciente}
          open={showDetail}
          onOpenChange={setShowDetail}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar Paciente"
        description="¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer."
        actionLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            })
          }
        }}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
