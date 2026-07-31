import { useState } from 'react'
import {
  Plus, Edit, Trash2, ChevronDown, ChevronRight,
  FlaskConical, Thermometer, CheckCircle2, XCircle, TestTube,
  Check, ChevronsUpDown
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useGetTiposMuestra,
  useCreateTipoMuestra,
  useUpdateTipoMuestra,
  useToggleTipoMuestra,
  useAddTuboMuestra,
  useUpdateTuboMuestra,
  useDeleteTuboMuestra,
  useGetAlmacenes,
} from '../hooks/useBiobanco'
import { TipoMuestra, TuboMuestra } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command'
import { UnidadSelect } from '@/components/forms/UnidadSelect'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Formulario TipoMuestra ─────────────────────────────────────────────────────

interface TipoMuestraFormProps {
  initial?: TipoMuestra | null
  onSave: (data: { nombre: string; descripcion: string; temperaturaAlmacenamiento: string }) => void
  onCancel: () => void
  loading: boolean
}

function TipoMuestraForm({ initial, onSave, onCancel, loading }: TipoMuestraFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [temperatura, setTemperatura] = useState(initial?.temperaturaAlmacenamiento ?? '')

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nombre <span className="text-destructive">*</span></Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Suero, EDTA, Heces, Orina"
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción del tipo de muestra (opcional)"
          rows={2}
          maxLength={500}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Temperatura de almacenamiento</Label>
        <Input
          value={temperatura}
          onChange={(e) => setTemperatura(e.target.value)}
          placeholder="Ej: -80°C, 4°C, Ambiente"
          maxLength={30}
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={loading || !nombre.trim()}
          onClick={() => onSave({ nombre: nombre.trim(), descripcion: descripcion.trim(), temperaturaAlmacenamiento: temperatura.trim() })}
        >
          {loading ? 'Guardando...' : initial ? 'Actualizar' : 'Crear tipo'}
        </Button>
      </div>
    </div>
  )
}

// ── Formulario TuboMuestra ─────────────────────────────────────────────────────

interface TuboFormProps {
  initial?: TuboMuestra | null
  onSave: (data: {
    nombre: string; prefijoCodigo: string; numeroAlicuotas: number;
    volumenAlicuota: number | undefined; unidadVolumen: string; destinoSugerido: string
  }) => void
  onCancel: () => void
  loading: boolean
}

