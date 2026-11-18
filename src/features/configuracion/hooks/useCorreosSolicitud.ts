import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCorreosSolicitud,
  agregarCorreoSolicitud,
  toggleCorreoSolicitud,
  eliminarCorreoSolicitud,
  type CorreoDestinoRequest,
} from '../api/correosSolicitud.api'

const KEY = ['correos-solicitud']

export function useCorreosSolicitud() {
  return useQuery({ queryKey: KEY, queryFn: getCorreosSolicitud })
}

export function useAgregarCorreoSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CorreoDestinoRequest) => agregarCorreoSolicitud(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useToggleCorreoSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleCorreoSolicitud(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useEliminarCorreoSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminarCorreoSolicitud(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
