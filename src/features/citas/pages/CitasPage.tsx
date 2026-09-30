import { useState } from 'react'
import { Plus, Search, CalendarDays, AlertCircle } from 'lucide-react'
import { useGetCitas } from '../hooks/useCitas'
import { CitaFormModal } from '../components/CitaFormModal'
import { PacienteFormModal } from '@/features/pacientes/components/PacienteFormModal'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { DataTable } from '@/components/tables/DataTable'
import { formatDate } from '@/lib/utils'
import { Cita } from '@/types/api'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }: any) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled>
                <CalendarDays className="h-4 w-4 text-slate-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Visualizar detalle (próximamente)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Citas</h1>
        <p className="section-subtitle">
          Agenda citas y registra pacientes sin salir de la sección de citas.
        </p>
      </div>

      <RoleGuard allowedRoles={['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA']}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            En esta sección puedes crear citas nuevas y registrar pacientes de forma inmediata.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar paciente, usuario o estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setIsPacienteFormOpen(true)}
                >
                  Registrar paciente
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsCitaModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva cita
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable columns={columns} data={filteredCitas as Cita[]} isLoading={isLoading} />
          </CardContent>
        </Card>

        <CitaFormModal open={isCitaModalOpen} onOpenChange={setIsCitaModalOpen} />
        <PacienteFormModal
          open={isPacienteFormOpen}
          onOpenChange={setIsPacienteFormOpen}
          onSuccess={() => setIsPacienteFormOpen(false)}
        />
      </RoleGuard>
    </div>
  )
}
