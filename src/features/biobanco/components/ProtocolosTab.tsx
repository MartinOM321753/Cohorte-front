import { useState } from 'react'
import {
  Plus, Edit, Trash2, ChevronDown, ChevronRight,
  ClipboardList, CheckCircle2, XCircle, TestTube, Archive, Microscope,
  AlertCircle, ArrowRight, FlaskConical, Thermometer,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useGetProtocolos,
  useCreateProtocolo,
  useUpdateProtocolo,
  useToggleProtocolo,
  useDeleteProtocolo,
  useAddTuboProtocolo,
  useUpdateTuboProtocolo,
  useDeleteTuboProtocolo,
  useGetTiposMuestraActivos,
  useGetTiposMuestra,
  useCreateTipoMuestra,
  useUpdateTipoMuestra,
  useToggleTipoMuestra,
  useDeleteTipoMuestra,
} from '../hooks/useBiobanco'
import { AccionTubo, Protocolo, TipoMuestra, TuboProtocolo } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { UnidadSelect } from '@/components/forms/UnidadSelect'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

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

function volumenVariable(tubo: TuboProtocolo): boolean {
  const v = tubo.volumenesAlicuota
  if (!v || v.length < 2) return false
  return v.some((x) => x !== v[0])
}

// ── Formulario Protocolo ────────────────────────────────────────────────────────

interface ProtocoloFormProps {
  initial?: Protocolo | null
  tipos: TipoMuestra[]
  onSave: (data: { nombre: string; descripcion: string; idTipoOrigen: number }) => void
  onCancel: () => void
  loading: boolean
}

function ProtocoloForm({ initial, tipos, onSave, onCancel, loading }: ProtocoloFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [idTipoOrigen, setIdTipoOrigen] = useState<string>(
    initial?.idTipoOrigen != null ? String(initial.idTipoOrigen) : '',
  )

  const faltaTipo = idTipoOrigen === ''

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nombre <span className="text-destructive">*</span></Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Muestras Serológicas · Sangre total"
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de muestra origen <span className="text-destructive">*</span></Label>
        <Select value={idTipoOrigen} onValueChange={setIdTipoOrigen}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione el material que se recolecta…" />
          </SelectTrigger>
          <SelectContent>
            {tipos.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Lo que se recolecta del participante (ej. Sangre total). Las alícuotas pueden resultar
          en otro tipo (suero), que se configura por tubo.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción del protocolo (opcional)"
          rows={2}
          maxLength={500}
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button
          size="sm"
          disabled={loading || !nombre.trim() || faltaTipo}
          onClick={() => onSave({
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            idTipoOrigen: Number(idTipoOrigen),
          })}
        >
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Crear protocolo'}
        </Button>
      </div>
    </div>
  )
}

// ── Formulario TuboProtocolo ────────────────────────────────────────────────────

interface TuboFormData {
  nombre: string; prefijoCodigo: string; accion: AccionTubo; orden?: number
  idTipoResultante: number | null; numeroAlicuotas: number
  volumenAlicuota: number | undefined; volumenesAlicuota: number[] | undefined
  unidadVolumen: string; destinoSugerido: string
  agruparEnLote: boolean; generacionAutomatica: boolean; permiteAlicuotaParcial: boolean
}

interface TuboFormProps {
  initial?: TuboProtocolo | null
  tipos: TipoMuestra[]
  onSave: (data: TuboFormData) => void
  onCancel: () => void
  loading: boolean
}

