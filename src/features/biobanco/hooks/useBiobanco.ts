import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRefrigeradores,
  getRefrigeradorById,
  createRefrigerador,
  updateRefrigerador,
  deleteRefrigerador,
  getPisosByRefrigerador,
  createPisos,
  getCajas,
  getCajaById,
  createCaja,
  updateCaja,
  deleteCaja,
  getPosicionesByCaja,
  getPosicionesLibresByCaja,
  getPosicionesByPiso,
  getPosicionesLibresByPiso,
  getMuestras,
  getMuestraById,
  getMuestrasByPaciente,
  createMuestra,
  updateMuestra,
  deleteMuestra
} from '../api/biobanco.api'
import {
  RefrigeradorRequestDTO,
  PisosDTO,
  CajaRequestDTO,
  MuestraRequestDTO,
} from '@/types/api'
import { toast } from 'sonner'

// ============================================
// HOOKS PARA REFRIGERADORES
// ============================================

export function useGetRefrigeradores() {
  return useQuery({
    queryKey: ['refrigeradores'],
    queryFn: () => getRefrigeradores(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetRefrigeradorById(id: number) {
  return useQuery({
    queryKey: ['refrigeradores', id],
    queryFn: () => getRefrigeradorById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRefrigerador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RefrigeradorRequestDTO) => createRefrigerador(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Refrigerador creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear el refrigerador'
      toast.error(message)
    },
  })
}

export function useUpdateRefrigerador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RefrigeradorRequestDTO> }) =>
      updateRefrigerador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Refrigerador actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el refrigerador'
      toast.error(message)
    },
  })
}

export function useDeleteRefrigerador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteRefrigerador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Refrigerador eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el refrigerador'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA PISOS
// ============================================

export function useGetPisosByRefrigerador(idRefrigerador: number) {
  return useQuery({
    queryKey: ['pisos', idRefrigerador],
    queryFn: () => getPisosByRefrigerador(idRefrigerador),
    enabled: !!idRefrigerador,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreatePisos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PisosDTO) => createPisos(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Pisos creados exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear los pisos'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA POSICIONES DE PISO
// ============================================

export function useGetPosicionesByPiso(idPiso: number) {
  return useQuery({
    queryKey: ['posiciones-piso', idPiso],
    queryFn: () => getPosicionesByPiso(idPiso),
    enabled: !!idPiso,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetPosicionesLibresByPiso(idPiso: number) {
  return useQuery({
    queryKey: ['posiciones-piso-libres', idPiso],
    queryFn: () => getPosicionesLibresByPiso(idPiso),
    enabled: !!idPiso,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================
// HOOKS PARA CAJAS
// ============================================

export function useGetCajas() {
  return useQuery({
    queryKey: ['cajas'],
    queryFn: () => getCajas(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetCajaById(id: number) {
  return useQuery({
    queryKey: ['cajas', id],
    queryFn: () => getCajaById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCaja() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CajaRequestDTO) => createCaja(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      toast.success('Caja criogénica creada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear la caja'
      toast.error(message)
    },
  })
}

export function useUpdateCaja() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CajaRequestDTO> }) =>
      updateCaja(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      toast.success('Caja actualizada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la caja'
      toast.error(message)
    },
  })
}

export function useDeleteCaja() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCaja(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      toast.success('Caja eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar la caja'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA POSICIONES DE CAJA
// ============================================

export function useGetPosicionesByCaja(idCaja: number) {
  return useQuery({
    queryKey: ['posiciones', idCaja],
    queryFn: () => getPosicionesByCaja(idCaja),
    enabled: !!idCaja,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetPosicionesLibresByCaja(idCaja: number) {
  return useQuery({
    queryKey: ['posiciones-libres', idCaja],
    queryFn: () => getPosicionesLibresByCaja(idCaja),
    enabled: !!idCaja,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================
// HOOKS PARA MUESTRAS
// ============================================

export function useGetMuestras(params?: { pacienteUUID?: string }) {
  return useQuery({
    queryKey: ['muestras', params],
    queryFn: () => getMuestras(params),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetMuestraById(id: number) {
  return useQuery({
    queryKey: ['muestras', id],
    queryFn: () => getMuestraById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGetMuestrasByPaciente(uuid: string) {
  return useQuery({
    queryKey: ['muestras-paciente', uuid],
    queryFn: () => getMuestrasByPaciente(uuid),
    enabled: !!uuid,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MuestraRequestDTO) => createMuestra(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Muestra registrada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrar la muestra'
      toast.error(message)
    },
  })
}

export function useUpdateMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MuestraRequestDTO> }) =>
      updateMuestra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Muestra actualizada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar la muestra'
      toast.error(message)
    },
  })
}

export function useDeleteMuestra() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMuestra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
      toast.success('Muestra eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar la muestra'
      toast.error(message)
    },
  })
}