import api from '@/lib/axiosInstance'
import {
  ApiResponse,
  SpringPage,
  Colaborador,
  ColaboradorRequestDTO,
  DestinatarioEntrega,
  EntregaMuestra,
  EntregaRequestDTO,
  CerrarEntregaRequestDTO,
  CancelarEntregaRequestDTO,
} from '@/types/api'

// ============================================
// COLABORADORES
// ============================================

export async function getColaboradores() {
  const response = await api.get<ApiResponse<Colaborador[]>>('/almacenamiento/colaboradores')
  return response.data.data
}

export async function getColaboradoresActivos() {
  const response = await api.get<ApiResponse<Colaborador[]>>('/almacenamiento/colaboradores/activos')
  return response.data.data
}

export async function createColaborador(data: ColaboradorRequestDTO) {
  const response = await api.post<ApiResponse<Colaborador>>('/almacenamiento/colaboradores', data)
  return response.data.data
}

export async function updateColaborador(id: number, data: ColaboradorRequestDTO) {
  const response = await api.put<ApiResponse<Colaborador>>(`/almacenamiento/colaboradores/${id}`, data)
  return response.data.data
}

export async function setColaboradorActivo(id: number, activo: boolean) {
  const response = await api.patch<ApiResponse<Colaborador>>(
    `/almacenamiento/colaboradores/${id}/activo`, null, { params: { activo } })
  return response.data.data
}

// ============================================
// ENTREGAS A COLABORADORES
// ============================================

/** Destinatarios posibles (colaboradores activos + usuarios) de mi institución. */
export async function getDestinatariosEntrega() {
  const response = await api.get<ApiResponse<DestinatarioEntrega[]>>('/almacenamiento/entregas/destinatarios')
  return response.data.data
}

/** Entregas activas (ENTREGADA) de mi institución. */
export async function getEntregasActivas() {
  const response = await api.get<ApiResponse<EntregaMuestra[]>>('/almacenamiento/entregas')
  return response.data.data
}

/** Historial paginado de entregas de mi institución. */
export async function getHistorialEntregas(page = 0, size = 20) {
  const response = await api.get<ApiResponse<SpringPage<EntregaMuestra>>>('/almacenamiento/entregas/historial', {
    params: { page, size },
  })
  return response.data.data
}

/** Historial de entregas de una muestra. */
export async function getEntregasByMuestra(idMuestra: number) {
  const response = await api.get<ApiResponse<EntregaMuestra[]>>(`/almacenamiento/entregas/muestra/${idMuestra}`)
  return response.data.data
}

/** Entregar una o varias muestras a un colaborador. */
export async function entregarMuestras(data: EntregaRequestDTO) {
  const response = await api.post<ApiResponse<EntregaMuestra[]>>('/almacenamiento/entregas', data)
  return response.data.data
}

/** ENTREGADA → DEVUELTA (la muestra regresó al biobanco). */
export async function devolverEntrega(idEntrega: number, data: CerrarEntregaRequestDTO) {
  const response = await api.put<ApiResponse<EntregaMuestra>>(`/almacenamiento/entregas/${idEntrega}/devolver`, data)
  return response.data.data
}

/** ENTREGADA → CONSUMIDA (no regresó; conserva volumen para estudios pendientes). */
export async function consumirEntrega(idEntrega: number, data: CerrarEntregaRequestDTO) {
  const response = await api.put<ApiResponse<EntregaMuestra>>(`/almacenamiento/entregas/${idEntrega}/consumir`, data)
  return response.data.data
}

/** ENTREGADA → CANCELADA (corrige el registro; la muestra regresa). */
export async function cancelarEntrega(idEntrega: number, data: CancelarEntregaRequestDTO) {
  const response = await api.put<ApiResponse<EntregaMuestra>>(`/almacenamiento/entregas/${idEntrega}/cancelar`, data)
  return response.data.data
}
