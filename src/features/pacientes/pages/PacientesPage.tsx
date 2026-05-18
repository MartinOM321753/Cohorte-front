import { useMemo, useState } from 'react'
import { CalendarDays, Search, UserRound, UserRoundPlus } from 'lucide-react'
import { useGetPacientes } from '../hooks/useGetPacientes'
import { useDeletePaciente } from '../hooks/useCreatePaciente'
import { PacientesTable } from '../components/PacientesTable'
import { PacienteFormModal } from '../components/PacienteFormModal'
import { PacienteDetailDrawer } from '../components/PacienteDetailDrawer'
import { CitaIlamyEventForm } from '@/features/citas/components/CitaIlamyEventForm'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { getFullName } from '@/lib/utils'
import type { Paciente } from '@/types/api'

export default function PacientesPage() {
  const { data: pacientes, isLoading } = useGetPacientes()
  const deleteMutation = useDeletePaciente()

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pacienteToEdit, setPacienteToEdit] = useState<Paciente | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Paciente | null>(null)
  const [isCitaModalOpen, setIsCitaModalOpen] = useState(false)
  const [patientToSchedule, setPatientToSchedule] = useState<Paciente | null>(null)

  const pacientesArray = useMemo(
    () => (Array.isArray(pacientes) ? pacientes : []),
    [pacientes]
  )

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return pacientesArray
    return pacientesArray.filter(
      (p: Paciente) =>
        getFullName(p.persona).toLowerCase().includes(q) ||
        p.folio.toLowerCase().includes(q) ||
        p.persona.email?.toLowerCase().includes(q)
    )
  }, [pacientesArray, searchTerm])

  function handleView(paciente: Paciente) {
    setSelectedPaciente(paciente)
    setIsDrawerOpen(true)
  }

  function handleEdit(paciente: Paciente) {
    setPacienteToEdit(paciente)
    setIsFormOpen(true)
  }

  function handleSchedule(paciente: Paciente) {
    setPatientToSchedule(paciente)
    setIsCitaModalOpen(true)
  }

  function handleFormClose(open: boolean) {
    setIsFormOpen(open)
    if (!open) setPacienteToEdit(null)
  }

  function handleOpenCreate() {
    setPacienteToEdit(null)
    setIsFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Pacientes"
        subtitle="Registro de pacientes incluidos en la cohorte"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsCitaModalOpen(true)}
              className="gap-2 text-[13px] h-9"
            >
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              Agendar cita
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px] h-9"
            >
              <UserRoundPlus className="h-4 w-4" strokeWidth={1.75} />
              Registrar paciente
            </Button>
          </>
        }
      />

      {/* Barra de búsqueda y contador */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[340px]">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--imss-ink-300)]"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por nombre, folio o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-8 text-[13px]"
          />
        </div>

        {!isLoading && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--imss-ink-300)]">
            <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>
              {filtered.length} de {pacientesArray.length} paciente
              {pacientesArray.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tabla */}
      <PacientesTable
        data={filtered}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(p) => setDeleteTarget(p)}
        onSchedule={handleSchedule}
      />

      {/* Modal crear / editar */}
      <PacienteFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        paciente={pacienteToEdit}
      />

      {/* Drawer detalle */}
      <PacienteDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        paciente={selectedPaciente}
        onEdit={handleEdit}
        onSchedule={handleSchedule}
      />

      {/* Modal agendar cita */}
      <CitaIlamyEventForm
        open={isCitaModalOpen}
        onClose={() => {
          setPatientToSchedule(null)
          setIsCitaModalOpen(false)
        }}
        initialPacienteUUID={
          patientToSchedule?.UUID || (patientToSchedule as any)?.uuid || undefined
        }
      />

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar paciente"
        description={`¿Confirmas que deseas eliminar a ${deleteTarget ? getFullName(deleteTarget.persona) : 'este paciente'}? Esta acción no se puede deshacer.`}
        actionLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
