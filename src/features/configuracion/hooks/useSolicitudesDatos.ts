import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSolicitudesDatos, cambiarEstadoSolicitud } from '../api/solicitudesDatos.api'

const KEY = ['solicitudes-datos']

export function useSolicitudesDatos() {
  return useQuery({ queryKey: KEY, queryFn: getSolicitudesDatos })
}

export function useCambiarEstadoSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => cambiarEstadoSolicitud(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
