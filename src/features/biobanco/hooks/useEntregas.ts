import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getColaboradores,
  getColaboradoresActivos,
  createColaborador,
  updateColaborador,
  setColaboradorActivo,
  getDestinatariosEntrega,
  getEntregasActivas,
  getHistorialEntregas,
  getEntregasByMuestra,
  entregarMuestras,
  devolverEntrega,
  consumirEntrega,
  cancelarEntrega,
} from '../api/entregas.api'
import {
  ColaboradorRequestDTO,
  EntregaRequestDTO,
  CerrarEntregaRequestDTO,
  CancelarEntregaRequestDTO,
} from '@/types/api'

// ── Colaboradores ────────────────────────────────────────────────────────────

export function useGetColaboradores(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => getColaboradores(),
    enabled: options?.enabled ?? true,
  })
}

export function useGetColaboradoresActivos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['colaboradores', 'activos'],
    queryFn: () => getColaboradoresActivos(),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateColaborador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ColaboradorRequestDTO) => createColaborador(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] })
      queryClient.invalidateQueries({ queryKey: ['entregas', 'destinatarios'] })
      toast.success('Colaborador registrado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar el colaborador')
    },
  })
}

export function useUpdateColaborador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ColaboradorRequestDTO }) => updateColaborador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] })
      queryClient.invalidateQueries({ queryKey: ['entregas', 'destinatarios'] })
      toast.success('Colaborador actualizado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el colaborador')
    },
  })
}

export function useSetColaboradorActivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => setColaboradorActivo(id, activo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] })
      queryClient.invalidateQueries({ queryKey: ['entregas', 'destinatarios'] })
      toast.success(data.activo ? 'Colaborador activado' : 'Colaborador desactivado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado')
    },
  })
}

// ── Entregas ───────────────────────────────────────────────────────────────

export function useGetDestinatariosEntrega(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entregas', 'destinatarios'],
    queryFn: () => getDestinatariosEntrega(),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 2,
  })
}

export function useGetEntregasActivas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entregas'],
    queryFn: () => getEntregasActivas(),
    enabled: options?.enabled ?? true,
  })
}

export function useGetHistorialEntregas(page = 0, size = 20) {
  return useQuery({
    queryKey: ['entregas-historial', page, size],
    queryFn: () => getHistorialEntregas(page, size),
  })
}

export function useGetEntregasByMuestra(idMuestra: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['entregas-muestra', idMuestra],
    queryFn: () => getEntregasByMuestra(idMuestra),
    enabled: (options?.enabled ?? true) && !!idMuestra,
  })
}

/** Invalida todo lo que cambia al mover una muestra entre biobanco y colaborador. */
function invalidarEntregas(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['entregas'] })
  queryClient.invalidateQueries({ queryKey: ['entregas-historial'] })
  queryClient.invalidateQueries({ queryKey: ['entregas-muestra'] })
  queryClient.invalidateQueries({ queryKey: ['muestras'] })
  queryClient.invalidateQueries({ queryKey: ['muestras-biobanco'] })
  queryClient.invalidateQueries({ queryKey: ['posiciones'] })
  queryClient.invalidateQueries({ queryKey: ['posiciones-libres'] })
}

export function useEntregarMuestras() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: EntregaRequestDTO) => entregarMuestras(data),
    onSuccess: (data) => {
      invalidarEntregas(queryClient)
      const count = Array.isArray(data) ? data.length : 1
      toast.success(count > 1 ? `Entrega registrada: ${count} muestras` : 'Entrega registrada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar la entrega')
    },
  })
}

export function useDevolverEntrega() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idEntrega, data }: { idEntrega: number; data: CerrarEntregaRequestDTO }) =>
      devolverEntrega(idEntrega, data),
    onSuccess: () => {
      invalidarEntregas(queryClient)
      toast.success('Devolución registrada. La muestra regresó al biobanco.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar la devolución')
    },
  })
}

export function useConsumirEntrega() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idEntrega, data }: { idEntrega: number; data: CerrarEntregaRequestDTO }) =>
      consumirEntrega(idEntrega, data),
    onSuccess: () => {
      invalidarEntregas(queryClient)
      toast.success('Muestra marcada como consumida. Conserva su volumen para capturar estudios pendientes.',
        { duration: 6000 })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al marcar como consumida')
    },
  })
}

export function useCancelarEntrega() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idEntrega, data }: { idEntrega: number; data: CancelarEntregaRequestDTO }) =>
      cancelarEntrega(idEntrega, data),
    onSuccess: () => {
      invalidarEntregas(queryClient)
      toast.success('Entrega cancelada. La muestra regresó al biobanco.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cancelar la entrega')
    },
  })
}
