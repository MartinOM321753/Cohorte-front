import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Check, ChevronsUpDown, FlaskConical, Info, MapPin, TestTube, X } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useCreateMuestra, useUpdateMuestra, useGetMuestraById, useGetTiposMuestraActivos } from '../hooks/useBiobanco'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'
import { useAuthStore } from '@/stores/authStore'
import { MuestraDetalleDTO, Paciente } from '@/types/api'
import { SeleccionPosicionCajaModal } from './SeleccionPosicionCajaModal'
import { UnidadSelect } from '@/components/forms/UnidadSelect'

const muestraSchema = z.object({
  etiqueta: z.string().trim().min(1, 'La etiqueta es obligatoria').max(50, 'Máximo 50 caracteres'),
  valor: z.number().min(0, 'El valor debe ser positivo'),
  unidad: z.string().min(1, 'La unidad es obligatoria'),
  fechaRecoleccion: z.string().min(1, 'La fecha es obligatoria'),
  observaciones: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  pacienteUUID: z.string().min(1, 'El paciente es obligatorio'),
  usuarioRecolectaUUID: z.string().min(1, 'El recolector es obligatorio'),
  idPosicionCaja: z.number().min(1, 'Debe seleccionar una posición'),
})

type MuestraFormData = z.infer<typeof muestraSchema>

interface MuestraFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra?: MuestraDetalleDTO | null
}

