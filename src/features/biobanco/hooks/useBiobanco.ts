import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRefrigeradores,
  getRefrigeradorById,
  createRefrigerador,
  updateRefrigerador,
  deleteRefrigerador,
  getPisosByRefrigerador,
  createPisos,
  updatePiso,
  deletePiso,
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
  deleteMuestra,
  getAlmacenes,
  createAlmacen,
  updateAlmacen,
  deleteAlmacen,
  activateAlmacen,
  getAllTraslados,
  getTrasladosByMuestra,
  getTrasladosByAlmacen,
  registrarTraslado,
  registrarDevolucion,
  confirmarRecepcion,
  iniciarDevolucion,
  getUsuariosByRol,
  getAlmacenesByEncargadoUuid,
} from '../api/biobanco.api'
import {
  RefrigeradorRequestDTO,
  PisosDTO,
  CajaRequestDTO,
  MuestraRequestDTO,
  MuestraDetalleDTO,
  AlmacenRequestDTO,
  TrasladoRequestDTO,
  DevolucionRequestDTO,
  ConfirmarRecepcionRequestDTO,
  IniciarDevolucionRequestDTO,
} from '@/types/api'
import { toast } from 'sonner'

// ============================================
// HOOKS PARA REFRIGERADORES
// ============================================

export function useGetRefrigeradores(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['refrigeradores'],
    queryFn: () => getRefrigeradores(),
    enabled: options?.enabled ?? true,
  })
}

export function useGetRefrigeradorById(id: number) {
  return useQuery({
    queryKey: ['refrigeradores', id],
    queryFn: () => getRefrigeradorById(id),
    enabled: !!id,
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

export function useUpdatePiso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { numeroPiso: string; filas: number; columnas: number; altura: number; activo: boolean } }) =>
      updatePiso(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Piso actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el piso'
      toast.error(message)
    },
  })
}

export function useDeletePiso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deletePiso(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisos'] })
      queryClient.invalidateQueries({ queryKey: ['refrigeradores'] })
      toast.success('Piso eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el piso'
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
  })
}

export function useGetPosicionesLibresByPiso(idPiso: number) {
  return useQuery({
    queryKey: ['posiciones-piso-libres', idPiso],
    queryFn: () => getPosicionesLibresByPiso(idPiso),
    enabled: !!idPiso,
  })
}

// ============================================
// HOOKS PARA CAJAS
// ============================================

export function useGetCajas() {
  return useQuery({
    queryKey: ['cajas'],
    queryFn: () => getCajas(),
  })
}

export function useGetCajaById(id: number) {
  return useQuery({
    queryKey: ['cajas', id],
    queryFn: () => getCajaById(id),
    enabled: !!id,
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
  })
}

export function useGetPosicionesLibresByCaja(idCaja: number) {
  return useQuery({
    queryKey: ['posiciones-libres', idCaja],
    queryFn: () => getPosicionesLibresByCaja(idCaja),
    enabled: !!idCaja,
  })
}

// ============================================
// HOOKS PARA MUESTRAS
// ============================================

export function useGetMuestras(params?: { pacienteUUID?: string }) {
  return useQuery<MuestraDetalleDTO[]>({
    queryKey: ['muestras', params],
    queryFn: () => getMuestras(params),
  })
}

export function useGetMuestraById(id: number) {
  return useQuery<MuestraDetalleDTO>({
    queryKey: ['muestras', id],
    queryFn: () => getMuestraById(id),
    enabled: !!id,
  })
}

export function useGetMuestrasByPaciente(uuid: string) {
  return useQuery({
    queryKey: ['muestras-paciente', uuid],
    queryFn: () => getMuestrasByPaciente(uuid),
    enabled: !!uuid,
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

// ============================================
// HOOKS PARA ALMACENES EXTERNOS
// ============================================

export function useGetAlmacenes() {
  return useQuery({
    queryKey: ['almacenes'],
    queryFn: () => getAlmacenes(),
  })
}

export function useCreateAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AlmacenRequestDTO) => createAlmacen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén creado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear el almacén'
      toast.error(message)
    },
  })
}

export function useUpdateAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AlmacenRequestDTO }) => updateAlmacen(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el almacén'
      toast.error(message)
    },
  })
}

export function useDeleteAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAlmacen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén desactivado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al desactivar el almacén'
      toast.error(message)
    },
  })
}

export function useActivateAlmacen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => activateAlmacen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      toast.success('Almacén activado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al activar el almacén'
      toast.error(message)
    },
  })
}

// ============================================
// HOOKS PARA TRASLADOS DE MUESTRAS
// ============================================

export function useGetAllTraslados() {
  return useQuery({
    queryKey: ['traslados'],
    queryFn: () => getAllTraslados(),
  })
}

export function useGetTrasladosByMuestra(idMuestra: number) {
  return useQuery({
    queryKey: ['traslados-muestra', idMuestra],
    queryFn: () => getTrasladosByMuestra(idMuestra),
    enabled: !!idMuestra,
  })
}

export function useRegistrarTraslado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TrasladoRequestDTO) => registrarTraslado(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      toast.success('Traslado registrado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al registrar el traslado'
      toast.error(message)
    },
  })
}

export function useRegistrarDevolucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: DevolucionRequestDTO }) =>
      registrarDevolucion(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      toast.success('Devolución confirmada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al confirmar la devolución'
      toast.error(message)
    },
  })
}

export function useConfirmarRecepcion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: ConfirmarRecepcionRequestDTO }) =>
      confirmarRecepcion(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-almacen'] })
      toast.success('Recepción confirmada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al confirmar la recepción'
      toast.error(message)
    },
  })
}

export function useIniciarDevolucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idTraslado, data }: { idTraslado: number; data: IniciarDevolucionRequestDTO }) =>
      iniciarDevolucion(idTraslado, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-muestra'] })
      queryClient.invalidateQueries({ queryKey: ['traslados-almacen'] })
      toast.success('Devolución iniciada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al iniciar la devolución'
      toast.error(message)
    },
  })
}

export function useGetTrasladosByAlmacen(idAlmacen: number, page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: ['traslados-almacen', idAlmacen, page, size],
    queryFn: () => getTrasladosByAlmacen(idAlmacen, page, size),
    enabled: !!idAlmacen,
  })
}

export function useGetUsuariosByRol(roleName: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['usuarios-rol', roleName],
    queryFn: () => getUsuariosByRol(roleName),
    enabled: options?.enabled ?? true,
  })
}

export function useGetAlmacenesByEncargado(uuid: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['almacenes-encargado', uuid],
    queryFn: () => getAlmacenesByEncargadoUuid(uuid),
    enabled: (options?.enabled ?? true) && !!uuid,
  })
}

