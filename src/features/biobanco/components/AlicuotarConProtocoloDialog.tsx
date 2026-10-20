import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlaskConical, Loader2 } from 'lucide-react'
import { useGetProtocolosActivos, useAlicuotarTubo } from '../hooks/useBiobanco'
import type { MuestraDetalleDTO, Protocolo, TuboProtocolo } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra: MuestraDetalleDTO | null
}

export function AlicuotarConProtocoloDialog({ open, onOpenChange, muestra }: Props) {
  const [idProtocolo, setIdProtocolo] = useState<number | null>(null)
  const [idTuboProtocolo, setIdTuboProtocolo] = useState<number | null>(null)

  const { data: protocolos = [] } = useGetProtocolosActivos({ enabled: open })
  const mutation = useAlicuotarTubo()

  const nombreTipoMuestra = muestra?.tipoMuestra?.nombre?.toLowerCase()
  const compatibles = protocolos.filter((p: Protocolo) =>
    p.nombreTipoOrigen?.toLowerCase() === nombreTipoMuestra,
  )

  const protocoloSeleccionado = compatibles.find((p) => p.id === idProtocolo)
  const tubosAlicuotar = (protocoloSeleccionado?.tubos ?? []).filter(
    (t: TuboProtocolo) => t.activo && t.accion === 'ALICUOTAR',
  )

  const tuboSeleccionado = tubosAlicuotar.find((t) => t.id === idTuboProtocolo)

  const handleClose = () => {
    setIdProtocolo(null)
    setIdTuboProtocolo(null)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!muestra || !idTuboProtocolo) return
    mutation.mutate(
      { idPadre: muestra.id, idTuboProtocolo },
      { onSuccess: handleClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            Alicuotar con protocolo externo
          </DialogTitle>
          <DialogDescription>
            Seleccione un protocolo y tubo de su institución para alicuotar{' '}
            <strong>{muestra?.etiqueta}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Protocolo</Label>
            {compatibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay protocolos activos compatibles con {muestra?.tipoMuestra?.nombre ?? 'este tipo de muestra'}.
              </p>
            ) : (
              <Select
                value={idProtocolo?.toString() ?? ''}
                onValueChange={(v) => {
                  setIdProtocolo(Number(v))
                  setIdTuboProtocolo(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un protocolo" />
                </SelectTrigger>
                <SelectContent>
                  {compatibles.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {idProtocolo != null && (
            <div className="space-y-2">
              <Label>Tubo</Label>
              {tubosAlicuotar.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este protocolo no tiene tubos con acción «Alicuotar».
                </p>
              ) : (
                <Select
                  value={idTuboProtocolo?.toString() ?? ''}
                  onValueChange={(v) => setIdTuboProtocolo(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tubo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tubosAlicuotar.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.nombre}
                        {t.nombreTipoResultante && ` → ${t.nombreTipoResultante}`}
                        {t.numeroAlicuotas > 0 && ` (${t.numeroAlicuotas} alíc.)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {tuboSeleccionado && tuboSeleccionado.volumenAlicuota != null && (
                <p className="text-xs text-muted-foreground">
                  Volumen por alícuota: {tuboSeleccionado.volumenAlicuota} {tuboSeleccionado.unidadVolumen ?? ''}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!idTuboProtocolo || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Alicuotar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
