import { useState } from 'react'
import { ArrowLeft, FileText, Plus, Star, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

import { EditorPlantilla } from '../components/EditorPlantilla'
import {
  useCrearPlantilla, useEliminarPlantilla, useEstablecerPredeterminada,
  useGuardarPlantilla, usePlantillaReporte, usePlantillasReporte, useTogglePlantilla,
} from '../hooks/useReportes'
import { TIPO_REPORTE_ROTULOS, type TipoReporte } from '../types.api'
import { disenoVacio, type DisenoReporte } from '../types'

export default function ReportesPage() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear   = hasPermiso('REPORTES_PLANTILLAS_CREAR')
  const puedeEditar  = hasPermiso('REPORTES_PLANTILLAS_EDITAR')
  const puedeBorrar  = hasPermiso('REPORTES_PLANTILLAS_ELIMINAR')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [dialogoNueva, setDialogoNueva] = useState(false)

  const { data: plantillas, isLoading } = usePlantillasReporte()
  const { data: enEdicion } = usePlantillaReporte(editandoId)

  const toggle = useTogglePlantilla()
  const predeterminar = useEstablecerPredeterminada()
  const eliminar = useEliminarPlantilla()
  const guardar = useGuardarPlantilla(editandoId ?? 0)

  // ── Editor abierto ────────────────────────────────────────────────────────
  if (editandoId != null) {
    const diseno = leerDiseno(enEdicion?.diseno)

    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditandoId(null)}>
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
              tipoReporte={enEdicion.tipoReporte}
              guardando={guardar.isPending}
              onGuardar={(d) => guardar.mutate({
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
      </div>
    )
  }

  // ── Listado ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        subtitle="Diseña los formatos con los que tu institución emite sus documentos."
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
              Todavía no hay plantillas. Crea una para empezar a diseñar tus reportes.
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

                {puedeEditar && (
                  <>
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
                    onClick={() => eliminar.mutate(p.id)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogoNuevaPlantilla
        abierto={dialogoNueva}
        onCerrar={() => setDialogoNueva(false)}
        onCreada={(id) => { setDialogoNueva(false); setEditandoId(id) }}
      />
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
              Determina qué datos podrás insertar. No se puede cambiar después sin
              rehacer el diseño.
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
