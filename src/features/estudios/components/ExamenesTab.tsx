import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { AlertCircle, FlaskConical, Pencil, Trash2, X } from 'lucide-react'

import { Examen, ExamenRequestDTO } from '@/types/api'
import { examenSchema, type ExamenFormData } from '../schemas/examen.schema'
import { useGetExamenes, useCreateExamen, useUpdateExamen, useDeleteExamen } from '../hooks/useExamenes'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { UnidadSelect } from '@/components/forms/UnidadSelect'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const DEFAULT_VALUES: ExamenFormData = {
  nombreExamen: '',
  descripcion: '',
  unidad: '',
  valorMinMujeres: undefined,
  valorMaxMujeres: undefined,
  valorMinHombres: undefined,
  valorMaxHombres: undefined,
}

export function ExamenesTab() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrear = hasPermiso('EXAMENES_CATALOGO_CREAR')
  const puedeEditar = hasPermiso('EXAMENES_CATALOGO_EDITAR')
  const puedeEliminar = hasPermiso('EXAMENES_CATALOGO_ELIMINAR')
  const [editingId, setEditingId] = useState<number | null>(null)
  /** Cambia al limpiar/cancelar para forzar el remount del formulario y
   *  limpiar visualmente los inputs type="number" (React no actualiza el DOM
   *  cuando se pasa undefined a un input controlado con valueAsNumber). */
  const [formKey, setFormKey] = useState(0)

  const { data: examenes, isLoading, isError } = useGetExamenes()
  const createMutation = useCreateExamen()
  const updateMutation = useUpdateExamen()
  const deleteMutation = useDeleteExamen()

  const isPending = createMutation.isPending || updateMutation.isPending
  const isEditing = editingId !== null

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExamenFormData>({
    resolver: zodResolver(examenSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const handleEdit = (examen: Examen) => {
    setEditingId(examen.id)
    reset({
      nombreExamen: examen.nombreExamen,
      descripcion: examen.descripcion ?? '',
      unidad: examen.unidad ?? '',
      valorMinMujeres: examen.valorMinMujeres,
      valorMaxMujeres: examen.valorMaxMujeres,
      valorMinHombres: examen.valorMinHombres,
      valorMaxHombres: examen.valorMaxHombres,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    reset(DEFAULT_VALUES)
    // Incrementar la key fuerza el unmount+remount de <form> → los inputs
    // type="number" quedan completamente vacíos sin importar el estado anterior
    setFormKey((k) => k + 1)
  }

  const onSubmit = (data: ExamenFormData) => {
    const payload: ExamenRequestDTO = {
      nombreExamen: data.nombreExamen.trim(),
      descripcion: data.descripcion?.trim() || undefined,
      unidad: data.unidad?.trim() || undefined,
      valorMinMujeres: data.valorMinMujeres,
      valorMaxMujeres: data.valorMaxMujeres,
      valorMinHombres: data.valorMinHombres,
      valorMaxHombres: data.valorMaxHombres,
    }

    if (isEditing) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        { onSuccess: handleCancel }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          reset(DEFAULT_VALUES)
          setFormKey((k) => k + 1)
        },
      })
    }
  }

  const formatRange = (min?: number, max?: number) =>
    min != null && max != null ? `${min} – ${max}` : '—'

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* ── Lista de exámenes ── */}
      <Card className={puedeCrear || (puedeEditar && isEditing) ? 'lg:col-span-3' : 'lg:col-span-5'}>
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              Catálogo de exámenes
            </div>
            <div className="text-xs text-muted-foreground">
              Exámenes de laboratorio con rangos de referencia por sexo.
            </div>
          </div>
          <Badge variant="secondary" className="font-mono">
            {(examenes || []).length}
          </Badge>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Cargando exámenes…
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>No se pudieron cargar los exámenes.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-center">Ref. ♀</TableHead>
                  <TableHead className="text-center">Ref. ♂</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(examenes || []).map((ex) => (
                  <TableRow
                    key={ex.id}
                    className={editingId === ex.id ? 'bg-muted/50' : undefined}
                  >
                    <TableCell className="font-medium">{ex.nombreExamen}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ex.unidad || '—'}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {formatRange(ex.valorMinMujeres, ex.valorMaxMujeres)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {formatRange(ex.valorMinHombres, ex.valorMaxHombres)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {puedeEditar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              editingId === ex.id ? handleCancel() : handleEdit(ex)
                            }
                          >
                            {editingId === ex.id ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {puedeEliminar && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar examen "{ex.nombreExamen}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Solo se puede eliminar si no tiene resultados registrados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(ex.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(examenes || []).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Sin exámenes en el catálogo
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* ── Formulario crear / editar ── */}
      {(puedeCrear || (puedeEditar && isEditing)) && <Card className="lg:col-span-2">
        <div className="border-b p-4">
          <div className="text-sm font-medium">
            {isEditing ? 'Editar examen' : 'Nuevo examen'}
          </div>
          <div className="text-xs text-muted-foreground">
            {isEditing
              ? 'Modifica los datos del examen seleccionado.'
              : 'Agrega un examen al catálogo con sus rangos de referencia.'}
          </div>
        </div>

        <form key={formKey} onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-4">
          <FormField label="Nombre del examen" required error={errors.nombreExamen?.message}>
            <Input
              placeholder="Ej. Glucosa en ayuno"
              sanitize="alfanumerico"
              maxLength={100}
              {...register('nombreExamen')}
            />
          </FormField>

          <FormField label="Descripción" error={errors.descripcion?.message}>
            <Textarea
              placeholder="Descripción breve del examen…"
              rows={2}
              className="resize-none"
              sanitize="descripcion"
              maxLength={500}
              {...register('descripcion')}
            />
          </FormField>

          <FormField label="Unidad de medida" error={errors.unidad?.message}>
            <UnidadSelect
              value={watch('unidad') ?? ''}
              onChange={(v) => setValue('unidad', v, { shouldValidate: true })}
              placeholder="Selecciona unidad..."
              error={errors.unidad?.message}
            />
          </FormField>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rangos de referencia — Mujeres ♀
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Mínimo" error={errors.valorMinMujeres?.message}>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register('valorMinMujeres', { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Máximo" error={errors.valorMaxMujeres?.message}>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register('valorMaxMujeres', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rangos de referencia — Hombres ♂
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Mínimo" error={errors.valorMinHombres?.message}>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register('valorMinHombres', { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Máximo" error={errors.valorMaxHombres?.message}>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register('valorMaxHombres', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isEditing ? 'Cancelar' : 'Limpiar'}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isEditing ? 'Actualizando…' : 'Creando…'}
                </>
              ) : isEditing ? (
                'Actualizar'
              ) : (
                'Crear examen'
              )}
            </Button>
          </div>
        </form>
      </Card>}
    </div>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-[1px] size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
