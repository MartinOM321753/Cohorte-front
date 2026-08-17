import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
  CoberturaItemDTO,
  DistribucionBucketDTO,
  PacientePendienteDTO,
  CoberturaPacienteDTO,
  CatalogoTipo,
} from '../types/cobertura.types'

/**
 * `idInstitucion` permite ver la cobertura de otra sede del grupo. Si se omite,
 * la propia. La cobertura se mide por sede: juntar varios padrones en un solo
 * porcentaje escondería el pendiente de cada una.
 */
export const getCobertura = (tipo: CatalogoTipo, idInstitucion?: number) =>
  api.get<ApiResponse<CoberturaItemDTO[]>>(
    `/dashboard/cobertura/${tipo === 'EXAMEN' ? 'examenes' : 'estudios'}`,
    { params: idInstitucion ? { idInstitucion } : undefined }
  ).then(r => r.data.data ?? [])

export const getDistribucion = (tipo: CatalogoTipo, idInstitucion?: number) =>
  api.get<ApiResponse<DistribucionBucketDTO[]>>('/dashboard/cobertura/distribucion', {
    params: { tipo, ...(idInstitucion ? { idInstitucion } : {}) },
  }).then(r => r.data.data ?? [])

export const getPendientes = (tipoId: number, catalogoTipo: CatalogoTipo, idInstitucion?: number) =>
  api.get<ApiResponse<PacientePendienteDTO[]>>('/dashboard/cobertura/pendientes', {
    params: { tipoId, catalogoTipo, ...(idInstitucion ? { idInstitucion } : {}) },
  }).then(r => r.data.data ?? [])

export const getGrupo = (cantidadTipos: number, catalogoTipo: CatalogoTipo, idInstitucion?: number) =>
  api.get<ApiResponse<PacientePendienteDTO[]>>('/dashboard/cobertura/grupo', {
    params: { cantidadTipos, catalogoTipo, ...(idInstitucion ? { idInstitucion } : {}) },
  }).then(r => r.data.data ?? [])

export const getMatriz = (catalogoTipo: CatalogoTipo, idInstitucion?: number) =>
  api.get<ApiResponse<CoberturaPacienteDTO[]>>('/dashboard/cobertura/matriz', {
    params: { catalogoTipo, ...(idInstitucion ? { idInstitucion } : {}) },
  }).then(r => r.data.data ?? [])
