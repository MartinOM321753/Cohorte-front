import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  copiarCatalogos,
  previewCopia,
  CopiarCatalogosRequest,
  CopiarCatalogosResponse,
  PreviewCopiaResponse,
} from '../api/catalogoCopy.api'

export function useCopiarCatalogos() {
  const queryClient = useQueryClient()

  return useMutation<CopiarCatalogosResponse, Error, CopiarCatalogosRequest>({
    mutationFn: copiarCatalogos,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      queryClient.invalidateQueries({ queryKey: ['tiposEstudio'] })
      queryClient.invalidateQueries({ queryKey: ['examenes'] })
      queryClient.invalidateQueries({ queryKey: ['tiposMuestra'] })
      queryClient.invalidateQueries({ queryKey: ['tiposEstudioMuestra'] })
      toast.success(`Copia completada: ${data.totalCopiados} registros copiados`)
    },
    onError: () => {
      toast.error('Error al copiar catálogos')
    },
  })
}

export function usePreviewCopia() {
  return useMutation<
    PreviewCopiaResponse,
    Error,
    Pick<CopiarCatalogosRequest, 'uuidInstitucionOrigen' | 'uuidInstitucionDestino'>
  >({
    mutationFn: previewCopia,
  })
}
