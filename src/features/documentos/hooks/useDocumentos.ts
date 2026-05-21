import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TipoDocumentoPaciente } from '@/types/api'
import {
  getDocumentosByEstudio,
  getDocumentosByMuestra,
  getDocumentosByPaciente,
  getDocumentosByPacienteTipo,
  uploadParaEstudio,
  uploadParaMuestra,
  uploadParaPaciente,
  deleteDocumento,
  getDocumentoUrl,
} from '../api/documentos.api'

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEYS = {
  estudio:       (id: number)                               => ['documentos', 'estudio', id]       as const,
  paciente:      (uuid: string)                             => ['documentos', 'paciente', uuid]     as const,
  pacienteTipo:  (uuid: string, tipo: TipoDocumentoPaciente) => ['documentos', 'paciente', uuid, tipo] as const,
  muestra:       (id: number)                               => ['documentos', 'muestra', id]        as const,
}

// ─── Consultas ────────────────────────────────────────────────────────────────

export function useDocumentosEstudio(estudioId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.estudio(estudioId),
    queryFn: () => getDocumentosByEstudio(estudioId),
    enabled: (options?.enabled ?? true) && estudioId > 0,
    staleTime: 30_000,
  })
}

export function useDocumentosPaciente(uuid: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.paciente(uuid),
    queryFn: () => getDocumentosByPaciente(uuid),
    enabled: (options?.enabled ?? true) && !!uuid,
    staleTime: 30_000,
  })
}

export function useDocumentosPacienteTipo(
  uuid: string,
  tipoDoc: TipoDocumentoPaciente,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.pacienteTipo(uuid, tipoDoc),
    queryFn: () => getDocumentosByPacienteTipo(uuid, tipoDoc),
    enabled: (options?.enabled ?? true) && !!uuid,
    staleTime: 30_000,
  })
}

export function useDocumentosMuestra(muestraId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.muestra(muestraId),
    queryFn: () => getDocumentosByMuestra(muestraId),
    enabled: (options?.enabled ?? true) && muestraId > 0,
    staleTime: 30_000,
  })
}

// ─── Mutaciones de subida ─────────────────────────────────────────────────────

export function useUploadDocumentoEstudio(estudioId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      usuarioUUID,
      descripcion,
      orden,
    }: {
      file: File
      usuarioUUID: string
      descripcion?: string
      orden?: number
    }) => uploadParaEstudio(estudioId, file, usuarioUUID, descripcion, orden),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.estudio(estudioId) })
      toast.success('Documento subido correctamente')
    },
    onError: () => toast.error('No se pudo subir el documento'),
  })
}

export function useUploadDocumentoPaciente(pacienteUUID: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      usuarioUUID,
      tipoDoc,
      descripcion,
    }: {
      file: File
      usuarioUUID: string
      tipoDoc?: TipoDocumentoPaciente
      descripcion?: string
    }) => uploadParaPaciente(pacienteUUID, file, usuarioUUID, tipoDoc, descripcion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.paciente(pacienteUUID) })
      toast.success('Documento subido correctamente')
    },
    onError: () => toast.error('No se pudo subir el documento'),
  })
}

export function useUploadDocumentoMuestra(muestraId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      usuarioUUID,
      descripcion,
    }: {
      file: File
      usuarioUUID: string
      descripcion?: string
    }) => uploadParaMuestra(muestraId, file, usuarioUUID, descripcion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.muestra(muestraId) })
      toast.success('Documento subido correctamente')
    },
    onError: () => toast.error('No se pudo subir el documento'),
  })
}

// ─── Eliminación ──────────────────────────────────────────────────────────────

export function useDeleteDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDocumento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos'] })
      toast.success('Documento eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el documento'),
  })
}

// ─── URL fresca ───────────────────────────────────────────────────────────────

export function useDocumentoUrl(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['documentos', 'url', id],
    queryFn: () => getDocumentoUrl(id),
    enabled: (options?.enabled ?? true) && id > 0,
    staleTime: 50 * 60 * 1000, // 50 min — URLs duran 60 min por defecto
    gcTime: 55 * 60 * 1000,
  })
}
