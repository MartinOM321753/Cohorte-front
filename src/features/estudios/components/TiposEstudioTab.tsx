import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'

import { TipoEstudioRequestDTO, ParametroEstudioRequestDTO } from '@/types/api'
import {
  parametroEstudioSchema,
  tipoEstudioSchema,
  type ParametroEstudioFormData,
  type TipoEstudioFormData,
} from '../schemas/estudio.schema'
import {
  useCreateParametroEstudio,
  useCreateTipoEstudio,
  useGetTiposEstudio,
  useToggleTipoEstudio,
} from '../hooks/useEstudios'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DEFAULT_TIPO: TipoEstudioFormData = {
  nombre: '',
  descripcion: '',
}

const DEFAULT_PARAMETRO: ParametroEstudioFormData = {
  idTipoEstudio: 0,
  nombre: '',
  unidad: '',
  tipo: 'TEXTO',
}

export function TiposEstudioTab() {
  const { data: tipos, isLoading, isError } = useGetTiposEstudio()
  const createTipo = useCreateTipoEstudio()
  const toggleTipo = useToggleTipoEstudio()
  const createParametro = useCreateParametroEstudio()

  const tiposOrdenados = useMemo(() => {
    const arr = tipos || []
    return [...arr].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre))
  }, [tipos])

  const tiposActivos = useMemo(() => (tipos || []).filter((t) => t.activo), [tipos])

  const tipoForm = useForm<TipoEstudioFormData>({
    resolver: zodResolver(tipoEstudioSchema),
    defaultValues: DEFAULT_TIPO,
  })

  const parametroForm = useForm<ParametroEstudioFormData>({
    resolver: zodResolver(parametroEstudioSchema),
    defaultValues: DEFAULT_PARAMETRO,
  })

  const parametroTipo = parametroForm.watch('tipo')
  const parametroTipoEstudio = parametroForm.watch('idTipoEstudio')

  const onSubmitTipo = (data: TipoEstudioFormData) => {
    const payload: TipoEstudioRequestDTO = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || undefined,
    }
    createTipo.mutate(payload, { onSuccess: () => tipoForm.reset(DEFAULT_TIPO) })
  }

  const onSubmitParametro = (data: ParametroEstudioFormData) => {
    const payload: ParametroEstudioRequestDTO = {
      idTipoEstudio: Number(data.idTipoEstudio),
      nombre: data.nombre.trim(),
      unidad: data.unidad?.trim() || undefined,
      tipo: data.tipo,
    }
    createParametro.mutate(payload, { onSuccess: () => parametroForm.reset(DEFAULT_PARAMETRO) })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Tipos de estudio</div>
            <div className="text-xs text-muted-foreground">Catálogo para clasificar los estudios médicos.</div>
          </div>
          <Badge variant="secondary" className="font-mono">
            {(tipos || []).length}
          </Badge>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Cargando tipos…
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>No se pudieron cargar los tipos de estudio.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposOrdenados.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nombre}</TableCell>
                    <TableCell className="max-w-[380px] truncate text-muted-foreground">{t.descripcion || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => toggleTipo.mutate(t.id)}
                        disabled={toggleTipo.isPending}
                      >
                        {t.activo ? (
                          <>
                            <ToggleRight className="mr-2 h-4 w-4" strokeWidth={1.75} />
                            Activo
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
                            Inactivo
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tiposOrdenados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      Sin tipos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:col-span-2">
        <Card>
          <div className="border-b p-4">
            <div className="text-sm font-medium">Crear tipo</div>
            <div className="text-xs text-muted-foreground">Agrega un nuevo tipo al catálogo.</div>
          </div>

          <form onSubmit={tipoForm.handleSubmit(onSubmitTipo)} className="grid gap-4 p-4">
            <FormField label="Nombre" required error={tipoForm.formState.errors.nombre?.message}>
              <Input placeholder="Ej. Radiografía de tórax" {...tipoForm.register('nombre')} />
            </FormField>
            <FormField label="Descripción" error={tipoForm.formState.errors.descripcion?.message}>
              <Textarea placeholder="Opcional…" {...tipoForm.register('descripcion')} />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => tipoForm.reset(DEFAULT_TIPO)} disabled={createTipo.isPending}>
                Limpiar
              </Button>
              <Button type="submit" disabled={createTipo.isPending}>
                {createTipo.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando…
                  </>
                ) : (
                  'Crear'
                )}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="border-b p-4">
            <div className="text-sm font-medium">Crear parámetro</div>
            <div className="text-xs text-muted-foreground">Asocia un parámetro al tipo de estudio.</div>
          </div>

          <form onSubmit={parametroForm.handleSubmit(onSubmitParametro)} className="grid gap-4 p-4">
            <FormField label="Tipo de estudio" required error={parametroForm.formState.errors.idTipoEstudio?.message as any}>
              <Select
                value={parametroTipoEstudio ? String(parametroTipoEstudio) : ''}
                onValueChange={(v) => parametroForm.setValue('idTipoEstudio', Number(v))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Cargando…' : 'Seleccione un tipo'} />
                </SelectTrigger>
                <SelectContent>
                  {tiposActivos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Nombre" required error={parametroForm.formState.errors.nombre?.message}>
              <Input placeholder="Ej. Hemoglobina" {...parametroForm.register('nombre')} />
            </FormField>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Tipo" required error={parametroForm.formState.errors.tipo?.message}>
                <Select value={parametroTipo || ''} onValueChange={(v) => parametroForm.setValue('tipo', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NUMERICO">Numérico</SelectItem>
                    <SelectItem value="TEXTO">Texto</SelectItem>
                    <SelectItem value="BOOLEANO">Booleano</SelectItem>
                    <SelectItem value="GRUPO">Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Unidad" error={parametroForm.formState.errors.unidad?.message}>
                <Input placeholder="Ej. mg/dL" {...parametroForm.register('unidad')} />
              </FormField>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>
                El backend aún no expone un listado de parámetros; esta vista permite crearlos y mantener el diseño sin modales grandes.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => parametroForm.reset(DEFAULT_PARAMETRO)}
                disabled={createParametro.isPending}
              >
                Limpiar
              </Button>
              <Button type="submit" disabled={createParametro.isPending}>
                {createParametro.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando…
                  </>
                ) : (
                  'Crear'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
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
    <div className="space-y-2">
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
