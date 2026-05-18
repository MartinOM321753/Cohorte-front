import { useQuery } from '@tanstack/react-query'
import { getUsuarios } from '../api/users.api'

export function useGetUsuarios(params?: { activo?: boolean }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['usuarios', params],
    queryFn: () => getUsuarios(params),
    enabled: options?.enabled ?? true,
  })
}

