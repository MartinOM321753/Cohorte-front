import { useEffect, useMemo, useState } from 'react'
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
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, ArrowRightFromLine, Check, FlaskConical, Info, Lock, MapPin, TestTube, X } from 'lucide-react'

import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'
import { useCreateMuestra, useUpdateMuestra, useGetMuestraById, useGetTiposMuestraActivos } from '../hooks/useBiobanco'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { useAuthStore } from '@/stores/authStore'
import { MuestraDetalleDTO } from '@/types/api'
import { SeleccionPosicionCajaModal } from './SeleccionPosicionCajaModal'
import { UnidadSelect } from '@/components/forms/UnidadSelect'

const muestraSchema = z.object({
  valor: z.number().min(0, 'El valor debe ser positivo'),
  unidad: z.string().min(1, 'La unidad es obligatoria'),
  fechaRecoleccion: z.string().min(1, 'La fecha es obligatoria'),
  observaciones: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  pacienteUUID: z.string().min(1, 'El participante es obligatorio'),
  usuarioRecolectaUUID: z.string().min(1, 'El recolector es obligatorio'),
  idPosicionCaja: z.number().optional(),
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
  const [showPosicionModal, setShowPosicionModal] = useState(false)
  const [posicionLabel, setPosicionLabel] = useState<string>('')

  // Stream C — TipoMuestra / TuboMuestra selection
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null)
  const [selectedTuboId, setSelectedTuboId] = useState<number | null>(null)

  const user = useAuthStore((state) => state.user)
  const { data: tiposMuestra = [] } = useGetTiposMuestraActivos()
  const { data: horarioActivo } = useGetConfiguracionHorarioActiva()

  const disabledDaysOfWeek = useMemo(() => {
    if (!horarioActivo) return undefined
    const days: number[] = []
    if (!horarioActivo.domingo) days.push(0)
    if (!horarioActivo.lunes) days.push(1)
    if (!horarioActivo.martes) days.push(2)
    if (!horarioActivo.miercoles) days.push(3)
    if (!horarioActivo.jueves) days.push(4)
    if (!horarioActivo.viernes) days.push(5)
    if (!horarioActivo.sabado) days.push(6)
    return days.length > 0 ? days : undefined
  }, [horarioActivo])

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
      valor: 0,
      unidad: '',
      fechaRecoleccion: ultimoMomentoValido(horarioActivo),
      observaciones: '',
      pacienteUUID: '',
      usuarioRecolectaUUID: '',
      idPosicionCaja: 0,
    },
  })

  const createMuestraMutation = useCreateMuestra()
  const updateMuestraMutation = useUpdateMuestra()

  const { data: freshMuestra } = useGetMuestraById(open && isEditing ? muestra!.id : 0)

  const buildDefaultValues = (): MuestraFormData => ({
    valor: 0,
    unidad: '',
    fechaRecoleccion: ultimoMomentoValido(horarioActivo),
    observaciones: '',
    pacienteUUID: '',
    usuarioRecolectaUUID: user?.uuid || '',
    idPosicionCaja: 0,
  })

  useEffect(() => {
    if (open && user?.uuid) {
      setValue('usuarioRecolectaUUID', user.uuid, { shouldValidate: true })
    }
  }, [open, user, setValue])

  useEffect(() => {
    if (open && freshMuestra) {
      const u = freshMuestra.ubicacion
      reset({
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

  const [tipoTuboError, setTipoTuboError] = useState<string | null>(null)

  const onSubmit = async (data: MuestraFormData) => {
    if (!isEditing) {
      if (!selectedTipoId) {
        setTipoTuboError('Debe seleccionar un tipo de muestra')
        return
      }
      if (!selectedTuboId) {
        setTipoTuboError('Debe seleccionar un tubo para el tipo de muestra')
        return
      }
    }
    setTipoTuboError(null)
    try {
      if (isEditing && muestra) {
        // Solo campos editables — tipo, tubo y participante son inmutables
        // Si está prestada, no enviar idPosicionCaja (backend la rechazaría igualmente)
        const payload = {
          valor: data.valor,
          unidad: data.unidad,
          fechaRecoleccion: data.fechaRecoleccion,
          observaciones: data.observaciones,
          idPosicionCaja: isPrestada ? undefined : (data.idPosicionCaja || undefined),
          pacienteUUID: data.pacienteUUID,
          usuarioRecolectaUUID: data.usuarioRecolectaUUID,
        }
        await updateMuestraMutation.mutateAsync({ id: muestra.id, data: payload })
      } else {
        // idPosicionCaja usa 0 como "sin posición" en el formulario; el backend
        // espera que se omita, o intentará buscar la posición con id 0.
        const payload = {
          ...data,
          idPosicionCaja: data.idPosicionCaja || undefined,
          idTipoMuestra: selectedTipoId!,
          idTuboMuestra: selectedTuboId!,
        }
        await createMuestraMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (error) { }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPosicionLabel('')
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

  const muestraActiva = freshMuestra ?? muestra
  const isPrestada = isEditing && muestraActiva?.estadoMuestra === 'PRESTADA'

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
            {/* Etiqueta: auto-generada — solo mostrar en modo edición */}
            {isEditing && muestra && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2">
                <Label className="text-xs text-muted-foreground shrink-0">Etiqueta:</Label>
                <span className="text-sm font-mono font-medium">{freshMuestra?.etiqueta ?? muestra.etiqueta}</span>
              </div>
            )}
            {!isEditing && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>La etiqueta se genera automáticamente con el formato <strong>{'{prefijo}/{folio}/F4'}</strong> según el tubo seleccionado y el participante.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fechaRecoleccion">Fecha de Recolección *</Label>
              <input id="fechaRecoleccion" type="hidden" {...register('fechaRecoleccion')} />
              <DateTimePicker
                value={watchedFechaRecoleccion}
                onChange={(v) => setValue('fechaRecoleccion', v, { shouldValidate: true })}
                placeholder="Selecciona fecha y hora"
                timeStepMinutes={1}
                maxDateTime={new Date()}
                minHour={horarioActivo?.horaInicio ?? 8}
                maxHour={(horarioActivo?.horaFin ?? 17) - 1}
                disabledDaysOfWeek={disabledDaysOfWeek}
              />
              {errors.fechaRecoleccion && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.fechaRecoleccion.message}
                </p>
              )}
            </div>

            {/* Tipo de muestra ─────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                  Tipo de muestra {!isEditing && <span className="text-destructive">*</span>}
                </Label>

                {isEditing ? (
                  /* Solo lectura en edición */
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2">
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">
                      {selectedTipo?.nombre ?? <span className="text-muted-foreground italic">Sin tipo</span>}
                    </span>
                    {selectedTipo?.temperaturaAlmacenamiento && (
                      <span className="text-xs text-muted-foreground">· {selectedTipo.temperaturaAlmacenamiento}</span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground italic">No editable</span>
                  </div>
                ) : (
                  <Select
                    value={selectedTipoId != null ? String(selectedTipoId) : ''}
                    onValueChange={(v) => {
                      setSelectedTipoId(parseInt(v))
                      setSelectedTuboId(null)
                      setTipoTuboError(null)
                    }}
                  >
                    <SelectTrigger className={tipoTuboError && !selectedTipoId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Seleccionar tipo de muestra..." />
                    </SelectTrigger>
                    <SelectContent>
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
                )}
              </div>

              {/* Tubos del tipo seleccionado ─────────────────────────────── */}
              {selectedTipo && (
                <div className="rounded-md border border-dashed p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <TestTube className="h-3.5 w-3.5" />
                    {isEditing ? 'Tubo registrado' : `Tubos para "${selectedTipo.nombre}" ${!isEditing ? '*' : ''}`}
                  </p>

                  {isEditing ? (
                    /* Solo lectura — mostrar tubo actual */
                    (() => {
                      const tubo = tubosDisponibles.find(tb => tb.id === selectedTuboId)
                      return tubo ? (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium">{tubo.nombre}</span>
                            {tubo.prefijoCodigo && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tubo.prefijoCodigo}</Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground italic">No editable</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sin tubo registrado</p>
                      )
                    })()
                  ) : (
                    /* Selección en creación */
                    tubosDisponibles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin tubos activos configurados</p>
                    ) : (
                      <div className="space-y-1.5">
                        {tubosDisponibles.map((tb) => {
                          const isSelected = selectedTuboId === tb.id
                          return (
                            <button
                              key={tb.id}
                              type="button"
                              onClick={() => { setSelectedTuboId(isSelected ? null : tb.id); setTipoTuboError(null) }}
                              className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : tipoTuboError && !selectedTuboId
                                    ? 'border-destructive/50 bg-muted/30 hover:bg-muted/60'
                                    : 'border-transparent bg-muted/30 hover:bg-muted/60'
                              }`}
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="mt-0.5 shrink-0">
                                  {isSelected
                                    ? <Check className="h-3.5 w-3.5 text-primary" />
                                    : <div className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium">{tb.nombre}</span>
                                    {tb.prefijoCodigo && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{tb.prefijoCodigo}</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
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
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  )}

                  {/* Error de tubo no seleccionado */}
                  {tipoTuboError && selectedTipoId && !selectedTuboId && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                      {tipoTuboError}
                    </p>
                  )}

                  {/* Aviso generación automática */}
                  {!isEditing && selectedTuboId != null && (() => {
                    const tubo = tubosDisponibles.find(tb => tb.id === selectedTuboId)
                    if (!tubo || tubo.numeroAlicuotas === 0) return null
                    return (
                      <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 mt-2">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          Al registrar se crearán automáticamente <strong>{tubo.numeroAlicuotas} alícuotas</strong> con
                          etiqueta <strong>{tubo.prefijoCodigo || 'M'}/folio/F4/1-{tubo.numeroAlicuotas}</strong> … <strong>{tubo.numeroAlicuotas}-{tubo.numeroAlicuotas}</strong>.
                          Podrás asignarles su posición en caja desde la lista de muestras.
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Error de tipo no seleccionado */}
              {tipoTuboError && !selectedTipoId && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {tipoTuboError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
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
              <Label>Participante *</Label>
              {isEditing ? (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2">
                  <span className="text-sm font-medium">
                    {freshMuestra?.paciente
                      ? `${freshMuestra.paciente.folio} — ${freshMuestra.paciente.nombreCompleto}`
                      : muestra?.paciente
                        ? `${muestra.paciente.folio} — ${muestra.paciente.nombreCompleto}`
                        : '—'}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground italic shrink-0">No editable</span>
                </div>
              ) : (
                <PacienteSearchCombobox
                  value={watchedPacienteUUID}
                  onChange={(uuid) => setValue('pacienteUUID', uuid, { shouldValidate: true })}
                  modal
                />
              )}
              {!isEditing && errors.pacienteUUID && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {errors.pacienteUUID.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Posición en Caja</Label>
              {isPrestada ? (
                /* Muestra en tránsito — posición bloqueada */
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">En tránsito — posición no editable</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Esta muestra está prestada a otra institución. La posición se libera automáticamente al iniciar el traslado.
                    </p>
                  </div>
                  <ArrowRightFromLine className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                </div>
              ) : posicionLabel ? (
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
                      setValue('idPosicionCaja', 0, { shouldValidate: true })
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
          setValue('idPosicionCaja', idPosicionCaja, { shouldValidate: true })
          setPosicionLabel(cajaLabel)
          setShowPosicionModal(false)
        }}
      />
    </>
  )
}
