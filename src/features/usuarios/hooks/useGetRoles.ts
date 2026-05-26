import { useQuery } from '@tanstack/react-query'
import { getRoles } from '../api/roles.api'

export const ROLES_QUERY_KEY = ['roles'] as const

export function useGetRoles() {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: getRoles,
    staleTime: 1000 * 60 * 10, // 10 min — los roles raramente cambian
  })
}
