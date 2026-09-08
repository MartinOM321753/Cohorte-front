import { useCallback, useRef, useState } from 'react'
import {
  ArrowLeft, Copy, Download, FileText, Pencil, Plus, Star, ToggleLeft, ToggleRight, Trash2,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { useAnchoCompleto } from '@/components/layout/anchoPagina'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

import { EditorPlantilla } from '../components/EditorPlantilla'
import { ExportarDatosDialog } from '../components/ExportarDatosDialog'
import { FormulasPanel } from '../components/FormulasPanel'
import {
  useCrearPlantilla, useDuplicarPlantilla, useEliminarPlantilla,
  useEstablecerPredeterminada, useGuardarPlantilla, usePlantillaReporte,
  usePlantillasReporte, useRenombrarPlantilla, useTogglePlantilla,
} from '../hooks/useReportes'
import { TIPO_REPORTE_ROTULOS, type PlantillaReporte, type TipoReporte } from '../types.api'
import { disenoVacio, type DisenoReporte } from '../types'

export default function ReportesPage() {
  // El diseñador es un taller: lienzo, panel de propiedades, capas y datos a la vez.
  // Con el tope de 1440 px del resto de la aplicación, todo eso sale apretado.
  useAnchoCompleto()

  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear   = hasPermiso('REPORTES_PLANTILLAS_CREAR')
  const puedeEditar  = hasPermiso('REPORTES_PLANTILLAS_EDITAR')
  const puedeBorrar  = hasPermiso('REPORTES_PLANTILLAS_ELIMINAR')
  const puedeExportar = hasPermiso('REPORTES_EXPORTAR')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [dialogoNueva, setDialogoNueva] = useState(false)
  const [dialogoExportar, setDialogoExportar] = useState(false)
  const [dialogoSalir, setDialogoSalir] = useState(false)
  const [porEliminar, setPorEliminar] = useState<PlantillaReporte | null>(null)
  const [porRenombrar, setPorRenombrar] = useState<PlantillaReporte | null>(null)
  const [porDuplicar, setPorDuplicar] = useState<PlantillaReporte | null>(null)

  const [hayCambios, setHayCambios] = useState(false)
  // El diseño en curso vive en el editor; aquí solo se guarda una referencia para
  // poder guardarlo desde el aviso de salida sin subir todo su estado.
  const disenoEnCurso = useRef<DisenoReporte | null>(null)

  const registrarEstado = useCallback((cambios: boolean, d: DisenoReporte) => {
    setHayCambios(cambios)
    disenoEnCurso.current = d
  }, [])

  const { data: plantillas, isLoading } = usePlantillasReporte()
  const { data: enEdicion } = usePlantillaReporte(editandoId)

  const toggle = useTogglePlantilla()
  const predeterminar = useEstablecerPredeterminada()
  const eliminar = useEliminarPlantilla()
  const renombrar = useRenombrarPlantilla()
  const duplicar = useDuplicarPlantilla()
  const guardar = useGuardarPlantilla(editandoId ?? 0)

  function cerrarEditor() {
    setHayCambios(false)
    disenoEnCurso.current = null
    setDialogoSalir(false)
    setEditandoId(null)
  }

  function guardarDesdeElAviso() {
    if (!enEdicion || !disenoEnCurso.current) return
    guardar.mutate({
      nombre: enEdicion.nombre,
      descripcion: enEdicion.descripcion ?? undefined,
      tipoReporte: enEdicion.tipoReporte,
      diseno: JSON.stringify(disenoEnCurso.current),
    }, {
      // Solo se sale si de verdad quedó guardado. Si el guardado falla, cerrar el
      // editor perdería exactamente lo que el aviso prometía conservar.
      onSuccess: () => cerrarEditor(),
    })
  }

  // ── Editor abierto ────────────────────────────────────────────────────────
  if (editandoId != null) {
    const diseno = leerDiseno(enEdicion?.diseno)

    return (
      <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm"
                  onClick={() => (hayCambios ? setDialogoSalir(true) : cerrarEditor())}>
            <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Volver
          </Button>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{enEdicion?.nombre ?? 'Cargando…'}</div>
            {enEdicion && (
              <div className="text-[12px] text-muted-foreground">
                {TIPO_REPORTE_ROTULOS[enEdicion.tipoReporte]}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
          {enEdicion ? (
            <EditorPlantilla
              key={enEdicion.id}
              disenoInicial={diseno}
              guardando={guardar.isPending}
              onEstado={registrarEstado}
              onGuardar={(d) => guardar.mutateAsync({
                nombre: enEdicion.nombre,
                descripcion: enEdicion.descripcion ?? undefined,
                tipoReporte: enEdicion.tipoReporte,
                diseno: JSON.stringify(d),
              })}
            />
          ) : (
            <div className="p-6 text-[13px] text-muted-foreground">Cargando el diseño…</div>
          )}
        </div>

        <Dialog open={dialogoSalir} onOpenChange={setDialogoSalir}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Hay cambios sin guardar</DialogTitle>
              <DialogDescription>
                Si sale ahora, lo que lleva diseñado se pierde y no se puede recuperar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setDialogoSalir(false)}>
                Seguir editando
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={cerrarEditor}>
                  Salir sin guardar
                </Button>
                <Button type="button" disabled={guardar.isPending} onClick={guardarDesdeElAviso}>
                  {guardar.isPending ? 'Guardando…' : 'Guardar y salir'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── Listado ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        subtitle="Diseñe los formatos con los que su institución emite sus documentos."
        actions={puedeExportar ? (
          <Button type="button" variant="outline" size="sm" className="h-8"
                  onClick={() => setDialogoExportar(true)}>
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Descargar datos
          </Button>
        ) : undefined}
      />

      <div className="rounded-lg border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Plantillas
          </span>
          {puedeCrear && (
            <Button type="button" size="sm" className="h-8" onClick={() => setDialogoNueva(true)}>
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Nueva plantilla
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 text-[13px] text-muted-foreground">Cargando…</div>
        ) : !plantillas?.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">
              Todavía no hay plantillas. Cree una para empezar a diseñar sus reportes.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {plantillas.map((p) => (
              <div key={p.id} className={cn('flex items-center gap-3 px-4 py-3', !p.activo && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('truncate text-sm font-medium', !p.activo && 'line-through')}>
                      {p.nombre}
                    </span>
                    {p.predeterminada && (
                      <Badge variant="secondary" className="text-[10px]">Predeterminada</Badge>
                    )}
                    {!p.activo && (
                      <Badge variant="outline" className="text-[10px] font-normal">Fuera de uso</Badge>
                    )}
                  </div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {TIPO_REPORTE_ROTULOS[p.tipoReporte]}
                    {p.descripcion ? ` · ${p.descripcion}` : ''}
                  </div>
                </div>

                {puedeCrear && (
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    title="Duplicar para partir de este diseño"
                    onClick={() => setPorDuplicar(p)}
                  >
                    <Copy className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                )}
                {puedeEditar && (
                  <>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8"
                      title="Cambiar el nombre"
                      onClick={() => setPorRenombrar(p)}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8"
                            onClick={() => setEditandoId(p.id)}>
                      Diseñar
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8"
                      title={p.predeterminada
                        ? 'Ya es la que se ofrece primero'
                        : 'Ofrecer esta primero al emitir'}
                      disabled={p.predeterminada || !p.activo}
                      onClick={() => predeterminar.mutate(p.id)}
                    >
                      <Star className={cn('h-4 w-4', p.predeterminada && 'fill-current')} strokeWidth={1.75} />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8"
                      title={p.activo ? 'Retirar de uso' : 'Poner en uso'}
                      onClick={() => toggle.mutate(p.id)}
                    >
                      {p.activo
                        ? <ToggleRight className="h-4 w-4" strokeWidth={1.75} />
                        : <ToggleLeft className="h-4 w-4" strokeWidth={1.75} />}
                    </Button>
                  </>
                )}
                {puedeBorrar && (
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Eliminar plantilla"
                    onClick={() => setPorEliminar(p)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* El catálogo de fórmulas va aquí, junto a las plantillas, porque las arma la
          misma persona en el mismo momento: se diseña un reporte y se necesita un
          cálculo que todavía no existe. */}
      <FormulasPanel />

      <ExportarDatosDialog
        abierto={dialogoExportar}
        onCerrar={() => setDialogoExportar(false)}
      />

      <DialogoNuevaPlantilla
        abierto={dialogoNueva}
        onCerrar={() => setDialogoNueva(false)}
        onCreada={(id) => { setDialogoNueva(false); setEditandoId(id) }}
      />

      <DialogoNombre
        titulo="Cambiar el nombre"
        descripcion="El diseño no se toca; solo cambia cómo se llama y cómo se describe."
        etiquetaAccion="Guardar"
        plantilla={porRenombrar}
        nombreInicial={porRenombrar?.nombre ?? ''}
        conDescripcion
        trabajando={renombrar.isPending}
        onCerrar={() => setPorRenombrar(null)}
        onAceptar={(nombre, descripcion) => {
          if (!porRenombrar) return
          renombrar.mutate({ id: porRenombrar.id, nombre, descripcion },
                           { onSuccess: () => setPorRenombrar(null) })
        }}
      />

      <DialogoNombre
        titulo="Duplicar plantilla"
        descripcion="Se copia el diseño completo. La copia no queda como predeterminada."
        etiquetaAccion="Duplicar y diseñar"
        plantilla={porDuplicar}
        nombreInicial={porDuplicar ? `${porDuplicar.nombre} (copia)` : ''}
        trabajando={duplicar.isPending}
        onCerrar={() => setPorDuplicar(null)}
        onAceptar={(nombre) => {
          if (!porDuplicar) return
          duplicar.mutate({ id: porDuplicar.id, nombre }, {
            // Se abre la copia recién hecha: duplicar es el primer paso de
            // «quiero una parecida», no un fin en sí mismo.
            onSuccess: (copia) => { setPorDuplicar(null); setEditandoId(copia.id) },
          })
        }}
      />

      {/* Borrar una plantilla no tiene vuelta atrás: el diseño no se guarda en
          ningún otro sitio. Antes bastaba un clic en el icono para perderlo. */}
      <Dialog open={porEliminar != null} onOpenChange={(a) => !a && setPorEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar «{porEliminar?.nombre}»</DialogTitle>
            <DialogDescription>
              Se borra el diseño completo y no se puede recuperar. Los reportes ya
              emitidos con ella no cambian.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPorEliminar(null)}>
              Cancelar
            </Button>
            <Button
              type="button" variant="destructive" disabled={eliminar.isPending}
              onClick={() => {
                const id = porEliminar?.id
                if (id == null) return
                eliminar.mutate(id, { onSuccess: () => setPorEliminar(null) })
              }}
            >
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DialogoNuevaPlantilla({ abierto, onCerrar, onCreada }: {
  abierto: boolean; onCerrar: () => void; onCreada: (id: number) => void
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoReporte>('ESTUDIO')
  const crear = useCrearPlantilla()

  function crearla() {
    if (!nombre.trim()) return
    crear.mutate(
      { nombre: nombre.trim(), tipoReporte: tipo, diseno: JSON.stringify(disenoVacio()) },
      {
        onSuccess: (creada) => {
          setNombre('')
          // Se entra directo a diseñar: una plantilla recién creada está en
          // blanco y no hay nada que hacer con ella desde el listado.
          onCreada(creada.id)
        },
      },
    )
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="@container sm:max-w-md">
        <DialogHeader><DialogTitle>Nueva plantilla</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Nombre</Label>
            <Input className="h-9" value={nombre} placeholder="Formato institucional 2026"
                   onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Sobre qué se emite</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoReporte)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_REPORTE_ROTULOS).map(([clave, rotulo]) => (
                  <SelectItem key={clave} value={clave}>{rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Solo sirve para organizar el catálogo. Los datos se eligen dentro del
              editor, y una misma hoja puede combinar varios estudios.
            </p>
          </div>

        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="button" disabled={!nombre.trim() || crear.isPending} onClick={crearla}>
            {crear.isPending ? 'Creando…' : 'Crear y diseñar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Lee el diseño guardado. Si viene vacío o ilegible se empieza en blanco en vez
 * de romper la pantalla: una plantilla con el JSON dañado debe poder rescatarse
 * rediseñándola, no dejar al usuario ante un error del que no puede salir.
 */
/**
 * Pide un nombre. Sirve para renombrar y para duplicar, que solo se diferencian en
 * los rótulos y en si hay descripción.
 *
 * <p>El estado del formulario se reinicia con `key` en quien lo usa, no con un
 * efecto: montar de nuevo es lo que garantiza que el campo llegue con el nombre de
 * la plantilla que se acaba de elegir y no con el de la anterior.</p>
 */
function DialogoNombre({
  titulo, descripcion, etiquetaAccion, plantilla, nombreInicial, conDescripcion,
  trabajando, onCerrar, onAceptar,
}: {
  titulo: string
  descripcion: string
  etiquetaAccion: string
  plantilla: PlantillaReporte | null
  nombreInicial: string
  conDescripcion?: boolean
  trabajando: boolean
  onCerrar: () => void
  onAceptar: (nombre: string, descripcion?: string) => void
}) {
  return (
    <Dialog open={plantilla != null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {plantilla && (
          <FormularioNombre
            key={`${titulo}-${plantilla.id}`}
            titulo={titulo}
            descripcion={descripcion}
            etiquetaAccion={etiquetaAccion}
            nombreInicial={nombreInicial}
            descripcionInicial={conDescripcion ? plantilla.descripcion ?? '' : undefined}
            trabajando={trabajando}
            onCancelar={onCerrar}
            onAceptar={onAceptar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormularioNombre({
  titulo, descripcion, etiquetaAccion, nombreInicial, descripcionInicial,
  trabajando, onCancelar, onAceptar,
}: {
  titulo: string
  descripcion: string
  etiquetaAccion: string
  nombreInicial: string
  descripcionInicial?: string
  trabajando: boolean
  onCancelar: () => void
  onAceptar: (nombre: string, descripcion?: string) => void
}) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [desc, setDesc] = useState(descripcionInicial ?? '')

  const vacio = nombre.trim().length === 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (vacio || trabajando) return
        onAceptar(nombre.trim(), descripcionInicial === undefined ? undefined : desc.trim())
      }}
    >
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-4">
        <div className="space-y-1">
          <Label className="text-[12px]">Nombre</Label>
          <Input autoFocus maxLength={120} value={nombre}
                 onChange={(e) => setNombre(e.target.value)} />
        </div>
        {descripcionInicial !== undefined && (
          <div className="space-y-1">
            <Label className="text-[12px]">Descripción</Label>
            <Input maxLength={500} value={desc}
                   placeholder="Para qué sirve esta plantilla"
                   onChange={(e) => setDesc(e.target.value)} />
          </div>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" disabled={vacio || trabajando}>
          {trabajando ? 'Un momento…' : etiquetaAccion}
        </Button>
      </DialogFooter>
    </form>
  )
}

function leerDiseno(json: string | null | undefined): DisenoReporte {
  if (!json) return disenoVacio()
  try {
    const leido = JSON.parse(json) as DisenoReporte
    if (!leido?.paginas?.length) return disenoVacio()
    return leido
  } catch {
    return disenoVacio()
  }
}
