import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Layers } from 'lucide-react'
import { useCreatePisos, useGetPisosByRefrigerador } from '../hooks/useBiobanco'
import { Refrigerador } from '@/types/api'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const pisoSchema = z.object({
  numeroPiso: z.string().min(1, 'El número de piso es obligatorio'),
  filas: z.number().min(1, 'Debe tener al menos 1 fila'),
  columnas: z.number().min(1, 'Debe tener al menos 1 columna'),
  altura: z.union([z.number(), z.string()]).transform(val => String(val)).refine(val => val.trim() !== '', 'La altura es obligatoria'),
})

const pisosFormSchema = z.object({
  pisos: z.array(pisoSchema).min(1, 'Debe agregar al menos un piso'),
})

type PisosFormData = z.infer<typeof pisosFormSchema>

interface PisosFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  refrigerador: Refrigerador | null
}

export function PisosFormModal({ open, onOpenChange, refrigerador }: PisosFormModalProps) {
  const [existingPisos, setExistingPisos] = useState<any[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PisosFormData>({
    resolver: zodResolver(pisosFormSchema),
    defaultValues: {
      pisos: [{ numeroPiso: '', filas: 1, columnas: 1, altura: '1' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'pisos',
  })

  const createPisosMutation = useCreatePisos()
  const { data: currentPisos, isLoading: isLoadingPisos } = useGetPisosByRefrigerador(refrigerador?.id || 0)

  useEffect(() => {
    if (currentPisos && Array.isArray(currentPisos)) {
      setExistingPisos(currentPisos)
    }
  }, [currentPisos])

  useEffect(() => {
    if (!open) {
      reset()
      setExistingPisos([])
    }
  }, [open, reset])

  const onSubmit = async (data: PisosFormData) => {
    if (!refrigerador) return

    try {
      const pisosData = {
        idRefrigerador: refrigerador.id,
        pisos: data.pisos.map(piso => ({
          numeroPiso: piso.numeroPiso,
          filas: piso.filas,
          columnas: piso.columnas,
          altura: piso.altura,
          activo: true,
        })),
      }

      await createPisosMutation.mutateAsync(pisosData)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const addPiso = () => {
    append({ numeroPiso: '', filas: 1, columnas: 1, altura: '1' })
  }

  const removePiso = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const getTotalPosiciones = (piso: any) => {
    return piso.filas * piso.columnas * piso.altura
  }

  if (!refrigerador) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Gestionar Pisos - {refrigerador.nombre}
          </DialogTitle>
          <DialogDescription>
            Visualiza los pisos existentes del refrigerador y agrega nuevos. Cada piso tendrá posiciones generadas automáticamente.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPisos ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando pisos existentes...</span>
          </div>
        ) : existingPisos.length > 0 ? (
          <div className="space-y-3 border-b pb-4">
            <h4 className="font-medium text-base">Pisos Existentes ({existingPisos.length}):</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Piso</TableHead>
                    <TableHead className="text-center">Filas</TableHead>
                    <TableHead className="text-center">Columnas</TableHead>
                    <TableHead className="text-center">Altura</TableHead>
                    <TableHead className="text-center">Total Posiciones</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingPisos.map((piso, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-blue-600">
                        Piso {piso.numeroPiso}
                      </TableCell>
                      <TableCell className="text-center">{piso.filas}</TableCell>
                      <TableCell className="text-center">{piso.columnas}</TableCell>
                      <TableCell className="text-center">
                        {typeof piso.altura === 'number' ? piso.altura : parseInt(piso.altura || '1', 10)}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {getTotalPosiciones(piso)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2 py-1 rounded ${
                          piso.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {piso.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground pb-4 border-b">
            No hay pisos registrados en este refrigerador aún.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Agregar nuevos pisos:</h4>
              <Button type="button" variant="outline" size="sm" onClick={addPiso}>
                <Plus className="mr-1 h-3 w-3" />
                Agregar Piso
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Piso {index + 1}</CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePiso(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Número de Piso *</Label>
                      <Input
                        {...control.register(`pisos.${index}.numeroPiso`)}
                        placeholder="P1"
                      />
                      {errors.pisos?.[index]?.numeroPiso && (
                        <p className="text-sm text-destructive">
                          {errors.pisos[index]?.numeroPiso?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Filas *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...control.register(`pisos.${index}.filas`, { valueAsNumber: true })}
                      />
                      {errors.pisos?.[index]?.filas && (
                        <p className="text-sm text-destructive">
                          {errors.pisos[index]?.filas?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Columnas *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...control.register(`pisos.${index}.columnas`, { valueAsNumber: true })}
                      />
                      {errors.pisos?.[index]?.columnas && (
                        <p className="text-sm text-destructive">
                          {errors.pisos[index]?.columnas?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Altura *</Label>
                      <Input
                        type="text"
                        placeholder="1"
                        {...control.register(`pisos.${index}.altura`)}
                      />
                      {errors.pisos?.[index]?.altura && (
                        <p className="text-sm text-destructive">
                          {errors.pisos[index]?.altura?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const piso = control._getWatch(`pisos.${index}`)
                    const alturaNum = parseInt(piso.altura || '0', 10)
                    const total = piso.filas && piso.columnas && alturaNum
                      ? piso.filas * piso.columnas * alturaNum
                      : 0
                    return (
                      <div className="text-sm text-muted-foreground">
                        Total de posiciones a generar: <span className="font-medium">{total}</span>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>

          {errors.pisos && (
            <p className="text-sm text-destructive">{errors.pisos.message}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creando Pisos...' : 'Crear Pisos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}