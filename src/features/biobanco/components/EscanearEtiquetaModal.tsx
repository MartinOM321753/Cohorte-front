import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Camera, Keyboard, ScanLine } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Recibe el contenido leído. El modal no busca: solo entrega el código. */
  onCodigo: (codigo: string) => void
  /** Mensaje del último intento fallido, para mostrarlo sin cerrar la cámara. */
  errorBusqueda?: string | null
  buscando?: boolean
}

/**
 * Los tres formatos que la aplicación imprime en las etiquetas. Acotar la lista
 * no es cosmético: ZXing prueba un decodificador por formato en cada fotograma,
 * y dejarlos todos hace que la lectura sea perceptiblemente más lenta.
 */
const FORMATOS = [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX]

export function EscanearEtiquetaModal({
  open,
  onOpenChange,
  onCodigo,
  errorBusqueda,
  buscando,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([])
  const [camaraId, setCamaraId] = useState<string>('')
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [manual, setManual] = useState('')

  // Sin esto, mover un tubo delante del objetivo dispara la misma lectura muchas
  // veces por segundo y se encadenan búsquedas idénticas.
  const ultimoCodigo = useRef<{ valor: string; ts: number }>({ valor: '', ts: 0 })

  const emitir = useCallback((codigo: string) => {
    const limpio = codigo.trim()
    if (!limpio) return
    const ahora = Date.now()
    if (limpio === ultimoCodigo.current.valor && ahora - ultimoCodigo.current.ts < 2500) return
    ultimoCodigo.current = { valor: limpio, ts: ahora }
    onCodigo(limpio)
  }, [onCodigo])

  const detener = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }, [])

  // Enumerar cámaras. Los navegadores no dan las etiquetas de los dispositivos
  // hasta que se concede el permiso, así que primero se pide y luego se listan.
  useEffect(() => {
    if (!open) return
    let cancelado = false

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((t) => t.stop())
        const dispositivos = (await navigator.mediaDevices.enumerateDevices())
          .filter((d) => d.kind === 'videoinput')
        if (cancelado) return
        setCamaras(dispositivos)
        // La trasera es la que se usa con un tubo en la mano; el nombre es la
        // única pista portable para reconocerla.
        const trasera = dispositivos.find((d) => /back|rear|trasera|environment/i.test(d.label))
        setCamaraId((previa) => previa || trasera?.deviceId || dispositivos[0]?.deviceId || '')
      } catch (e) {
        if (cancelado) return
        const err = e as DOMException
        setErrorCamara(
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Puedes escribir la etiqueta a mano abajo, o usar un lector conectado.'
            : err?.name === 'NotFoundError'
              ? 'Este equipo no tiene cámara. Usa un lector conectado o escribe la etiqueta.'
              : 'No se pudo abrir la cámara. Usa un lector conectado o escribe la etiqueta.',
        )
      }
    })()

    return () => { cancelado = true }
  }, [open])

  // Arrancar la decodificación sobre la cámara elegida.
  useEffect(() => {
    if (!open || !camaraId || !videoRef.current) return
    let cancelado = false
    setIniciando(true)

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS)
    const lector = new BrowserMultiFormatReader(hints)

    lector
      .decodeFromVideoDevice(camaraId, videoRef.current, (resultado) => {
        if (resultado) emitir(resultado.getText())
        // El callback también recibe "no encontrado" en cada fotograma sin
        // código: no es un error y no debe pintarse en pantalla.
      })
      .then((controls) => {
        if (cancelado) { controls.stop(); return }
        controlsRef.current = controls
        setIniciando(false)
      })
      .catch(() => {
        if (cancelado) return
        setIniciando(false)
        setErrorCamara('No se pudo iniciar la lectura con esta cámara. Prueba con otra.')
      })

    return () => { cancelado = true; detener() }
  }, [open, camaraId, emitir, detener])

  // Soltar la cámara al cerrar: si no, el led sigue encendido y el dispositivo
  // queda tomado para el resto de la sesión.
  useEffect(() => {
    if (!open) detener()
    return () => detener()
  }, [open, detener])

  const enviarManual = () => {
    const valor = manual.trim()
    if (!valor) return
    setManual('')
    onCodigo(valor)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Buscar muestra por su etiqueta
          </DialogTitle>
          <DialogDescription>
            Enfoca el código impreso en la etiqueta. Se reconocen Code 128, QR y DataMatrix.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Keyboard className="h-4 w-4" />
          <AlertDescription className="text-[12px] leading-snug">
            Si tienes un lector conectado, no hace falta abrir esta ventana: dispara sobre la
            etiqueta con el listado de muestras a la vista y la búsqueda se hace sola.
          </AlertDescription>
        </Alert>

        {errorCamara ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorCamara}</AlertDescription>
          </Alert>
        ) : (
          <div className="relative overflow-hidden rounded-md border bg-black">
            <video
              ref={videoRef}
              className="h-64 w-full object-cover"
              muted
              playsInline
            />
            {/* Guía de encuadre: sin una referencia visual la gente acerca
                demasiado el tubo y el código se sale del campo. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-4/5 rounded-md border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            {(iniciando || buscando) && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm text-white">
                <Spinner className="h-4 w-4" />
                {buscando ? 'Buscando la muestra…' : 'Iniciando cámara…'}
              </div>
            )}
          </div>
        )}

        {camaras.length > 1 && !errorCamara && (
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select value={camaraId} onValueChange={setCamaraId}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="Elegir cámara" />
              </SelectTrigger>
              <SelectContent>
                {camaras.map((c, i) => (
                  <SelectItem key={c.deviceId} value={c.deviceId}>
                    {c.label || `Cámara ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {errorBusqueda && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorBusqueda}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            O escribe la etiqueta
          </p>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviarManual() } }}
              placeholder="Ej. C1/001103/F4"
              className="h-9 font-mono text-[13px]"
            />
            <Button type="button" onClick={enviarManual} disabled={!manual.trim() || buscando}>
              Buscar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
