import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/**
 * Botón de descarga de la plantilla de carga masiva, con selector de versión
 * cuando hay más de una.
 *
 * <p>Una «versión» es un juego de alias: un mismo catálogo puede recibir archivos
 * de instrumentos que titulan sus columnas de otra forma, y cada forma es un
 * alias. El servidor decide cuántas versiones hay; con una sola, aquí no aparece
 * el selector y se descarga sin más.</p>
 *
 * <p>Quién sabe armar la plantilla es el servidor —de ahí que reciba funciones y
 * no datos—: el navegador no repite las reglas de qué columna se llama cómo, que
 * es justo lo que se degrada cuando cada quien mantiene su copia.</p>
 */
export function DescargarPlantilla({
  disabled = false,
  recargaKey,
  cargarVersiones,
  descargar,
}: {
  /** Deshabilita el control (p. ej. mientras no se ha elegido tipo de estudio). */
  disabled?: boolean
  /**
   * Valor que, al cambiar, obliga a volver a preguntar cuántas versiones hay
   * (el tipo de estudio en estudios; algo fijo en exámenes).
   */
  recargaKey?: string | number
  /** Pregunta al servidor cuántas versiones tiene la plantilla. */
  cargarVersiones: () => Promise<number>
  /** Descarga la versión indicada (base 1). */
  descargar: (version: number) => Promise<void>
}) {
  const [versiones, setVersiones] = useState(1)
  const [version, setVersion] = useState(1)
  const [descargando, setDescargando] = useState(false)

  // Cuántas versiones hay depende del catálogo, así que se pregunta al servidor y
  // se vuelve a preguntar cuando cambia aquello de lo que depende. Si falla, se
  // asume una sola: el peor caso es no ofrecer elegir, nunca bloquear la descarga.
  useEffect(() => {
    if (disabled) return
    let vivo = true
    cargarVersiones()
      .then((n) => {
        if (!vivo) return
        setVersiones(n)
        setVersion(1) // al cambiar de catálogo, la versión anterior ya no significa lo mismo
      })
      .catch(() => { if (vivo) setVersiones(1) })
    return () => { vivo = false }
    // cargarVersiones se recrea en cada render del padre; la dependencia real es
    // qué catálogo se está mirando, que es lo que trae recargaKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recargaKey, disabled])

  async function alDescargar() {
    setDescargando(true)
    try {
      await descargar(version)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo descargar la plantilla')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {versiones > 1 && (
        <Select
          value={String(version)}
          onValueChange={(v) => setVersion(Number(v))}
          disabled={disabled || descargando}
        >
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: versiones }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>Versión {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={alDescargar}
        disabled={disabled || descargando}
      >
        {descargando
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <Download className="mr-2 h-4 w-4" />}
        Descargar plantilla
      </Button>
    </div>
  )
}
