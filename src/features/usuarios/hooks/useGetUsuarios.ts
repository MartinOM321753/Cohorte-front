import { useQuery } from '@tanstack/react-query'
import { getUsuarios, getUsuarioById, getUsuariosActivos, getAdministradoresDisponibles } from '../api/usuarios.api'
import { useMemo } from 'react'

export const USUARIOS_QUERY_KEY = ['usuarios'] as const

/** Roles válidos para ser asignados como encargado de institución. */
const ROLES_ENCARGADO = ['ENCARGADO', 'ADMINISTRADOR'] as const

export function useGetUsuarios() {
  return useQuery({
    queryKey: USUARIOS_QUERY_KEY,
    queryFn: getUsuarios,
    staleTime: 1000 * 60 * 2,
  })
}

export function useGetUsuarioById(id: number | null) {
  return useQuery({
    queryKey: [...USUARIOS_QUERY_KEY, id],
    queryFn: () => getUsuarioById(id!),
    enabled: id !== null,
  })
}

/**
 * Obtiene los usuarios elegibles como encargado de institución:
 * usuarios ACTIVOS con rol ENCARGADO o ADMINISTRADOR.
 *
 * @deprecated Usar {@link useGetAdministradoresDisponibles} que filtra correctamente
 * solo ADMINISTRADORs sin asignación de encargado.
 */
export function useGetEncargadosParaInstitucion(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  const { data: activos = [], isLoading, isError } = useQuery({
    queryKey: ['usuarios', 'activos'],
    queryFn: getUsuariosActivos,
    enabled,
    staleTime: 0,
  })

  const data = useMemo(
    () => activos.filter(u => ROLES_ENCARGADO.includes(u.rol?.nombre as typeof ROLES_ENCARGADO[number])),
    [activos],
  )

  return { data, isLoading, isError }
}

/**
 * Administradores activos disponibles para ser asignados como encargado de institución.
 * Solo muestra ADMINISTRADORs que no estén ya a cargo de ninguna institución.
 *
 * Si se pasa `institucionUuid` (modo edición), también incluye al que ya esté asignado
 * a esa institución para que el selector no lo pierda.
 *
 * staleTime: 0 → siempre re-fetch al abrir el modal (admins recién creados aparecen de inmediato).
 */
export function useGetAdministradoresDisponibles(options?: { enabled?: boolean; institucionUuid?: string | null }) {
  const enabled = options?.enabled ?? true
  const institucionUuid = options?.institucionUuid ?? null

  return useQuery({
    queryKey: ['usuarios', 'administradores-disponibles', institucionUuid],
    queryFn: () => getAdministradoresDisponibles(institucionUuid ?? undefined),
    enabled,
    staleTime: 0,
  })
}
