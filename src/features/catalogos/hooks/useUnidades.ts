import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUnidadesActivas,
  getAllUnidades,
  createUnidad,
  updateUnidad,
  toggleUnidad,
} from '../api/unidades.api'
import { UnidadMedidaRequestDTO } from '@/types/api'
import { toast } from 'sonner'

const KEYS = {
  activas: ['unidades', 'activas'] as const,
  todas: ['unidades', 'todas'] as const,
}

export function useGetUnidadesActivas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.activas,
    queryFn: getUnidadesActivas,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  })
}

export function useGetAllUnidades(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.todas,
    queryFn: getAllUnidades,
    staleTime: 0,
    enabled: options?.enabled ?? true,
  })
}

export function useCreateUnidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UnidadMedidaRequestDTO) => createUnidad(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] })
      toast.success('Unidad de medida creada')
    },
    onError: () => toast.error('No se pudo crear la unidad'),
  })
}

export function useUpdateUnidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UnidadMedidaRequestDTO }) =>
      updateUnidad(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] })
      toast.success('Unidad de medida actualizada')
    },
    onError: () => toast.error('No se pudo actualizar la unidad'),
  })
}

export function useToggleUnidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleUnidad(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['unidades'] })
      toast.success(data.activo ? 'Unidad activada' : 'Unidad desactivada')
    },
    onError: () => toast.error('No se pudo cambiar el estado de la unidad'),
  })
}
