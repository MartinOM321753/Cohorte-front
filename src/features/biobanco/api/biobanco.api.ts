import api from '@/lib/axiosInstance'
import {
  ApiResponse,
  Refrigerador,
  RefrigeradorRequestDTO,
  PisosDTO,
  Caja,
  CajaRequestDTO,
  Muestra,
  MuestraRequestDTO,
  PosicionCaja
} from '@/types/api'

// ============================================
// REFRIGERADORES
// ============================================

export async function getRefrigeradores() {
  const response = await api.get<ApiResponse<Refrigerador[]>>('/almacenamiento/refrigeradores')
  return response.data.data
}

export async function getRefrigeradorById(id: number) {
  const response = await api.get<ApiResponse<Refrigerador>>(`/almacenamiento/refrigeradores/${id}`)
  return response.data.data
}

export async function createRefrigerador(data: RefrigeradorRequestDTO) {
  const response = await api.post<ApiResponse<Refrigerador>>('/almacenamiento/refrigeradores', data)
  return response.data.data
}

export async function updateRefrigerador(id: number, data: Partial<RefrigeradorRequestDTO>) {
  const response = await api.put<ApiResponse<Refrigerador>>(`/almacenamiento/refrigeradores/${id}`, data)
  return response.data.data
}

export async function deleteRefrigerador(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/refrigeradores/${id}`)
  return response.data
}

// ============================================
// PISOS DE REFRIGERADOR
// ============================================

export async function getPisosByRefrigerador(idRefrigerador: number) {
  try {
    const response = await api.get<ApiResponse<any[]>>(`/almacenamiento/refrigeradores/${idRefrigerador}/pisos`)
    return response.data.data || []
  } catch (error: any) {
    // Si la API retorna 404 o error, retornar array vacío en lugar de lanzar error
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export async function createPisos(data: PisosDTO) {
  const response = await api.post<ApiResponse<any[]>>('/almacenamiento/refrigeradores/pisos', data)
  return response.data.data
}

// ============================================
// POSICIONES DE PISO
// ============================================

export async function getPosicionesByPiso(idPiso: number) {
  const response = await api.get<ApiResponse<any[]>>(`/almacenamiento/pisos/${idPiso}/posiciones`)
  return response.data.data
}

export async function getPosicionesLibresByPiso(idPiso: number) {
  const response = await api.get<ApiResponse<any[]>>(`/almacenamiento/pisos/${idPiso}/posiciones/libres`)
  return response.data.data
}

// ============================================
// CAJAS CRIOGÉNICAS
// ============================================

export async function getCajas() {
  const response = await api.get<ApiResponse<Caja[]>>('/almacenamiento/cajas')
  return response.data.data
}

export async function getCajaById(id: number) {
  const response = await api.get<ApiResponse<Caja>>(`/almacenamiento/cajas/${id}`)
  return response.data.data
}

export async function createCaja(data: CajaRequestDTO) {
  const response = await api.post<ApiResponse<Caja>>('/almacenamiento/cajas', data)
  return response.data.data
}

export async function updateCaja(id: number, data: Partial<CajaRequestDTO>) {
  const response = await api.put<ApiResponse<Caja>>(`/almacenamiento/cajas/${id}`, data)
  return response.data.data
}

export async function deleteCaja(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/cajas/${id}`)
  return response.data
}

// ============================================
// POSICIONES DE CAJA
// ============================================

export async function getPosicionesByCaja(idCaja: number) {
  const response = await api.get<ApiResponse<PosicionCaja[]>>(`/almacenamiento/cajas/${idCaja}/posiciones`)
  return response.data.data
}

export async function getPosicionesLibresByCaja(idCaja: number) {
  const response = await api.get<ApiResponse<PosicionCaja[]>>(`/almacenamiento/cajas/${idCaja}/posiciones/libres`)
  return response.data.data
}

// ============================================
// MUESTRAS
// ============================================

export async function getMuestras(params?: { pacienteUUID?: string }) {
  const response = await api.get<ApiResponse<Muestra[]>>('/almacenamiento/muestras', { params })
  return response.data.data
}

export async function getMuestraById(id: number) {
  const response = await api.get<ApiResponse<Muestra>>(`/almacenamiento/muestras/${id}`)
  return response.data.data
}

export async function getMuestrasByPaciente(uuid: string) {
  const response = await api.get<ApiResponse<Muestra[]>>(`/almacenamiento/muestras/paciente/uuid/${uuid}`)
  return response.data.data
}

export async function createMuestra(data: MuestraRequestDTO) {
  const response = await api.post<ApiResponse<Muestra>>('/almacenamiento/muestras', data)
  return response.data.data
}

export async function updateMuestra(id: number, data: Partial<MuestraRequestDTO>) {
  const response = await api.put<ApiResponse<Muestra>>(`/almacenamiento/muestras/${id}`, data)
  return response.data.data
}

export async function deleteMuestra(id: number) {
  const response = await api.delete<ApiResponse<void>>(`/almacenamiento/muestras/${id}`)
  return response.data
}