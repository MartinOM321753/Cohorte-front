import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCita, getCitas, updateCita } from '../api/citas.api'
import { CitaRequestDTO, CitaUpdateRequestDTO } from '@/types/api'
import { toast } from 'sonner'

export function useGetCitas(params?: { pacienteUUID?: string }) {
  return useQuery({
    queryKey: ['citas', params],
    queryFn: () => getCitas(params),
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
      toast.success('Cita actualizada.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la cita'
      toast.error(message)
    },
  })
}
