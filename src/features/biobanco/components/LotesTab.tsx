import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Boxes, TestTube, Archive, Microscope, MapPin, CheckCircle2, Search,
} from 'lucide-react'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useGetCartaFolio, useAsignarPosicionMuestra } from '../hooks/useBiobanco'
import { SeleccionPosicionCajaModal } from './SeleccionPosicionCajaModal'
import { AccionTubo, AlicuotaLote, TuboPrimarioCarta } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ACCION_LABEL: Record<AccionTubo, string> = {
  GUARDAR: 'Guardar entero',
  ESTUDIO: 'Estudio',
  ALICUOTAR: 'Alicuotar',
}

function AccionIcon({ accion, className }: { accion: AccionTubo; className?: string }) {
  if (accion === 'GUARDAR') return <Archive className={className} />
  if (accion === 'ESTUDIO') return <Microscope className={className} />
  return <TestTube className={className} />
}

export function LotesTab() {
  const [uuid, setUuid] = useState('')
  const { data: carta, isLoading } = useGetCartaFolio(uuid || undefined)
  const asignar = useAsignarPosicionMuestra()
  const queryClient = useQueryClient()
  const [ubicarId, setUbicarId] = useState<number | null>(null)

  async function ubicar(idPosicionCaja: number) {
    if (ubicarId == null) return
    await asignar.mutateAsync({ id: ubicarId, data: { idPosicionCaja } })
    queryClient.invalidateQueries({ queryKey: ['carta-folio'] })
    setUbicarId(null)
  }

  const vacia = carta && carta.tubosPrimarios.length === 0 && carta.lotes.length === 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Lotes por participante</h2>
        <p className="text-muted-foreground">
          La carta de biobanco: todo lo que se le hizo al participante, por tubos primarios y lotes de alícuotas.
        </p>
      </div>

      <Alert>
        <Boxes className="h-4 w-4" />
        <AlertDescription>
          Busca un folio para ver sus tubos primarios y los lotes de alícuotas (numeradas 1…N). Desde aquí puedes
          asignar posición a cada vial.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1.5 max-w-md">
            <Label>Participante</Label>
            <PacienteSearchCombobox value={uuid} onChange={setUuid} />
          </div>
        </CardContent>
      </Card>

      {!uuid ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Search className="h-10 w-10 mb-3" />
            <p>Busca un participante para ver su carta de biobanco.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : vacia ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Este participante aún no tiene muestras procesadas.
          </CardContent>
        </Card>
      ) : carta ? (
        <div className="space-y-4">
          {carta.tubosPrimarios.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tubos primarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {carta.tubosPrimarios.map((t) => (
                  <TuboPrimarioRow key={t.id} tubo={t} onUbicar={() => setUbicarId(t.id)} />
                ))}
              </CardContent>
            </Card>
          )}

          {carta.lotes.map((lote) => (
            <Card key={`${lote.heredado ? 'p' : 'l'}-${lote.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  Lote {lote.numeroLote ?? '—'}
                  {lote.tipoResultante && <span className="text-muted-foreground font-normal">· {lote.tipoResultante}</span>}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {lote.alicuotas.length} alícuota(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {lote.alicuotas.map((a) => (
                    <AlicuotaRow key={a.id} alicuota={a} onUbicar={() => setUbicarId(a.id)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <SeleccionPosicionCajaModal
        open={ubicarId != null}
        onOpenChange={(o) => { if (!o) setUbicarId(null) }}
        onConfirm={(r) => ubicar(r.idPosicionCaja)}
      />
    </div>
  )
}

function TuboPrimarioRow({ tubo, onUbicar }: { tubo: TuboPrimarioCarta; onUbicar: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      {tubo.accion && <AccionIcon accion={tubo.accion} className="h-4 w-4 text-muted-foreground shrink-0" />}
      <span className="font-mono text-xs">{tubo.etiqueta}</span>
      {tubo.nombreTubo && <span className="text-muted-foreground text-xs">· {tubo.nombreTubo}</span>}
      {tubo.valor != null && <span className="text-muted-foreground text-xs">· {tubo.valor} {tubo.unidad ?? ''}</span>}
      {tubo.accion && <Badge variant="secondary" className="text-[10px]">{ACCION_LABEL[tubo.accion]}</Badge>}
      <div className="ml-auto flex items-center gap-2">
        {tubo.tienePosicion ? (
          <span className="flex items-center gap-1 text-xs text-green-700">
            <MapPin className="h-3 w-3" /> {tubo.posicionLabel}
          </span>
        ) : tubo.accion === 'GUARDAR' ? (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onUbicar}>
            <MapPin className="h-3 w-3 mr-1" /> Ubicar
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {tubo.accion === 'ESTUDIO' ? 'Para estudios' : 'Sin posición'}
          </span>
        )}
      </div>
    </div>
  )
}

function AlicuotaRow({ alicuota, onUbicar }: { alicuota: AlicuotaLote; onUbicar: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-sm bg-muted/20">
      <span className="w-8 shrink-0 text-right font-semibold text-xs text-muted-foreground">#{alicuota.numeroEnLote}</span>
      <span className="font-mono text-[11px] truncate">{alicuota.etiqueta}</span>
      {alicuota.valor != null && (
        <span className="text-muted-foreground text-[11px] shrink-0">{alicuota.valor} {alicuota.unidad ?? ''}</span>
      )}
      <div className="ml-auto shrink-0">
        {alicuota.tienePosicion ? (
          <span className="flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 className="h-3 w-3" /> {alicuota.posicionLabel}
          </span>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onUbicar}>
            <MapPin className="h-3 w-3 mr-1" /> Ubicar
          </Button>
        )}
      </div>
    </div>
  )
}
