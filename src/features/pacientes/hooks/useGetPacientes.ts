import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getPacientes, getPacientesActivos, getPacienteById, getPacienteByUUID, getPacienteByFolio, getPacientesPaginados, getMiPacienteUuid, getInstitucionesParaRegistro, getElegibilidadCambioInstitucion, getParticipantesConRegistrosPropios } from '../api/pacientes.api'

/**
 * Si el participante todavía puede cambiar de institución. Se consulta al abrir
 * la edición; la decisión real la vuelve a tomar el backend al guardar, porque
 * entre una cosa y otra alguien pudo registrarle un estudio.
 */
export function useElegibilidadCambioInstitucion(uuid: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['pacientes', 'cambio-institucion', uuid],
    queryFn: () => getElegibilidadCambioInstitucion(uuid as string),
    enabled: (options?.enabled ?? true) && !!uuid,
  })
}

/**
 * Instituciones a las que el usuario puede asignar un participante nuevo.
 * Solo se consulta con el formulario abierto: cambia poco y no vale la pena
 * mantenerla cargada.
 */
export function useGetInstitucionesParaRegistro(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['pacientes', 'instituciones-registro'],
    queryFn: getInstitucionesParaRegistro,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

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


/** Participantes fuera de tu alcance de los que conservas registros. */
export function useParticipantesConRegistrosPropios(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['pacientes', 'con-registros-propios'],
    queryFn: getParticipantesConRegistrosPropios,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  })
}

