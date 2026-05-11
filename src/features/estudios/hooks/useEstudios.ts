import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEstudios,
  getTiposEstudio,
  createEstudio,
  updateEstudio,
  createTipoEstudio,
  createParametroEstudio,
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