function TuboForm({ initial, tipos, onSave, onCancel, loading }: TuboFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [prefijo, setPrefijo] = useState(initial?.prefijoCodigo ?? '')
  const [orden, setOrden] = useState(initial?.orden != null ? String(initial.orden) : '')
  const [accion, setAccion] = useState<AccionTubo>(initial?.accion ?? 'GUARDAR')
  const [idTipoResultante, setIdTipoResultante] = useState<string>(
    initial?.idTipoResultante != null ? String(initial.idTipoResultante) : '',
  )
  const [numAlicuotas, setNumAlicuotas] = useState(String(initial?.numeroAlicuotas ?? '0'))
  const [volumen, setVolumen] = useState(initial?.volumenAlicuota != null ? String(initial.volumenAlicuota) : '')
  const [volumenesSlots, setVolumenesSlots] = useState<string[]>(() => {
    const n = parseInt(String(initial?.numeroAlicuotas ?? '0')) || 0
    const general = initial?.volumenAlicuota != null ? String(initial.volumenAlicuota) : ''
    if (initial?.volumenesAlicuota && initial.volumenesAlicuota.length > 0) {
      return initial.volumenesAlicuota.map((v) => (v != null ? String(v) : general))
    }
    return Array.from({ length: n }, () => general)
  })
  const [unidad, setUnidad] = useState(initial?.unidadVolumen ?? '')
  const [destino, setDestino] = useState(initial?.destinoSugerido ?? '')
  const [agrupar, setAgrupar] = useState(initial?.agruparEnLote === true)
  const [generacionAutomatica, setGeneracionAutomatica] = useState(initial?.generacionAutomatica !== false)
  const [permiteParcial, setPermiteParcial] = useState(initial?.permiteAlicuotaParcial !== false)

  const esAlicuotar = accion === 'ALICUOTAR'
  const nAlicuotas = parseInt(numAlicuotas) || 0
  const faltaTipoResultante = esAlicuotar && idTipoResultante === ''
  const faltaNum = esAlicuotar && nAlicuotas <= 0
  const faltaVolumen = esAlicuotar && (volumen === '' || !(parseFloat(volumen) > 0))
  const faltaUnidad = esAlicuotar && unidad.trim() === ''
  const invalido = faltaTipoResultante || faltaNum || faltaVolumen || faltaUnidad

  function cambiarNumAlicuotas(valor: string) {
    setNumAlicuotas(valor)
    const n = parseInt(valor) || 0
    setVolumenesSlots((prev) => {
      const arr = [...prev]
      if (n > arr.length) while (arr.length < n) arr.push(volumen)
      else arr.splice(n)
      return arr
    })
  }

  function aplicarGeneralATodas() {
    setVolumenesSlots(Array.from({ length: nAlicuotas }, () => volumen))
  }

  function cambiarSlot(i: number, valor: string) {
    setVolumenesSlots((prev) => prev.map((x, j) => (j === i ? valor : x)))
  }

  function volumenesPayload(): number[] | undefined {
    if (nAlicuotas <= 0) return undefined
    const general = volumen !== '' ? parseFloat(volumen) : undefined
    const resueltos = Array.from({ length: nAlicuotas }, (_, i) => {
      const raw = volumenesSlots[i]
      return raw !== undefined && raw !== '' ? parseFloat(raw) : general
    })
    return resueltos.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
      ? (resueltos as number[])
      : undefined
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nombre <span className="text-destructive">*</span></Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Vacutainer tapa roja 1" maxLength={100} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Nº tubo (T)</Label>
            <Input type="number" min={1} value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="1…N" />
          </div>
          <div className="space-y-1.5">
            <Label>Prefijo</Label>
            <Input value={prefijo} onChange={(e) => setPrefijo(e.target.value)} placeholder="Ej: S, SL, H" maxLength={20} />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        El Nº de tubo (T) ordena y distingue los tubos primarios en la etiqueta: <code>…F4-T{'{N}'}</code>.
      </p>

      <div className="space-y-1.5">
        <Label>¿Qué se le hace al tubo? <span className="text-destructive">*</span></Label>
        <Select value={accion} onValueChange={(v) => setAccion(v as AccionTubo)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GUARDAR">Guardar entero (custodia / traslado)</SelectItem>
            <SelectItem value="ESTUDIO">Estudio (se consume en mediciones)</SelectItem>
            <SelectItem value="ALICUOTAR">Alicuotar (produce crioviales)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Receta — solo si alicuota */}
      {esAlicuotar && (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="space-y-1.5">
            <Label>Tipo resultante <span className="text-destructive">*</span></Label>
            <Select value={idTipoResultante} onValueChange={setIdTipoResultante}>
              <SelectTrigger>
                <SelectValue placeholder="¿En qué se convierte? (ej. Suero)" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Las alícuotas de este tubo se registran con este tipo, que puede diferir del origen
              (sangre total → suero).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nº alícuotas <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} value={numAlicuotas} onChange={(e) => cambiarNumAlicuotas(e.target.value)} placeholder="Ej: 6" />
            </div>
            <div className="space-y-1.5">
              <Label>Volumen general <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} step="0.01" value={volumen} onChange={(e) => setVolumen(e.target.value)} placeholder="Ej: 500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Unidad <span className="text-destructive">*</span></Label>
            <UnidadSelect value={unidad} onChange={setUnidad} placeholder="Seleccione una unidad…" />
          </div>

          {nAlicuotas > 0 && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium">Volumen por alícuota ({nAlicuotas})</Label>
                <button
                  type="button"
                  className="text-[11px] text-primary underline-offset-2 hover:underline disabled:opacity-40"
                  disabled={!volumen}
                  onClick={aplicarGeneralATodas}
                >
                  Aplicar general a todas
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: nAlicuotas }, (_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-7 shrink-0 text-right text-[11px] text-muted-foreground">#{i + 1}</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={volumenesSlots[i] ?? ''}
                      onChange={(e) => cambiarSlot(i, e.target.value)}
                      placeholder={volumen || '500'}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Destino sugerido</Label>
            <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej: INMEGEN, INSP" maxLength={100} />
          </div>

          <div className="space-y-2 rounded-md bg-muted/20 p-3">
            <div className="flex items-start gap-3">
              <Switch id="agrupar" checked={agrupar} onCheckedChange={setAgrupar} />
              <div className="min-w-0 flex-1">
                <Label htmlFor="agrupar" className="cursor-pointer text-xs font-medium">
                  Agrupar en un solo lote con otros tubos
                </Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Las alícuotas de este tubo se juntan con las de otros tubos del mismo tipo resultante
                  marcados a agrupar, en un lote con numeración continua (p. ej. 2 tubos × 6 → 1…12).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Switch id="gen-auto" checked={generacionAutomatica} onCheckedChange={setGeneracionAutomatica} />
              <Label htmlFor="gen-auto" className="cursor-pointer text-xs font-medium">
                Generar alícuotas automáticamente al procesar
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Switch id="permite-parcial" checked={permiteParcial} onCheckedChange={setPermiteParcial} />
              <Label htmlFor="permite-parcial" className="cursor-pointer text-xs font-medium">
                Admitir alícuotas incompletas
              </Label>
            </div>
          </div>
        </div>
      )}

      {invalido && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} />
          {faltaTipoResultante
            ? 'Indique el tipo de muestra resultante del proceso.'
            : faltaNum
              ? 'Indique cuántas alícuotas genera el tubo.'
              : faltaVolumen
                ? 'Indique el volumen de cada alícuota.'
                : 'Indique la unidad del volumen.'}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button
          size="sm"
          disabled={loading || !nombre.trim() || invalido}
          onClick={() => onSave({
            nombre: nombre.trim(),
            prefijoCodigo: prefijo.trim(),
            accion,
            orden: orden.trim() !== '' ? parseInt(orden) : undefined,
            idTipoResultante: esAlicuotar && idTipoResultante !== '' ? Number(idTipoResultante) : null,
            numeroAlicuotas: esAlicuotar ? nAlicuotas : 0,
            volumenAlicuota: esAlicuotar && volumen !== '' ? parseFloat(volumen) : undefined,
            volumenesAlicuota: esAlicuotar ? volumenesPayload() : undefined,
            unidadVolumen: esAlicuotar ? unidad.trim() : '',
            destinoSugerido: destino.trim(),
            agruparEnLote: esAlicuotar ? agrupar : false,
            generacionAutomatica,
            permiteAlicuotaParcial: permiteParcial,
          })}
        >
          {loading ? 'Guardando…' : initial ? 'Actualizar tubo' : 'Agregar tubo'}
        </Button>
      </div>
    </div>
  )
}

