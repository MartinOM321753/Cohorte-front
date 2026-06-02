import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPaciente, updatePaciente, deletePaciente, toggleActivoPaciente } from '../api/pacientes.api'
import { PacienteRequestDTO } from '@/types/api'
import { toast } from 'sonner'

export function useCreatePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PacienteRequestDTO) => createPaciente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Paciente registrado correctamente')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al registrar el paciente')
    },
  })
}

export function useUpdatePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PacienteRequestDTO }) =>
      updatePaciente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Paciente actualizado correctamente')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al actualizar el paciente')
    },
  })
}

export function useDeletePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deletePaciente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Paciente eliminado correctamente')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al eliminar el paciente')
    },
  })
}

export function useToggleActivoPaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => toggleActivoPaciente(uuid),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(updated.activo ? 'Paciente activado' : 'Paciente desactivado')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al cambiar estado del paciente')
    },
  })
}
