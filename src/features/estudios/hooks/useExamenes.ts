import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExamenes,
  getExamenById,
  createExamen,
  updateExamen,
  saveResultadoExamen,
  updateResultadoExamen,
  getResultadosByPacienteUUID,
  getResultadosByPacienteFolio,
} from '../api/examenes.api'
import { ExamenRequestDTO, ResultadoExamenRequestDTO } from '@/types/api'
import { toast } from 'sonner'

// ============================================
// CATÁLOGO DE EXÁMENES
// ============================================

export function useGetExamenes() {
  return useQuery({
    queryKey: ['examenes'],
    queryFn: getExamenes,
  })
}

export function useGetExamenById(id: number | null) {
  return useQuery({
    queryKey: ['examenes', id],
    queryFn: () => getExamenById(id as number),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

export function useCreateExamen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ExamenRequestDTO) => createExamen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examenes'] })
      toast.success('Examen creado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el examen')
    },
  })
}

export function useUpdateExamen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExamenRequestDTO }) => updateExamen(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examenes'] })
      toast.success('Examen actualizado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el examen')
    },
  })
}

// ============================================
// RESULTADOS DE EXAMEN
// ============================================

export function useSaveResultadoExamen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ResultadoExamenRequestDTO) => saveResultadoExamen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resultadosExamen'] })
      toast.success('Resultado registrado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar resultado')
    },
  })
}

export function useUpdateResultadoExamen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ResultadoExamenRequestDTO }) =>
      updateResultadoExamen(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resultadosExamen'] })
      toast.success('Resultado actualizado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar resultado')
    },
  })
}

export function useGetResultadosByPacienteUUID(uuid: string | null) {
  return useQuery({
    queryKey: ['resultadosExamen', 'uuid', uuid],
    queryFn: () => getResultadosByPacienteUUID(uuid as string),
    enabled: !!uuid,
  })
}

export function useGetResultadosByPacienteFolio(folio: string | null) {
  return useQuery({
    queryKey: ['resultadosExamen', 'folio', folio],
    queryFn: () => getResultadosByPacienteFolio(folio as string),
    enabled: !!folio,
  })
}
