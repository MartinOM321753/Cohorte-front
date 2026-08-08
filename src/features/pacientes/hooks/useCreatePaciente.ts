import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPaciente, updatePaciente, deletePaciente, toggleActivoPaciente, crearAccesoPaciente, cambiarInstitucionPaciente, reasignarInstitucionPacientes } from '../api/pacientes.api'
import { PacienteRequestDTO } from '@/types/api'
import { toast } from 'sonner'

export function useCreatePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PacienteRequestDTO) => createPaciente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Participante registrado correctamente')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al registrar el participante')
    },
  })
}

export function useUpdatePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PacienteRequestDTO }) =>
      updatePaciente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Participante actualizado correctamente')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al actualizar el participante')
    },
  })
}

export function useDeletePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deletePaciente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Participante eliminado correctamente')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al eliminar el participante')
    },
  })
}

export function useToggleActivoPaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => toggleActivoPaciente(uuid),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(updated.activo ? 'Participante activado' : 'Participante desactivado')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al cambiar estado del participante')
    },
  })
}

export function useCrearAccesoPaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => crearAccesoPaciente(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      toast.success('Cuenta de acceso creada. Se envió un correo de invitación al participante.')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al crear la cuenta de acceso')
    },
  })
}

export function useCambiarInstitucionPaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, idInstitucion }: { uuid: string; idInstitucion: number }) =>
      cambiarInstitucionPaciente(uuid, idInstitucion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      toast.success('Institución del participante actualizada')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al cambiar la institución')
    },
  })
}

/**
 * Reasignación en lote. No muestra toast de éxito: el resultado se presenta en el
 * modal con el detalle de los rechazados, que es lo que hay que revisar.
 */
export function useReasignarInstitucion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuids, idInstitucion }: { uuids: string[]; idInstitucion: number }) =>
      reasignarInstitucionPacientes(uuids, idInstitucion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al reasignar la institución')
    },
  })
}
