import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCita, getCitas, getCitasResumenByPaciente, updateCita } from '../api/citas.api'
import { CitaRequestDTO, CitaUpdateRequestDTO } from '@/types/api'
import { toast } from 'sonner'

export function useGetCitas(
  params?: { pacienteUUID?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['citas', params],
    queryFn: () => getCitas(params),
    enabled: options?.enabled ?? true,
  })
}

export function useCitasResumenByPaciente(
  pacienteUuid: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['citas-resumen', pacienteUuid],
    queryFn: () => getCitasResumenByPaciente(pacienteUuid),
    enabled: (options?.enabled ?? true) && !!pacienteUuid,
  })
}

export function useCreateCita() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CitaRequestDTO) => createCita(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citas'] })
      queryClient.invalidateQueries({ queryKey: ['proximas-citas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Cita programada.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al programar la cita'
      toast.error(message)
    },
  })
}

export function useUpdateCita() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: CitaUpdateRequestDTO }) => updateCita(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citas'] })
      queryClient.invalidateQueries({ queryKey: ['proximas-citas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-agenda-hoy'] })
      toast.success('Cita actualizada.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la cita'
      toast.error(message)
    },
  })
}
