import api from '@/lib/axiosInstance'
import { ApiResponse, DocumentoResponseDTO, TipoDocumentoPaciente } from '@/types/api'

// ─── Subida ───────────────────────────────────────────────────────────────────

export async function uploadParaEstudio(
  estudioId: number,
  file: File,
  usuarioUUID: string,
  descripcion?: string,
  orden = 0,
): Promise<DocumentoResponseDTO> {
  const form = new FormData()
  form.append('file', file)
  form.append('usuarioUUID', usuarioUUID)
  form.append('orden', String(orden))
  if (descripcion) form.append('descripcion', descripcion)

  const res = await api.post<ApiResponse<DocumentoResponseDTO>>(
    `/documentos/estudio/${estudioId}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

export async function uploadParaPaciente(
  pacienteUUID: string,
  file: File,
  usuarioUUID: string,
  tipoDoc: TipoDocumentoPaciente = 'GENERAL',
  descripcion?: string,
): Promise<DocumentoResponseDTO> {
  const form = new FormData()
  form.append('file', file)
  form.append('usuarioUUID', usuarioUUID)
  form.append('tipoDoc', tipoDoc)
  if (descripcion) form.append('descripcion', descripcion)

  const res = await api.post<ApiResponse<DocumentoResponseDTO>>(
    `/documentos/paciente/${pacienteUUID}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

export async function uploadParaMuestra(
  muestraId: number,
  file: File,
  usuarioUUID: string,
  descripcion?: string,
): Promise<DocumentoResponseDTO> {
  const form = new FormData()
  form.append('file', file)
  form.append('usuarioUUID', usuarioUUID)
  if (descripcion) form.append('descripcion', descripcion)

  const res = await api.post<ApiResponse<DocumentoResponseDTO>>(
    `/documentos/muestra/${muestraId}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

// ─── Consulta ─────────────────────────────────────────────────────────────────

export async function getDocumentosByEstudio(estudioId: number): Promise<DocumentoResponseDTO[]> {
  const res = await api.get<ApiResponse<DocumentoResponseDTO[]>>(`/documentos/estudio/${estudioId}`)
  return res.data.data
}

export async function getDocumentosByPaciente(uuid: string): Promise<DocumentoResponseDTO[]> {
  const res = await api.get<ApiResponse<DocumentoResponseDTO[]>>(`/documentos/paciente/${uuid}`)
  return res.data.data
}

export async function getDocumentosByPacienteTipo(
  uuid: string,
  tipoDoc: TipoDocumentoPaciente,
): Promise<DocumentoResponseDTO[]> {
  const res = await api.get<ApiResponse<DocumentoResponseDTO[]>>(
    `/documentos/paciente/${uuid}/tipo/${tipoDoc}`,
  )
  return res.data.data
}

export async function getDocumentosByMuestra(muestraId: number): Promise<DocumentoResponseDTO[]> {
  const res = await api.get<ApiResponse<DocumentoResponseDTO[]>>(`/documentos/muestra/${muestraId}`)
  return res.data.data
}

export async function getDocumentoUrl(id: number): Promise<string> {
  const res = await api.get<ApiResponse<string>>(`/documentos/${id}/url`)
  return res.data.data
}

// ─── Descarga autenticada ─────────────────────────────────────────────────────

/**
 * Descarga el archivo a través del backend (JWT requerido).
 * Devuelve un object URL temporal para el blob; el caller debe revocarlo después de usarlo.
 */
export async function downloadDocumentoBlob(
  id: number,
  inline = false,
): Promise<{ objectUrl: string; fileName: string; mimeType: string }> {
  const res = await api.get(`/documentos/${id}/download`, {
    responseType: 'blob',
    params: inline ? { inline: 'true' } : undefined,
  })

  const contentDisposition = String(res.headers['content-disposition'] ?? '')
  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  const rawName = match ? match[1].replace(/['"]/g, '') : `documento-${id}`
  const fileName = decodeURIComponent(rawName.replace(/%20/g, ' '))

  const mimeType = String(res.headers['content-type'] ?? 'application/octet-stream')
  const objectUrl = URL.createObjectURL(new Blob([res.data], { type: mimeType }))

  return { objectUrl, fileName, mimeType }
}

// ─── Eliminación ──────────────────────────────────────────────────────────────

export async function deleteDocumento(id: number): Promise<void> {
  await api.delete(`/documentos/${id}`)
}
