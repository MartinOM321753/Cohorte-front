import { useQuery } from '@tanstack/react-query'
import { getUsuariosConAccesos, getUsuariosConAcciones } from '../api/bitacora.api'

export function useGetUsuariosConAccesos() {
  return useQuery({
    queryKey: ['bitacora', 'accesos', 'usuarios'],
    queryFn: getUsuariosConAccesos,
  })
}

export function useGetUsuariosConAcciones() {
  return useQuery({
    queryKey: ['bitacora', 'acciones', 'usuarios'],
    queryFn: getUsuariosConAcciones,
  })
}
