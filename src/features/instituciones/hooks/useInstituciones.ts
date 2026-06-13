import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getInstitucionesPaginado,
  getInstitucionesGestionables,
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
} from '../api/instituciones.api'
import { InstitucionRequestDTO, ModuloSistema, TipoInstitucionRequestDTO } from '@/types/api'

// ============================================
// QUERIES
// ============================================

export function useGetInstitucionesGestionables() {
  return useQuery({
    queryKey: ['instituciones', 'gestionables'],
    queryFn: () => getInstitucionesGestionables(),
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
      toast.success(variables.habilitado ? 'Módulo habilitado exitosamente' : 'Módulo deshabilitado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el permiso del módulo')
    },
  })
}
