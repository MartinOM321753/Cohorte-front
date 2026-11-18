import api from '@/lib/axiosInstance'
import type { ApiResponse } from '@/types/api'

const BASE = '/configuracion/claves'

export async function getConfiguracionClave(clave: string): Promise<string | null> {
  const { data } = await api.get<ApiResponse<string | null>>(`${BASE}/${clave}`)
  return data.data
}

export async function setConfiguracionClave(clave: string, valor: string): Promise<void> {
  await api.put(`${BASE}/${clave}`, valor, {
    headers: { 'Content-Type': 'application/json' },
  })
}
