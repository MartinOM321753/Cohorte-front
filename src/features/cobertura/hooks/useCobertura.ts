import { useQuery } from '@tanstack/react-query'
import type { CatalogoTipo } from '../types/cobertura.types'
import * as api from '../api/cobertura.api'

export const useCobertura = (tipo: CatalogoTipo, idInstitucion?: number) =>
  useQuery({
    queryKey: ['cobertura', tipo, idInstitucion],
    queryFn: () => api.getCobertura(tipo, idInstitucion),
    staleTime: 5 * 60_000,
  })

export const useDistribucion = (tipo: CatalogoTipo, idInstitucion?: number) =>
  useQuery({
    queryKey: ['cobertura-dist', tipo, idInstitucion],
    queryFn: () => api.getDistribucion(tipo, idInstitucion),
    staleTime: 5 * 60_000,
  })

export const usePendientes = (tipoId: number | null, catalogoTipo: CatalogoTipo, idInstitucion?: number) =>
  useQuery({
    queryKey: ['cobertura-pendientes', tipoId, catalogoTipo, idInstitucion],
    queryFn: () => api.getPendientes(tipoId!, catalogoTipo, idInstitucion),
    enabled: tipoId !== null,
    staleTime: 60_000,
  })

export const useGrupo = (k: number | null, catalogoTipo: CatalogoTipo, idInstitucion?: number) =>
  useQuery({
    queryKey: ['cobertura-grupo', k, catalogoTipo, idInstitucion],
    queryFn: () => api.getGrupo(k!, catalogoTipo, idInstitucion),
    enabled: k !== null,
    staleTime: 60_000,
  })

export const useMatriz = (catalogoTipo: CatalogoTipo, idInstitucion?: number) =>
  useQuery({
    queryKey: ['cobertura-matriz', catalogoTipo, idInstitucion],
    queryFn: () => api.getMatriz(catalogoTipo, idInstitucion),
    staleTime: 5 * 60_000,
  })
