import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  actualizarFormula, crearFormula, eliminarFormula, historialFormula, listarFormulas,
  listarFormulasActivas, listarVariablesDisponibles, probarFormula, revisarFormula, toggleFormula,
} from '../api/formulas.api'
import type { FormulaReporteRequest } from '../formulas.types'

const CLAVE = ['formulasReporte'] as const
const CLAVE_VARIABLES = ['variablesFormula'] as const

export function useFormulas(opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CLAVE,
    queryFn: listarFormulas,
    enabled: opciones?.enabled ?? true,
  })
}

/** Las que se ofrecen al diseñar. */
export function useFormulasActivas(opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...CLAVE, 'activas'],
    queryFn: listarFormulasActivas,
    enabled: opciones?.enabled ?? true,
  })
}

export function useHistorialFormula(id: number | null) {
  return useQuery({
    queryKey: [...CLAVE, id, 'historial'],
    queryFn: () => historialFormula(id as number),
    enabled: id != null,
  })
}

/**
 * Con qué se puede calcular.
 *
 * Cambia poco —solo si alguien toca el catálogo de parámetros— así que se guarda un
 * buen rato: el editor la consulta cada vez que se abre.
 */
export function useVariablesDisponibles(opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CLAVE_VARIABLES,
    queryFn: listarVariablesDisponibles,
    enabled: opciones?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCrearFormula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FormulaReporteRequest) => crearFormula(body),
    onSuccess: (formula) => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Fórmula creada')
      avisarDeLasAdvertencias(formula.advertencias)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No fue posible crear la fórmula')
    },
  })
}

export function useGuardarFormula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: FormulaReporteRequest }) =>
      actualizarFormula(id, body),
    onSuccess: (formula) => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success(`Fórmula guardada (versión ${formula.version})`)
      avisarDeLasAdvertencias(formula.advertencias)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No fue posible guardar la fórmula')
    },
  })
}

export function useToggleFormula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleFormula(id),
    onSuccess: (activa) => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success(activa ? 'Fórmula puesta en uso' : 'Fórmula retirada de uso')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No fue posible cambiar el estado')
    },
  })
}

export function useEliminarFormula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminarFormula(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Fórmula eliminada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No fue posible eliminar la fórmula')
    },
  })
}

/**
 * Revisa la fórmula sin guardarla.
 *
 * No lleva mensajes de error: se consulta mientras se escribe y la mitad de las veces
 * la fórmula está a medias. Lo que devuelve se pinta en el editor, no en un aviso
 * flotante que interrumpiría cada tecla.
 */
export function useRevisarFormula() {
  return useMutation({
    mutationFn: (body: FormulaReporteRequest) => revisarFormula(body),
  })
}

export function useProbarFormula() {
  return useMutation({
    mutationFn: ({ uuid, body }: { uuid: string; body: FormulaReporteRequest }) =>
      probarFormula(uuid, body),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No fue posible probar la fórmula')
    },
  })
}

/** Las advertencias no impidieron guardar, pero hay que verlas. */
function avisarDeLasAdvertencias(advertencias?: { mensaje: string }[]) {
  advertencias?.forEach((a) => toast.warning(a.mensaje, { duration: 8000 }))
}
