import { useQuery } from '@tanstack/react-query'
import type { CatalogoTipo } from '../types/cobertura.types'
import * as api from '../api/cobertura.api'

export const useCobertura = (tipo: CatalogoTipo) =>
  useQuery({
    queryKey: ['cobertura', tipo],
    queryFn: () => api.getCobertura(tipo),
    staleTime: 5 * 60_000,
  })

export const useDistribucion = (tipo: CatalogoTipo) =>
  useQuery({
    queryKey: ['cobertura-dist', tipo],
    queryFn: () => api.getDistribucion(tipo),
    staleTime: 5 * 60_000,
  })

export const usePendientes = (tipoId: number | null, catalogoTipo: CatalogoTipo) =>
  useQuery({
    queryKey: ['cobertura-pendientes', tipoId, catalogoTipo],
    queryFn: () => api.getPendientes(tipoId!, catalogoTipo),
    enabled: tipoId !== null,
    staleTime: 60_000,
  })

export const useGrupo = (k: number | null, catalogoTipo: CatalogoTipo) =>
  useQuery({
    queryKey: ['cobertura-grupo', k, catalogoTipo],
    queryFn: () => api.getGrupo(k!, catalogoTipo),
    enabled: k !== null,
    staleTime: 60_000,
  })

export const useMatriz = (catalogoTipo: CatalogoTipo) =>
  useQuery({
    queryKey: ['cobertura-matriz', catalogoTipo],
    queryFn: () => api.getMatriz(catalogoTipo),
    staleTime: 5 * 60_000,
  })
