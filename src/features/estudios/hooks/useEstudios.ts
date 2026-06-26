import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEstudios,
  getEstudioById,
  getEstudiosByPaciente,
  getTiposEstudio,
  getTodosLosTipos,
  getParametrosByTipo,
  createEstudio,
  updateEstudio,
  createTipoEstudio,
  updateTipoEstudio,
  toggleTipoEstudio,
  createParametroEstudio,
  updateParametroEstudio,
  deleteParametroEstudio,
} from '../api/estudios.api'
import { EstudioMedicoRequestDTO, TipoEstudioRequestDTO, ParametroEstudioRequestDTO } from '@/types/api'
import { toast } from 'sonner'

/**
 * Get all estudios médicos
 */
export function useGetEstudios() {
  return useQuery({
    queryKey: ['estudios'],
    queryFn: getEstudios,
  })
}

/**
 * Get estudio médico by ID
 */
export function useGetEstudioById(id: number | null) {
  return useQuery({
    queryKey: ['estudios', id],
    queryFn: () => getEstudioById(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

/**
 * Get all estudios for a patient by UUID
 */
export function useGetEstudiosByPaciente(uuid: string | null) {
  return useQuery({
    queryKey: ['estudios', 'paciente', uuid],
    queryFn: () => getEstudiosByPaciente(uuid as string),
    enabled: typeof uuid === 'string' && uuid.length > 0,
  })
}

/**
 * Get all parámetros for a tipo de estudio
 */
export function useGetParametrosByTipo(tipoEstudioId: number | null) {
  return useQuery({
    queryKey: ['parametros', 'tipo', tipoEstudioId],
    queryFn: () => getParametrosByTipo(tipoEstudioId as number),
    enabled: typeof tipoEstudioId === 'number' && tipoEstudioId > 0,
  })
}

/**
 * Get active tipos de estudio (for llenado dropdown)
 */
export function useGetTiposEstudio() {
  return useQuery({
    queryKey: ['tiposEstudio'],
    queryFn: getTiposEstudio,
  })
}

/**
 * Get ALL tipos de estudio including inactive (for catalogos management)
 */
export function useGetTodosLosTipos() {
  return useQuery({
    queryKey: ['tiposEstudio', 'todos'],
    queryFn: getTodosLosTipos,
  })
}

/**
 * Create a new estudio médico
 */
export function useCreateEstudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: EstudioMedicoRequestDTO) => createEstudio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudios'] })
      toast.success('Estudio médico registrado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrar estudio'
      toast.error(message)
    },
  })
}

/**
 * Update an estudio médico
 */
export function useUpdateEstudio(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: EstudioMedicoRequestDTO) => updateEstudio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudios'] })
      queryClient.invalidateQueries({ queryKey: ['estudios', id] })
      toast.success('Estudio actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar estudio'
      toast.error(message)
    },
  })
}

/**
 * Create a new tipo de estudio
 */
export function useCreateTipoEstudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TipoEstudioRequestDTO) => createTipoEstudio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('Tipo de estudio creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear tipo de estudio'
      toast.error(message)
    },
  })
}

/**
 * Update a tipo de estudio
 */
export function useUpdateTipoEstudio(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TipoEstudioRequestDTO) => updateTipoEstudio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('Tipo de estudio actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar tipo de estudio'
      toast.error(message)
    },
  })
}

/**
 * Toggle tipo de estudio active status
 */
export function useToggleTipoEstudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleTipoEstudio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('Estado de la plantilla actualizado')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar estado del tipo de estudio'
      toast.error(message)
    },
  })
}

/**
 * Create a new parámetro de estudio
 */
export function useCreateParametroEstudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ParametroEstudioRequestDTO) => createParametroEstudio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('Parámetro de estudio creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear parámetro'
      toast.error(message)
    },
  })
}

/**
 * Update a parámetro de estudio
 */
export function useUpdateParametroEstudio(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ParametroEstudioRequestDTO) => updateParametroEstudio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('Parámetro actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar parámetro'
      toast.error(message)
    },
  })
}

/**
 * Delete a parámetro de estudio
 */
export function useDeleteParametroEstudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteParametroEstudio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('Parámetro eliminado')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar parámetro'
      toast.error(message)
    },
  })
}
