import { useMemo, useState } from 'react'
import { PlayCircle, TestTube, Archive, Microscope, CheckCircle2, ArrowRight, Boxes, MapPin, AlertTriangle, Info, Send } from 'lucide-react'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useGetProtocolosActivos, useProcesarProtocolo, usePlanAlicuotasProtocolo } from '../hooks/useBiobanco'
import { useGetInstitucionesVisibles } from '@/features/instituciones/hooks/useInstituciones'
import { AccionTubo, MuestraDetalleDTO, OpcionDistribucion, PadreBreve, ProcesarResultado, TuboProtocolo } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { UbicarLoteModal } from './UbicarLoteModal'
import { SeleccionPosicionCajaModal } from './SeleccionPosicionCajaModal'
import { useAsignarPosicionMuestra } from '../hooks/useBiobanco'
import { toast } from 'sonner'

const ACCION_LABEL: Record<AccionTubo, string> = {
  GUARDAR: 'Guardar entero',
  ESTUDIO: 'Estudio',
  ALICUOTAR: 'Alicuotar',
  TRANSFERIR: 'Transferir',
}

function AccionIcon({ accion, className }: { accion: AccionTubo; className?: string }) {
  if (accion === 'GUARDAR') return <Archive className={className} />
  if (accion === 'ESTUDIO') return <Microscope className={className} />
  if (accion === 'TRANSFERIR') return <Send className={className} />
  return <TestTube className={className} />
}

interface DecisionEstado {
  incluir: boolean
  accion: AccionTubo
  volumen: string
  observaciones: string
  planVolumenes?: number[]
  transferirAutorizado?: boolean
  idInstitucionDestinoOverride?: number | null
  motivoTransferencia?: string
}

