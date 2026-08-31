import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  actualizarPlantilla, crearPlantilla, eliminarPlantilla, establecerPredeterminada,
  listarCampos, listarPlantillas, obtenerPlantilla, togglePlantilla,
} from '../api/reportes.api'
import type { PlantillaReporteRequest } from '../types.api'

const CLAVE = ['plantillasReporte'] as const

export function usePlantillasReporte() {
  return useQuery({
    queryKey: CLAVE,
    queryFn: listarPlantillas,
  })
}

/** Trae el diseño completo. Solo se pide cuando se abre el editor. */
export function usePlantillaReporte(id: number | null) {
  return useQuery({
    queryKey: [...CLAVE, id],
    queryFn: () => obtenerPlantilla(id as number),
    enabled: id != null,
  })
}

export function useCrearPlantilla() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PlantillaReporteRequest) => crearPlantilla(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Plantilla creada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo crear la plantilla')
    },
  })
}

export function useGuardarPlantilla(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PlantillaReporteRequest) => actualizarPlantilla(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Diseño guardado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo guardar el diseño')
    },
  })
}

export function useTogglePlantilla() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => togglePlantilla(id),
    onSuccess: (activa) => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success(activa ? 'Plantilla puesta en uso' : 'Plantilla retirada de uso')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo cambiar el estado')
    },
  })
}

export function useEstablecerPredeterminada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => establecerPredeterminada(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Es la plantilla que se ofrecerá primero')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo marcar como predeterminada')
    },
  })
}

export function useEliminarPlantilla() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminarPlantilla(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Plantilla eliminada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo eliminar la plantilla')
    },
  })
}

/**
 * El catálogo de datos insertables. Viene del servidor a propósito: si el editor
 * tuviera su propia lista, acabaría ofreciendo campos que nadie sabe resolver.
 */
export function useCamposReporte() {
  return useQuery({
    queryKey: ['camposReporte'],
    queryFn: listarCampos,
    // Cambia solo cuando alguien toca el catálogo de estudios, que es raro dentro
    // de una sesión de diseño.
    staleTime: 5 * 60 * 1000,
  })
}
