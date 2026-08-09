import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Eye,
  Filter,
  Info,
  Minus,
  Paperclip,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { ResultadoExamen, ResultadoExamenRequestDTO } from '@/types/api'
import { resultadoExamenSchema, type ResultadoExamenFormData } from '../schemas/examen.schema'
import {
  useDeleteResultadoExamen,
  useGetExamenes,
  useGetResultadosByPacienteUUID,
  useSaveResultadoExamen,
  useUpdateResultadoExamen,
} from '../hooks/useExamenes'
import { PacienteSearchCombobox } from '@/features/pacientes/components/PacienteSearchCombobox'
import { getPacienteBasicoByUUID } from '@/features/pacientes/api/pacientes.api'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { DateTimePicker, ultimoMomentoValido } from '@/components/ui/date-time-picker'
import type { HorarioActivoMinimo } from '@/components/ui/date-time-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DocumentosDialog } from '@/features/documentos/components/DocumentosDialog'
import { useGetConfiguracionHorarioActiva } from '@/features/configuracion/hooks/useHorarios'

// ── helpers ───────────────────────────────────────────────────────────────────

function getRangeStatus(
  resultado: ResultadoExamen,
  sexo?: 'M' | 'F'
): 'low' | 'normal' | 'high' | null {
  const { examen, valorObtenido } = resultado
  if (!examen) return null
  const min = sexo === 'F' ? examen.valorMinMujeres : examen.valorMinHombres
  const max = sexo === 'F' ? examen.valorMaxMujeres : examen.valorMaxHombres
  if (min == null || max == null) return null
  if (valorObtenido < min) return 'low'
  if (valorObtenido > max) return 'high'
  return 'normal'
}

