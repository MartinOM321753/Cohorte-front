import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useGetProtocolosActivos } from '../hooks/useBiobanco'
import { previsualizarCargaProtocolo, confirmarCargaProtocolo } from '../api/biobanco.api'
import { ResultadoCargaProtocolo } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/**
 * Carga masiva asociada a un PROTOCOLO: el archivo trae alícuotas (folio, tubo T,
 * lote L, volumen, caja/posición) y el sistema genera los tubos primarios y los
 * lotes del protocolo. Columnas: folio, tubo, lote, volumen, unidad, caja,
 * posicion, fecha.
 */
export function CargaProtocoloSection() {
  const { data: protocolos = [] } = useGetProtocolosActivos()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [idProtocolo, setIdProtocolo] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState<'previa' | 'confirmar' | null>(null)
  const [resultado, setResultado] = useState<ResultadoCargaProtocolo | null>(null)
  const [esConfirmado, setEsConfirmado] = useState(false)

  const listo = idProtocolo !== '' && archivo != null

  async function previsualizar() {
    if (!archivo || idProtocolo === '') return
    setCargando('previa'); setEsConfirmado(false)
    try {
      const r = await previsualizarCargaProtocolo(archivo, Number(idProtocolo))
      setResultado(r)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al previsualizar')
    } finally { setCargando(null) }
  }

  async function confirmar() {
    if (!archivo || idProtocolo === '') return
    setCargando('confirmar')
    try {
      const r = await confirmarCargaProtocolo(archivo, Number(idProtocolo))
      setResultado(r); setEsConfirmado(true)
      queryClient.invalidateQueries({ queryKey: ['muestras'] })
      toast.success(`Carga confirmada: ${r.alicuotas} alícuota(s) en ${r.lotes} lote(s)`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al confirmar la carga')
    } finally { setCargando(null) }
  }

  function reset() {
    setArchivo(null); setResultado(null); setEsConfirmado(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const puedeConfirmar = resultado != null && resultado.errores.length === 0 && !esConfirmado

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Carga por protocolo</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>
            El archivo trae alícuotas; los tubos primarios y los lotes se generan según el protocolo.
            Columnas: <code>folio, tubo, lote, volumen, unidad, caja, posicion, fecha</code>.
            Si falta el tubo, se infiere por orden.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Protocolo <span className="text-destructive">*</span></Label>
            <Select value={idProtocolo} onValueChange={(v) => { setIdProtocolo(v); setResultado(null) }}>
              <SelectTrigger><SelectValue placeholder="Seleccione un protocolo…" /></SelectTrigger>
              <SelectContent>
                {protocolos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nombre} · {p.nombreTipoOrigen}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Archivo (.xlsx/.csv) <span className="text-destructive">*</span></Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null) }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!listo || cargando != null} onClick={previsualizar}>
            {cargando === 'previa' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Previsualizar
          </Button>
          <Button size="sm" disabled={!puedeConfirmar || cargando != null} onClick={confirmar}>
            {cargando === 'confirmar' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Confirmar carga
          </Button>
          {resultado && (
            <Button variant="ghost" size="sm" onClick={reset}>Limpiar</Button>
          )}
        </div>

        {resultado && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              {esConfirmado
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : resultado.errores.length === 0
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className="text-sm font-medium">
                {esConfirmado ? 'Carga confirmada' : resultado.errores.length === 0 ? 'Listo para confirmar' : 'Hay errores por corregir'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{resultado.procesamientos} procesamiento(s)</Badge>
              <Badge variant="outline">{resultado.padres} tubo(s) primario(s)</Badge>
              <Badge variant="outline">{resultado.lotes} lote(s)</Badge>
              <Badge variant="outline">{resultado.alicuotas} alícuota(s)</Badge>
              <Badge variant="outline">{resultado.ubicadas} con hueco</Badge>
            </div>
            {resultado.errores.length > 0 && (
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {resultado.errores.map((err, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
