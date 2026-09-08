import { useRef, useState } from 'react'
import { Check, ImageOff, Trash2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

import { urlDeImagen } from '../api/imagenes.api'
import {
  useEliminarImagen, useImagenesReporte, useSubirImagenes,
} from '../hooks/useImagenesReporte'
import type { ImagenReporte } from '../types.api'

/** Lo que el servidor acepta. Repetirlo aquí evita un viaje para que lo rechace. */
const TIPOS = ['image/png', 'image/jpeg']
const MAX_BYTES = 2 * 1024 * 1024
const ANCHO_RECOMENDADO = 2000

/**
 * Cuántas se admiten de una tanda.
 *
 * No es una limitación técnica sino un freno ante el resbalón de seleccionar una
 * carpeta entera: cada archivo es una petición, y doscientas seguidas dejarían el
 * diálogo bloqueado un buen rato sin que nadie lo hubiera pretendido.
 */
const MAX_POR_TANDA = 20

interface Props {
  abierto: boolean
  /** La que está puesta ahora en el elemento, para marcarla. */
  claveActual?: string
  onCerrar: () => void
  onElegir: (imagen: ImagenReporte) => void
}

/**
 * La galería de imágenes de la institución: logos, sellos, membretes.
 *
 * <p>Se sube una vez y sirve para todas las plantillas. Lo que se guarda en el diseño
 * es la referencia —`imagen:{id}`—, no los bytes ni una dirección: el mismo diseño
 * funciona en local, en pruebas y en producción, y cambiar el escudo institucional no
 * obliga a abrir las diez plantillas que lo llevan.</p>
 */
export function GaleriaImagenes({ abierto, claveActual, onCerrar, onElegir }: Props) {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeSubir = hasPermiso('REPORTES_PLANTILLAS_EDITAR')
  const puedeBorrar = hasPermiso('REPORTES_PLANTILLAS_ELIMINAR')

  const { data: imagenes, isLoading } = useImagenesReporte()
  const subir = useSubirImagenes()
  const eliminar = useEliminarImagen()

  const entrada = useRef<HTMLInputElement>(null)
  /** Los archivos que ni se intentan, con el porqué de cada uno. */
  const [descartados, setDescartados] = useState<string[]>([])
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null)
  const [porBorrar, setPorBorrar] = useState<ImagenReporte | null>(null)
  /** Hay algo arrastrado sobre la zona de subida. Solo para resaltarla. */
  const [encima, setEncima] = useState(false)

  /**
   * Reparte los archivos elegidos entre los que se suben y los que no.
   *
   * <p>Se revisan todos antes de mandar ninguno, y los que no valen se apartan en
   * vez de cancelar la tanda: al elegir ocho logos de una carpeta, que uno sea un
   * PDF no es motivo para no subir los otros siete.</p>
   */
  function alElegirArchivos(lista: FileList | null) {
    const elegidos = Array.from(lista ?? [])
    if (elegidos.length === 0) return

    const motivos: string[] = []
    let candidatos = elegidos.filter((a) => {
      if (!TIPOS.includes(a.type)) {
        motivos.push(`«${a.name}» no es PNG ni JPEG.`)
        return false
      }
      if (a.size > MAX_BYTES) {
        motivos.push(`«${a.name}» pesa ${(a.size / 1024 / 1024).toFixed(1)} MB; el máximo son 2 MB.`)
        return false
      }
      return true
    })

    if (candidatos.length > MAX_POR_TANDA) {
      motivos.push(`Solo se suben ${MAX_POR_TANDA} a la vez; el resto quedó fuera.`)
      candidatos = candidatos.slice(0, MAX_POR_TANDA)
    }

    setDescartados(motivos)
    if (candidatos.length === 0) return

    setProgreso({ hechas: 0, total: candidatos.length })
    subir.mutate(
      { archivos: candidatos, onProgreso: (hechas, total) => setProgreso({ hechas, total }) },
      { onSettled: () => setProgreso(null) },
    )
  }

  return (
    <>
      <Dialog
        open={abierto}
        onOpenChange={(a) => {
          if (a) return
          // Los avisos de la tanda anterior no tienen por qué recibir a quien
          // vuelve a abrir la galería un rato después.
          setDescartados([])
          setEncima(false)
          onCerrar()
        }}
      >
        <DialogContent className="@container w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Imágenes de la institución</DialogTitle>
            <DialogDescription>
              Se suben una vez y sirven para todas las plantillas. PNG o JPEG, hasta 2 MB.
            </DialogDescription>
          </DialogHeader>

          {puedeSubir && (
            <div>
              <input
                ref={entrada}
                type="file"
                accept="image/png,image/jpeg"
                multiple
                className="hidden"
                onChange={(e) => {
                  alElegirArchivos(e.target.files)
                  // Se limpia para que volver a elegir los mismos archivos cuente
                  // como un cambio; sin esto, reintentar tras un error no dispara nada.
                  e.target.value = ''
                }}
              />

              {/* Se puede soltar el archivo encima o pulsar el botón. Arrastrar es
                  lo que hace la mayoría cuando el logo ya está a la vista en una
                  carpeta, y antes había que pasar por el diálogo del sistema. */}
              <div
                onDragOver={(e) => { e.preventDefault(); setEncima(true) }}
                onDragEnter={(e) => { e.preventDefault(); setEncima(true) }}
                onDragLeave={(e) => {
                  // Solo cuando se sale de la zona entera: al pasar de un hijo a
                  // otro también llega un dragleave, y el recuadro parpadeaba.
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                  setEncima(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setEncima(false)
                  alElegirArchivos(e.dataTransfer.files)
                }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-4 text-center transition-colors',
                  encima
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] bg-[var(--muted)]/30',
                )}
              >
                <Button
                  type="button" variant="outline" size="sm"
                  disabled={subir.isPending}
                  onClick={() => entrada.current?.click()}
                >
                  <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  {progreso
                    ? `Subiendo ${Math.min(progreso.hechas + 1, progreso.total)} de ${progreso.total}…`
                    : 'Subir imágenes'}
                </Button>
                <p className="text-[11.5px] leading-tight text-muted-foreground">
                  {encima
                    ? 'Suelte aquí para cargarlas'
                    : 'O arrastre los archivos hasta aquí'}
                </p>
              </div>

              {progreso && progreso.total > 1 && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full bg-[var(--primary)] transition-[width] duration-200"
                    style={{ width: `${(progreso.hechas / progreso.total) * 100}%` }}
                  />
                </div>
              )}

              {descartados.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {descartados.map((motivo) => (
                    <li key={motivo} className="text-[12px] leading-tight text-destructive">
                      {motivo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="max-h-[55vh] overflow-auto">
            {isLoading ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">Cargando…</p>
            ) : !imagenes?.length ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ImageOff className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[13px] text-muted-foreground">
                  Todavía no hay imágenes. Sube el logo o el membrete para empezar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagenes.map((img) => {
                  const puesta = claveActual === img.clave
                  const enorme = (img.anchoPx ?? 0) > ANCHO_RECOMENDADO
                  return (
                    <div
                      key={img.id}
                      className={cn('group relative overflow-hidden rounded-lg border',
                                    puesta && 'ring-2 ring-[var(--ring)]')}
                    >
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => { onElegir(img); onCerrar() }}
                      >
                        {/* Fondo a cuadros: un logo con transparencia sobre blanco
                            liso parece recortado, y sobre oscuro desaparece. */}
                        <div
                          className="flex h-28 items-center justify-center p-2"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg,#e9edf0 25%,transparent 25%),' +
                              'linear-gradient(-45deg,#e9edf0 25%,transparent 25%),' +
                              'linear-gradient(45deg,transparent 75%,#e9edf0 75%),' +
                              'linear-gradient(-45deg,transparent 75%,#e9edf0 75%)',
                            backgroundSize: '12px 12px',
                            backgroundPosition: '0 0,0 6px,6px -6px,-6px 0',
                            backgroundColor: '#f7f9fa',
                          }}
                        >
                          <img
                            src={urlDeImagen(img.id)}
                            alt={img.nombre}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="border-t px-2 py-1.5 text-left">
                          <div className="truncate text-[12px]">{img.nombre}</div>
                          <div className="text-[10.5px] text-muted-foreground">
                            {img.anchoPx && img.altoPx ? `${img.anchoPx}×${img.altoPx} · ` : ''}
                            {(img.bytes / 1024).toFixed(0)} KB
                          </div>
                          {enorme && (
                            <div className="text-[10.5px] leading-tight text-amber-600">
                              Muy grande: en una hoja carta no se verá mejor y engorda el PDF
                            </div>
                          )}
                        </div>
                      </button>

                      {puesta && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--primary)] p-1 text-[var(--primary-foreground)]">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                      )}

                      {puedeBorrar && (
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="absolute right-1 top-1 h-7 w-7 bg-background/85 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          title="Eliminar del catálogo"
                          onClick={(e) => { e.stopPropagation(); setPorBorrar(img) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={porBorrar != null} onOpenChange={(a) => !a && setPorBorrar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar «{porBorrar?.nombre}»</DialogTitle>
            <DialogDescription>
              Se borra del catálogo y no se puede recuperar. Si alguna plantilla la usa,
              el servidor rechazará el borrado y te dirá cuáles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPorBorrar(null)}>
              Cancelar
            </Button>
            <Button
              type="button" variant="destructive" disabled={eliminar.isPending}
              onClick={() => {
                if (!porBorrar) return
                eliminar.mutate(porBorrar.id, { onSuccess: () => setPorBorrar(null) })
              }}
            >
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
