import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eraser, Printer, SquareDashed, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LabelDataDTO } from '@/types/api'

interface AcomodoCarrilesDialogProps {
  etiquetas: LabelDataDTO[]
  /** Etiquetas que el rollo lleva a lo ancho. */
  carriles: number
  open: boolean
  onClose: () => void
  /**
   * Acomodo elegido: una posición por carril, en orden de avance, con `null`
   * donde el carril queda en blanco.
   */
  onImprimir: (slots: (number | null)[], marcoDepuracion: boolean) => void
  imprimiendo?: boolean
}

/** Índice de la etiqueta que ocupa el carril, o `null` si queda en blanco. */
type Carril = number | null

/**
 * Acomodo de las etiquetas sobre los carriles del rollo.
 *
 * La Zebra consume el papel por filas completas: en un rollo de tres carriles,
 * mandar una sola etiqueta gasta los tres troqueles y los otros dos salen en
 * blanco. Ese gasto no se puede evitar —el rollo no retrocede, y recalibrar al
 * reinsertarlo consume otra fila— pero sí se puede decidir en qué carril cae
 * cada etiqueta, que es lo que permite aprovechar una tira ya empezada.
 */
export function AcomodoCarrilesDialog({
  etiquetas,
  carriles,
  open,
  onClose,
  onImprimir,
  imprimiendo = false,
}: AcomodoCarrilesDialogProps) {
  const cols = Math.max(1, carriles)

  const [slots, setSlots] = useState<Carril[]>([])
  /**
   * Carriles que el operador decidió dejar en blanco.
   *
   * Se guardan aparte de `slots` porque al correr las etiquetas hacia adelante
   * hay que volver a saltárselos todos, no solo el último: si solo se respetara
   * el recién marcado, dejar en blanco un segundo carril compactaría el primero
   * y el hueco se movería en vez de acumularse.
   */
  const [bloqueados, setBloqueados] = useState<Set<number>>(new Set())
  const [origen, setOrigen] = useState<number | null>(null)
  const [destino, setDestino] = useState<number | null>(null)
  const [marco, setMarco] = useState(false)

  const firma = useMemo(() => etiquetas.map((e) => e.etiqueta).join('|'), [etiquetas])

  useEffect(() => {
    const filas = Math.max(1, Math.ceil(etiquetas.length / cols))
    setSlots(Array.from({ length: filas * cols }, (_, i) => (i < etiquetas.length ? i : null)))
    setBloqueados(new Set())
    setOrigen(null)
    setDestino(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, cols])

  const filas = Math.max(1, Math.ceil(slots.length / cols))

  // Solo se imprimen las filas que llevan al menos una etiqueta: una fila vacía
  // gastaría una vuelta de rollo sin dibujar nada, así que no se manda.
  const filasImpresas = useMemo(() => {
    let n = 0
    for (let f = 0; f < filas; f++) {
      const fila = slots.slice(f * cols, (f + 1) * cols)
      if (fila.some((c) => c !== null)) n++
    }
    return n
  }, [slots, filas, cols])

  const desperdicio = filasImpresas * cols - etiquetas.length

  /** Reparte las etiquetas sobre los carriles libres, respetando los marcados. */
  function repartir(marcados: Set<number>) {
    const pendientes = slots.filter((c): c is number => c !== null)
    let total = slots.length
    while (total - marcados.size < pendientes.length) total += cols

    const siguientes: Carril[] = Array.from({ length: total }, () => null)
    let k = 0
    for (let i = 0; i < total && k < pendientes.length; i++) {
      if (marcados.has(i)) continue
      siguientes[i] = pendientes[k++]
    }
    setSlots(siguientes)
  }

  /**
   * Alterna un carril entre ocupado y en blanco.
   *
   * Marcarlo corre las etiquetas hacia adelante respetando los que ya estaban
   * marcados. Liberarlo no reacomoda nada: el hueco queda a disposición del
   * operador, que puede arrastrar ahí la etiqueta que quiera.
   */
  function alternarCarril(i: number) {
    const marcados = new Set(bloqueados)
    if (marcados.has(i)) {
      marcados.delete(i)
      setBloqueados(marcados)
      return
    }
    marcados.add(i)
    setBloqueados(marcados)
    repartir(marcados)
  }

  function compactar() {
    repartir(bloqueados)
  }

  function reiniciar() {
    const f = Math.max(1, Math.ceil(etiquetas.length / cols))
    setSlots(Array.from({ length: f * cols }, (_, i) => (i < etiquetas.length ? i : null)))
    setBloqueados(new Set())
  }

  function soltar(j: number) {
    const i = origen
    setOrigen(null)
    setDestino(null)
    if (i === null || i === j) return
    setSlots((prev) => {
      const s = [...prev]
      const t = s[j]
      s[j] = s[i]
      s[i] = t
      return s
    })
  }

  function imprimir() {
    // Se recortan las filas finales vacías: no aportan nada y gastarían rollo.
    let ultima = -1
    for (let f = 0; f < filas; f++) {
      if (slots.slice(f * cols, (f + 1) * cols).some((c) => c !== null)) ultima = f
    }
    onImprimir(slots.slice(0, (ultima + 1) * cols), marco)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Acomodo en el rollo</DialogTitle>
          <DialogDescription>
            {etiquetas.length} etiqueta(s) · rollo de {cols} carril(es) · {filasImpresas} fila(s) de
            avance
          </DialogDescription>
        </DialogHeader>

        <p className="text-[12px] leading-snug text-muted-foreground">
          Cada fila es un avance del rollo. Haz clic en una etiqueta para{' '}
          <strong>dejar ese carril en blanco</strong> y correr las demás hacia adelante; arrastra
          para intercambiarlas. Sirve para aprovechar una tira de rollo que ya venía empezada.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={compactar}>
            <Wand2 className="h-3.5 w-3.5" />
            Compactar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={reiniciar}>
            <Eraser className="h-3.5 w-3.5" />
            Reiniciar
          </Button>
          <Button
            variant={marco ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setMarco((v) => !v)}
            title="Dibuja el contorno de cada etiqueta para comparar contra el troquel del rollo"
          >
            <SquareDashed className="h-3.5 w-3.5" />
            Marco de calibración
          </Button>
        </div>

        {/* La tira de rollo: una fila por avance, un recuadro por carril. */}
        <div className="max-h-[45vh] space-y-1.5 overflow-auto rounded-md border bg-muted/20 p-3">
          {Array.from({ length: filas }).map((_, f) => {
            const fila = slots.slice(f * cols, (f + 1) * cols)
            const vacia = fila.every((c) => c === null)
            return (
              <div key={f} className="flex items-center gap-1.5">
                <span className="w-10 shrink-0 text-right text-[10px] text-muted-foreground">
                  {vacia ? '—' : `#${f + 1}`}
                </span>
                <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                  {fila.map((valor, c) => {
                    const i = f * cols + c
                    const label = valor !== null ? etiquetas[valor] : null
                    return (
                      <div
                        key={i}
                        draggable={!!label}
                        onDragStart={(e) => {
                          if (!label) return
                          e.dataTransfer.effectAllowed = 'move'
                          setOrigen(i)
                        }}
                        onDragEnd={() => { setOrigen(null); setDestino(null) }}
                        onDragOver={(e) => {
                          if (origen === null) return
                          e.preventDefault()
                          if (destino !== i) setDestino(i)
                        }}
                        onDragLeave={() => setDestino((d) => (d === i ? null : d))}
                        onDrop={(e) => { e.preventDefault(); soltar(i) }}
                        onClick={() => alternarCarril(i)}
                        title={
                          bloqueados.has(i)
                            ? 'Carril marcado en blanco — clic para liberarlo'
                            : label
                              ? `${label.etiqueta} — clic para dejar este carril en blanco`
                              : 'Carril en blanco (se pierde al avanzar el rollo)'
                        }
                        className={[
                          'flex h-11 items-center justify-center rounded border px-1 text-center text-[10px] leading-tight',
                          label
                            ? 'cursor-grab border-border bg-background'
                            : 'border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground',
                          destino === i ? 'ring-2 ring-green-600' : '',
                          origen === i ? 'opacity-35' : '',
                        ].join(' ')}
                      >
                        {label ? (
                          <span className="line-clamp-2 break-all font-mono">{label.etiqueta}</span>
                        ) : (
                          <span>en blanco</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {desperdicio > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-[12px]">
              Van a quedar <strong>{desperdicio} etiqueta(s) del rollo en blanco</strong>. El rollo
              avanza por filas completas y no retrocede, así que esas se pierden. Si te sobran
              carriles, conviene juntar más etiquetas antes de imprimir.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={imprimir} disabled={imprimiendo || filasImpresas === 0}>
            <Printer className="mr-2 h-4 w-4" />
            {imprimiendo ? 'Enviando…' : 'Imprimir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
