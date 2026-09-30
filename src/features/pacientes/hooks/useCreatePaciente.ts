import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPaciente, updatePaciente, deletePaciente } from '../api/pacientes.api'
import { PacienteRequestDTO } from '@/types/api'
import { toast } from 'sonner'

export function useCreatePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PacienteRequestDTO) => createPaciente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Paciente creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear paciente'
      toast.error(message)
    },
  })
}

export function useUpdatePaciente(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PacienteRequestDTO) => updatePaciente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Paciente actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar paciente'
      toast.error(message)
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
      toast.success('Paciente eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar paciente'
      toast.error(message)
    },
  })
}
