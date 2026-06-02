import api from '@/lib/axiosInstance'
import type { ApiResponse, Somatometria, SomatometriaRequestDTO } from '@/types/api'

const BASE = '/somatometria'

export async function getSomatometriaByPaciente(pacienteUUID: string): Promise<Somatometria[]> {
  const res = await api.get<ApiResponse<Somatometria[]>>(`${BASE}/paciente/${pacienteUUID}`)
  return res.data.data
}

export async function getLatestSomatometria(pacienteUUID: string): Promise<Somatometria | null> {
  try {
    const res = await api.get<ApiResponse<Somatometria>>(`${BASE}/paciente/${pacienteUUID}/latest`)
    return res.data.data
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function createSomatometria(dto: SomatometriaRequestDTO): Promise<Somatometria> {
  const res = await api.post<ApiResponse<Somatometria>>(BASE, dto)
  return res.data.data
}

export async function updateSomatometria(id: number, dto: SomatometriaRequestDTO): Promise<Somatometria> {
  const res = await api.put<ApiResponse<Somatometria>>(`${BASE}/${id}`, dto)
  return res.data.data
}

export async function deleteSomatometria(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
