import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDocumentosPublicosAdmin,
  uploadDocumentoPublico,
  updateDocumentoPublico,
  deleteDocumentoPublico,
  getCategoriasDocPublico,
  getCategoriasActivasDocPublico,
  createCategoriaDocPublico,
  updateCategoriaDocPublico,
  toggleCategoriaDocPublico,
  getSeccionesDocPublico,
  getSeccionesActivasDocPublico,
  createSeccionDocPublico,
  updateSeccionDocPublico,
  toggleSeccionDocPublico,
  type DocumentoPublicoRequest,
} from '../api/documentosPublicos.api'
import { toast } from 'sonner'

const DOCS_KEY = 'documentos-publicos'
const CATS_KEY = 'categorias-doc-publico'
const SECS_KEY = 'secciones-doc-publico'

export function useDocumentosPublicosAdmin() {
  return useQuery({
    queryKey: [DOCS_KEY],
    queryFn: getDocumentosPublicosAdmin,
  })
}

export function useUploadDocumentoPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, data, usuarioUUID }: { file: File; data: DocumentoPublicoRequest; usuarioUUID: string }) =>
      uploadDocumentoPublico(file, data, usuarioUUID),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DOCS_KEY] })
      toast.success('Documento publicado correctamente')
    },
    onError: () => toast.error('Error al subir el documento'),
  })
}

export function useUpdateDocumentoPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocumentoPublicoRequest }) =>
      updateDocumentoPublico(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DOCS_KEY] })
      toast.success('Documento actualizado')
    },
    onError: () => toast.error('Error al actualizar el documento'),
  })
}

export function useDeleteDocumentoPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDocumentoPublico(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DOCS_KEY] })
      toast.success('Documento eliminado')
    },
    onError: () => toast.error('Error al eliminar el documento'),
  })
}

export function useCategoriasDocPublico() {
  return useQuery({
    queryKey: [CATS_KEY],
    queryFn: getCategoriasDocPublico,
  })
}

export function useCategoriasActivasDocPublico() {
  return useQuery({
    queryKey: [CATS_KEY, 'activas'],
    queryFn: getCategoriasActivasDocPublico,
  })
}

export function useCreateCategoriaDocPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => createCategoriaDocPublico(nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATS_KEY] })
      toast.success('Categoría creada')
    },
    onError: () => toast.error('Error al crear la categoría'),
  })
}

export function useUpdateCategoriaDocPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      updateCategoriaDocPublico(id, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATS_KEY] })
      toast.success('Categoría actualizada')
    },
    onError: () => toast.error('Error al actualizar la categoría'),
  })
}

export function useToggleCategoriaDocPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleCategoriaDocPublico(id),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: [CATS_KEY] })
      toast.success(cat.activo ? 'Categoría activada' : 'Categoría desactivada')
    },
    onError: () => toast.error('Error al cambiar estado de la categoría'),
  })
}

// ─── Secciones ─────────────────────────────────────────────────────────────

export function useSeccionesDocPublico() {
  return useQuery({
    queryKey: [SECS_KEY],
    queryFn: getSeccionesDocPublico,
  })
}

export function useSeccionesActivasDocPublico() {
  return useQuery({
    queryKey: [SECS_KEY, 'activas'],
    queryFn: getSeccionesActivasDocPublico,
  })
}

export function useCreateSeccionDocPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, orden }: { nombre: string; orden?: number | null }) =>
      createSeccionDocPublico(nombre, orden),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SECS_KEY] })
      toast.success('Sección creada')
    },
    onError: () => toast.error('Error al crear la sección'),
  })
}

export function useUpdateSeccionDocPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, orden }: { id: number; nombre: string; orden?: number | null }) =>
      updateSeccionDocPublico(id, nombre, orden),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SECS_KEY] })
      toast.success('Sección actualizada')
    },
    onError: () => toast.error('Error al actualizar la sección'),
  })
}

export function useToggleSeccionDocPublico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleSeccionDocPublico(id),
    onSuccess: (sec) => {
      qc.invalidateQueries({ queryKey: [SECS_KEY] })
      toast.success(sec.activo ? 'Sección activada' : 'Sección desactivada')
    },
    onError: () => toast.error('Error al cambiar estado de la sección'),
  })
}
