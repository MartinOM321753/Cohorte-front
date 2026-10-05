import { useMemo, useState } from 'react'
import { PlayCircle, TestTube, Archive, Microscope, CheckCircle2, ArrowRight, Boxes } from 'lucide-react'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useGetProtocolosActivos, useProcesarProtocolo } from '../hooks/useBiobanco'
import { AccionTubo, ProcesarResultado, TuboProtocolo } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

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

interface DecisionEstado {
  incluir: boolean
  accion: AccionTubo
  volumen: string
}

export function ProcesarTab() {
  const { data: protocolos = [] } = useGetProtocolosActivos()
  const procesar = useProcesarProtocolo()

  const [pacienteUUID, setPacienteUUID] = useState('')
  const [idProtocolo, setIdProtocolo] = useState<string>('')
  const [fecha, setFecha] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [decisiones, setDecisiones] = useState<Record<number, DecisionEstado>>({})
  const [resultado, setResultado] = useState<ProcesarResultado | null>(null)

  const protocolo = useMemo(
    () => protocolos.find((p) => String(p.id) === idProtocolo) ?? null,
    [protocolos, idProtocolo],
  )

  function elegirProtocolo(valor: string) {
    setIdProtocolo(valor)
    setResultado(null)
    const p = protocolos.find((x) => String(x.id) === valor)
    const init: Record<number, DecisionEstado> = {}
    p?.tubos.forEach((t) => {
      init[t.id] = {
        incluir: t.activo !== false,
        accion: t.accion,
        volumen: t.accion === 'ALICUOTAR' && t.volumenAlicuota != null && t.numeroAlicuotas
          ? String(t.volumenAlicuota * t.numeroAlicuotas)
          : '',
      }
    })
    setDecisiones(init)
  }

  function setDecision(idTubo: number, patch: Partial<DecisionEstado>) {
    setDecisiones((prev) => ({ ...prev, [idTubo]: { ...prev[idTubo], ...patch } }))
  }

  const tubosOrdenados = useMemo(
    () => (protocolo ? [...protocolo.tubos].sort((a, b) => a.orden - b.orden) : []),
    [protocolo],
  )

  const alMenosUno = tubosOrdenados.some((t) => decisiones[t.id]?.incluir)
  const puedeEnviar = pacienteUUID !== '' && protocolo != null && alMenosUno && !procesar.isPending

  async function enviar() {
    if (!protocolo) return
    const tubos = tubosOrdenados
      .filter((t) => decisiones[t.id])
      .map((t) => {
        const d = decisiones[t.id]
        const vol = d.volumen !== '' ? parseFloat(d.volumen) : undefined
        return {
          idTuboProtocolo: t.id,
          incluir: d.incluir,
          accion: d.accion,
          volumen: vol != null && Number.isFinite(vol) ? vol : undefined,
        }
      })
    const res = await procesar.mutateAsync({
      pacienteUUID,
      idProtocolo: protocolo.id,
      fechaRecoleccion: fecha !== '' ? fecha : undefined,
      observaciones: observaciones.trim() || undefined,
      tubos,
    })
    setResultado(res)
  }

  function nuevo() {
    setResultado(null)
    setDecisiones({})
    setIdProtocolo('')
    setPacienteUUID('')
    setObservaciones('')
    setFecha('')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Procesar participante</h2>
        <p className="text-muted-foreground">
          Instancia un protocolo sobre un participante: genera las muestras padre, los estudios y los lotes de alícuotas.
        </p>
      </div>

      <Alert>
        <PlayCircle className="h-4 w-4" />
        <AlertDescription>
          Elige participante y protocolo. Por cada tubo primario decides qué se le hace (puedes cambiar la acción del
          protocolo) y cuánto se extrajo. Los tubos que alicuotan generan sus crioviales, agrupados en lotes por tipo resultante.
        </AlertDescription>
      </Alert>

      {resultado ? (
        <ResultadoView resultado={resultado} onNuevo={nuevo} />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos de la tanda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Participante <span className="text-destructive">*</span></Label>
                  <PacienteSearchCombobox value={pacienteUUID} onChange={setPacienteUUID} />
                </div>
                <div className="space-y-1.5">
                  <Label>Protocolo <span className="text-destructive">*</span></Label>
                  <Select value={idProtocolo} onValueChange={elegirProtocolo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un protocolo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {protocolos.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre} · {p.nombreTipoOrigen}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fecha de recolección</Label>
                  <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Observaciones</Label>
                  <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={1} maxLength={200} />
                </div>
              </div>
            </CardContent>
          </Card>

          {protocolo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tubos primarios · {protocolo.nombreTipoOrigen}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tubosOrdenados.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    Este protocolo no tiene tubos configurados.
                  </p>
                ) : (
                  tubosOrdenados.map((t) => (
                    <TuboRow
                      key={t.id}
                      tubo={t}
                      decision={decisiones[t.id]}
                      onChange={(patch) => setDecision(t.id, patch)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button size="lg" disabled={!puedeEnviar} onClick={enviar}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {procesar.isPending ? 'Procesando…' : 'Procesar'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function TuboRow({
  tubo, decision, onChange,
}: {
  tubo: TuboProtocolo
  decision?: DecisionEstado
  onChange: (patch: Partial<DecisionEstado>) => void
}) {
  const d = decision ?? { incluir: true, accion: tubo.accion, volumen: '' }
  const esAlicuotar = d.accion === 'ALICUOTAR'

  return (
    <div className={`rounded-md border px-3 py-2.5 ${d.incluir ? '' : 'opacity-50'}`}>
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Switch checked={d.incluir} onCheckedChange={(v) => onChange({ incluir: v })} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <AccionIcon accion={d.accion} className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">{tubo.nombre}</span>
            {tubo.prefijoCodigo && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tubo.prefijoCodigo}</Badge>
            )}
            {esAlicuotar && tubo.nombreTipoResultante && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <ArrowRight className="h-3 w-3" /> {tubo.nombreTipoResultante}
                {tubo.numeroAlicuotas ? ` · ${tubo.numeroAlicuotas}×${tubo.volumenAlicuota ?? ''} ${tubo.unidadVolumen ?? ''}` : ''}
                {tubo.agruparEnLote ? ' · agrupa' : ''}
              </span>
            )}
          </div>

          {d.incluir && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Acción</Label>
                <Select value={d.accion} onValueChange={(v) => onChange({ accion: v as AccionTubo })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUARDAR">{ACCION_LABEL.GUARDAR}</SelectItem>
                    <SelectItem value="ESTUDIO">{ACCION_LABEL.ESTUDIO}</SelectItem>
                    <SelectItem value="ALICUOTAR">{ACCION_LABEL.ALICUOTAR}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">
                  {esAlicuotar ? `Volumen extraído (${tubo.unidadVolumen ?? ''})` : 'Volumen'}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-8 text-xs"
                  value={d.volumen}
                  onChange={(e) => onChange({ volumen: e.target.value })}
                  placeholder={esAlicuotar ? 'Lo que salió' : 'Opcional'}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultadoView({ resultado, onNuevo }: { resultado: ProcesarResultado; onNuevo: () => void }) {
  return (
    <Card className="border-green-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          Procesado · folio {resultado.folio ?? '—'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{resultado.numeroPadres} tubo(s) padre</Badge>
          <Badge variant="outline">{resultado.numeroAlicuotas} alícuota(s)</Badge>
          <Badge variant="outline">{resultado.lotes.length} lote(s)</Badge>
        </div>

        {resultado.padres.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Tubos primarios</p>
            {resultado.padres.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                {p.accion && <AccionIcon accion={p.accion} className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="font-mono text-xs">{p.etiqueta}</span>
                {p.nombreTubo && <span className="text-muted-foreground text-xs">· {p.nombreTubo}</span>}
                {p.valor != null && <span className="text-muted-foreground text-xs">· {p.valor} {p.unidad ?? ''}</span>}
                {p.accion && <Badge variant="secondary" className="ml-auto text-[10px]">{ACCION_LABEL[p.accion]}</Badge>}
              </div>
            ))}
          </div>
        )}

        {resultado.lotes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Lotes de alícuotas</p>
            {resultado.lotes.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Lote {l.numeroLote}</span>
                {l.nombreTipoResultante && <span className="text-muted-foreground text-xs">· {l.nombreTipoResultante}</span>}
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {l.numeroAlicuotas} alícuota(s) · 1…{l.numeroAlicuotas}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Las alícuotas quedaron sin ubicar: ve a <strong>Muestras</strong> para asignarles posición en cajas.
          Los tubos de estudio se llenan desde el panel de estudios de cada muestra.
        </p>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onNuevo}>Procesar otro</Button>
        </div>
      </CardContent>
    </Card>
  )
}
