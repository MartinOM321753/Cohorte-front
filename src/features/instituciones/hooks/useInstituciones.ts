import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getInstitucionesPaginado,
  getInstitucionesGestionables,
  getInstitucionesGestionablesEstado,
  getInstitucionesVisibles,
  searchInstituciones,
  getInstitucionesActivas,
  getInstitucionesRaices,
  getInstitucionesHijas,
  getInstitucionById,
  getInstitucionByUuid,
  createInstitucion,
  updateInstitucion,
  toggleInstitucion,
  getTiposInstitucionActivas,
  getTiposInstitucionTodas,
  createTipoInstitucion,
  updateTipoInstitucion,
  toggleTipoInstitucion,
  getModulosDeInstitucion,
  otorgarModuloInstitucion,
  getPermisosAccesoPacientesOtorgados,
  getPermisosAccesoPacientesRecibidos,
  otorgarPermisoAccesoPacientes,
  revocarPermisoAccesoPacientes,
  getPermisosRegistroOtorgados,
  getPermisosRegistroRecibidos,
  otorgarPermisoRegistro,
  revocarPermisoRegistro,
  getVisibilidadHijas,
  fijarVisibilidadHija,
  fijarVisibilidadDefecto,
} from '../api/instituciones.api'
import { InstitucionRequestDTO, ModuloSistema, TipoInstitucionRequestDTO } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'

// ============================================
// QUERIES
// ============================================

export function useGetInstitucionesGestionables() {
  return useQuery({
    queryKey: ['instituciones', 'gestionables'],
    queryFn: () => getInstitucionesGestionables(),
  })
}

export function useGetInstitucionesGestionablesEstado() {
  return useQuery({
    queryKey: ['instituciones', 'gestionables-estado'],
    queryFn: () => getInstitucionesGestionablesEstado(),
  })
}

export function useGetInstitucionesVisibles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['instituciones', 'visibles'],
    queryFn: () => getInstitucionesVisibles(),
    enabled: options?.enabled ?? true,
  })
}

export function useGetInstitucionesPaginado(page = 0, size = 10) {
  return useQuery({
    queryKey: ['instituciones', 'paginado', page, size],
    queryFn: () => getInstitucionesPaginado(page, size),
    placeholderData: keepPreviousData,
  })
}

export function useSearchInstituciones(q: string, soloActivas = true, page = 0, size = 10, enabled = true) {
  return useQuery({
    queryKey: ['instituciones', 'buscar', q, soloActivas, page, size],
    queryFn: () => searchInstituciones(q, soloActivas, page, size),
    enabled: enabled && q.trim().length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useGetInstitucionesActivas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['instituciones', 'activas'],
    queryFn: () => getInstitucionesActivas(),
    enabled: options?.enabled ?? true,
  })
}

export function useGetInstitucionesRaices() {
  return useQuery({
    queryKey: ['instituciones', 'raices'],
    queryFn: () => getInstitucionesRaices(),
  })
}

export function useGetInstitucionesHijas(id: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'hijas', id],
    queryFn: () => getInstitucionesHijas(id as number),
    enabled: id != null,
  })
}

export function useGetInstitucionById(id: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'detalle', id],
    queryFn: () => getInstitucionById(id as number),
    enabled: id != null,
  })
}

export function useGetInstitucionByUuid(uuid: string | null) {
  return useQuery({
    queryKey: ['instituciones', 'uuid', uuid],
    queryFn: () => getInstitucionByUuid(uuid as string),
    enabled: !!uuid,
  })
}

export function useGetTiposInstitucionActivas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tipos-institucion', 'activas'],
    queryFn: () => getTiposInstitucionActivas(),
    enabled: options?.enabled ?? true,
  })
}

// ============================================
// MUTATIONS
// ============================================

function invalidateInstituciones(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['instituciones'] })
}

export function useCreateInstitucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InstitucionRequestDTO) => createInstitucion(data),
    onSuccess: () => {
      invalidateInstituciones(queryClient)
      toast.success('Institución creada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear la institución'
      toast.error(message)
    },
  })
}

