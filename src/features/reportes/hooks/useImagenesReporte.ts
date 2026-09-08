import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  eliminarImagen, listarImagenes, renombrarImagen, subirImagen,
} from '../api/imagenes.api'
import type { ImagenReporte } from '../types.api'

const CLAVE = ['imagenesReporte'] as const

export function useImagenesReporte() {
  return useQuery({
    queryKey: CLAVE,
    queryFn: listarImagenes,
    // La galería de una institución cambia poco: un logo se sube una vez al año.
    staleTime: 5 * 60 * 1000,
  })
}

/** Lo que no se pudo subir, y por qué. */
export interface ImagenFallida {
  archivo: string
  motivo: string
}

export interface ResultadoSubida {
  subidas: ImagenReporte[]
  fallidas: ImagenFallida[]
}

/**
 * Sube una o varias imágenes.
 *
 * <p>Van <b>de una en una</b>, no en paralelo. El nombre es único por institución
 * y el servidor numera los repetidos —«logo», «logo (2)»—; dos peticiones a la vez
 * consultarían el mismo hueco libre y la segunda chocaría contra la restricción de
 * unicidad. En serie cada una ve lo que dejó la anterior.</p>
 *
 * <p>Un archivo que falla no detiene a los demás: se sigue con el resto y al final
 * se dice cuáles quedaron fuera. Al subir ocho logos de golpe, que uno esté
 * corrupto no es motivo para perder los otros siete.</p>
 */
export function useSubirImagenes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivos, onProgreso }: {
      archivos: File[]
      /** Cuántas van, para poder enseñarlo mientras tanto. */
      onProgreso?: (hechas: number, total: number) => void
    }): Promise<ResultadoSubida> => {
      const subidas: ImagenReporte[] = []
      const fallidas: ImagenFallida[] = []

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i]
        onProgreso?.(i, archivos.length)
        try {
          subidas.push(await subirImagen(archivo))
        } catch (error: any) {
          fallidas.push({
            archivo: archivo.name,
            motivo: error.response?.data?.message ?? 'No se pudo subir',
          })
        }
      }
      onProgreso?.(archivos.length, archivos.length)
      return { subidas, fallidas }
    },
    onSuccess: ({ subidas, fallidas }) => {
      // Se refresca aunque haya fallos: lo que sí entró tiene que verse.
      if (subidas.length) queryClient.invalidateQueries({ queryKey: CLAVE })

      if (subidas.length && !fallidas.length) {
        toast.success(subidas.length === 1
          ? 'Imagen subida'
          : `${subidas.length} imágenes subidas`)
      } else if (subidas.length && fallidas.length) {
        toast.warning(`Se subieron ${subidas.length} de ${subidas.length + fallidas.length}.`)
      } else if (fallidas.length === 1) {
        toast.error(fallidas[0].motivo)
      } else if (fallidas.length) {
        toast.error('No se pudo subir ninguna imagen.')
      }
    },
    onError: (error: any) => {
      // Aquí solo se llega si falla algo fuera del bucle; los fallos por archivo
      // se recogen arriba sin cortar la tanda.
      toast.error(error.response?.data?.message || 'No se pudieron subir las imágenes')
    },
  })
}

export function useRenombrarImagen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => renombrarImagen(id, nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Imagen renombrada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo renombrar la imagen')
    },
  })
}

export function useEliminarImagen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminarImagen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE })
      toast.success('Imagen eliminada')
    },
    onError: (error: any) => {
      // El servidor rechaza el borrado si alguna plantilla la usa, y su mensaje
      // trae los nombres. Merece verse entero, no resumido a «no se pudo».
      toast.error(error.response?.data?.message || 'No se pudo eliminar la imagen')
    },
  })
}
