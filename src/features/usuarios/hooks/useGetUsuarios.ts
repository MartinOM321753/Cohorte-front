import { useQuery } from '@tanstack/react-query'
import { getUsuarios, getUsuarioById } from '../api/usuarios.api'

export const USUARIOS_QUERY_KEY = ['usuarios'] as const

export function useGetUsuarios() {
  return useQuery({
    queryKey: USUARIOS_QUERY_KEY,
    queryFn: getUsuarios,
    staleTime: 1000 * 60 * 2,
  })
}

export function useGetUsuarioById(id: number | null) {
  return useQuery({
    queryKey: [...USUARIOS_QUERY_KEY, id],
    queryFn: () => getUsuarioById(id!),
    enabled: id !== null,
  })
}
