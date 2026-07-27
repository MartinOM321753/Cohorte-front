import api from '@/lib/axiosInstance'
import { ApiResponse } from '@/types/api'

export type TipoCatalogo =
  | 'UNIDADES'
  | 'TIPOS_ESTUDIO'
  | 'EXAMENES'
  | 'TIPOS_MUESTRA'
  | 'ESTUDIOS_MUESTRA'

export interface SeleccionCatalogo {
  tipo: TipoCatalogo
  ids: number[] | null
}

export interface CopiarCatalogosRequest {
  uuidInstitucionOrigen: string
  uuidInstitucionDestino: string
  catalogos: SeleccionCatalogo[]
}

export interface ResultadoCopia {
  catalogo: TipoCatalogo
  copiados: number
  omitidos: number
  detalleOmitidos: string[]
}

export interface CopiarCatalogosResponse {
  resultados: ResultadoCopia[]
  totalCopiados: number
  totalOmitidos: number
}

export interface ItemCatalogo {
  id: number
  nombre: string
  existeEnDestino: boolean
  hijos: number
}

export interface PreviewCatalogo {
  catalogo: TipoCatalogo
  items: ItemCatalogo[]
}

export interface PreviewCopiaResponse {
  previews: PreviewCatalogo[]
}

export async function copiarCatalogos(request: CopiarCatalogosRequest): Promise<CopiarCatalogosResponse> {
  const response = await api.post<ApiResponse<CopiarCatalogosResponse>>('/catalogos/copiar', request)
  return response.data.data
}

export async function previewCopia(
  request: Pick<CopiarCatalogosRequest, 'uuidInstitucionOrigen' | 'uuidInstitucionDestino'>,
): Promise<PreviewCopiaResponse> {
  const allCatalogos: SeleccionCatalogo[] = [
    { tipo: 'UNIDADES', ids: null },
    { tipo: 'TIPOS_ESTUDIO', ids: null },
    { tipo: 'EXAMENES', ids: null },
    { tipo: 'TIPOS_MUESTRA', ids: null },
    { tipo: 'ESTUDIOS_MUESTRA', ids: null },
  ]
  const response = await api.post<ApiResponse<PreviewCopiaResponse>>('/catalogos/copiar/preview', {
    ...request,
    catalogos: allCatalogos,
  })
  return response.data.data
}
