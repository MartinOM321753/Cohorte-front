import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  useGetConfiguracionesHorario,
  useCreateConfiguracionHorario,
  useUpdateConfiguracionHorario,
  useActivarConfiguracionHorario,
  useDeleteConfiguracionHorario,
} from '../hooks/useHorarios'
import { useAuthStore } from '@/stores/authStore'
import type { ConfiguracionHorarioResponse, ConfiguracionHorarioRequest } from '@/types/api'

const DIAS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
] as const

type DiaKey = (typeof DIAS)[number]['key']

const HORAS = Array.from({ length: 25 }, (_, i) => i)

const DEFAULT_FORM: ConfiguracionHorarioRequest = {
  nombre: '',
  horaInicio: 8,
  horaFin: 17,
  lunes: true,
  martes: true,
  miercoles: true,
  jueves: true,
  viernes: true,
  sabado: false,
  domingo: false,
}

function formatHora(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function diasActivos(config: ConfiguracionHorarioResponse): string {
  const map: [DiaKey, string][] = [
    ['lunes', 'L'],
    ['martes', 'M'],
    ['miercoles', 'Mi'],
    ['jueves', 'J'],
    ['viernes', 'V'],
    ['sabado', 'S'],
    ['domingo', 'D'],
  ]
  return map
    .filter(([key]) => config[key])
    .map(([, label]) => label)
    .join(', ')
}

export default function HorariosConfigPanel() {
  const puedeEditar = useAuthStore((s) => s.hasPermiso('CITAS_CONFIGURACION_EDITAR'))
  const { data: configuraciones = [], isLoading, isError } = useGetConfiguracionesHorario()
  const createMutation = useCreateConfiguracionHorario()
  const updateMutation = useUpdateConfiguracionHorario()
  const activarMutation = useActivarConfiguracionHorario()
  const deleteMutation = useDeleteConfiguracionHorario()

  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<ConfiguracionHorarioRequest>({ ...DEFAULT_FORM })
  const [formError, setFormError] = useState('')

  const activa = configuraciones.find((c) => c.activa)
  const inactivas = configuraciones.filter((c) => !c.activa)

  function openCreate() {
    setEditId(null)
    setForm({ ...DEFAULT_FORM })
    setFormError('')
    setOpenForm(true)
  }

  function openEdit(config: ConfiguracionHorarioResponse) {
    setEditId(config.id)
    setForm({
      nombre: config.nombre,
      horaInicio: config.horaInicio,
      horaFin: config.horaFin,
      lunes: config.lunes,
      martes: config.martes,
      miercoles: config.miercoles,
      jueves: config.jueves,
      viernes: config.viernes,
      sabado: config.sabado,
      domingo: config.domingo,
    })
    setFormError('')
    setOpenForm(true)
  }

  function handleSubmit() {
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (form.horaInicio >= form.horaFin) {
      setFormError('La hora de inicio debe ser menor a la hora de fin')
      return
    }
    const alMenosUnDia = DIAS.some((d) => form[d.key])
    if (!alMenosUnDia) {
      setFormError('Selecciona al menos un día')
      return
    }
    setFormError('')

    const onSuccess = () => {
      setOpenForm(false)
      setEditId(null)
    }
    const onError = (err: any) => {
      setFormError(err?.response?.data?.message || 'Error al guardar')
    }

    if (editId !== null) {
      updateMutation.mutate({ id: editId, dto: form }, { onSuccess, onError })
    } else {
      createMutation.mutate(form, { onSuccess, onError })
    }
  }

  function setDia(key: DiaKey, value: boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horario de Citas
            </CardTitle>
            <CardDescription>
              Configura los horarios y días disponibles para agendar citas. Solo una configuración puede estar activa.
            </CardDescription>
          </div>
          {puedeEditar && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo horario
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando configuraciones…
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No se pudieron cargar las configuraciones de horario.</AlertDescription>
            </Alert>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center">Horario</TableHead>
                <TableHead className="text-center">Días</TableHead>
                <TableHead className="w-28 text-center">Estado</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Configuración activa */}
              {activa && (
                <TableRow>
                  <TableCell className="font-medium">{activa.nombre}</TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatHora(activa.horaInicio)} – {formatHora(activa.horaFin)}
                  </TableCell>
                  <TableCell className="text-center text-sm">{diasActivos(activa)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Activa
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar && (
                      <Button variant="ghost" size="icon" onClick={() => openEdit(activa)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}

              {/* Configuraciones inactivas */}
              {inactivas.length > 0 && (
                <>
                  {activa && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30 py-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Inactivas ({inactivas.length})
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                  {inactivas.map((config) => (
                    <TableRow key={config.id} className="opacity-60">
                      <TableCell className="font-medium">{config.nombre}</TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {formatHora(config.horaInicio)} – {formatHora(config.horaFin)}
                      </TableCell>
                      <TableCell className="text-center text-sm">{diasActivos(config)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">Inactiva</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {puedeEditar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => activarMutation.mutate(config.id)}
                              disabled={activarMutation.isPending}
                              title="Activar"
                              className="text-muted-foreground hover:text-green-600"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {puedeEditar && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(config)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {puedeEditar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(config.id)}
                              disabled={deleteMutation.isPending}
                              title="Eliminar"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {configuraciones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Sin configuraciones de horario. Crea la primera para definir el horario de atención.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* ── Modal crear/editar ── */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar' : 'Nueva'} configuración de horario</DialogTitle>
            <DialogDescription>
              Define el rango de horas y los días en que se pueden agendar citas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej. Horario matutino"
                value={form.nombre}
                maxLength={100}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </div>

            {/* Rango de horas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Hora inicio</Label>
                <Select
                  value={String(form.horaInicio)}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, horaInicio: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.filter((h) => h < 24).map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {formatHora(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hora fin</Label>
                <Select
                  value={String(form.horaFin)}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, horaFin: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.filter((h) => h > 0).map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {formatHora(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Días de la semana */}
            <div className="space-y-1.5">
              <Label>Días disponibles</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                {DIAS.map((dia) => (
                  <label key={dia.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={form[dia.key]}
                      onCheckedChange={(checked) => setDia(dia.key, checked === true)}
                    />
                    {dia.label}
                  </label>
                ))}
              </div>
            </div>

            {formError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
