import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getConfiguracionesEtiqueta,
  getConfiguracionesActivas,
  getConfiguracionEtiqueta,
  getConfiguracionPredeterminada,
  createConfiguracionEtiqueta,
  updateConfiguracionEtiqueta,
  toggleConfiguracionEtiqueta,
  setPredeterminada,
  getOpcionesEtiqueta,
} from '../api/etiquetas.api'
import { ConfiguracionEtiquetaRequest } from '@/types/api'
import { mensajeErrorApi } from '@/lib/apiErrors'
import toast from 'react-hot-toast'

const KEY = 'configuraciones-etiqueta'

/** Nombres de campo del backend → los rótulos que se ven en el formulario. */
const CAMPOS_ETIQUETA: Record<string, string> = {
  nombre: 'Nombre de la configuración',
  anchoMm: 'Ancho (mm)',
  altoMm: 'Alto (mm)',
  dpi: 'DPI',
  etiquetasPorFila: 'Etiquetas por fila',
  margenIzquierdoMm: 'Margen izquierdo (mm)',
  margenSuperiorMm: 'Margen superior (mm)',
  tipoCodigo: 'Tipo de código',
  moduloCodigo: 'Tamaño del módulo',
  // Validación cruzada del backend (módulo contra tipo de código).
  moduloParaTipoCodigo: 'Tamaño del módulo',
  tamanoFuenteNombre: 'Fuente del nombre',
  tamanoFuenteEtiqueta: 'Fuente de la etiqueta',
  espaciadoNombre: 'Después del nombre',
  espaciadoCodigo: 'Después del código',
  espaciadoEtiqueta: 'Después de la etiqueta',
  disposicion: 'Orden de los elementos',
  filasPorPagina: 'Filas por página',
  espacioHorizontalMm: 'Espacio horizontal (mm)',
  espacioVerticalMm: 'Espacio vertical (mm)',
  margenPaginaSuperiorMm: 'Margen superior página (mm)',
  margenPaginaIzquierdoMm: 'Margen izquierdo página (mm)',
}

export function useGetConfiguracionesEtiqueta() {
  return useQuery({
    queryKey: [KEY],
    queryFn: getConfiguracionesEtiqueta,
  })
}

export function useGetConfiguracionesActivas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [KEY, 'activas'],
    queryFn: getConfiguracionesActivas,
    enabled: options?.enabled ?? true,
  })
}

export function useGetConfiguracionEtiqueta(id: number | null) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => getConfiguracionEtiqueta(id!),
    enabled: id !== null,
  })
}

export function useGetConfiguracionPredeterminada() {
  return useQuery({
    queryKey: [KEY, 'predeterminada'],
    queryFn: getConfiguracionPredeterminada,
  })
}

export function useGetOpcionesEtiqueta() {
  return useQuery({
    queryKey: [KEY, 'opciones'],
    queryFn: getOpcionesEtiqueta,
  })
}

export function useCreateConfiguracionEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ConfiguracionEtiquetaRequest) => createConfiguracionEtiqueta(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración creada')
    },
    onError: (err: unknown) => {
      toast.error(mensajeErrorApi(err, 'Error al crear configuración', CAMPOS_ETIQUETA))
    },
  })
}

export function useUpdateConfiguracionEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ConfiguracionEtiquetaRequest }) =>
      updateConfiguracionEtiqueta(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración actualizada')
    },
    onError: (err: unknown) => {
      toast.error(mensajeErrorApi(err, 'Error al actualizar', CAMPOS_ETIQUETA))
    },
  })
}

export function useToggleConfiguracionEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleConfiguracionEtiqueta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al cambiar estado'),
  })
}

export function useSetPredeterminada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => setPredeterminada(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Configuración predeterminada actualizada')
    },
    onError: () => toast.error('Error al establecer predeterminada'),
  })
}
