import { useState } from 'react'
import { CalendarDays, Plus, Search } from 'lucide-react'
import { useGetPacientes } from '../hooks/useGetPacientes'
import { PacientesTable } from '../components/PacientesTable'
import { PacienteFormModal } from '../components/PacienteFormModal'
import { CitaFormModal } from '@/features/citas/components/CitaFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { getFullName } from '@/lib/utils'
import { Paciente } from '@/types/api'
import { PageHeader } from '@/components/layout/PageHeader'

export default function PacientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCitaModalOpen, setIsCitaModalOpen] = useState(false)
  const [patientToSchedule, setPatientToSchedule] = useState<Paciente | null>(null)
  const { data: pacientes, isLoading } = useGetPacientes({ buscar: searchTerm })

  // Filter pacientes based on search term
  const pacientesArray = Array.isArray(pacientes) ? pacientes : []
  const filteredPacientes = pacientesArray.filter(
    (paciente: Paciente) =>
      getFullName(paciente.persona).toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.folio.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pacientes"
        subtitle="Registro de pacientes incluidos en la cohorte."
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsCitaModalOpen(true)}>
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              Agendar cita
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Registrar paciente
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              placeholder="Buscar por folio o nombre…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-10"
            />
          </div>
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {filteredPacientes.length} de {pacientesArray.length}
          </span>
        </div>

        <div className="p-0">
          <PacientesTable
            pacientes={filteredPacientes}
            isLoading={isLoading}
            onSchedule={(paciente) => {
              setPatientToSchedule(paciente)
              setIsCitaModalOpen(true)
            }}
          />
        </div>
      </Card>

      {/* Form Modals */}
      <PacienteFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
      <CitaFormModal
        open={isCitaModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPatientToSchedule(null)
          }
          setIsCitaModalOpen(open)
        }}
        initialPacienteUUID={
          patientToSchedule?.UUID || (patientToSchedule as any)?.uuid || undefined
        }
      />
    </div>
  )
}
