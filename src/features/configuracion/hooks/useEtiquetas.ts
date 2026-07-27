import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getConfiguracionesEtiqueta,
  getConfiguracionesActivas,
  getConfiguracionEtiqueta,
  getConfiguracionPredeterminada,
  createConfiguracionEtiqueta,
  updateConfiguracionEtiqueta,
  toggleConfiguracionEtiqueta,
  setPredeterminada,
  getOpcionesEtiqueta,
} from '../api/etiquetas.api'
import { ConfiguracionEtiquetaRequest } from '@/types/api'
import toast from 'react-hot-toast'

const KEY = 'configuraciones-etiqueta'

export function useGetConfiguracionesEtiqueta() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getConfiguracionesEtiqueta,
  })
}

export function useGetConfiguracionesActivas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [KEY, 'activas'],
    queryFn: getConfiguracionesActivas,
    enabled: options?.enabled ?? true,
  })
}

export function useGetConfiguracionEtiqueta(id: number | null) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => getConfiguracionEtiqueta(id!),
    enabled: id !== null,
  })
}

export function useGetConfiguracionPredeterminada() {
  return useQuery({
    queryKey: [KEY, 'predeterminada'],
    queryFn: getConfiguracionPredeterminada,
  })
}

export function useGetOpcionesEtiqueta() {
  return useQuery({
    queryKey: [KEY, 'opciones'],
    queryFn: getOpcionesEtiqueta,
  })
}

export function useCreateConfiguracionEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ConfiguracionEtiquetaRequest) => createConfiguracionEtiqueta(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración creada')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear configuración')
    },
  })
}

export function useUpdateConfiguracionEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ConfiguracionEtiquetaRequest }) =>
      updateConfiguracionEtiqueta(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración actualizada')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar')
    },
  })
}

export function useToggleConfiguracionEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleConfiguracionEtiqueta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al cambiar estado'),
  })
}

export function useSetPredeterminada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => setPredeterminada(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración predeterminada actualizada')
    },
    onError: () => toast.error('Error al establecer predeterminada'),
  })
}
