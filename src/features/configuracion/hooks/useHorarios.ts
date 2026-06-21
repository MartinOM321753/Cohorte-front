import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getConfiguracionesHorario,
  getConfiguracionHorarioActiva,
  createConfiguracionHorario,
  updateConfiguracionHorario,
  activarConfiguracionHorario,
  deleteConfiguracionHorario,
} from '../api/horarios.api'
import { ConfiguracionHorarioRequest } from '@/types/api'
import { toast } from 'sonner'

const KEY = 'configuraciones-horario'

export function useGetConfiguracionesHorario() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getConfiguracionesHorario,
  })
}

export function useGetConfiguracionHorarioActiva(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [KEY, 'activa'],
    queryFn: getConfiguracionHorarioActiva,
    enabled: options?.enabled ?? true,
  })
}

export function useCreateConfiguracionHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ConfiguracionHorarioRequest) => createConfiguracionHorario(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración de horario creada')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear configuración de horario')
    },
  })
}

export function useUpdateConfiguracionHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ConfiguracionHorarioRequest }) =>
      updateConfiguracionHorario(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración de horario actualizada')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar')
    },
  })
}

export function useActivarConfiguracionHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => activarConfiguracionHorario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración de horario activada')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al activar')
    },
  })
}

export function useDeleteConfiguracionHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteConfiguracionHorario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración de horario eliminada')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al eliminar')
    },
  })
}