function TuboForm({ initial, onSave, onCancel, loading }: TuboFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [prefijo, setPrefijo] = useState(initial?.prefijoCodigo ?? '')
  const [numAlicuotas, setNumAlicuotas] = useState(String(initial?.numeroAlicuotas ?? '0'))
  const [volumen, setVolumen] = useState(initial?.volumenAlicuota != null ? String(initial.volumenAlicuota) : '')
  const [unidad, setUnidad] = useState(initial?.unidadVolumen ?? '')
  const [destino, setDestino] = useState(initial?.destinoSugerido ?? '')
  const [openDestino, setOpenDestino] = useState(false)

  const { data: almacenes = [] } = useGetAlmacenes()
  const almacenesActivos = almacenes.filter((a) => a.activo)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nombre <span className="text-destructive">*</span></Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Suero T1" maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label>Prefijo código</Label>
          <Input value={prefijo} onChange={(e) => setPrefijo(e.target.value)} placeholder="Ej: S, EDTA, H" maxLength={20} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nº alícuotas</Label>
          <Input
            type="number"
            min={0}
            value={numAlicuotas}
            onChange={(e) => setNumAlicuotas(e.target.value)}
            placeholder="0 = directo"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Volumen alícuota</Label>
          <Input type="number" min={0} step="0.01" value={volumen} onChange={(e) => setVolumen(e.target.value)} placeholder="Ej: 1.5" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Unidad</Label>
        <UnidadSelect
          value={unidad}
          onChange={setUnidad}
          placeholder="Selecciona unidad..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Destino sugerido</Label>
        <Popover open={openDestino} onOpenChange={setOpenDestino} modal>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className={cn(
                'w-full justify-between font-normal h-9 text-sm',
                !destino && 'text-muted-foreground',
              )}
            >
              <span className="truncate">{destino || 'Selecciona institución destino...'}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar institución..." className="h-9" />
              <CommandList>
                <CommandEmpty>No se encontraron instituciones</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__ninguno__"
                    onSelect={() => { setDestino(''); setOpenDestino(false) }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !destino ? 'opacity-100' : 'opacity-0')} />
                    <span className="text-muted-foreground italic">Sin destino específico</span>
                  </CommandItem>
                  {almacenesActivos.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={a.nombre}
                      onSelect={() => { setDestino(a.nombre); setOpenDestino(false) }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', destino === a.nombre ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col min-w-0">
                        <span>{a.nombre}</span>
                        <span className="text-xs text-muted-foreground">{a.ciudad}, {a.estado}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {destino && (
          <button
            type="button"
            onClick={() => setDestino('')}
            className="text-xs text-muted-foreground hover:text-destructive underline"
          >
            Quitar destino
          </button>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button
          size="sm"
          disabled={loading || !nombre.trim()}
          onClick={() =>
            onSave({
              nombre: nombre.trim(),
              prefijoCodigo: prefijo.trim(),
              numeroAlicuotas: parseInt(numAlicuotas) || 0,
              volumenAlicuota: volumen !== '' ? parseFloat(volumen) : undefined,
              unidadVolumen: unidad.trim(),
              destinoSugerido: destino.trim(),
            })
          }
        >
          {loading ? 'Guardando...' : initial ? 'Actualizar tubo' : 'Agregar tubo'}
        </Button>
      </div>
    </div>
  )
}

// ── Row TuboMuestra (editable inline) ─────────────────────────────────────────

interface TuboRowProps {
  tubo: TuboMuestra
  onDelete: (id: number) => void
  deletePending: boolean
  puedeEditar: boolean
}

function TuboRow({ tubo, onDelete, deletePending, puedeEditar }: TuboRowProps) {
  const updateMutation = useUpdateTuboMuestra()
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between gap-2 rounded-md border border-dashed px-3 py-2 bg-muted/30 text-sm">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <TestTube className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{tubo.nombre}</span>
            {tubo.prefijoCodigo && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tubo.prefijoCodigo}</Badge>
            )}
            {!tubo.activo && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactivo</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground pl-5">
            {tubo.numeroAlicuotas === 0
              ? 'Sin alicuotar (tubo directo)'
              : `${tubo.numeroAlicuotas} alícuota${tubo.numeroAlicuotas !== 1 ? 's' : ''}`}
            {tubo.volumenAlicuota != null && ` · ${tubo.volumenAlicuota} ${tubo.unidadVolumen ?? ''}`}
            {tubo.destinoSugerido && ` · → ${tubo.destinoSugerido}`}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  disabled={deletePending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar tubo "{tubo.nombre}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Solo puede eliminarse un tubo que todavía no tenga muestras ni alícuotas registradas.
                  Si ya las tiene, la operación será rechazada y el tubo se conservará. Esta acción no se puede deshacer.
                </AlertDialogDescription>
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

// ── Card TipoMuestra expandible ────────────────────────────────────────────────

interface TipoCardProps {
  tipo: TipoMuestra
  puedeEditar: boolean
}

function TipoCard({ tipo, puedeEditar }: TipoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addTuboOpen, setAddTuboOpen] = useState(false)

  const updateMutation = useUpdateTipoMuestra()
  const toggleMutation = useToggleTipoMuestra()
  const addTuboMutation = useAddTuboMuestra()
  const deleteTuboMutation = useDeleteTuboMuestra()

  return (
    <Card className={`${!tipo.activo ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-left flex-1 min-w-0"
          >
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            }
            <FlaskConical className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{tipo.nombre}</CardTitle>
              {tipo.temperaturaAlmacenamiento && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Thermometer className="h-3 w-3" />
                  {tipo.temperaturaAlmacenamiento}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={tipo.activo ? 'default' : 'secondary'} className="text-xs">
              {tipo.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {tipo.tubos.length} tubo{tipo.tubos.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* Acciones */}
      {puedeEditar && (
      <div className="flex items-center gap-1.5 px-6 pb-3">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditOpen(true)}>
          <Edit className="h-3 w-3" /> Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={!tipo.activo}
          onClick={() => setAddTuboOpen(true)}
        >
          <Plus className="h-3 w-3" /> Tubo
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-7 text-xs gap-1 ${tipo.activo
                ? 'text-destructive border-destructive/30 hover:bg-destructive/5'
                : 'text-green-700 border-green-300 hover:bg-green-50'}`}
              disabled={toggleMutation.isPending}
            >
              {tipo.activo
                ? <><XCircle className="h-3 w-3" /> Desactivar</>
                : <><CheckCircle2 className="h-3 w-3" /> Activar</>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tipo.activo ? '¿Desactivar' : '¿Activar'} tipo "{tipo.nombre}"?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tipo.activo
                  ? 'El tipo no estará disponible para nuevas muestras.'
                  : 'El tipo volverá a estar disponible para nuevas muestras.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => toggleMutation.mutate(tipo.id)}
                className={tipo.activo
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-green-600 text-white hover:bg-green-700'}
              >
                {tipo.activo ? 'Desactivar' : 'Activar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      )}

      {/* Panel expandido — tubos */}
      {expanded && (
        <CardContent className="pt-0 border-t space-y-2">
          {tipo.descripcion && (
            <p className="text-xs text-muted-foreground py-1">{tipo.descripcion}</p>
          )}
          {tipo.tubos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Sin tubos configurados · Haz clic en "+ Tubo" para agregar
            </p>
          ) : (
            <div className="space-y-1.5">
              {tipo.tubos.map((tubo) => (
                <TuboRow
                  key={tubo.id}
                  tubo={tubo}
                  onDelete={(id) => deleteTuboMutation.mutate(id)}
                  deletePending={deleteTuboMutation.isPending}
                  puedeEditar={puedeEditar}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}

      {/* Diálogo editar tipo */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tipo de muestra</DialogTitle>
          </DialogHeader>
          <TipoMuestraForm
            initial={tipo}
            loading={updateMutation.isPending}
            onCancel={() => setEditOpen(false)}
            onSave={async (data) => {
              await updateMutation.mutateAsync({ id: tipo.id, data })
              setEditOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo agregar tubo */}
      <Dialog open={addTuboOpen} onOpenChange={setAddTuboOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar tubo a "{tipo.nombre}"</DialogTitle>
          </DialogHeader>
          <TuboForm
            loading={addTuboMutation.isPending}
            onCancel={() => setAddTuboOpen(false)}
            onSave={async (data) => {
              await addTuboMutation.mutateAsync({ idTipo: tipo.id, data: { ...data, activo: true } })
              setAddTuboOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function TipoMuestraAdminTab() {
  const [createOpen, setCreateOpen] = useState(false)
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('TIPOS_MUESTRA_CREAR')
  const puedeEditar = hasPermiso('TIPOS_MUESTRA_EDITAR')
  const { data: tipos = [], isLoading } = useGetTiposMuestra()
  const createMutation = useCreateTipoMuestra()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tipos de Muestra</h2>
          <p className="text-muted-foreground">
            Configura los tipos de muestra y la cantidad de tubos/alícuotas que genera cada uno
          </p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Tipo
          </Button>
        )}
      </div>

      <Alert>
        <FlaskConical className="h-4 w-4" />
        <AlertDescription>
          Cada tipo de muestra puede tener múltiples tubos. Por cada tubo configuras cuántas alícuotas
          se generan (0 = tubo directo, sin alicuotar) y el volumen por alícuota.
          Expande una card para ver y gestionar sus tubos.
        </AlertDescription>
      </Alert>

      {/* Lista */}
      {tipos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin tipos de muestra configurados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea el primer tipo de muestra para empezar a organizar el biobanco.
            </p>
            {puedeCrear && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primer tipo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tipos.map((tipo) => (
            <TipoCard key={tipo.id} tipo={tipo} puedeEditar={puedeEditar} />
          ))}
        </div>
      )}

      {/* Diálogo crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo tipo de muestra</DialogTitle>
          </DialogHeader>
          <TipoMuestraForm
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
