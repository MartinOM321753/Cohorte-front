import { useQuery } from '@tanstack/react-query'
import { getBitacoraAccesos } from '../api/bitacora.api'
import type { FiltrosAcceso } from '../types/bitacora.types'

export function useGetBitacoraAccesos(filtros: FiltrosAcceso) {
  return useQuery({
    queryKey: ['bitacora', 'accesos', filtros],
    queryFn: () => getBitacoraAccesos(filtros),
    placeholderData: (prev) => prev,
  })
}