export function useUpdateInstitucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InstitucionRequestDTO }) => updateInstitucion(id, data),
    onSuccess: () => {
      invalidateInstituciones(queryClient)
      toast.success('Institución actualizada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la institución'
      toast.error(message)
    },
  })
}

export function useToggleInstitucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleInstitucion(id),
    onSuccess: (data) => {
      invalidateInstituciones(queryClient)
      toast.success(data?.activo ? 'Institución activada exitosamente' : 'Institución desactivada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al cambiar el estado de la institución'
      toast.error(message)
    },
  })
}

// ============================================
// TIPOS DE INSTITUCIÓN (administración — catálogo configurable)
// ============================================

export function useGetTiposInstitucionTodas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tipos-institucion', 'todas'],
    queryFn: () => getTiposInstitucionTodas(),
    enabled: options?.enabled ?? true,
  })
}

function invalidateTiposInstitucion(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['tipos-institucion'] })
}

export function useCreateTipoInstitucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TipoInstitucionRequestDTO) => createTipoInstitucion(data),
    onSuccess: () => {
      invalidateTiposInstitucion(queryClient)
      toast.success('Tipo de institución creado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el tipo de institución')
    },
  })
}

export function useUpdateTipoInstitucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TipoInstitucionRequestDTO }) => updateTipoInstitucion(id, data),
    onSuccess: () => {
      invalidateTiposInstitucion(queryClient)
      toast.success('Tipo de institución actualizado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el tipo de institución')
    },
  })
}

export function useToggleTipoInstitucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleTipoInstitucion(id),
    onSuccess: (data) => {
      invalidateTiposInstitucion(queryClient)
      toast.success(data?.activo ? 'Tipo activado exitosamente' : 'Tipo desactivado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado del tipo')
    },
  })
}

// ============================================
// PERMISOS DE MÓDULO POR INSTITUCIÓN (estilo ERP)
// ============================================

export function useGetModulosDeInstitucion(idInstitucion: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'modulos', idInstitucion],
    queryFn: () => getModulosDeInstitucion(idInstitucion as number),
    enabled: idInstitucion != null,
  })
}

export function useOtorgarModuloInstitucion(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { modulo: ModuloSistema; habilitado: boolean; idOtorgante: number }) =>
      otorgarModuloInstitucion(idInstitucion as number, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instituciones', 'modulos', idInstitucion] })
      const authState = useAuthStore.getState()
      if (authState.user?.institucion?.id === idInstitucion) {
        const nextModulos = variables.habilitado
          ? Array.from(new Set([...authState.modulosHabilitados, variables.modulo]))
          : authState.modulosHabilitados.filter((modulo) => modulo !== variables.modulo)
        useAuthStore.setState({ modulosHabilitados: nextModulos })
      }
      toast.success(variables.habilitado ? 'Módulo habilitado exitosamente' : 'Módulo deshabilitado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el permiso del módulo')
    },
  })
}

// ============================================
// PERMISOS DE ACCESO A PACIENTES (institución padre habilita ver sus pacientes a una hija)
// ============================================

export function useGetPermisosAccesoPacientesOtorgados(idInstitucion: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'permisos-pacientes', 'otorgados', idInstitucion],
    queryFn: () => getPermisosAccesoPacientesOtorgados(idInstitucion as number),
    enabled: idInstitucion != null,
  })
}

export function useGetPermisosAccesoPacientesRecibidos(idInstitucion: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'permisos-pacientes', 'recibidos', idInstitucion],
    queryFn: () => getPermisosAccesoPacientesRecibidos(idInstitucion as number),
    enabled: idInstitucion != null,
  })
}

export function useOtorgarPermisoAccesoPacientes(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idInstitucionRecibe: number) =>
      otorgarPermisoAccesoPacientes(idInstitucion as number, idInstitucionRecibe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instituciones', 'permisos-pacientes', 'otorgados', idInstitucion] })
      toast.success('Permiso otorgado: la institución hija ya puede ver estos pacientes')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al otorgar el permiso')
    },
  })
}

