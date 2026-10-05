import api from '@/lib/axiosInstance'
import { ApiResponse } from '@/types/api'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentoPublicoDTO {
  id: number
  nombreMostrar: string | null
  nombreOriginal: string
  mimeType: string | null
  tamanioBytes: number | null
  descripcion: string | null
  fechaPublicacion: string
  fase: string | null
  autor: string | null
  categoriaId: number | null
  categoriaNombre: string | null
  fechaCreacion: string
  activo: boolean
}

export interface CategoriaDocumentoPublicoDTO {
  id: number
  nombre: string
  activo: boolean
}

export interface DocumentoPublicoRequest {
  fechaPublicacion: string
  nombreMostrar?: string
  fase?: string
  descripcion?: string
  categoriaId?: number | null
  autor?: string
}

// ─── Admin (autenticado) ────────────────────────────────────────────────────

export async function uploadDocumentoPublico(
  file: File,
  data: DocumentoPublicoRequest,
  usuarioUUID: string,
): Promise<DocumentoPublicoDTO> {
  const form = new FormData()
  form.append('file', file)
  form.append('fechaPublicacion', data.fechaPublicacion)
  form.append('usuarioUUID', usuarioUUID)
  if (data.nombreMostrar) form.append('nombreMostrar', data.nombreMostrar)
  if (data.fase) form.append('fase', data.fase)
  if (data.descripcion) form.append('descripcion', data.descripcion)
  if (data.categoriaId) form.append('categoriaId', String(data.categoriaId))
  if (data.autor) form.append('autor', data.autor)

  const res = await api.post<ApiResponse<DocumentoPublicoDTO>>(
    '/documentos-publicos',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}

export async function getDocumentosPublicosAdmin(): Promise<DocumentoPublicoDTO[]> {
  const res = await api.get<ApiResponse<DocumentoPublicoDTO[]>>('/documentos-publicos')
  return res.data.data
}

export async function updateDocumentoPublico(
  id: number,
  data: DocumentoPublicoRequest,
): Promise<DocumentoPublicoDTO> {
  const res = await api.put<ApiResponse<DocumentoPublicoDTO>>(`/documentos-publicos/${id}`, data)
  return res.data.data
}

export async function deleteDocumentoPublico(id: number): Promise<void> {
  await api.delete(`/documentos-publicos/${id}`)
}

export async function downloadDocumentoPublicoAdmin(id: number): Promise<{ objectUrl: string; fileName: string }> {
  const res = await api.get(`/documentos-publicos/${id}/download`, { responseType: 'blob' })
  const contentDisposition = String(res.headers['content-disposition'] ?? '')
  const rfc5987Match = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)'[^']*'([^;\s]+)/i)
  let fileName: string
  if (rfc5987Match) {
    fileName = decodeURIComponent(rfc5987Match[1])
  } else {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    fileName = match ? match[1].replace(/['"]/g, '').trim() : `documento-${id}`
  }
  const objectUrl = URL.createObjectURL(new Blob([res.data]))
  return { objectUrl, fileName }
}

// ─── Categorías (autenticado) ───────────────────────────────────────────────

export async function getCategoriasDocPublico(): Promise<CategoriaDocumentoPublicoDTO[]> {
  const res = await api.get<ApiResponse<CategoriaDocumentoPublicoDTO[]>>('/documentos-publicos/categorias')
  return res.data.data
}

export async function getCategoriasActivasDocPublico(): Promise<CategoriaDocumentoPublicoDTO[]> {
  const res = await api.get<ApiResponse<CategoriaDocumentoPublicoDTO[]>>('/documentos-publicos/categorias/activas')
  return res.data.data
}

export async function createCategoriaDocPublico(nombre: string): Promise<CategoriaDocumentoPublicoDTO> {
  const res = await api.post<ApiResponse<CategoriaDocumentoPublicoDTO>>('/documentos-publicos/categorias', { nombre })
  return res.data.data
}

export async function updateCategoriaDocPublico(id: number, nombre: string): Promise<CategoriaDocumentoPublicoDTO> {
  const res = await api.put<ApiResponse<CategoriaDocumentoPublicoDTO>>(`/documentos-publicos/categorias/${id}`, { nombre })
  return res.data.data
}

export async function toggleCategoriaDocPublico(id: number): Promise<CategoriaDocumentoPublicoDTO> {
  const res = await api.patch<ApiResponse<CategoriaDocumentoPublicoDTO>>(`/documentos-publicos/categorias/${id}/toggle`)
  return res.data.data
}

// ─── Público (sin autenticación) ────────────────────────────────────────────

const PUBLIC_API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api'

export async function getDocumentosPublicos(idInstitucion: number): Promise<DocumentoPublicoDTO[]> {
  const res = await fetch(`${PUBLIC_API_BASE}/publico/documentos/${idInstitucion}`)
  const json = await res.json()
  return json.data
}

export async function getCategoriasPublicas(idInstitucion: number): Promise<CategoriaDocumentoPublicoDTO[]> {
  const res = await fetch(`${PUBLIC_API_BASE}/publico/documentos/${idInstitucion}/categorias`)
  const json = await res.json()
  return json.data
}

export function buildPublicDownloadUrl(id: number): string {
  return `${PUBLIC_API_BASE}/publico/documentos/descargar/${id}`
}
