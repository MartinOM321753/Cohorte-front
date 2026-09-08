import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  actualizarPlantilla, crearPlantilla, duplicarPlantilla, eliminarPlantilla,
  establecerPredeterminada, listarCampos, listarPlantillas, obtenerPlantilla,
  renombrarPlantilla, togglePlantilla,
} from '../api/reportes.api'
import type { PlantillaReporteRequest } from '../types.api'

const CLAVE = ['plantillasReporte'] as const

/**
 * El listado de plantillas de la institución.
 *
 * <p>Admite apagarse porque no todo el que abre un expediente puede pedirlas: el
 * participante ve el suyo y no tiene `REPORTES_ACCEDER`. Pidiéndolas siempre, su
 * sesión se llevaba un 401 nada más entrar, y el interceptor de axios convierte
 * cualquier 401 en un cierre de sesión — o sea que la petición no solo sobraba,
 * lo echaba de su propio expediente.</p>
 */
export function usePlantillasReporte(opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CLAVE,
    queryFn: listarPlantillas,
    enabled: opciones?.enabled ?? true,
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

export function useRenombrarPlantilla() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; nombre: string; descripcion?: string }) =>
      renombrarPlantilla(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Plantilla renombrada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo renombrar la plantilla')
    },
  })
}

export function useDuplicarPlantilla() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre?: string }) => duplicarPlantilla(id, nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Plantilla duplicada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo duplicar la plantilla')
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
