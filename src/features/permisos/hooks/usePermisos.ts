import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import * as api from '../api/permisos.api'
import type { ActualizarPermisosRolRequest, AsignarRolRequest, PermisoIndividualRequest } from '../types/permiso.types'

const KEYS = {
  catalogo: ['permisos', 'catalogo'] as const,
  roles: ['permisos', 'roles'] as const,
  usuario: (uuid: string) => ['permisos', 'usuario', uuid] as const,
  bitacora: (params: { uuid?: string; page: number; size: number }) => ['permisos', 'bitacora', params] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useCatalogo() {
  return useQuery({ queryKey: KEYS.catalogo, queryFn: api.getCatalogo })
}

export function useRolesConPermisos() {
  return useQuery({ queryKey: KEYS.roles, queryFn: api.getRolesConPermisos })
}

export function usePermisosUsuario(uuid: string | null) {
  return useQuery({
    queryKey: KEYS.usuario(uuid!),
    queryFn: () => api.getPermisosUsuario(uuid!),
    enabled: !!uuid,
  })
}

export function useBitacoraPermisos(params: { uuid?: string; page: number; size: number }) {
  return useQuery({
    queryKey: KEYS.bitacora(params),
    queryFn: () => api.getBitacoraPermisos(params),
    placeholderData: (prev) => prev,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useActualizarPermisosRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idRol, body }: { idRol: number; body: ActualizarPermisosRolRequest }) =>
      api.actualizarPermisosRol(idRol, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.roles })
      useAuthStore.getState().restoreSession()
      toast.success('Permisos del rol actualizados')
    },
    onError: () => toast.error('Error al actualizar permisos del rol'),
  })
}

export function useAsignarRol(uuid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AsignarRolRequest) => api.asignarRol(uuid, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.usuario(uuid) })
      qc.invalidateQueries({ queryKey: ['permisos', 'bitacora'] })
      useAuthStore.getState().restoreSession()
      toast.success('Rol asignado')
    },
    onError: () => toast.error('Error al asignar rol'),
  })
}

export function useQuitarRol(uuid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idRol: number) => api.quitarRol(uuid, idRol),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.usuario(uuid) })
      qc.invalidateQueries({ queryKey: ['permisos', 'bitacora'] })
      useAuthStore.getState().restoreSession()
      toast.success('Rol removido')
    },
    onError: () => toast.error('Error al quitar rol'),
  })
}

export function useConcederPermiso(uuid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PermisoIndividualRequest) => api.concederPermiso(uuid, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.usuario(uuid) })
      qc.invalidateQueries({ queryKey: ['permisos', 'bitacora'] })
      useAuthStore.getState().restoreSession()
      toast.success('Permiso concedido')
    },
    onError: () => toast.error('Error al conceder permiso'),
  })
}

export function useRestringirPermiso(uuid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PermisoIndividualRequest) => api.restringirPermiso(uuid, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.usuario(uuid) })
      qc.invalidateQueries({ queryKey: ['permisos', 'bitacora'] })
      useAuthStore.getState().restoreSession()
      toast.success('Restricción aplicada')
    },
    onError: () => toast.error('Error al restringir permiso'),
  })
}

export function useQuitarPermisoIndividual(uuid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.quitarPermisoIndividual(uuid, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.usuario(uuid) })
      qc.invalidateQueries({ queryKey: ['permisos', 'bitacora'] })
      useAuthStore.getState().restoreSession()
      toast.success('Permiso individual revocado')
    },
    onError: () => toast.error('Error al revocar permiso'),
  })
}
