import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getPacientes, getPacientesActivos, getPacienteById, getPacienteByUUID, getPacienteByFolio, getPacientesPaginados, getMiPacienteUuid } from '../api/pacientes.api'

export function useGetPacientes(
  params?: { buscar?: string; activos?: boolean; incluirJerarquia?: boolean },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['pacientes', params],
    queryFn: async () => {
      if (params?.activos) {
        return await getPacientesActivos()
      }
      return await getPacientes({
        buscar: params?.buscar,
        incluirJerarquia: params?.incluirJerarquia,
      })
    },
    enabled: options?.enabled ?? true,
  })
}

export function useGetPacienteById(id: number) {
  return useQuery({
    queryKey: ['pacientes', id],
    queryFn: () => getPacienteById(id),
    enabled: !!id,
  })
}

export function useGetPacienteByUUID(uuid: string) {
  return useQuery({
    queryKey: ['pacientes', uuid],
    queryFn: () => getPacienteByUUID(uuid),
    enabled: !!uuid,
  })
}

export function useGetPacienteByFolio(folio: string) {
  return useQuery({
    queryKey: ['pacientes', folio],
    queryFn: () => getPacienteByFolio(folio),
    enabled: !!folio,
  })
}

/** Resuelve el UUID propio para el rol PACIENTE — solo se dispara si `enabled`. */
export function useMiPacienteUuid(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['pacientes', 'mi-uuid'],
    queryFn: getMiPacienteUuid,
    enabled: options?.enabled ?? false,
  })
}

export function useGetPacientesPaginados(params: {
  page: number
  size: number
  buscar?: string
  incluirJerarquia?: boolean
  soloActivos?: boolean
  idInstitucionFiltro?: number
}) {
  return useQuery({
    queryKey: ['pacientes', 'paginado', params],
    queryFn: () => getPacientesPaginados(params),
    placeholderData: keepPreviousData,
  })
}
