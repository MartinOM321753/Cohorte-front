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

export async function uploadParaResultadoExamen(
  resultadoExamenId: number,
  file: File,
  usuarioUUID: string,
  descripcion?: string,
): Promise<DocumentoResponseDTO> {
  const form = new FormData()
  form.append('file', file)
  form.append('usuarioUUID', usuarioUUID)
  if (descripcion) form.append('descripcion', descripcion)

  const res = await api.post<ApiResponse<DocumentoResponseDTO>>(
    `/documentos/resultado-examen/${resultadoExamenId}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

export async function crearDocumentoSinArchivo(
  pacienteUUID: string,
  usuarioUUID: string,
  tipoDoc: TipoDocumentoPaciente = 'CUESTIONARIO',
  descripcion?: string,
): Promise<DocumentoResponseDTO> {
  const params: Record<string, string> = { usuarioUUID, tipoDoc }
  if (descripcion) params.descripcion = descripcion
  const res = await api.post<ApiResponse<DocumentoResponseDTO>>(
    `/documentos/paciente/${pacienteUUID}/sin-archivo`,
    null,
    { params },
  )
  return res.data.data
}

export async function adjuntarArchivo(
  documentoId: number,
  file: File,
): Promise<DocumentoResponseDTO> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ApiResponse<DocumentoResponseDTO>>(
    `/documentos/${documentoId}/adjuntar`,
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

export async function getDocumentosByResultadoExamen(resultadoExamenId: number): Promise<DocumentoResponseDTO[]> {
  const res = await api.get<ApiResponse<DocumentoResponseDTO[]>>(`/documentos/resultado-examen/${resultadoExamenId}`)
  return res.data.data
}

export async function getDocumentoUrl(id: number): Promise<string> {
  const res = await api.get<ApiResponse<string>>(`/documentos/${id}/url`)
  return res.data.data
}

// ─── Descarga autenticada ─────────────────────────────────────────────────────

/**
 * Cuando Axios usa responseType:'blob', los errores HTTP también llegan con
 * `response.data` como Blob (no JSON parseado). Esta función lee ese Blob,
 * extrae el campo `message` del APIResponse del backend y lo re-lanza como Error.
 */
async function rethrowBlobError(err: unknown): Promise<never> {
  try {
    const data = (err as any)?.response?.data
    if (data instanceof Blob) {
      const text = await data.text()
      const json = JSON.parse(text)
      const msg: string = json?.message || json?.mensaje || ''
      if (msg) throw new Error(msg)
    }
  } catch (inner) {
    // Si inner es el Error que acabamos de construir, re-lanzarlo
    if (inner instanceof Error && inner !== err) throw inner
  }
  // Fallback genérico
  throw new Error('No se pudo acceder al archivo')
}

/**
 * Descarga el archivo a través del backend (JWT requerido).
 * Devuelve un object URL temporal para el blob; el caller debe revocarlo después de usarlo.
 * Si el backend responde con un error JSON (p. ej. 503 MinIO no disponible),
 * extrae el mensaje y lo lanza como Error normal para que el caller lo muestre en el toast.
 */
export async function downloadDocumentoBlob(
  id: number,
  inline = false,
): Promise<{ objectUrl: string; fileName: string; mimeType: string }> {
  try {
    const res = await api.get(`/documentos/${id}/download`, {
      responseType: 'blob',
      params: inline ? { inline: 'true' } : undefined,
    })

    const contentDisposition = String(res.headers['content-disposition'] ?? '')

    // Prefer RFC 5987 filename*=UTF-8''<encoded> (set by backend for full Unicode support)
    const rfc5987Match = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)'[^']*'([^;\s]+)/i)
    let fileName: string
    if (rfc5987Match) {
      fileName = decodeURIComponent(rfc5987Match[1])
    } else {
      // Fall back to plain filename="..." parameter
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      const rawName = match ? match[1].replace(/['"]/g, '').trim() : `documento-${id}`
      fileName = decodeURIComponent(rawName.replace(/%20/g, ' '))
    }

    const mimeType = String(res.headers['content-type'] ?? 'application/octet-stream')
    const objectUrl = URL.createObjectURL(new Blob([res.data], { type: mimeType }))

    return { objectUrl, fileName, mimeType }
  } catch (err) {
    return rethrowBlobError(err)
  }
}

// ─── Impresión de etiquetas ──────────────────────────────────────────────────

export async function getZplEtiquetaDocumento(
  idDocumento: number,
  configuracionId?: number,
): Promise<string> {
  const params = configuracionId ? { configuracionId } : undefined
  const res = await api.get<string>(`/documentos/${idDocumento}/etiqueta/zpl`, { params })
  return res.data
}

export async function imprimirEtiquetaDocumento(
  idDocumento: number,
  impresora: string,
  configuracionId?: number,
): Promise<void> {
  const params: Record<string, string | number> = { impresora }
  if (configuracionId) params.configuracionId = configuracionId
  await api.post(`/documentos/${idDocumento}/etiqueta/imprimir`, null, { params })
}

export async function listarImpresorasDocumentos(): Promise<string[]> {
  const res = await api.get<ApiResponse<string[]>>('/documentos/impresoras')
  return res.data.data
}

// ─── Visualización por etiqueta (escaneo QR/barcode) ────────────────────────

export interface DocumentoAccessTokenResponse {
  token: string
  expiresAt: string
  idDocumento: number
}

export interface DocumentoEtiquetaInfo {
  id: number
  nombreOriginal: string
  mimeType: string
  etiqueta: string
  tipoEntidad: string
  fechaSubida: string
}

export async function generarTokenAcceso(etiqueta: string): Promise<DocumentoAccessTokenResponse> {
  const res = await api.post<ApiResponse<DocumentoAccessTokenResponse>>(
    `/documentos/etiqueta/${encodeURIComponent(etiqueta)}/token`,
  )
  return res.data.data
}

export async function getInfoPorEtiqueta(etiqueta: string): Promise<DocumentoEtiquetaInfo> {
  const res = await api.get<ApiResponse<DocumentoEtiquetaInfo>>(
    `/documentos/etiqueta/${encodeURIComponent(etiqueta)}/info`,
  )
  return res.data.data
}

export function buildDocumentoViewUrl(token: string): string {
  return `/api/documentos/ver/${token}`
}

// ─── Eliminación ──────────────────────────────────────────────────────────────

export async function deleteDocumento(id: number): Promise<void> {
  await api.delete(`/documentos/${id}`)
}
