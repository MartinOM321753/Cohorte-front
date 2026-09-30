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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateMuestra, useUpdateMuestra, useGetCajas } from '../hooks/useBiobanco'
import { Muestra } from '@/types/api'

const muestraSchema = z.object({
  etiqueta: z.string().min(1, 'La etiqueta es obligatoria').max(50, 'Máximo 50 caracteres'),
  valor: z.number().min(0, 'El valor debe ser positivo'),
  unidad: z.string().min(1, 'La unidad es obligatoria').max(50, 'Máximo 50 caracteres'),
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

export function MuestraFormModal({ open, onOpenChange, muestra }: MuestraFormModalProps) {
  const isEditing = !!muestra
  const [selectedCaja, setSelectedCaja] = useState<string>('')

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
      fechaRecoleccion: new Date().toISOString().split('T')[0],
      observaciones: '',
      pacienteUUID: '',
      usuarioRecolectaUUID: '',
      idPosicionCaja: 0,
    },
  })

  const createMuestraMutation = useCreateMuestra()
  const updateMuestraMutation = useUpdateMuestra()
  const { data: cajas } = useGetCajas()

  useEffect(() => {
    if (muestra) {
      reset({
        etiqueta: muestra.etiqueta,
        valor: muestra.valor,
        unidad: muestra.unidad,
        fechaRecoleccion: new Date(muestra.fechaRecoleccion).toISOString().split('T')[0],
        observaciones: muestra.observaciones || '',
        pacienteUUID: muestra.pacienteUUID,
        usuarioRecolectaUUID: muestra.usuarioRecolectaUUID,
        idPosicionCaja: muestra.idPosicionCaja,
      })
    } else {
      reset({
        etiqueta: '',
        valor: 0,
        unidad: '',
        fechaRecoleccion: new Date().toISOString().split('T')[0],
        observaciones: '',
        pacienteUUID: '',
        usuarioRecolectaUUID: '',
        idPosicionCaja: 0,
      })
    }
  }, [muestra, reset])

  const onSubmit = async (data: MuestraFormData) => {
    try {
      if (isEditing && muestra) {
        await updateMuestraMutation.mutateAsync({ id: muestra.id, data })
      } else {
        await createMuestraMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setSelectedCaja('')
    }
    onOpenChange(newOpen)
  }

  const getAvailablePositions = () => {
    if (!selectedCaja || !cajas) return []

    const caja = cajas.find(c => c.id.toString() === selectedCaja)
    if (!caja?.posiciones) return []

    return caja.posiciones.filter(p => !p.ocupada)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
                type="date"
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
              <Label htmlFor="unidad">Unidad *</Label>
              <Input
                id="unidad"
                {...register('unidad')}
                placeholder="ml"
              />
              {errors.unidad && (
                <p className="text-sm text-destructive">{errors.unidad.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pacienteUUID">UUID del Paciente *</Label>
              <Input
                id="pacienteUUID"
                {...register('pacienteUUID')}
                placeholder="550e8400-e29b-41d4-a716-446655440000"
              />
              {errors.pacienteUUID && (
                <p className="text-sm text-destructive">{errors.pacienteUUID.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuarioRecolectaUUID">UUID del Recolector *</Label>
              <Input
                id="usuarioRecolectaUUID"
                {...register('usuarioRecolectaUUID')}
                placeholder="660e8400-e29b-41d4-a716-446655440001"
              />
              {errors.usuarioRecolectaUUID && (
                <p className="text-sm text-destructive">{errors.usuarioRecolectaUUID.message}</p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar Caja</Label>
                <Select value={selectedCaja} onValueChange={setSelectedCaja}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {cajas?.map((caja) => (
                      <SelectItem key={caja.id} value={caja.id.toString()}>
                        {caja.codigoCaja} - {caja.tipoCaja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCaja && (
                <div className="space-y-2">
                  <Label>Posición Disponible *</Label>
                  <Select
                    value={watch('idPosicionCaja')?.toString()}
                    onValueChange={(value) => setValue('idPosicionCaja', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una posición libre" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePositions().map((pos) => (
                        <SelectItem key={pos.id} value={pos.id.toString()}>
                          Fila {pos.fila}, Columna {pos.columna}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.idPosicionCaja && (
                    <p className="text-sm text-destructive">{errors.idPosicionCaja.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

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
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}