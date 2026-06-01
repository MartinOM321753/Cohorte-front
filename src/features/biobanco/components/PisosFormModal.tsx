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
import { AlertCircle, Plus, Trash2, Layers, Edit, Check, X } from 'lucide-react'
import { useCreatePisos, useGetPisosByRefrigerador, useUpdatePiso, useDeletePiso } from '../hooks/useBiobanco'
import { Refrigerador } from '@/types/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const pisoSchema = z.object({
  numeroPiso: z.string().min(1, 'El número de piso es obligatorio'),
  filas: z.number().min(1, 'Debe tener al menos 1 fila'),
  columnas: z.number().min(1, 'Debe tener al menos 1 columna'),
  altura: z.union([z.number(), z.string()])
    .transform(val => String(val))
    .refine(val => val.trim() !== '', 'La altura es obligatoria'),
})

const pisosFormSchema = z.object({
  pisos: z.array(pisoSchema).min(1, 'Debe agregar al menos un piso'),
})

type PisosFormData = z.infer<typeof pisosFormSchema>

interface EditingPiso {
  id: number
  numeroPiso: string
  filas: number
  columnas: number
  altura: number
  activo: boolean
}

interface PisosFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  refrigerador: Refrigerador | null
}

const DEFAULT_VALUES: PisosFormData = {
  pisos: [{ numeroPiso: '', filas: 1, columnas: 1, altura: '1' }],
}

