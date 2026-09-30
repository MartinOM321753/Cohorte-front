import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCita, getCitas } from '../api/citas.api'
import { CitaRequestDTO, Cita } from '@/types/api'
import { toast } from 'sonner'

export function useGetCitas(params?: { pacienteUUID?: string }) {
  return useQuery({
    queryKey: ['citas', params],
    queryFn: () => getCitas(params),
    staleTime: 5 * 60 * 1000,
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
      toast.success('Cita programada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al programar la cita'
      toast.error(message)
    },
  })
}
