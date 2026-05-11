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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateMuestra, useUpdateMuestra } from '../hooks/useBiobanco'
import { useGetPacientes } from '@/features/pacientes/hooks/useGetPacientes'
import { useAuthStore } from '@/stores/authStore'
import { Muestra, Paciente, PacienteRequestDTO, PacienteResumenDTO } from '@/types/api'
import { SeleccionPosicionCajaModal } from './SeleccionPosicionCajaModal'

const UNIDADES = [
  'ml', 'L', 'µL', 'g', 'kg', 'mg', 'µg', 'ng', 'mL/kg', 'UI', 'UI/mL',
  'nmol', 'µmol', 'mmol', 'mol', 'células/mL', 'copias/mL', 'UFC/mL',
  'pg/mL', 'ng/mL', 'µg/mL', 'mg/dL', 'g/dL', '%',
]

const muestraSchema = z.object({
  etiqueta: z.string().min(1, 'La etiqueta es obligatoria').max(50, 'Máximo 50 caracteres'),
  valor: z.number().min(0, 'El valor debe ser positivo'),
  unidad: z.string().min(1, 'La unidad es obligatoria'),
  fechaRecoleccion: z.string().min(1, 'La fecha es obligatoria'),
  observaciones: z.string().max(200, 'Máximo 200 caracteres').optional(),
  pacienteUUID: z.string().min(1, 'El paciente es obligatorio'),
  usuarioRecolectaUUID: z.string().min(1, 'El recolector es obligatorio'),
  idPosicionCaja: z.number().min(1, 'Debe seleccionar una posición'),
})

type MuestraFormData = z.infer<typeof muestraSchema>

interface MuestraFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  muestra?: Muestra | null
}

const toLocalDateTimeInput = (date: Date): string => {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

export function MuestraFormModal({ open, onOpenChange, muestra }: MuestraFormModalProps) {
  const isEditing = !!muestra
  const [openUnidad, setOpenUnidad] = useState(false)
  const [openPaciente, setOpenPaciente] = useState(false)
  const [showPosicionModal, setShowPosicionModal] = useState(false)
  const [posicionLabel, setPosicionLabel] = useState<string>('')

  const user = useAuthStore((state) => state.user)

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

  const { data: pacientesRaw } = useGetPacientes({ activos: true })
  const pacientes = Array.isArray(pacientesRaw)
    ? pacientesRaw
    : (pacientesRaw as any)?.data ?? []

  const getPacienteUUID = (p: Paciente): string =>
    p.UUID || (p as unknown as { uuid?: string }).uuid || ''


  useEffect(() => {
    if (open && user?.uuid) {
      setValue('usuarioRecolectaUUID', user.uuid)
    }
  }, [open, user, setValue])

  useEffect(() => {
    if (muestra) {
      reset({
        etiqueta: muestra.etiqueta,
        valor: muestra.valor,
        unidad: muestra.unidad,
        fechaRecoleccion: toLocalDateTimeInput(new Date(muestra.fechaRecoleccion)),
        observaciones: muestra.observaciones || '',
        pacienteUUID: muestra.pacienteUUID,
        usuarioRecolectaUUID: muestra.usuarioRecolectaUUID,
        idPosicionCaja: muestra.idPosicionCaja,
      })
      setPosicionLabel(`Posición #${muestra.idPosicionCaja}`)
    } else {
      reset({
        etiqueta: '',
        valor: 0,
        unidad: '',
        fechaRecoleccion: toLocalDateTimeInput(new Date()),
        observaciones: '',
        pacienteUUID: '',
        usuarioRecolectaUUID: user?.uuid || '',
        idPosicionCaja: 0,
      })
      setPosicionLabel('')
    }
  }, [muestra, reset, user])

  const onSubmit = async (data: MuestraFormData) => {
    try {
      if (isEditing && muestra) {
        await updateMuestraMutation.mutateAsync({ id: muestra.id, data })
      } else {
        await createMuestraMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch (error) { }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setPosicionLabel('')
      setOpenUnidad(false)
      setOpenPaciente(false)
      setShowPosicionModal(false)
    }
    onOpenChange(newOpen)
  }

  const watchedUnidad = watch('unidad')
  const watchedPacienteUUID = watch('pacienteUUID')

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
                  placeholder="M-2024-0001-SANGRE"
                  disabled={isEditing}
                />
                {errors.etiqueta && (
                  <p className="text-sm text-destructive">{errors.etiqueta.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaRecoleccion">Fecha de Recolección *</Label>
                <Input
                  id="fechaRecoleccion"
                  type="datetime-local"
                  step={60}
                  max={toLocalDateTimeInput(new Date())}
                  {...register('fechaRecoleccion')}
                />
                {errors.fechaRecoleccion && (
                  <p className="text-sm text-destructive">{errors.fechaRecoleccion.message}</p>
                )}
              </div>
            </div>

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
                  <p className="text-sm text-destructive">{errors.valor.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Unidad *</Label>
                <Popover open={openUnidad} onOpenChange={setOpenUnidad} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openUnidad}
                      className="w-full justify-between font-normal"
                    >
                      {watchedUnidad || 'Selecciona unidad...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-50 p-0">
                    <Command filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }>
                      <CommandInput placeholder="Buscar unidad..." />
                      <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                          {UNIDADES.map((u) => (
                            <CommandItem
                              key={u}
                              value={u}
                              onSelect={() => {
                                setValue('unidad', u)
                                setOpenUnidad(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  watchedUnidad === u ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {u}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.unidad && (
                  <p className="text-sm text-destructive">{errors.unidad.message}</p>
                )}
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
                <p className="text-sm text-destructive">{errors.pacienteUUID.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Posición en Caja *</Label>
              {posicionLabel ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                    <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-800 font-medium">{posicionLabel}</p>
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
                <p className="text-sm text-destructive">{errors.idPosicionCaja.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                {...register('observaciones')}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
              {errors.observaciones && (
                <p className="text-sm text-destructive">{errors.observaciones.message}</p>
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
