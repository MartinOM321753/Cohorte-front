import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getConfiguracionClave, setConfiguracionClave } from '../api/configuracionClave.api'
import { toast } from 'sonner'

const KEY = 'configuracion-clave'

export function useGetConfiguracionClave(clave: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [KEY, clave],
    queryFn: () => getConfiguracionClave(clave),
    enabled: options?.enabled ?? true,
  })
}

export function useSetConfiguracionClave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: string }) =>
      setConfiguracionClave(clave, valor),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [KEY, variables.clave] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al guardar la configuración')
    },
  })
}
