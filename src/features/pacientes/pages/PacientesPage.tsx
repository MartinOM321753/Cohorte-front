import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useGetPacientes } from '../hooks/useGetPacientes'
import { PacientesTable } from '../components/PacientesTable'
import { PacienteFormModal } from '../components/PacienteFormModal'
import { CitaFormModal } from '@/features/citas/components/CitaFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getFullName } from '@/lib/utils'
import { Paciente } from '@/types/api'

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
    <div className="page-wrapper space-y-6">
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Pacientes</h1>
        <p className="section-subtitle">
          Gestiona el registro y seguimiento de todos los pacientes del sistema
        </p>
      </div>

      {/* Search and Add */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o folio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setIsCitaModalOpen(true)}
              >
                Agendar cita
              </Button>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Paciente
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <PacientesTable
            pacientes={filteredPacientes}
            isLoading={isLoading}
            onSchedule={(paciente) => {
              setPatientToSchedule(paciente)
              setIsCitaModalOpen(true)
            }}
          />
        </CardContent>
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