// ── Row TuboProtocolo ─────────────────────────────────────────────────────────

interface TuboRowProps {
  tubo: TuboProtocolo
  tipos: TipoMuestra[]
  onDelete: (id: number) => void
  deletePending: boolean
  puedeEditar: boolean
}

function TuboRow({ tubo, tipos, onDelete, deletePending, puedeEditar }: TuboRowProps) {
  const updateMutation = useUpdateTuboProtocolo()
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between gap-2 rounded-md border border-dashed px-3 py-2 bg-muted/30 text-sm">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <AccionIcon accion={tubo.accion} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">T{tubo.orden}</Badge>
            <span className="font-medium">{tubo.nombre}</span>
            {tubo.prefijoCodigo && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tubo.prefijoCodigo}</Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ACCION_LABEL[tubo.accion]}</Badge>
            {!tubo.activo && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactivo</Badge>}
          </div>
          <p className="text-xs text-muted-foreground pl-5">
            {tubo.accion === 'ALICUOTAR' ? (
              <>
                {tubo.numeroAlicuotas} alícuota{tubo.numeroAlicuotas !== 1 ? 's' : ''}
                {volumenVariable(tubo)
                  ? ` · vol. variable ${tubo.unidadVolumen ?? ''}`
                  : tubo.volumenAlicuota != null && ` · ${tubo.volumenAlicuota} ${tubo.unidadVolumen ?? ''}`}
                {tubo.nombreTipoResultante && (
                  <span className="inline-flex items-center gap-0.5"> <ArrowRight className="h-3 w-3" /> {tubo.nombreTipoResultante}</span>
                )}
                {tubo.agruparEnLote && ' · agrupa'}
                {tubo.destinoSugerido && ` · → ${tubo.destinoSugerido}`}
              </>
            ) : tubo.accion === 'GUARDAR' ? 'Se guarda entero, sin alicuotar' : 'Se consume en mediciones (estudios)'}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {puedeEditar && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditOpen(true)}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {puedeEditar && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" disabled={deletePending}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar tubo "{tubo.nombre}"?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(tubo.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar tubo</DialogTitle>
          </DialogHeader>
          <TuboForm
            initial={tubo}
            tipos={tipos}
            loading={updateMutation.isPending}
            onCancel={() => setEditOpen(false)}
            onSave={async (data) => {
              await updateMutation.mutateAsync({ id: tubo.id, data: { ...data, activo: tubo.activo } })
              setEditOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Card Protocolo ──────────────────────────────────────────────────────────────

interface ProtocoloCardProps {
  protocolo: Protocolo
  tipos: TipoMuestra[]
  puedeEditar: boolean
}

function ProtocoloCard({ protocolo, tipos, puedeEditar }: ProtocoloCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addTuboOpen, setAddTuboOpen] = useState(false)

  const updateMutation = useUpdateProtocolo()
  const toggleMutation = useToggleProtocolo()
  const deleteMutation = useDeleteProtocolo()
  const addTuboMutation = useAddTuboProtocolo()
  const deleteTuboMutation = useDeleteTuboProtocolo()

  const sinTubos = protocolo.tubos.length === 0

  return (
    <Card className={`${!protocolo.activo ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 text-left flex-1 min-w-0">
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            <ClipboardList className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{protocolo.nombre}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Origen: {protocolo.nombreTipoOrigen ?? '—'}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={protocolo.activo ? 'default' : 'secondary'} className="text-xs">
              {protocolo.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {protocolo.tubos.length} tubo{protocolo.tubos.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {puedeEditar && (
        <div className="flex items-center gap-1.5 px-6 pb-3 flex-wrap">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditOpen(true)}>
            <Edit className="h-3 w-3" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={!protocolo.activo} onClick={() => setAddTuboOpen(true)}>
            <Plus className="h-3 w-3" /> Tubo
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs gap-1 ${protocolo.activo
                  ? 'text-destructive border-destructive/30 hover:bg-destructive/5'
                  : 'text-green-700 border-green-300 hover:bg-green-50'}`}
                disabled={toggleMutation.isPending}
              >
                {protocolo.activo ? <><XCircle className="h-3 w-3" /> Desactivar</> : <><CheckCircle2 className="h-3 w-3" /> Activar</>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{protocolo.activo ? '¿Desactivar' : '¿Activar'} protocolo "{protocolo.nombre}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  {protocolo.activo
                    ? 'El protocolo no estará disponible para procesar muestras.'
                    : 'El protocolo volverá a estar disponible para procesar muestras.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => toggleMutation.mutate(protocolo.id)}
                  className={protocolo.activo
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-green-600 text-white hover:bg-green-700'}
                >
                  {protocolo.activo ? 'Desactivar' : 'Activar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={!sinTubos || deleteMutation.isPending}
                title={sinTubos ? 'Eliminar este protocolo' : 'Solo se puede eliminar un protocolo sin tubos. Elimine sus tubos o desactívelo.'}
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar protocolo "{protocolo.nombre}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Solo puede eliminarse un protocolo sin tubos configurados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(protocolo.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {expanded && (
        <CardContent className="pt-0 border-t space-y-2">
          {protocolo.descripcion && <p className="text-xs text-muted-foreground py-1">{protocolo.descripcion}</p>}
          {protocolo.tubos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Sin tubos configurados · Haz clic en "+ Tubo" para agregar
            </p>
          ) : (
            <div className="space-y-1.5">
              {protocolo.tubos.map((tubo) => (
                <TuboRow
                  key={tubo.id}
                  tubo={tubo}
                  tipos={tipos}
                  onDelete={(id) => deleteTuboMutation.mutate(id)}
                  deletePending={deleteTuboMutation.isPending}
                  puedeEditar={puedeEditar}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar protocolo</DialogTitle>
          </DialogHeader>
          <ProtocoloForm
            initial={protocolo}
            tipos={tipos}
            loading={updateMutation.isPending}
            onCancel={() => setEditOpen(false)}
            onSave={async (data) => {
              await updateMutation.mutateAsync({ id: protocolo.id, data })
              setEditOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addTuboOpen} onOpenChange={setAddTuboOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar tubo a "{protocolo.nombre}"</DialogTitle>
          </DialogHeader>
          <TuboForm
            tipos={tipos}
            loading={addTuboMutation.isPending}
            onCancel={() => setAddTuboOpen(false)}
            onSave={async (data) => {
              await addTuboMutation.mutateAsync({ idProtocolo: protocolo.id, data: { ...data, activo: true } })
              setAddTuboOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ── Catálogo de Tipos de muestra (formulario chico, embebido en Protocolos) ──────

interface TipoFormData { nombre: string; descripcion: string; temperaturaAlmacenamiento: string }

function TipoMuestraForm({ initial, onSave, onCancel, loading }: {
  initial?: TipoMuestra | null
  onSave: (data: TipoFormData) => void
  onCancel: () => void
  loading: boolean
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [temperatura, setTemperatura] = useState(initial?.temperaturaAlmacenamiento ?? '')
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nombre <span className="text-destructive">*</span></Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Sangre total, Suero, Heces, Plasma" maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" rows={2} maxLength={500} />
      </div>
      <div className="space-y-1.5">
        <Label>Temperatura de almacenamiento</Label>
        <Input value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ej: -80°C, 4°C, Ambiente" maxLength={30} />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button size="sm" disabled={loading || !nombre.trim()}
          onClick={() => onSave({ nombre: nombre.trim(), descripcion: descripcion.trim(), temperaturaAlmacenamiento: temperatura.trim() })}>
          {loading ? 'Guardando…' : initial ? 'Actualizar' : 'Crear tipo'}
        </Button>
      </div>
    </div>
  )
}

function CatalogoTiposSection({ puedeCrear, puedeEditar }: { puedeCrear: boolean; puedeEditar: boolean }) {
  const { data: tipos = [], isLoading } = useGetTiposMuestra()
  const createMutation = useCreateTipoMuestra()
  const updateMutation = useUpdateTipoMuestra()
  const toggleMutation = useToggleTipoMuestra()
  const deleteMutation = useDeleteTipoMuestra()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTipo, setEditTipo] = useState<TipoMuestra | null>(null)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Tipos de muestra</CardTitle>
            <Badge variant="outline" className="text-xs">{tipos.length}</Badge>
          </div>
          {puedeCrear && (
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Agregar tipo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          Catálogo de materiales (origen y resultante). Los tubos ya no se configuran aquí: se definen por protocolo.
        </p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-2">Cargando…</p>
        ) : tipos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin tipos. Agrega el primero (ej. Sangre total).</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tipos.map((t) => (
              <div key={t.id} className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${!t.activo ? 'opacity-50' : ''}`}>
                <span className="font-medium">{t.nombre}</span>
                {t.temperaturaAlmacenamiento && (
                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Thermometer className="h-3 w-3" />{t.temperaturaAlmacenamiento}
                  </span>
                )}
                {!t.activo && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactivo</Badge>}
                {puedeEditar && (
                  <>
                    <button className="text-muted-foreground hover:text-foreground" title="Editar" onClick={() => setEditTipo(t)}>
                      <Edit className="h-3 w-3" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground" title={t.activo ? 'Desactivar' : 'Activar'}
                      disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(t.id)}>
                      {t.activo ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-destructive/80 hover:text-destructive" title="Eliminar" disabled={deleteMutation.isPending}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar tipo "{t.nombre}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Solo se puede eliminar un tipo que no esté en uso por protocolos ni muestras. Si está en uso, desactívalo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo tipo de muestra</DialogTitle></DialogHeader>
          <TipoMuestraForm loading={createMutation.isPending} onCancel={() => setCreateOpen(false)}
            onSave={async (data) => { await createMutation.mutateAsync(data); setCreateOpen(false) }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTipo} onOpenChange={(o) => { if (!o) setEditTipo(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar tipo de muestra</DialogTitle></DialogHeader>
          {editTipo && (
            <TipoMuestraForm initial={editTipo} loading={updateMutation.isPending} onCancel={() => setEditTipo(null)}
              onSave={async (data) => { await updateMutation.mutateAsync({ id: editTipo.id, data }); setEditTipo(null) }} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────────

export function ProtocolosTab() {
  const [createOpen, setCreateOpen] = useState(false)
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('PROTOCOLOS_CREAR')
  const puedeEditar = hasPermiso('PROTOCOLOS_EDITAR')
  const puedeTiposCrear = hasPermiso('TIPOS_MUESTRA_CREAR')
  const puedeTiposEditar = hasPermiso('TIPOS_MUESTRA_EDITAR')
  const { data: protocolos = [], isLoading } = useGetProtocolos()
  const { data: tipos = [] } = useGetTiposMuestraActivos()
  const createMutation = useCreateProtocolo()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Protocolos</h2>
          <p className="text-muted-foreground">
            Plantillas de procesamiento: los tubos primarios de cada material y qué se le hace a cada uno
          </p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Protocolo
          </Button>
        )}
      </div>

      <Alert>
        <ClipboardList className="h-4 w-4" />
        <AlertDescription>
          Un protocolo es por tipo de muestra origen (ej. Sangre total). Cada tubo primario se guarda
          entero, se consume en un estudio, o se alicuota en un tipo resultante (sangre total → suero).
          Al procesar un participante se instancian estas salidas.
        </AlertDescription>
      </Alert>

      <CatalogoTiposSection puedeCrear={puedeTiposCrear} puedeEditar={puedeTiposEditar} />

      {protocolos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin protocolos configurados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea el primer protocolo para empezar a procesar muestras.
            </p>
            {puedeCrear && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Crear primer protocolo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {protocolos.map((p) => (
            <ProtocoloCard key={p.id} protocolo={p} tipos={tipos} puedeEditar={puedeEditar} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo protocolo</DialogTitle>
          </DialogHeader>
          <ProtocoloForm
            tipos={tipos}
            loading={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSave={async (data) => {
              await createMutation.mutateAsync(data)
              setCreateOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
