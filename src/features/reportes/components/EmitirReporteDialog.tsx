import { useEffect, useState } from 'react'
import { FileDown, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { emitirReporteParticipante } from '../api/reportes.api'
import { usePlantillasReporte } from '../hooks/useReportes'
import { TIPO_REPORTE_ROTULOS } from '../types.api'

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Participante del que se emite. */
  uuidParticipante: string
  /** Para el mensaje: de quién es el reporte. */
  nombreParticipante?: string
}

/**
 * Elegir una plantilla y descargar el reporte.
 *
 * <p>Es la puerta que faltaba: hasta ahora el reporte solo se podía pedir llamando
 * a la API a mano, y nadie va a escribir una dirección para imprimir un documento.
 * El diálogo además resuelve dos cosas que la API sola no puede: enseñar qué
 * plantillas hay y avisar cuando no hay ninguna.</p>
 */
export function EmitirReporteDialog({
  abierto, onCerrar, uuidParticipante, nombreParticipante,
}: Props) {
  const { data: plantillas, isLoading } = usePlantillasReporte()
  const [elegida, setElegida] = useState<string>('')
  const [emitiendo, setEmitiendo] = useState(false)

  const disponibles = (plantillas ?? []).filter((p) => p.activo)

  // Se preselecciona la predeterminada, que es la que la institución quiere usar
  // salvo que digan otra cosa. Si no hay, la primera.
  useEffect(() => {
    if (!abierto || elegida || disponibles.length === 0) return
    const porDefecto = disponibles.find((p) => p.predeterminada) ?? disponibles[0]
    setElegida(String(porDefecto.id))
  }, [abierto, disponibles, elegida])

  async function emitir() {
    if (!elegida) return
    setEmitiendo(true)
    try {
      const blob = await emitirReporteParticipante(uuidParticipante, Number(elegida))

      // Se abre en una pestaña en vez de descargarse: casi siempre se quiere mirar
      // el documento antes de guardarlo o mandarlo a la impresora, y quien lo
      // quiera en disco lo guarda desde el visor.
      const url = URL.createObjectURL(blob)
      const ventana = window.open(url, '_blank')
      if (!ventana) {
        toast.error('El navegador bloqueó la ventana. Permite las ventanas emergentes de este sitio.')
      }
      // Se libera después, no de inmediato: revocarla antes de que la pestaña
      // termine de cargar deja el visor en blanco.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      onCerrar()
    } catch (error: any) {
      const mensaje = error?.response?.status === 403
        ? 'No tienes permiso para emitir reportes.'
        : 'No se pudo generar el reporte.'
      toast.error(mensaje)
    } finally {
      setEmitiendo(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="@container sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir reporte</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-[13px] text-muted-foreground">Cargando plantillas…</p>
        ) : disponibles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">
              No hay ninguna plantilla en uso. Crea una en Reportes para poder emitir.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nombreParticipante && (
              <p className="text-[13px] text-muted-foreground">
                Reporte de <span className="text-foreground">{nombreParticipante}</span>
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-[12px]">Plantilla</Label>
              <Select value={elegida} onValueChange={setElegida}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Elige una plantilla" /></SelectTrigger>
                <SelectContent>
                  {disponibles.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className={cn(p.predeterminada && 'font-medium')}>
                        {p.nombre}
                      </span>
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {TIPO_REPORTE_ROTULOS[p.tipoReporte]}
                        {p.predeterminada ? ' · predeterminada' : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="button" disabled={!elegida || emitiendo || disponibles.length === 0}
                  onClick={emitir}>
            {emitiendo
              ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />Generando…</>
              : <><FileDown className="mr-1.5 h-4 w-4" strokeWidth={1.75} />Generar PDF</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
