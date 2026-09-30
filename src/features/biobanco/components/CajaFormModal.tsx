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
import { useCreateCaja, useUpdateCaja, useGetRefrigeradores, useGetPisosByRefrigerador } from '../hooks/useBiobanco'
import { Caja } from '@/types/api'

const cajaSchema = z.object({
  codigoCaja: z.string().min(1, 'El código es obligatorio').max(50, 'Máximo 50 caracteres'),
  filas: z.number().min(1, 'Debe tener al menos 1 fila'),
  columnas: z.number().min(1, 'Debe tener al menos 1 columna'),
  tipoCaja: z.string().min(1, 'El tipo de caja es obligatorio').max(50, 'Máximo 50 caracteres'),
  color: z.string().max(30, 'Máximo 30 caracteres').optional(),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  idPosicionPiso: z.number().optional(),
})

type CajaFormData = z.infer<typeof cajaSchema>

interface CajaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja?: Caja | null
}

export function CajaFormModal({ open, onOpenChange, caja }: CajaFormModalProps) {
  const isEditing = !!caja
  const [selectedRefrigerador, setSelectedRefrigerador] = useState<string>('')
  const [selectedPiso, setSelectedPiso] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CajaFormData>({
    resolver: zodResolver(cajaSchema),
    defaultValues: {
      codigoCaja: '',
      filas: 1,
      columnas: 1,
      tipoCaja: '',
      color: '',
      observaciones: '',
      idPosicionPiso: undefined,
    },
  })

  const createCajaMutation = useCreateCaja()
  const updateCajaMutation = useUpdateCaja()
  const { data: refrigeradores } = useGetRefrigeradores()
  const { data: pisos } = useGetPisosByRefrigerador(selectedRefrigerador ? parseInt(selectedRefrigerador) : 0)

  useEffect(() => {
    if (caja) {
      reset({
        codigoCaja: caja.codigoCaja,
        filas: caja.filas,
        columnas: caja.columnas,
        tipoCaja: caja.tipoCaja,
        color: caja.color || '',
        observaciones: caja.observaciones || '',
        idPosicionPiso: caja.idPosicionPiso,
      })
    } else {
      reset({
        codigoCaja: '',
        filas: 1,
        columnas: 1,
        tipoCaja: '',
        color: '',
        observaciones: '',
        idPosicionPiso: undefined,
      })
    }
  }, [caja, reset])

  const onSubmit = async (data: CajaFormData) => {
    try {
      // Filtrar campos undefined para evitar enviarlos al backend
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      )

      if (isEditing && caja) {
        await updateCajaMutation.mutateAsync({ id: caja.id, data: filteredData })
      } else {
        await createCajaMutation.mutateAsync(filteredData)
      }
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setSelectedRefrigerador('')
      setSelectedPiso('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Caja Criogénica' : 'Crear Nueva Caja Criogénica'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos de la caja criogénica.'
              : 'Registra una nueva caja criogénica y asígnala a una posición disponible.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigoCaja">Código de Caja *</Label>
              <Input
                id="codigoCaja"
                {...register('codigoCaja')}
                placeholder="CAJA-A001"
                disabled={isEditing}
              />
              {errors.codigoCaja && (
                <p className="text-sm text-destructive">{errors.codigoCaja.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoCaja">Tipo de Caja *</Label>
              <Input
                id="tipoCaja"
                {...register('tipoCaja')}
                placeholder="Gradilla 81 pozos"
              />
              {errors.tipoCaja && (
                <p className="text-sm text-destructive">{errors.tipoCaja.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filas">Filas *</Label>
              <Input
                id="filas"
                type="number"
                min="1"
                {...register('filas', { valueAsNumber: true })}
              />
              {errors.filas && (
                <p className="text-sm text-destructive">{errors.filas.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="columnas">Columnas *</Label>
              <Input
                id="columnas"
                type="number"
                min="1"
                {...register('columnas', { valueAsNumber: true })}
              />
              {errors.columnas && (
                <p className="text-sm text-destructive">{errors.columnas.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                {...register('color')}
                placeholder="Azul"
              />
              {errors.color && (
                <p className="text-sm text-destructive">{errors.color.message}</p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar Refrigerador</Label>
                <Select value={selectedRefrigerador} onValueChange={(value) => {
                  setSelectedRefrigerador(value)
                  setSelectedPiso('')
                  setValue('idPosicionPiso', 0)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un refrigerador" />
                  </SelectTrigger>
                  <SelectContent>
                    {refrigeradores?.map((ref) => (
                      <SelectItem key={ref.id} value={ref.id.toString()}>
                        {ref.nombre} ({ref.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRefrigerador && pisos && (
                <div className="space-y-2">
                  <Label>Seleccionar Piso (Opcional)</Label>
                  <Select value={selectedPiso} onValueChange={(value) => {
                    setSelectedPiso(value)
                    setValue('idPosicionPiso', undefined)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un piso" />
                    </SelectTrigger>
                    <SelectContent>
                      {pisos.map((piso: any) => (
                        <SelectItem key={piso.id} value={piso.id.toString()}>
                          Piso {piso.numeroPiso} ({piso.filas}×{piso.columnas}×{piso.altura})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedPiso && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Las posiciones disponibles no se pueden cargar actualmente desde el backend.
                    La caja se creará sin posición asignada. Podrá asignar una posición posteriormente.
                  </p>
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
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}