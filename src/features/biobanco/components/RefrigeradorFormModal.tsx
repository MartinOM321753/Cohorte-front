import { useEffect } from 'react'
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
import { useCreateRefrigerador, useUpdateRefrigerador } from '../hooks/useBiobanco'
import { Refrigerador } from '@/types/api'

const refrigeradorSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio').max(50, 'Máximo 50 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  marca: z.string().max(50, 'Máximo 50 caracteres').optional(),
  modelo: z.string().max(50, 'Máximo 50 caracteres').optional(),
})

type RefrigeradorFormData = z.infer<typeof refrigeradorSchema>

interface RefrigeradorFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  refrigerador?: Refrigerador | null
}

export function RefrigeradorFormModal({ open, onOpenChange, refrigerador }: RefrigeradorFormModalProps) {
  const isEditing = !!refrigerador

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RefrigeradorFormData>({
    resolver: zodResolver(refrigeradorSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      marca: '',
      modelo: '',
    },
  })

  const createRefrigeradorMutation = useCreateRefrigerador()
  const updateRefrigeradorMutation = useUpdateRefrigerador()

  useEffect(() => {
    if (refrigerador) {
      reset({
        codigo: refrigerador.codigo,
        nombre: refrigerador.nombre,
        marca: refrigerador.marca || '',
        modelo: refrigerador.modelo || '',
      })
    } else {
      reset({
        codigo: '',
        nombre: '',
        marca: '',
        modelo: '',
      })
    }
  }, [refrigerador, reset])

  const onSubmit = async (data: RefrigeradorFormData) => {
    try {
      const submitData = {
        ...data,
        marca: data.marca || '',
        modelo: data.modelo || '',
      }
      if (isEditing && refrigerador) {
        await updateRefrigeradorMutation.mutateAsync({ id: refrigerador.id, data: submitData })
      } else {
        await createRefrigeradorMutation.mutateAsync(submitData)
      }
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Refrigerador' : 'Crear Nuevo Refrigerador'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del refrigerador criogénico.'
              : 'Registra un nuevo refrigerador criogénico en el sistema.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                {...register('codigo')}
                placeholder="REF-001"
                disabled={isEditing} // No permitir cambiar código en edición
              />
              {errors.codigo && (
                <p className="text-sm text-destructive">{errors.codigo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                {...register('nombre')}
                placeholder="Refrigerador Principal"
              />
              {errors.nombre && (
                <p className="text-sm text-destructive">{errors.nombre.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                {...register('marca')}
                placeholder="Thermo Scientific"
              />
              {errors.marca && (
                <p className="text-sm text-destructive">{errors.marca.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                {...register('modelo')}
                placeholder="TSX600"
              />
              {errors.modelo && (
                <p className="text-sm text-destructive">{errors.modelo.message}</p>
              )}
            </div>
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