const toLocalDateTimeInput = (date: Date): string => {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

export function MuestraFormModal({ open, onOpenChange, muestra }: MuestraFormModalProps) {
  const isEditing = !!muestra
  const [openPaciente, setOpenPaciente] = useState(false)
  const [showPosicionModal, setShowPosicionModal] = useState(false)
  const [posicionLabel, setPosicionLabel] = useState<string>('')

  // Stream C — TipoMuestra / TuboMuestra selection
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null)
  const [selectedTuboId, setSelectedTuboId] = useState<number | null>(null)

  const user = useAuthStore((state) => state.user)
  const { data: tiposMuestra = [] } = useGetTiposMuestraActivos()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MuestraFormData>({
    resolver: zodResolver(muestraSchema),
    defaultValues: {
      etiqueta: '',
      valor: 0,
      unidad: '',
      fechaRecoleccion: toLocalDateTimeInput(new Date()),
      observaciones: '',
      pacienteUUID: '',
      usuarioRecolectaUUID: '',
      idPosicionCaja: 0,
    },
  })

  const createMuestraMutation = useCreateMuestra()
  const updateMuestraMutation = useUpdateMuestra()

  const { data: pacientesRaw } = useGetPacientes({ activos: true }, { enabled: open })
  const pacientes = Array.isArray(pacientesRaw)
    ? pacientesRaw
    : (pacientesRaw as any)?.data ?? []

  const { data: freshMuestra } = useGetMuestraById(open && isEditing ? muestra!.id : 0)

  const getPacienteUUID = (p: Paciente): string =>
    p.UUID || (p as unknown as { uuid?: string }).uuid || ''

  const buildDefaultValues = (): MuestraFormData => ({
    etiqueta: '',
    valor: 0,
    unidad: '',
    fechaRecoleccion: toLocalDateTimeInput(new Date()),
    observaciones: '',
    pacienteUUID: '',
    usuarioRecolectaUUID: user?.uuid || '',
    idPosicionCaja: 0,
  })

  useEffect(() => {
    if (open && user?.uuid) {
      setValue('usuarioRecolectaUUID', user.uuid)
    }
  }, [open, user, setValue])

  useEffect(() => {
    if (open && freshMuestra) {
      const u = freshMuestra.ubicacion
      reset({
        etiqueta: freshMuestra.etiqueta,
        valor: freshMuestra.valor,
        unidad: freshMuestra.unidad,
        fechaRecoleccion: toLocalDateTimeInput(new Date(freshMuestra.fechaRecoleccion)),
        observaciones: freshMuestra.observaciones || '',
        pacienteUUID: freshMuestra.paciente.uuid,
        usuarioRecolectaUUID: freshMuestra.usuarioRecolecta.uuid,
        idPosicionCaja: u?.idPosicionCaja ?? 0,
      })
      if (u) {
        setPosicionLabel(`${u.codigoCaja} — F${u.fila} C${u.columna} (Piso ${u.numeroPiso}, ${u.codigoRefrigerador})`)
      } else {
        setPosicionLabel('')
      }
      // Stream C — restaurar tipo/tubo
      setSelectedTipoId(freshMuestra.tipoMuestra?.id ?? null)
      setSelectedTuboId(freshMuestra.tuboMuestra?.id ?? null)
    } else if (open && muestra) {
      const u = muestra.ubicacion
      reset({
        etiqueta: muestra.etiqueta,
        valor: muestra.valor,
        unidad: muestra.unidad,
        fechaRecoleccion: toLocalDateTimeInput(new Date(muestra.fechaRecoleccion)),
        observaciones: muestra.observaciones || '',
        pacienteUUID: muestra.paciente.uuid,
        usuarioRecolectaUUID: muestra.usuarioRecolecta.uuid,
        idPosicionCaja: u?.idPosicionCaja ?? 0,
      })
      if (u) {
        setPosicionLabel(`${u.codigoCaja} — F${u.fila} C${u.columna} (Piso ${u.numeroPiso}, ${u.codigoRefrigerador})`)
      } else {
        setPosicionLabel('')
      }
      // Stream C — restaurar tipo/tubo
      setSelectedTipoId(muestra.tipoMuestra?.id ?? null)
      setSelectedTuboId(muestra.tuboMuestra?.id ?? null)
    } else if (open) {
      reset(buildDefaultValues())
      setPosicionLabel('')
      setSelectedTipoId(null)
      setSelectedTuboId(null)
    } else {
      const timer = setTimeout(() => {
        reset(buildDefaultValues())
        setPosicionLabel('')
        setSelectedTipoId(null)
        setSelectedTuboId(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [open, freshMuestra, muestra, reset, user])

  const onSubmit = async (data: MuestraFormData) => {
    try {
      const payload = {
        ...data,
        idTipoMuestra: selectedTipoId ?? undefined,
        idTuboMuestra: selectedTuboId ?? undefined,
      }
      if (isEditing && muestra) {
        await updateMuestraMutation.mutateAsync({ id: muestra.id, data: payload })
      } else {
        await createMuestraMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (error) { }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPosicionLabel('')
      setOpenPaciente(false)
      setShowPosicionModal(false)
      setSelectedTipoId(null)
      setSelectedTuboId(null)
    }
    onOpenChange(newOpen)
  }

  // Tubos del tipo seleccionado
  const selectedTipo = tiposMuestra.find((t) => t.id === selectedTipoId) ?? null
  const tubosDisponibles = selectedTipo?.tubos.filter((tb) => tb.activo) ?? []

  const watchedUnidad = watch('unidad')
  const watchedPacienteUUID = watch('pacienteUUID')
  const watchedFechaRecoleccion = watch('fechaRecoleccion')

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-140 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Muestra Biológica' : 'Registrar Nueva Muestra'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos de la muestra biológica.'
                : 'Registra una nueva muestra y asígnala a una posición disponible en una caja.'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="etiqueta">Etiqueta *</Label>
                <Input
                  id="etiqueta"
                  {...register('etiqueta')}
                  sanitize="folio"
                  placeholder="M-2024-0001-SANGRE"
                  disabled={isEditing}
                />
                {errors.etiqueta && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.etiqueta.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaRecoleccion">Fecha de Recolección *</Label>
                <input id="fechaRecoleccion" type="hidden" {...register('fechaRecoleccion')} />
                <DateTimePicker
                  value={watchedFechaRecoleccion}
                  onChange={(v) => setValue('fechaRecoleccion', v)}
                  maxDateTime={new Date()}
                />
                {errors.fechaRecoleccion && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.fechaRecoleccion.message}
                  </p>
                )}
              </div>
            </div>

            {/* Tipo de muestra (opcional) ────────────────────────────────── */}
            {tiposMuestra.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                    Tipo de muestra
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Select
                    value={selectedTipoId != null ? String(selectedTipoId) : '__none__'}
                    onValueChange={(v) => {
                      const id = v === '__none__' ? null : parseInt(v)
                      setSelectedTipoId(id)
                      setSelectedTuboId(null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin tipo específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin tipo específico</SelectItem>
                      {tiposMuestra.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre}
                          {t.temperaturaAlmacenamiento && (
                            <span className="text-muted-foreground ml-1 text-xs">· {t.temperaturaAlmacenamiento}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Árbol de tubos del tipo seleccionado ─────────────────── */}
                {selectedTipo && (
                  <div className="rounded-md border border-dashed p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <TestTube className="h-3.5 w-3.5" />
                      Tubos configurados para "{selectedTipo.nombre}"
                    </p>
                    {tubosDisponibles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin tubos activos configurados</p>
                    ) : (
                      <div className="space-y-1.5">
                        {tubosDisponibles.map((tb) => {
                          const isSelected = selectedTuboId === tb.id
                          return (
                            <button
                              key={tb.id}
                              type="button"
                              onClick={() => setSelectedTuboId(isSelected ? null : tb.id)}
                              className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-transparent bg-muted/30 hover:bg-muted/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {isSelected
                                    ? <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                    : <div className="h-3.5 w-3.5 shrink-0" />
                                  }
                                  <span className="font-medium">{tb.nombre}</span>
                                  {tb.prefijoCodigo && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tb.prefijoCodigo}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {tb.numeroAlicuotas === 0 ? (
                                    <span className="italic">Tubo directo</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      → {tb.numeroAlicuotas} alícuota{tb.numeroAlicuotas !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {tb.volumenAlicuota != null && (
                                    <span>{tb.volumenAlicuota} {tb.unidadVolumen ?? ''}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Aviso de generación automática ──────────────────── */}
                    {selectedTuboId != null && (() => {
                      const tubo = tubosDisponibles.find(tb => tb.id === selectedTuboId)
                      if (!tubo || tubo.numeroAlicuotas === 0) return null
                      return (
                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 mt-2">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Al registrar se crearán automáticamente <strong>{tubo.numeroAlicuotas} alícuotas</strong> hija
                            con el prefijo <strong>{tubo.prefijoCodigo || 'A'}</strong>.
                            Podrás asignarles su posición en caja desde la lista de muestras.
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('valor', { valueAsNumber: true })}
                  placeholder="5.5"
                />
                {errors.valor && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                    {errors.valor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Unidad *</Label>
                <UnidadSelect
                  value={watchedUnidad}
                  onChange={(v) => setValue('unidad', v, { shouldValidate: true })}
                  error={errors.unidad?.message}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Popover open={openPaciente} onOpenChange={setOpenPaciente} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPaciente}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {watchedPacienteUUID
                        ? (() => {
                            const p = pacientes.find((p: Paciente) => getPacienteUUID(p) === watchedPacienteUUID)
                            return p
                              ? `${p.folio} — ${p.persona.nombre} ${p.persona.apellidoPaterno}${p.persona.apellidoMaterno ? ' ' + p.persona.apellidoMaterno : ''}`
                              : watchedPacienteUUID
                          })()
                        : 'Buscar paciente...'
                      }
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-115 p-0">
                  <Command filter={(value, search) =>
                    value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                  }>
                    <CommandInput placeholder="Buscar por folio o nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró el paciente.</CommandEmpty>
                      <CommandGroup>
                        {pacientes.map((p: Paciente) => (
                          <CommandItem
                            key={getPacienteUUID(p)}
                            value={`${p.folio} ${p.persona.nombre} ${p.persona.apellidoPaterno} ${p.persona.apellidoMaterno ?? ''}`}
                            onSelect={() => {
                              setValue('pacienteUUID', getPacienteUUID(p))
                              setOpenPaciente(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                watchedPacienteUUID === getPacienteUUID(p) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {p.folio} — {p.persona.nombre} {p.persona.apellidoPaterno}{p.persona.apellidoMaterno ? ' ' + p.persona.apellidoMaterno : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.pacienteUUID && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.pacienteUUID.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Posición en Caja *</Label>
              {posicionLabel ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 p-2.5 bg-primary/10 border border-primary/20 rounded-md">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm text-primary font-medium">{posicionLabel}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPosicionModal(true)}
                  >
                    Cambiar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPosicionLabel('')
                      setValue('idPosicionCaja', 0)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPosicionModal(true)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Seleccionar Posición en Caja
                </Button>
              )}
              {errors.idPosicionCaja && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.idPosicionCaja.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                {...register('observaciones')}
                sanitize="descripcion"
                placeholder="Observaciones adicionales..."
                rows={3}
              />
              {errors.observaciones && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.observaciones.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SeleccionPosicionCajaModal
        open={showPosicionModal}
        onOpenChange={setShowPosicionModal}
        onConfirm={({ idPosicionCaja, cajaLabel }) => {
          setValue('idPosicionCaja', idPosicionCaja)
          setPosicionLabel(cajaLabel)
          setShowPosicionModal(false)
        }}
      />
    </>
  )
}