export function useRevocarPermisoAccesoPacientes(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idInstitucionRecibe: number) =>
      revocarPermisoAccesoPacientes(idInstitucion as number, idInstitucionRecibe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instituciones', 'permisos-pacientes', 'otorgados', idInstitucion] })
      toast.success('Permiso revocado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al revocar el permiso')
    },
  })
}

// ── Permisos de registro de participantes ────────────────────────────────────

export function useGetPermisosRegistroOtorgados(idInstitucion: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'permisos-registro', 'otorgados', idInstitucion],
    queryFn: () => getPermisosRegistroOtorgados(idInstitucion as number),
    enabled: idInstitucion != null,
  })
}

export function useGetPermisosRegistroRecibidos(idInstitucion: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'permisos-registro', 'recibidos', idInstitucion],
    queryFn: () => getPermisosRegistroRecibidos(idInstitucion as number),
    enabled: idInstitucion != null,
  })
}

export function useOtorgarPermisoRegistro(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idInstitucionRecibe: number) =>
      otorgarPermisoRegistro(idInstitucion as number, idInstitucionRecibe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instituciones', 'permisos-registro', 'otorgados', idInstitucion] })
      queryClient.invalidateQueries({ queryKey: ['pacientes', 'instituciones-registro'] })
      toast.success('Autorización otorgada: esta sede ya puede registrar participantes en el grupo')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al otorgar la autorización')
    },
  })
}

export function useRevocarPermisoRegistro(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idInstitucionRecibe: number) =>
      revocarPermisoRegistro(idInstitucion as number, idInstitucionRecibe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instituciones', 'permisos-registro', 'otorgados', idInstitucion] })
      queryClient.invalidateQueries({ queryKey: ['pacientes', 'instituciones-registro'] })
      toast.success('Autorización revocada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al revocar la autorización')
    },
  })
}

// ── Visibilidad de instituciones hijas ───────────────────────────────────────

export function useGetVisibilidadHijas(idInstitucion: number | null) {
  return useQuery({
    queryKey: ['instituciones', 'visibilidad-hijas', idInstitucion],
    queryFn: () => getVisibilidadHijas(idInstitucion as number),
    enabled: idInstitucion != null,
  })
}

/**
 * Cambiar lo que una institución ve invalida bastante más que esta pantalla: el
 * alcance de participantes alimenta búsquedas, cobertura y el destino de los
 * registros nuevos. Se vacían esas cachés en lugar de esperar a que caduquen,
 * porque si no el usuario ve el interruptor cambiado y los listados iguales.
 */
function invalidarAlcance(queryClient: ReturnType<typeof useQueryClient>, idInstitucion: number | null) {
  queryClient.invalidateQueries({ queryKey: ['instituciones', 'visibilidad-hijas', idInstitucion] })
  queryClient.invalidateQueries({ queryKey: ['pacientes'] })
  queryClient.invalidateQueries({ queryKey: ['instituciones', 'visibles'] })
  queryClient.invalidateQueries({ queryKey: ['cobertura'] })
}

export function useFijarVisibilidadHija(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idHija, verParticipantes }: { idHija: number; verParticipantes: boolean }) =>
      fijarVisibilidadHija(idInstitucion as number, idHija, verParticipantes),
    onSuccess: (_data, variables) => {
      invalidarAlcance(queryClient, idInstitucion)
      toast.success(
        variables.verParticipantes
          ? 'Se verán los participantes de esta institución hija'
          : 'Se dejarán de ver los participantes de esta institución hija',
      )
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar la visibilidad')
    },
  })
}

export function useFijarVisibilidadDefecto(idInstitucion: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (verParticipantes: boolean) =>
      fijarVisibilidadDefecto(idInstitucion as number, verParticipantes),
    onSuccess: (_data, verParticipantes) => {
      invalidarAlcance(queryClient, idInstitucion)
      toast.success(
        verParticipantes
          ? 'Se verán los participantes de todas las hijas'
          : 'Se dejarán de ver los participantes de las hijas',
      )
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar la visibilidad')
    },
  })
}