export function ProcesarTab() {
  const { data: protocolos = [] } = useGetProtocolosActivos()
  const procesar = useProcesarProtocolo()
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

  const disabledDaysOfWeek = useMemo(() => {
    if (!horarioActivo) return undefined
    const days: number[] = []
    if (!horarioActivo.domingo) days.push(0)
    if (!horarioActivo.lunes) days.push(1)
    if (!horarioActivo.martes) days.push(2)
    if (!horarioActivo.miercoles) days.push(3)
    if (!horarioActivo.jueves) days.push(4)
    if (!horarioActivo.viernes) days.push(5)
    if (!horarioActivo.sabado) days.push(6)
    return days.length > 0 ? days : undefined
  }, [horarioActivo])

  const [pacienteUUID, setPacienteUUID] = useState('')
  const [idProtocolo, setIdProtocolo] = useState<string>('')
  const [fecha, setFecha] = useState(() => ultimoMomentoValido(horarioActivo))
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
      const volEsp = t.volumenEsperado
      const volAlicTotal = t.accion === 'ALICUOTAR' && t.volumenAlicuota != null && t.numeroAlicuotas
        ? t.volumenAlicuota * t.numeroAlicuotas : undefined
      init[t.id] = {
        incluir: t.activo !== false,
        accion: t.accion,
        volumen: volEsp != null ? String(volEsp) : volAlicTotal != null ? String(volAlicTotal) : '',
        observaciones: '',
        transferirAutorizado: t.accion === 'TRANSFERIR' ? true : undefined,
        idInstitucionDestinoOverride: t.accion === 'TRANSFERIR' ? (t.idInstitucionDestino ?? null) : undefined,
        motivoTransferencia: t.accion === 'TRANSFERIR' ? (t.motivoTransferencia ?? '') : undefined,
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
  const volumenesValidos = tubosOrdenados.every((t) => {
    const d = decisiones[t.id]
    if (!d?.incluir) return true
    if (d.accion === 'ALICUOTAR') return true
    return d.volumen !== '' && Number.isFinite(parseFloat(d.volumen)) && parseFloat(d.volumen) > 0
  })
  const puedeEnviar = pacienteUUID !== '' && protocolo != null && fecha !== '' && alMenosUno && volumenesValidos && !procesar.isPending

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
          planVolumenes: d.planVolumenes,
          observaciones: d.observaciones.trim() || undefined,
          transferirAutorizado: d.accion === 'TRANSFERIR' ? d.transferirAutorizado : undefined,
          idInstitucionDestino: d.accion === 'TRANSFERIR' && d.idInstitucionDestinoOverride != null
            ? d.idInstitucionDestinoOverride : undefined,
          motivoTransferencia: d.accion === 'TRANSFERIR' && d.motivoTransferencia?.trim()
            ? d.motivoTransferencia.trim() : undefined,
        }
      })
    const res = await procesar.mutateAsync({
      pacienteUUID,
      idProtocolo: protocolo.id,
      fechaRecoleccion: fecha,
      tubos,
    })
    setResultado(res)
  }

  function nuevo() {
    setResultado(null)
    setDecisiones({})
    setIdProtocolo('')
    setPacienteUUID('')
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
              <div className="space-y-1.5">
                <Label>Fecha de recolección <span className="text-destructive">*</span></Label>
                <DateTimePicker
                  value={fecha}
                  onChange={setFecha}
                  placeholder="Seleccione la fecha y la hora"
                  timeStepMinutes={1}
                  maxDateTime={new Date()}
                  minHour={horarioActivo?.horaInicio ?? 8}
                  maxHour={(horarioActivo?.horaFin ?? 18) - 1}
                  disabledDaysOfWeek={disabledDaysOfWeek}
                />
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
  const d = decision ?? { incluir: true, accion: tubo.accion, volumen: '', observaciones: '' }
  const esAlicuotar = d.accion === 'ALICUOTAR'
  const esTransferir = d.accion === 'TRANSFERIR'
  const { data: instituciones = [] } = useGetInstitucionesVisibles({ enabled: esTransferir })

  const volNum = d.volumen !== '' ? parseFloat(d.volumen) : null
  const { data: plan, isFetching: planCargando } = usePlanAlicuotasProtocolo(
    { idTuboProtocolo: tubo.id, valor: volNum },
    { enabled: esAlicuotar && d.incluir },
  )

  function seleccionarOpcion(op: OpcionDistribucion) {
    onChange({ planVolumenes: op.volumenes })
  }

  const opcionActiva = d.planVolumenes
  const claveActiva = plan?.opciones.find(
    (o) => o.volumenes.length === opcionActiva?.length
      && o.volumenes.every((v, i) => v === opcionActiva[i]),
  )?.clave ?? null

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
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Acción</Label>
                  <Select value={d.accion} onValueChange={(v) => onChange({ accion: v as AccionTubo, planVolumenes: undefined, transferirAutorizado: v === 'TRANSFERIR' ? true : undefined, idInstitucionDestinoOverride: v === 'TRANSFERIR' ? (tubo.idInstitucionDestino ?? null) : undefined, motivoTransferencia: v === 'TRANSFERIR' ? (tubo.motivoTransferencia ?? '') : undefined })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GUARDAR">{ACCION_LABEL.GUARDAR}</SelectItem>
                      <SelectItem value="ESTUDIO">{ACCION_LABEL.ESTUDIO}</SelectItem>
                      <SelectItem value="ALICUOTAR">{ACCION_LABEL.ALICUOTAR}</SelectItem>
                      <SelectItem value="TRANSFERIR">{ACCION_LABEL.TRANSFERIR}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    {esAlicuotar
                      ? `Volumen extraído (${tubo.unidadVolumen ?? ''})`
                      : <>Volumen {tubo.unidadVolumen ? `(${tubo.unidadVolumen})` : ''} <span className="text-destructive">*</span></>
                    }
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-8 text-xs"
                    value={d.volumen}
                    onChange={(e) => onChange({ volumen: e.target.value, planVolumenes: undefined })}
                    placeholder={esAlicuotar ? 'Lo que salió' : 'Obligatorio'}
                  />
                </div>
              </div>

              {esAlicuotar && plan && (
                <PlanPreview
                  plan={plan}
                  claveActiva={claveActiva}
                  onSeleccionar={seleccionarOpcion}
                  cargando={planCargando}
                />
              )}
              {esAlicuotar && planCargando && !plan && (
                <p className="text-[11px] text-muted-foreground animate-pulse">Calculando distribución…</p>
              )}

              {esTransferir && (
                <div className="rounded-md border border-dashed p-2.5 space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={d.transferirAutorizado === true}
                      onCheckedChange={(v) => onChange({ transferirAutorizado: v })}
                    />
                    <div className="min-w-0 flex-1">
                      <Label className="text-xs font-medium cursor-pointer">
                        Autorizar transferencia automática
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {tubo.nombreInstitucionDestino
                          ? `Destino del protocolo: ${tubo.nombreInstitucionDestino}`
                          : 'Sin destino configurado en el protocolo'}
                      </p>
                    </div>
                  </div>
                  {d.transferirAutorizado && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Destino (cambiar solo para esta vez)</Label>
                        <Select
                          value={d.idInstitucionDestinoOverride != null ? String(d.idInstitucionDestinoOverride) : ''}
                          onValueChange={(v) => onChange({ idInstitucionDestinoOverride: v ? Number(v) : null })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={tubo.nombreInstitucionDestino ?? 'Seleccione destino…'} />
                          </SelectTrigger>
                          <SelectContent>
                            {instituciones.map((inst) => (
                              <SelectItem key={inst.id} value={String(inst.id)}>{inst.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Motivo de la transferencia</Label>
                        <Textarea
                          className="text-xs"
                          value={d.motivoTransferencia ?? ''}
                          onChange={(e) => onChange({ motivoTransferencia: e.target.value })}
                          rows={2}
                          maxLength={200}
                          placeholder="Si se deja vacío: «Transferencia automática — protocolo …»"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11px]">Observaciones</Label>
                <Textarea
                  className="text-xs"
                  value={d.observaciones}
                  onChange={(e) => onChange({ observaciones: e.target.value })}
                  rows={1}
                  maxLength={200}
                  placeholder="Observaciones de este tubo"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlanPreview({
  plan,
  claveActiva,
  onSeleccionar,
  cargando,
}: {
  plan: import('@/types/api').PlanAlicuotas
  claveActiva: string | null
  onSeleccionar: (op: OpcionDistribucion) => void
  cargando: boolean
}) {
  const completo = plan.alcanzaLoteCompleto
  const sinAlicuotas = plan.alicuotasCompletas === 0 && plan.opciones.length <= 1

  return (
    <div className={`rounded-md border px-3 py-2 text-xs space-y-1.5 ${
      completo ? 'border-green-500/30 bg-green-500/5' :
      sinAlicuotas ? 'border-destructive/30 bg-destructive/5' :
      'border-yellow-500/30 bg-yellow-500/5'
    } ${cargando ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1.5">
        {completo ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
        ) : sinAlicuotas ? (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : (
          <Info className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
        )}
        <span className="font-medium">{plan.mensaje}</span>
      </div>

      <div className="flex items-center gap-3 text-muted-foreground text-[11px] flex-wrap">
        <span>Configuradas: {plan.numeroAlicuotasConfiguradas}</span>
        <span>Alcanzan: {plan.alicuotasCompletas}</span>
        {plan.remanente > 0 && <span>Remanente: {plan.remanente} {plan.unidad}</span>}
        <span>Requerido: {plan.totalRequerido} {plan.unidad}</span>
      </div>

      {plan.opciones.length > 1 && (
        <div className="space-y-1 pt-0.5">
          <p className="text-[11px] font-medium text-muted-foreground">Distribución:</p>
          {plan.opciones.map((op) => {
            const activa = op.clave === claveActiva
            return (
              <button
                key={op.clave}
                type="button"
                onClick={() => onSeleccionar(op)}
                className={`w-full text-left rounded px-2 py-1 text-[11px] border transition-colors ${
                  activa
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-transparent hover:bg-muted/50'
                }`}
              >
                <span>{op.descripcion}</span>
                <span className="text-muted-foreground ml-1">· {op.totalAlicuotas} alícuota(s)</span>
                {op.remanenteEnPadre > 0 && (
                  <span className="text-muted-foreground ml-1">· sobra {op.remanenteEnPadre} {plan.unidad}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function padreBreveAMuestra(p: PadreBreve): MuestraDetalleDTO {
  return {
    id: p.id,
    uuid: '',
    etiqueta: p.etiqueta,
    valor: p.valor ?? 0,
    unidad: p.unidad ?? '',
    fechaRecoleccion: '',
    activo: true,
    paciente: { id: 0, folio: '', nombreCompleto: '', sexo: '', uuid: '' },
    usuarioRecolecta: { id: 0, username: '', nombreCompleto: '', uuid: '' },
  }
}

function ResultadoView({ resultado, onNuevo }: { resultado: ProcesarResultado; onNuevo: () => void }) {
  const [ubicarPadre, setUbicarPadre] = useState<MuestraDetalleDTO | null>(null)
  const [ubicarTuboId, setUbicarTuboId] = useState<number | null>(null)
  const [ubicados, setUbicados] = useState<Set<number>>(new Set())
  const asignarPosicion = useAsignarPosicionMuestra()
  const padresConAlicuotas = resultado.padres.filter((p) => p.accion === 'ALICUOTAR')

  async function ubicarTuboEnPosicion({ idPosicionCaja }: { idPosicionCaja: number }) {
    if (ubicarTuboId == null) return
    try {
      await asignarPosicion.mutateAsync({ id: ubicarTuboId, data: { idPosicionCaja } })
      setUbicados((prev) => new Set(prev).add(ubicarTuboId))
      toast.success('Tubo ubicado')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al ubicar el tubo')
    }
    setUbicarTuboId(null)
  }

  return (
    <>
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
                {p.transferido && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    <Send className="h-2.5 w-2.5 mr-0.5" /> → {p.institucionDestino ?? 'Transferido'}
                  </Badge>
                )}
                {p.accion === 'ALICUOTAR' && (
                  <Button
                    variant="outline" size="sm"
                    className="ml-1 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    onClick={() => setUbicarPadre(padreBreveAMuestra(p))}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    Ubicar alícuotas
                  </Button>
                )}
                {p.accion === 'ALICUOTAR' && p.remanente != null && p.remanente > 0 && (
                  ubicados.has(p.id) ? (
                    <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Tubo ubicado
                    </span>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="ml-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => setUbicarTuboId(p.id)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Ubicar tubo ({p.remanente} {p.unidad ?? ''})
                    </Button>
                  )
                )}
                {(p.accion === 'GUARDAR' || p.accion === 'ESTUDIO') && (
                  ubicados.has(p.id) ? (
                    <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Ubicado
                    </span>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="ml-1 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() => setUbicarTuboId(p.id)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Ubicar tubo
                    </Button>
                  )
                )}
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
          {padresConAlicuotas.length > 0
            ? <>Use los botones <strong>Ubicar</strong> de cada tubo para asignar posiciones en caja, o hágalo después desde <strong>Muestras</strong>. Los tubos de estudio se llenan desde el panel de estudios de cada muestra.</>
            : <>Los tubos de estudio se llenan desde el panel de estudios de cada muestra.</>
          }
        </p>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onNuevo}>Procesar otro</Button>
        </div>
      </CardContent>
    </Card>

    <UbicarLoteModal
      open={ubicarPadre !== null}
      onOpenChange={(open) => !open && setUbicarPadre(null)}
      muestra={ubicarPadre}
    />

    <SeleccionPosicionCajaModal
      open={ubicarTuboId !== null}
      onOpenChange={(open) => { if (!open) setUbicarTuboId(null) }}
      onConfirm={ubicarTuboEnPosicion}
    />
    </>
  )
}
