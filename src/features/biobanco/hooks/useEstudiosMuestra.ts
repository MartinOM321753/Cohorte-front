import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTiposEstudioMuestra,
  getTodosLosTiposEstudioMuestra,
  createTipoEstudioMuestra,
  updateTipoEstudioMuestra,
  toggleTipoEstudioMuestra,
  getParametrosByTipoEstudioMuestra,
  createParametroEstudioMuestra,
  updateParametroEstudioMuestra,
  deleteParametroEstudioMuestra,
  getEstudiosByMuestra,
  createEstudioMuestra,
  updateEstudioMuestra,
  deleteEstudioMuestra,
  getHistorialMuestra,
} from '../api/biobanco.api'
import type {
  TipoEstudioMuestraRequestDTO,
  ParametroEstudioMuestraRequestDTO,
  EstudioMuestraRequestDTO,
} from '@/types/api'

// ── Query keys ────────────────────────────────────────────────────────────────
export const estudiosMuestraKeys = {
  tiposAll:        ['tipos-estudio-muestra'] as const,
  tiposTodos:      ['tipos-estudio-muestra', 'todos'] as const,
  parametrosByTipo:(id: number) => ['parametros-estudio-muestra', id] as const,
  byMuestra:       (id: number) => ['estudios-muestra', id] as const,
  historial:       (id: number) => ['historial-muestra', id] as const,
}

// ══════════════════════════════════════════════════════════════════════════════
//  TIPOS DE ESTUDIO DE MUESTRA
// ══════════════════════════════════════════════════════════════════════════════

export function useGetTiposEstudioMuestra() {
  return useQuery({
    queryKey: estudiosMuestraKeys.tiposAll,
    queryFn: getTiposEstudioMuestra,
  })
}

export function useGetTodosLosTiposEstudioMuestra() {
  return useQuery({
    queryKey: estudiosMuestraKeys.tiposTodos,
    queryFn: getTodosLosTiposEstudioMuestra,
  })
}

export function useCreateTipoEstudioMuestra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TipoEstudioMuestraRequestDTO) => createTipoEstudioMuestra(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposAll })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposTodos })
      toast.success('Tipo de estudio de muestra creado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al crear tipo de estudio')
    },
  })
}

export function useUpdateTipoEstudioMuestra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TipoEstudioMuestraRequestDTO }) =>
      updateTipoEstudioMuestra(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposAll })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposTodos })
      toast.success('Tipo de estudio de muestra actualizado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar tipo de estudio')
    },
  })
}

export function useToggleTipoEstudioMuestra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleTipoEstudioMuestra(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposAll })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposTodos })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al cambiar estado')
    },
  })
}

// ══════════════════════════════════════════════════════════════════════════════
//  PARÁMETROS DE ESTUDIO DE MUESTRA
// ══════════════════════════════════════════════════════════════════════════════

export function useGetParametrosByTipoEstudioMuestra(idTipo: number | null) {
  return useQuery({
    queryKey: estudiosMuestraKeys.parametrosByTipo(idTipo ?? 0),
    queryFn: () => getParametrosByTipoEstudioMuestra(idTipo!),
    enabled: idTipo != null && idTipo > 0,
  })
}

export function useCreateParametroEstudioMuestra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ParametroEstudioMuestraRequestDTO) => createParametroEstudioMuestra(data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposAll })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposTodos })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.parametrosByTipo(vars.idTipoEstudioMuestra) })
      toast.success('Parámetro creado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al crear parámetro')
    },
  })
}

export function useUpdateParametroEstudioMuestra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ParametroEstudioMuestraRequestDTO }) =>
      updateParametroEstudioMuestra(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposAll })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposTodos })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.parametrosByTipo(vars.data.idTipoEstudioMuestra) })
      toast.success('Parámetro actualizado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar parámetro')
    },
  })
}

export function useDeleteParametroEstudioMuestra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteParametroEstudioMuestra(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposAll })
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.tiposTodos })
      toast.success('Parámetro eliminado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar parámetro')
    },
  })
}

// ══════════════════════════════════════════════════════════════════════════════
//  ESTUDIOS POR MUESTRA
// ══════════════════════════════════════════════════════════════════════════════

export function useGetEstudiosByMuestra(idMuestra: number) {
  return useQuery({
    queryKey: estudiosMuestraKeys.byMuestra(idMuestra),
    queryFn: () => getEstudiosByMuestra(idMuestra),
    enabled: idMuestra > 0,
  })
}

export function useCreateEstudioMuestra(idMuestra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EstudioMuestraRequestDTO) => createEstudioMuestra(idMuestra, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.byMuestra(idMuestra) })
      toast.success('Estudio registrado correctamente')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al registrar estudio')
    },
  })
}

export function useUpdateEstudioMuestra(idMuestra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EstudioMuestraRequestDTO }) =>
      updateEstudioMuestra(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.byMuestra(idMuestra) })
      toast.success('Estudio actualizado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar estudio')
    },
  })
}

export function useDeleteEstudioMuestra(idMuestra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEstudioMuestra(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: estudiosMuestraKeys.byMuestra(idMuestra) })
      toast.success('Estudio eliminado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar estudio')
    },
  })
}

// ══════════════════════════════════════════════════════════════════════════════
//  HISTORIAL DE CAMBIOS
// ══════════════════════════════════════════════════════════════════════════════

export function useGetHistorialMuestra(idMuestra: number) {
  return useQuery({
    queryKey: estudiosMuestraKeys.historial(idMuestra),
    queryFn: () => getHistorialMuestra(idMuestra),
    enabled: idMuestra > 0,
  })
}
