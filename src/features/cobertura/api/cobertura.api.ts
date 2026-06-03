import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
  CoberturaItemDTO,
  DistribucionBucketDTO,
  PacientePendienteDTO,
  CoberturaPacienteDTO,
  CatalogoTipo,
} from '../types/cobertura.types'

export const getCobertura = (tipo: CatalogoTipo) =>
  api.get<ApiResponse<CoberturaItemDTO[]>>(
    `/dashboard/cobertura/${tipo === 'EXAMEN' ? 'examenes' : 'estudios'}`
  ).then(r => r.data.data ?? [])

export const getDistribucion = (tipo: CatalogoTipo) =>
  api.get<ApiResponse<DistribucionBucketDTO[]>>('/dashboard/cobertura/distribucion', {
    params: { tipo },
  }).then(r => r.data.data ?? [])

export const getPendientes = (tipoId: number, catalogoTipo: CatalogoTipo) =>
  api.get<ApiResponse<PacientePendienteDTO[]>>('/dashboard/cobertura/pendientes', {
    params: { tipoId, catalogoTipo },
  }).then(r => r.data.data ?? [])

export const getGrupo = (cantidadTipos: number, catalogoTipo: CatalogoTipo) =>
  api.get<ApiResponse<PacientePendienteDTO[]>>('/dashboard/cobertura/grupo', {
    params: { cantidadTipos, catalogoTipo },
  }).then(r => r.data.data ?? [])

export const getMatriz = (catalogoTipo: CatalogoTipo) =>
  api.get<ApiResponse<CoberturaPacienteDTO[]>>('/dashboard/cobertura/matriz', {
    params: { catalogoTipo },
  }).then(r => r.data.data ?? [])
