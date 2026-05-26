import { useQuery } from '@tanstack/react-query'
import { getBitacoraAcciones } from '../api/bitacora.api'
import type { FiltrosAcciones } from '../types/bitacora.types'

export function useGetBitacoraAcciones(filtros: FiltrosAcciones) {
  return useQuery({
    queryKey: ['bitacora', 'acciones', filtros],
    queryFn: () => getBitacoraAcciones(filtros),
    placeholderData: (prev) => prev,
  })
}
