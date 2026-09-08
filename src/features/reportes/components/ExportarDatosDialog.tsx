import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

import { exportarDatos, guardarArchivo } from '../api/exportacion.api'
import { listarCampos } from '../api/reportes.api'
import type { CampoReporte } from '../types.api'

interface ExportarDatosDialogProps {
  abierto: boolean
  onCerrar: () => void
}

/**
 * Elegir columnas y bajar los datos.
 *
 * Las columnas salen del mismo catálogo del que se elige qué imprimir, fórmulas
 * incluidas. Los bloques —tablas de resultados, evidencias— no se ofrecen: en una
 * hoja de cálculo cada columna es un valor, y una tabla entera no cabe en una celda.
 */
export function ExportarDatosDialog({ abierto, onCerrar }: ExportarDatosDialogProps) {
  const [elegidas, setElegidas] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [separador, setSeparador] = useState<',' | ';'>(',')
  const [bajando, setBajando] = useState(false)

  const { data: campos, isLoading } = useQuery({
    queryKey: ['camposReporte'],
    queryFn: listarCampos,
    enabled: abierto,
  })

  const disponibles = useMemo(() => {
    const soloValores = (campos ?? []).filter((c) => c.clase === 'CAMPO')
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return soloValores
    return soloValores.filter((c) =>
      c.rotulo.toLowerCase().includes(texto)
      || c.grupo.toLowerCase().includes(texto)
      || (c.subgrupo ?? '').toLowerCase().includes(texto))
  }, [campos, busqueda])

  const porGrupo = useMemo(() => {
    const grupos = new Map<string, CampoReporte[]>()
    for (const c of disponibles) {
      const clave = c.subgrupo ? `${c.grupo} · ${c.subgrupo}` : c.grupo
      if (!grupos.has(clave)) grupos.set(clave, [])
      grupos.get(clave)!.push(c)
    }
    return grupos
  }, [disponibles])

  const rotuloDe = (clave: string) =>
    (campos ?? []).find((c) => c.clave === clave)?.rotulo ?? clave

  function alternar(clave: string) {
    setElegidas((previas) =>
      previas.includes(clave) ? previas.filter((c) => c !== clave) : [...previas, clave])
  }

  async function descargar() {
    setBajando(true)
    try {
      const archivo = await exportarDatos({ claves: elegidas, separador })
      const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      guardarArchivo(archivo, `datos_${fecha}.csv`)
      onCerrar()
    } catch {
      toast.error('No fue posible generar la descarga')
    } finally {
      setBajando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="@container w-[95vw] max-w-3xl">
        <DialogHeader>
          <DialogTitle>Descargar datos</DialogTitle>
          <DialogDescription>
            Un archivo con una fila por participante y una columna por dato. Los valores se
            calculan igual que en el reporte impreso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar un dato…"
          />

          {elegidas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {elegidas.map((clave) => (
                <Badge key={clave} variant="secondary" className="gap-1 pr-1">
                  {rotuloDe(clave)}
                  <button
                    type="button"
                    onClick={() => alternar(clave)}
                    aria-label={`Quitar ${rotuloDe(clave)}`}
                    className="rounded-sm hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="h-[360px] rounded-md border">
            {isLoading ? (
              <div className="p-4 text-[13px] text-muted-foreground">Cargando…</div>
            ) : porGrupo.size === 0 ? (
              <div className="p-4 text-[13px] text-muted-foreground">
                No se encontró ningún dato con ese nombre.
              </div>
            ) : (
              <div className="p-1">
                {[...porGrupo.entries()].map(([grupo, items]) => (
                  <div key={grupo} className="mb-2">
                    <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      {grupo}
                    </div>
                    {items.map((c) => (
                      <label
                        key={c.clave}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] hover:bg-muted"
                      >
                        <Checkbox
                          checked={elegidas.includes(c.clave)}
                          onCheckedChange={() => alternar(c.clave)}
                        />
                        <span className="flex-1">{c.rotulo}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="grid gap-1.5">
            <Label htmlFor="exportar-separador">Separador de columnas</Label>
            <Select value={separador} onValueChange={(v) => setSeparador(v as ',' | ';')}>
              <SelectTrigger id="exportar-separador">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">Coma — para herramientas de análisis</SelectItem>
                <SelectItem value=";">Punto y coma — para Excel en español</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Excel configurado en español mete toda la fila en una celda cuando el archivo
              viene separado por comas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button onClick={descargar} disabled={elegidas.length === 0 || bajando} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {bajando ? 'Preparando…' : `Descargar ${elegidas.length || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
