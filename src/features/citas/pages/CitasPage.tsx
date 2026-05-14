import { useState } from 'react'
import { Filter, Plus, Search } from 'lucide-react'
import { useGetCitas } from '../hooks/useCitas'
import { CitaFormModal } from '../components/CitaFormModal'
import { PacienteFormModal } from '@/features/pacientes/components/PacienteFormModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { DataTable } from '@/components/tables/DataTable'
import { formatDate } from '@/lib/utils'
import { Cita } from '@/types/api'
import { PageHeader } from '@/components/layout/PageHeader'

export default function CitasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCitaModalOpen, setIsCitaModalOpen] = useState(false)
  const [isPacienteFormOpen, setIsPacienteFormOpen] = useState(false)
  const { data: citas, isLoading } = useGetCitas()

  const citasArray = Array.isArray(citas) ? citas : []
  const filteredCitas = citasArray.filter((cita) => {
    const pacienteText = cita.paciente?.nombreCompleto || ''
    const usuarioText = cita.usuarioAgenda?.nombreCompleto || ''
    return (
      pacienteText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuarioText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cita.estadoCita.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const columns = [
    {
      accessorKey: 'paciente',
      header: 'Paciente',
      cell: ({ row }: any) => row.original.paciente?.nombreCompleto || 'Sin paciente',
    },
    {
      accessorKey: 'fechaCita',
      header: 'Fecha de cita',
      cell: ({ row }: any) => formatDate(row.original.fechaCita),
    },
    {
      accessorKey: 'duracionMinutos',
      header: 'Duración',
      cell: ({ row }: any) => `${row.original.duracionMinutos} min`,
    },
    {
      accessorKey: 'estadoCita',
      header: 'Estado',
      cell: ({ row }: any) => row.original.estadoCita,
    },
  ]

  return (
    <RoleGuard allowedRoles={['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Citas"
          subtitle="Gestión de agenda clínica y registro inmediato de pacientes."
          actions={
            <>
              <Button variant="secondary" onClick={() => setIsPacienteFormOpen(true)}>
                Registrar paciente
              </Button>
              <Button onClick={() => setIsCitaModalOpen(true)}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Nueva cita
              </Button>
            </>
          }
        />

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <Input
                placeholder="Buscar paciente, usuario o estado…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-10"
              />
            </div>
            <Button variant="secondary" size="sm" type="button" disabled>
              <Filter className="h-4 w-4" strokeWidth={1.75} />
              Filtros
            </Button>
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              {filteredCitas.length} de {citasArray.length}
            </span>
          </div>
          <div className="p-0">
            <DataTable columns={columns} data={filteredCitas as Cita[]} isLoading={isLoading} />
          </div>
        </Card>

        <CitaFormModal open={isCitaModalOpen} onOpenChange={setIsCitaModalOpen} />
        <PacienteFormModal
          open={isPacienteFormOpen}
          onOpenChange={setIsPacienteFormOpen}
          onSuccess={() => setIsPacienteFormOpen(false)}
        />
      </div>
    </RoleGuard>
  )
}