function RangeIndicator({ status }: { status: 'low' | 'normal' | 'high' | null }) {
  if (status === null) return <span className="text-xs text-muted-foreground">—</span>
  if (status === 'normal')
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      >
        <Minus className="h-3 w-3" />
        Normal
      </Badge>
    )
  if (status === 'low')
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      >
        <TrendingDown className="h-3 w-3" />
        Bajo
      </Badge>
    )
  return (
    <Badge
      variant="secondary"
      className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    >
      <TrendingUp className="h-3 w-3" />
      Alto
    </Badge>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────


function freshDefaults(horario?: HorarioActivoMinimo | null): ResultadoExamenFormData {
  return {
    pacienteUUID: '',
    usuarioRegistroUUID: '',
    idExamen: 0,
    valorObtenido: 0,
    observaciones: '',
    // No vale el reloj a secas: fuera del horario activo esa hora no existe en
    // el selector. Ver ultimoMomentoValido().
    fechaResultado: ultimoMomentoValido(horario),
  }
}

export function ResultadosExamenTab() {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const puedeCrear = useAuthStore((s) => s.hasPermiso('EXAMENES_CREAR'))
  const puedeEditarExamen = useAuthStore((s) => s.hasPermiso('EXAMENES_EDITAR'))
  const puedeEliminar = useAuthStore((s) => s.hasPermiso('EXAMENES_ELIMINAR'))
  const puedeSubirDocs = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_SUBIR'))
  const puedeEliminarDocs = useAuthStore((s) => s.hasPermiso('DOCUMENTOS_ELIMINAR'))
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

  const [openExamen, setOpenExamen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [docsResultadoId, setDocsResultadoId] = useState<number | null>(null)
  const [selectedPacienteLabel, setSelectedPacienteLabel] = useState<string | null>(null)
  const [selectedPacienteSexo, setSelectedPacienteSexo] = useState<'M' | 'F' | null>(null)
  // Participante que ya no se gestiona: se le consulta lo propio, no se le registra.
  const [pacienteSoloConsulta, setPacienteSoloConsulta] = useState(false)
  const [filterExamenId, setFilterExamenId] = useState<string>('all')
  const { data: examenes, isLoading: isLoadingExamenes } = useGetExamenes()
  const saveMutation   = useSaveResultadoExamen()
  const updateMutation = useUpdateResultadoExamen()
  const deleteMutation = useDeleteResultadoExamen()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResultadoExamenFormData>({
    resolver: zodResolver(resultadoExamenSchema),
    defaultValues: { ...freshDefaults(horarioActivo), usuarioRegistroUUID: userUuid },
  })

  useEffect(() => {
    if (userUuid) setValue('usuarioRegistroUUID', userUuid)
  }, [userUuid, setValue])

  const watchedPacienteUUID = watch('pacienteUUID')
  const watchedIdExamen     = watch('idExamen')
  const watchedFecha        = watch('fechaResultado')

  // Exámenes activos ordenados alfabéticamente
  const examenesActivos = useMemo(
    () =>
      [...(examenes || [])]
        .filter((e) => e.activo)
        .sort((a, b) => a.nombreExamen.localeCompare(b.nombreExamen, 'es')),
    [examenes]
  )

  const selectedExamen = useMemo(
    () => examenesActivos.find((e) => e.id === watchedIdExamen),
    [examenesActivos, watchedIdExamen]
  )

  useEffect(() => { setFilterExamenId('all') }, [watchedPacienteUUID])

  // Al llegar desde «Participantes que ya no gestionas» el uuid viene en la URL:
  // ese participante no aparece en la búsqueda normal, así que se preselecciona.
  const [searchParams, setSearchParams] = useSearchParams()
  const uuidDeLaUrl = searchParams.get('paciente')

  useEffect(() => {
    if (!uuidDeLaUrl) return
    setValue('pacienteUUID', uuidDeLaUrl)
    // El parámetro se consume: si se queda en la URL, «Cambiar» vuelve a
    // preseleccionar al mismo y no hay forma de salir de esta consulta.
    setSearchParams((prev) => {
      const siguiente = new URLSearchParams(prev)
      siguiente.delete('paciente')
      return siguiente
    }, { replace: true })
    getPacienteBasicoByUUID(uuidDeLaUrl)
      .then((p) => {
        setSelectedPacienteLabel([p.folio, [p.persona?.nombre, p.persona?.segundoNombre, p.persona?.apellidoPaterno, p.persona?.apellidoMaterno].filter(Boolean).join(' ')]
          .filter(Boolean).join(' — '))
        setSelectedPacienteSexo(p.persona?.sexo === 'M' ? 'M' : p.persona?.sexo === 'F' ? 'F' : null)
        setPacienteSoloConsulta(!!p.soloConsulta)
      })
      // Si no se pudo resolver quién es, no se ofrece registrar: es preferible una
      // pantalla de solo lectura a un alta que el backend va a rechazar.
      .catch(() => setPacienteSoloConsulta(true))
  }, [uuidDeLaUrl, setValue, setSearchParams])

  const {
    data: resultados,
    isLoading: isLoadingResultados,
    isError: isErrorResultados,
  } = useGetResultadosByPacienteUUID(watchedPacienteUUID || null)

  const sortedResultados = useMemo(
    () =>
      [...(resultados || [])].sort(
        (a, b) =>
          new Date(b.fechaResultado).getTime() - new Date(a.fechaResultado).getTime()
      ),
    [resultados]
  )

  const examenesEnResultados = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of sortedResultados) {
      const id = r.examen?.id ?? r.idExamen
      if (!map.has(id)) map.set(id, r.examen?.nombreExamen ?? `#${id}`)
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [sortedResultados])

  const filteredResultados = useMemo(
    () =>
      filterExamenId === 'all'
        ? sortedResultados
        : sortedResultados.filter(
            (r) => (r.examen?.id ?? r.idExamen) === Number(filterExamenId)
          ),
    [sortedResultados, filterExamenId]
  )

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Pre-llena el formulario con los valores del resultado a editar. */
  const handleEditResultado = (r: ResultadoExamen) => {
    setEditingId(r.id)
    setValue('idExamen', r.idExamen ?? r.examen?.id ?? 0)
    setValue('valorObtenido', r.valorObtenido)
    setValue('observaciones', r.observaciones ?? '')
    setValue('fechaResultado', String(r.fechaResultado || '').slice(0, 16))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    reset({ ...freshDefaults(horarioActivo), usuarioRegistroUUID: userUuid, pacienteUUID: watchedPacienteUUID })
  }

  const cambiarParticipante = () => {
    setEditingId(null)
    setSelectedPacienteLabel(null)
    setSelectedPacienteSexo(null)
    // El modo de solo consulta es del participante, no de la pantalla: al soltarlo
    // hay que soltarlo también, o el siguiente hereda una restricción que no le toca.
    setPacienteSoloConsulta(false)
    reset({ ...freshDefaults(horarioActivo), usuarioRegistroUUID: userUuid })
  }

  const onSubmit = (data: ResultadoExamenFormData) => {
    const payload: ResultadoExamenRequestDTO = {
      pacienteUUID:       data.pacienteUUID.trim(),
      usuarioRegistroUUID: userUuid.trim(),
      idExamen:           data.idExamen,
      valorObtenido:      data.valorObtenido,
      observaciones:      data.observaciones?.trim() || undefined,
      fechaResultado:     data.fechaResultado,
    }

    if (editingId !== null) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            setEditingId(null)
            reset({ ...freshDefaults(horarioActivo), usuarioRegistroUUID: userUuid, pacienteUUID: data.pacienteUUID })
          },
        }
      )
    } else {
      saveMutation.mutate(payload, {
        onSuccess: () => reset({ ...freshDefaults(horarioActivo), usuarioRegistroUUID: userUuid, pacienteUUID: data.pacienteUUID }),
      })
    }
  }

  const isPending = saveMutation.isPending || updateMutation.isPending
  const isEditing = editingId !== null


  // A un participante de solo consulta no se le registra nada: el formulario
  // desaparece y queda el historial de lo que esta institución le hizo.
  const showForm = (puedeCrear || (puedeEditarExamen && isEditing)) && !pacienteSoloConsulta

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex items-center gap-2 max-w-md">
          <PacienteSearchCombobox
            value={watchedPacienteUUID || null}
            incluirSoloConsulta
            onChange={(uuid) => setValue('pacienteUUID', uuid)}
            onSelectPaciente={(p) => {
              setPacienteSoloConsulta(!!p.soloConsulta)
              const nombre = [p.persona?.nombre, p.persona?.segundoNombre, p.persona?.apellidoPaterno, p.persona?.apellidoMaterno].filter(Boolean).join(' ')
              setSelectedPacienteLabel(`${p.folio} — ${nombre}`)
              setSelectedPacienteSexo((p.persona?.sexo as 'M' | 'F') ?? null)
            }}
            placeholder="Buscar participante por folio, nombre o CURP…"
            variant="search"
            className="flex-1"
          />
          {watchedPacienteUUID && (
            <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={cambiarParticipante}>
              Cambiar
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* ── Panel izquierdo: historial ── */}
      <Card className={showForm ? 'lg:col-span-3' : 'lg:col-span-5'}>
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Historial de resultados
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedPacienteLabel
                ? selectedPacienteLabel
                : 'Busca un participante para ver sus resultados.'}
            </div>
            {pacienteSoloConsulta && (
              <div className="mt-1 inline-flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1">
                <Eye className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" />
                <span className="text-[11px] leading-snug text-amber-800">
                  Ya no gestionas a este participante. Se muestran únicamente los resultados que
                  registró tu institución; no se le pueden agregar ni modificar.
                </span>
              </div>
            )}
          </div>
          {watchedPacienteUUID && (
            <div className="flex items-center gap-2">
              {examenesEnResultados.length > 1 && (
                <Select value={filterExamenId} onValueChange={setFilterExamenId}>
                  <SelectTrigger className="h-7 w-auto max-w-[180px] gap-1 text-xs">
                    <Filter className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {examenesEnResultados.map(([id, name]) => (
                      <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Badge variant="secondary" className="font-mono">
                {filteredResultados.length}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4">
          {!watchedPacienteUUID ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-25" />
              <span>Busca un participante para ver su historial.</span>
            </div>
          ) : isLoadingResultados ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Cargando resultados…
            </div>
          ) : isErrorResultados ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              <AlertDescription>No se pudieron cargar los resultados.</AlertDescription>
            </Alert>
          ) : (
            <>
              {selectedPacienteSexo && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Rangos de referencia aplicados:{' '}
                  <span className="font-medium">
                    {selectedPacienteSexo === 'M' ? 'Hombres ♂' : 'Mujeres ♀'}
                  </span>
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Examen</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResultados.map((r) => {
                    const status = getRangeStatus(
                      r,
                      selectedPacienteSexo ?? undefined
                    )
                    return (
                      <TableRow
                        key={r.id}
                        className={editingId === r.id ? 'bg-muted/50' : undefined}
                      >
                        <TableCell className="font-mono text-xs">
                          {String(r.fechaResultado || '').slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.examen?.nombreExamen || `#${r.idExamen}`}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {r.valorObtenido}
                          {r.examen?.unidad && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {r.examen.unidad}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RangeIndicator status={status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Documentos adjuntos"
                              onClick={() => setDocsResultadoId(r.id)}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </Button>
                            {(puedeEditarExamen || editingId === r.id) && !pacienteSoloConsulta && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title={editingId === r.id ? 'Cancelar edición' : 'Editar resultado'}
                                onClick={() =>
                                  editingId === r.id ? handleCancelEdit() : handleEditResultado(r)
                                }
                              >
                                {editingId === r.id
                                  ? <X className="h-3.5 w-3.5" />
                                  : <Pencil className="h-3.5 w-3.5" />
                                }
                              </Button>
                            )}
                            {puedeEliminar && !pacienteSoloConsulta && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    disabled={deleteMutation.isPending}
                                    title="Eliminar resultado"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar este resultado?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminarán los documentos adjuntos de este resultado. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(r.id)}
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
                    )
                  })}
                  {filteredResultados.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Sin resultados para este participante
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

        </div>
      </Card>

      {/* ── Panel derecho: formulario ── */}
      {showForm && <Card className="lg:col-span-2">
        <div className="border-b p-4">
          <div className="text-sm font-medium">
            {isEditing ? 'Editar resultado' : 'Registrar resultado'}
          </div>
          <div className="text-xs text-muted-foreground">
            {isEditing
              ? 'Modifica el valor, fecha u observaciones del resultado seleccionado.'
              : 'Captura el valor obtenido en el examen de laboratorio.'}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-4">
          <input type="hidden" {...register('pacienteUUID')} />
          <input type="hidden" {...register('usuarioRegistroUUID')} />

          {/* Paciente */}
          <FormField label="Participante" required error={errors.pacienteUUID?.message}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {/* También ofrece los de solo consulta: quien puede registrar nunca ve
                    el buscador de arriba, así que sin esto no tendría por dónde
                    llegar a ellos. Al elegir uno, el formulario se retira solo. */}
                <PacienteSearchCombobox
                  value={watchedPacienteUUID}
                  incluirSoloConsulta
                  onChange={(uuid) => setValue('pacienteUUID', uuid)}
                  onSelectPaciente={(p) => {
                    setPacienteSoloConsulta(!!p.soloConsulta)
                    const nombre = [p.persona?.nombre, p.persona?.segundoNombre, p.persona?.apellidoPaterno, p.persona?.apellidoMaterno].filter(Boolean).join(' ')
                    setSelectedPacienteLabel(`${p.folio} — ${nombre}`)
                    setSelectedPacienteSexo((p.persona?.sexo as 'M' | 'F') ?? null)
                  }}
                  disabled={isEditing}
                />
              </div>
              {watchedPacienteUUID && !isEditing && (
                <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={cambiarParticipante}>
                  Cambiar
                </Button>
              )}
            </div>
          </FormField>

          {/* Examen — Combobox con búsqueda en lugar de Select */}
          <FormField label="Examen" required error={errors.idExamen?.message}>
            <Popover open={openExamen} onOpenChange={setOpenExamen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openExamen}
                  className="w-full justify-between"
                  disabled={isLoadingExamenes || isEditing}
                >
                  <span className="truncate text-left">
                    {watchedIdExamen && watchedIdExamen > 0
                      ? (() => {
                          const ex = examenesActivos.find((e) => e.id === watchedIdExamen)
                          return ex
                            ? `${ex.nombreExamen}${ex.unidad ? ` (${ex.unidad})` : ''}`
                            : 'Examen seleccionado'
                        })()
                      : isLoadingExamenes
                        ? 'Cargando exámenes…'
                        : 'Buscar examen…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar examen…" />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No se encontró el examen.</CommandEmpty>
                    <CommandGroup>
                      {examenesActivos.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.nombreExamen} ${e.unidad ?? ''}`}
                          onSelect={() => {
                            setValue('idExamen', e.id)
                            setOpenExamen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              watchedIdExamen === e.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="flex-1 truncate text-[13px]">
                            {e.nombreExamen}
                            {e.unidad && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({e.unidad})
                              </span>
                            )}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>

          {/* Descripción del examen */}
          {selectedExamen?.descripcion && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
              <span>{selectedExamen.descripcion}</span>
            </div>
          )}

          {/* Valor obtenido */}
          <FormField label="Valor obtenido" required error={errors.valorObtenido?.message}>
            <div className="relative">
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                className={selectedExamen?.unidad ? 'pr-14' : undefined}
                {...register('valorObtenido', { valueAsNumber: true })}
              />
              {selectedExamen?.unidad && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {selectedExamen.unidad}
                </span>
              )}
            </div>
            {selectedExamen && (
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {selectedExamen.valorMinMujeres != null &&
                  selectedExamen.valorMaxMujeres != null && (
                    <p>
                      ♀ Ref: {selectedExamen.valorMinMujeres} –{' '}
                      {selectedExamen.valorMaxMujeres}
                    </p>
                  )}
                {selectedExamen.valorMinHombres != null &&
                  selectedExamen.valorMaxHombres != null && (
                    <p>
                      ♂ Ref: {selectedExamen.valorMinHombres} –{' '}
                      {selectedExamen.valorMaxHombres}
                    </p>
                  )}
              </div>
            )}
          </FormField>

          {/* Fecha y hora */}
          <FormField label="Fecha y hora del resultado" required error={errors.fechaResultado?.message}>
            <input type="hidden" {...register('fechaResultado')} />
            <DateTimePicker
              value={watchedFecha}
              onChange={(v) => setValue('fechaResultado', v, { shouldValidate: true })}
              placeholder="Selecciona fecha y hora"
              timeStepMinutes={1}
              maxDateTime={new Date()}
              minHour={horarioActivo?.horaInicio ?? 8}
              maxHour={(horarioActivo?.horaFin ?? 17) - 1}
              disabledDaysOfWeek={disabledDaysOfWeek}
            />
          </FormField>

          {/* Observaciones */}
          <FormField label="Observaciones" error={errors.observaciones?.message}>
            <Textarea
              placeholder="Notas adicionales…"
              rows={2}
              maxLength={1000}
              className="resize-none"
              {...register('observaciones')}
            />
            {(watch('observaciones') as string)?.length > 900 && (
              <p className="text-[11px] text-muted-foreground text-right">
                {(watch('observaciones') as string).length}/1000
              </p>
            )}
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isPending}
            >
              {isEditing ? 'Cancelar' : 'Limpiar'}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isEditing ? 'Guardando…' : 'Registrando…'}
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </form>
      </Card>}

      {/* Modal de documentos del resultado. Los adjuntos se leen siempre que se
          pueda leer el resultado, pero no se añaden ni se borran sobre un
          participante que ya no se gestiona: eso es modificar el expediente. */}
      <DocumentosDialog
        entidad="resultadoExamen"
        resultadoExamenId={docsResultadoId ?? 0}
        open={docsResultadoId != null}
        onOpenChange={(open) => { if (!open) setDocsResultadoId(null) }}
        titulo={`Documentos — Resultado #${docsResultadoId}`}
        descripcion="Sube y consulta los documentos adjuntos de este resultado de examen."
        usuarioUUID={userUuid}
        canDelete={puedeEliminarDocs && !pacienteSoloConsulta}
        canUpload={puedeSubirDocs && !pacienteSoloConsulta}
      />
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