export function PisosFormModal({ open, onOpenChange, refrigerador }: PisosFormModalProps) {
  const [existingPisos, setExistingPisos] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditingPiso | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PisosFormData>({
    resolver: zodResolver(pisosFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'pisos' })

  const createPisosMutation = useCreatePisos()
  const updatePisoMutation = useUpdatePiso()
  const deletePisoMutation = useDeletePiso()
  const { data: currentPisos, isLoading: isLoadingPisos } = useGetPisosByRefrigerador(refrigerador?.id || 0)

  useEffect(() => {
    if (currentPisos && Array.isArray(currentPisos)) {
      setExistingPisos(currentPisos)
    }
  }, [currentPisos])

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        reset(DEFAULT_VALUES)
        setExistingPisos([])
        setEditingId(null)
        setEditForm(null)
      }, 150)
      return () => clearTimeout(timer)
    }
    return
  }, [open, reset])

  const onSubmit = async (data: PisosFormData) => {
    if (!refrigerador) return
    try {
      await createPisosMutation.mutateAsync({
        idRefrigerador: refrigerador.id,
        pisos: data.pisos.map(piso => ({
          numeroPiso: piso.numeroPiso,
          filas: piso.filas,
          columnas: piso.columnas,
          altura: piso.altura,
          activo: true,
        })),
      })
      onOpenChange(false)
    } catch (_) {}
  }

  const startEdit = (piso: any) => {
    setEditingId(piso.id)
    setEditForm({
      id: piso.id,
      numeroPiso: piso.numeroPiso,
      filas: piso.filas,
      columnas: piso.columnas,
      altura: typeof piso.altura === 'number' ? piso.altura : parseInt(piso.altura || '1', 10),
      activo: piso.activo,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editForm) return
    try {
      await updatePisoMutation.mutateAsync({
        id: editForm.id,
        data: {
          numeroPiso: editForm.numeroPiso,
          filas: editForm.filas,
          columnas: editForm.columnas,
          altura: editForm.altura,
          activo: editForm.activo,
        },
      })
      setEditingId(null)
      setEditForm(null)
    } catch (_) {}
  }

  const handleDelete = async (id: number) => {
    await deletePisoMutation.mutateAsync(id)
  }

  const getTotalPosiciones = (piso: any) => piso.filas * piso.columnas * (piso.altura || 1)

  if (!refrigerador) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Gestionar Pisos — {refrigerador.nombre}
          </DialogTitle>
          <DialogDescription>
            Consulta, edita o elimina pisos existentes, y agrega nuevos al refrigerador.
          </DialogDescription>
        </DialogHeader>

        {/* ── Pisos existentes ── */}
        {isLoadingPisos ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
            <span className="ml-2 text-sm">Cargando pisos...</span>
          </div>
        ) : existingPisos.length > 0 ? (
          <div className="space-y-2 border-b pb-4">
            <h4 className="font-medium text-base">Pisos registrados ({existingPisos.length})</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Piso</TableHead>
                    <TableHead className="text-center">Filas</TableHead>
                    <TableHead className="text-center">Columnas</TableHead>
                    <TableHead className="text-center">Altura</TableHead>
                    <TableHead className="text-center">Posiciones</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingPisos.map((piso) =>
                    editingId === piso.id && editForm ? (
                      /* ── fila en modo edición ── */
                      <TableRow key={piso.id} className="bg-blue-50">
                        <TableCell>
                          <Input
                            value={editForm.numeroPiso}
                            onChange={e => setEditForm({ ...editForm, numeroPiso: e.target.value })}
                            className="h-7 w-20 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={editForm.filas}
                            onChange={e => setEditForm({ ...editForm, filas: parseInt(e.target.value) || 1 })}
                            className="h-7 w-16 text-sm text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={editForm.columnas}
                            onChange={e => setEditForm({ ...editForm, columnas: parseInt(e.target.value) || 1 })}
                            className="h-7 w-16 text-sm text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={editForm.altura}
                            onChange={e => setEditForm({ ...editForm, altura: parseInt(e.target.value) || 1 })}
                            className="h-7 w-16 text-sm text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {editForm.filas * editForm.columnas * editForm.altura}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Editando</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 px-2"
                              onClick={saveEdit}
                              disabled={updatePisoMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={cancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      /* ── fila normal ── */
                      <TableRow key={piso.id} className="hover:bg-slate-50">
                        <TableCell className="font-semibold text-blue-600">Piso {piso.numeroPiso}</TableCell>
                        <TableCell className="text-center">{piso.filas}</TableCell>
                        <TableCell className="text-center">{piso.columnas}</TableCell>
                        <TableCell className="text-center">
                          {typeof piso.altura === 'number' ? piso.altura : parseInt(piso.altura || '1', 10)}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-blue-600">
                          {getTotalPosiciones(piso)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-1 rounded ${piso.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {piso.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => startEdit(piso)}
                              disabled={editingId !== null}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  disabled={editingId !== null}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar Piso {piso.numeroPiso}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminarán todas las posiciones del piso que no tengan cajas asignadas.
                                    Si hay posiciones ocupadas, la operación será rechazada.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(piso.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pb-4 border-b">
            No hay pisos registrados en este refrigerador aún.
          </p>
        )}

        {/* ── Agregar nuevos pisos ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Agregar nuevos pisos</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ numeroPiso: '', filas: 1, columnas: 1, altura: '1' })}>
                <Plus className="mr-1 h-3 w-3" />
                Agregar Piso
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Nuevo piso {index + 1}</CardTitle>
                    {fields.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Código de Piso *</Label>
                      <Input
                        {...control.register(`pisos.${index}.numeroPiso`)}
                        sanitize="folio"
                        placeholder="P1"
                      />
                      {errors.pisos?.[index]?.numeroPiso && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                          {errors.pisos[index]?.numeroPiso?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Filas *</Label>
                      <Input type="number" min="1" {...control.register(`pisos.${index}.filas`, { valueAsNumber: true })} />
                      {errors.pisos?.[index]?.filas && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                          {errors.pisos[index]?.filas?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Columnas *</Label>
                      <Input type="number" min="1" {...control.register(`pisos.${index}.columnas`, { valueAsNumber: true })} />
                      {errors.pisos?.[index]?.columnas && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                          {errors.pisos[index]?.columnas?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Altura *</Label>
                      <Input type="text" placeholder="1" {...control.register(`pisos.${index}.altura`)} />
                      {errors.pisos?.[index]?.altura && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                          {errors.pisos[index]?.altura?.message}
                        </p>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const piso = control._getWatch(`pisos.${index}`)
                    const alturaNum = parseInt(piso.altura || '0', 10)
                    const total = piso.filas && piso.columnas && alturaNum ? piso.filas * piso.columnas * alturaNum : 0
                    return (
                      <p className="text-sm text-muted-foreground">
                        Posiciones a generar: <span className="font-medium">{total}</span>
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>

          {errors.pisos && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
              {errors.pisos.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Pisos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
