import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSomatometria,
  deleteSomatometria,
  getLatestSomatometria,
  getSomatometriaByPaciente,
  updateSomatometria,
} from '../api/somatometria.api'
import type { SomatometriaRequestDTO } from '@/types/api'

// ─── Query keys ───────────────────────────────────────────────────────────────
export const somatometriaKeys = {
  all:     () => ['somatometria'] as const,
  byPaciente: (uuid: string) => ['somatometria', 'paciente', uuid] as const,
  latest:     (uuid: string) => ['somatometria', 'latest', uuid] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Historial completo del paciente — para gráficas y tabla.
 * `enabled` se usa externamente para no llamar si el rol no tiene acceso.
 */
export function useSomatometriaByPaciente(
  pacienteUUID: string | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: somatometriaKeys.byPaciente(pacienteUUID ?? ''),
    queryFn: () => getSomatometriaByPaciente(pacienteUUID!),
    enabled: (opts?.enabled ?? true) && !!pacienteUUID,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Último registro — para los tiles de resumen.
 */
export function useLatestSomatometria(
  pacienteUUID: string | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: somatometriaKeys.latest(pacienteUUID ?? ''),
    queryFn: () => getLatestSomatometria(pacienteUUID!),
    enabled: (opts?.enabled ?? true) && !!pacienteUUID,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSomatometria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SomatometriaRequestDTO) => createSomatometria(dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: somatometriaKeys.byPaciente(variables.pacienteUUID) })
      qc.invalidateQueries({ queryKey: somatometriaKeys.latest(variables.pacienteUUID) })
    },
  })
}

export function useUpdateSomatometria(pacienteUUID: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SomatometriaRequestDTO }) =>
      updateSomatometria(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: somatometriaKeys.byPaciente(pacienteUUID) })
      qc.invalidateQueries({ queryKey: somatometriaKeys.latest(pacienteUUID) })
    },
  })
}

export function useDeleteSomatometria(pacienteUUID: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSomatometria(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: somatometriaKeys.byPaciente(pacienteUUID) })
      qc.invalidateQueries({ queryKey: somatometriaKeys.latest(pacienteUUID) })
    },
  })
}
