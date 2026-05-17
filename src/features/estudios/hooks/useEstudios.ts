import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEstudios,
  getEstudioById,
  getTiposEstudio,
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
 * Get estudio mÃ©dico by ID
 */
export function useGetEstudioById(id: number | null) {
  return useQuery({
    queryKey: ['estudios', id],
    queryFn: () => getEstudioById(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

/**
 * Get all tipos de estudio for dropdown/selection
 */
export function useGetTiposEstudio() {
  return useQuery({
    queryKey: ['tiposEstudio'],
    queryFn: getTiposEstudio,
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
      toast.success('Estado del tipo de estudio actualizado')
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
 * Update a parÃ¡metro de estudio
 */
export function useUpdateParametroEstudio(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ParametroEstudioRequestDTO) => updateParametroEstudio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('ParÃ¡metro actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar parÃ¡metro'
      toast.error(message)
    },
  })
}

/**
 * Delete a parÃ¡metro de estudio
 */
export function useDeleteParametroEstudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteParametroEstudio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      toast.success('ParÃ¡metro eliminado')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar parÃ¡metro'
      toast.error(message)
    },
  })
}
