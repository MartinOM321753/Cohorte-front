import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, ChevronDown, ChevronRight, CheckCircle2, Copy } from 'lucide-react'
import { useGetInstitucionesVisibles } from '@/features/instituciones/hooks/useInstituciones'
import { useAuthStore } from '@/stores/authStore'
import { useCopiarCatalogos, usePreviewCopia } from '../hooks/useCopiarCatalogos'
import type {
  TipoCatalogo,
  SeleccionCatalogo,
  CopiarCatalogosResponse,
  PreviewCatalogo,
} from '../api/catalogoCopy.api'

const CATALOGOS_LABELS: Record<TipoCatalogo, string> = {
  UNIDADES: 'Unidades de Medida',
  TIPOS_ESTUDIO: 'Tipos de Estudio',
  EXAMENES: 'Exámenes',
  TIPOS_MUESTRA: 'Tipos de Muestra',
  ESTUDIOS_MUESTRA: 'Estudios de Muestra',
}

const ALL_TIPOS: TipoCatalogo[] = [
  'UNIDADES',
  'TIPOS_ESTUDIO',
  'EXAMENES',
  'TIPOS_MUESTRA',
  'ESTUDIOS_MUESTRA',
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CopiarCatalogosDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uuidOrigen, setUuidOrigen] = useState('')
  const [uuidDestino, setUuidDestino] = useState('')
  // Map: TipoCatalogo -> Set of selected item IDs (empty set = none, missing key = not expanded yet)
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<number>>>({})
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [resultado, setResultado] = useState<CopiarCatalogosResponse | null>(null)

  const user = useAuthStore((s) => s.user)
  const { data: instituciones, isLoading: cargandoInst } = useGetInstitucionesVisibles({ enabled: open })
  const previewMutation = usePreviewCopia()
  const copiarMutation = useCopiarCatalogos()

  const institucionOrigen = useMemo(
    () => instituciones?.find((i) => i.uuid === uuidOrigen),
    [instituciones, uuidOrigen],
  )
  const institucionDestino = useMemo(
    () => instituciones?.find((i) => i.uuid === uuidDestino),
    [instituciones, uuidDestino],
  )

  function reset() {
    setStep(1)
    setUuidOrigen('')
    setUuidDestino(user?.institucion?.uuid ?? '')
    setSelectedItems({})
    setExpandedTypes(new Set())
    setResultado(null)
    previewMutation.reset()
    copiarMutation.reset()
  }

  function handleOpenChange(value: boolean) {
    if (value) {
      reset()
      setUuidDestino(user?.institucion?.uuid ?? '')
    }
    onOpenChange(value)
  }

  // ── Item selection helpers ──

  function getPreview(tipo: TipoCatalogo): PreviewCatalogo | undefined {
    return previewMutation.data?.previews.find((p) => p.catalogo === tipo)
  }

  function getCopyableIds(tipo: TipoCatalogo): number[] {
    const preview = getPreview(tipo)
    if (!preview) return []
    return preview.items.filter((i) => !i.existeEnDestino).map((i) => i.id)
  }

  function toggleItem(tipo: TipoCatalogo, id: number) {
    setSelectedItems((prev) => {
      const current = new Set(prev[tipo] ?? [])
      if (current.has(id)) {
        current.delete(id)
      } else {
        current.add(id)
      }
      return { ...prev, [tipo]: current }
    })
  }

  function toggleAllOfType(tipo: TipoCatalogo) {
    const copyableIds = getCopyableIds(tipo)
    const current = selectedItems[tipo] ?? new Set()
    const allSelected = copyableIds.length > 0 && copyableIds.every((id) => current.has(id))

    if (allSelected) {
      setSelectedItems((prev) => ({ ...prev, [tipo]: new Set() }))
    } else {
      setSelectedItems((prev) => ({ ...prev, [tipo]: new Set(copyableIds) }))
    }
  }

  function selectAll() {
    const newSelected: Record<string, Set<number>> = {}
    for (const tipo of ALL_TIPOS) {
      newSelected[tipo] = new Set(getCopyableIds(tipo))
    }
    setSelectedItems(newSelected)
  }

  function deselectAll() {
    setSelectedItems({})
  }

  function toggleExpanded(tipo: TipoCatalogo) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(tipo)) {
        next.delete(tipo)
      } else {
        next.add(tipo)
      }
      return next
    })
  }

  // ── Computed values ──

  const totalSelected = useMemo(() => {
    let count = 0
    for (const set of Object.values(selectedItems)) {
      count += set.size
    }
    return count
  }, [selectedItems])

  const totalCopyable = useMemo(() => {
    if (!previewMutation.data) return 0
    return previewMutation.data.previews.reduce(
      (sum, p) => sum + p.items.filter((i) => !i.existeEnDestino).length,
      0,
    )
  }, [previewMutation.data])

  // ── Step navigation ──

  function goToStep2() {
    setStep(2)
    setSelectedItems({})
    setExpandedTypes(new Set())
    previewMutation.mutate({
      uuidInstitucionOrigen: uuidOrigen,
      uuidInstitucionDestino: uuidDestino,
    })
  }

  function buildSeleccion(): SeleccionCatalogo[] {
    const result: SeleccionCatalogo[] = []
    for (const tipo of ALL_TIPOS) {
      const ids = selectedItems[tipo]
      if (ids && ids.size > 0) {
        result.push({ tipo, ids: Array.from(ids) })
      }
    }
    return result
  }

  function goToStep3() {
    setStep(3)
  }

  function ejecutarCopia() {
    copiarMutation.mutate(
      {
        uuidInstitucionOrigen: uuidOrigen,
        uuidInstitucionDestino: uuidDestino,
        catalogos: buildSeleccion(),
      },
      { onSuccess: (data) => setResultado(data) },
    )
  }

  const canGoToStep2 = uuidOrigen && uuidDestino && uuidOrigen !== uuidDestino

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copiar catálogos entre instituciones
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Selecciona las instituciones de origen y destino.'}
            {step === 2 && 'Selecciona los registros que deseas copiar.'}
            {step === 3 && !resultado && 'Confirma la copia de catálogos.'}
            {step === 3 && resultado && 'Resultado de la copia.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`h-px w-8 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Select institutions */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Institución origen</Label>
                <Select value={uuidOrigen} onValueChange={setUuidOrigen} disabled={cargandoInst}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar institución origen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {instituciones?.map((inst) => (
                      <SelectItem key={inst.uuid} value={inst.uuid}>
                        {inst.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Institución destino</Label>
                <Select value={uuidDestino} onValueChange={setUuidDestino} disabled={cargandoInst}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar institución destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {instituciones
                      ?.filter((i) => i.uuid !== uuidOrigen)
                      .map((inst) => (
                        <SelectItem key={inst.uuid} value={inst.uuid}>
                          {inst.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {uuidOrigen && uuidDestino && uuidOrigen === uuidDestino && (
                <p className="text-sm text-destructive">
                  Las instituciones de origen y destino deben ser diferentes.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Select individual items */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  De{' '}
                  <span className="font-medium text-foreground">{institucionOrigen?.nombre}</span> a{' '}
                  <span className="font-medium text-foreground">{institucionDestino?.nombre}</span>
                </p>
                {previewMutation.isSuccess && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Ninguno
                    </Button>
                  </div>
                )}
              </div>

              {previewMutation.isPending && (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando catálogos...
                </div>
              )}

              {previewMutation.isSuccess &&
                ALL_TIPOS.map((tipo) => {
                  const preview = getPreview(tipo)
                  if (!preview || preview.items.length === 0) return null
                  const copyableIds = getCopyableIds(tipo)
                  const selected = selectedItems[tipo] ?? new Set()
                  const selectedCount = selected.size
                  const isExpanded = expandedTypes.has(tipo)
                  const allSelected =
                    copyableIds.length > 0 && copyableIds.every((id) => selected.has(id))
                  const someSelected = selectedCount > 0 && !allSelected

                  return (
                    <div key={tipo} className="rounded-lg border">
                      {/* Type header */}
                      <div className="flex items-center gap-2 p-3">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleAllOfType(tipo)}
                          disabled={copyableIds.length === 0}
                        />
                        <button
                          type="button"
                          className="flex items-center gap-1 flex-1 text-left"
                          onClick={() => toggleExpanded(tipo)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{CATALOGOS_LABELS[tipo]}</span>
                        </button>
                        <div className="flex gap-1.5">
                          {selectedCount > 0 && (
                            <Badge className="text-xs">{selectedCount} seleccionados</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {preview.items.length} total
                          </Badge>
                          {preview.items.filter((i) => i.existeEnDestino).length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {preview.items.filter((i) => i.existeEnDestino).length} ya existen
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Individual items */}
                      {isExpanded && (
                        <div className="border-t px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                          {preview.items.map((item) => (
                            <label
                              key={item.id}
                              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                                item.existeEnDestino
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer hover:bg-accent/50'
                              }`}
                            >
                              <Checkbox
                                checked={selected.has(item.id)}
                                onCheckedChange={() => toggleItem(tipo, item.id)}
                                disabled={item.existeEnDestino}
                              />
                              <span className="flex-1">{item.nombre}</span>
                              {item.hijos > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {item.hijos} hijos
                                </span>
                              )}
                              {item.existeEnDestino && (
                                <Badge variant="outline" className="text-xs">
                                  ya existe
                                </Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* Step 3: Confirm / Results */}
          {step === 3 && !resultado && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Origen:</span>{' '}
                  <span className="font-medium">{institucionOrigen?.nombre}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Destino:</span>{' '}
                  <span className="font-medium">{institucionDestino?.nombre}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Total a copiar:</span>{' '}
                  <span className="font-medium">{totalSelected} registros</span>
                </p>
              </div>

              <div className="space-y-2">
                {ALL_TIPOS.map((tipo) => {
                  const selected = selectedItems[tipo]
                  if (!selected || selected.size === 0) return null
                  const preview = getPreview(tipo)
                  const names = preview?.items
                    .filter((i) => selected.has(i.id))
                    .map((i) => i.nombre)

                  return (
                    <Collapsible key={tipo}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left rounded-lg border p-3 hover:bg-accent/50">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium flex-1">
                          {CATALOGOS_LABELS[tipo]}
                        </span>
                        <Badge className="text-xs">{selected.size}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-2 flex flex-wrap gap-1">
                          {names?.map((n) => (
                            <Badge key={n} variant="secondary" className="text-xs font-normal">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>

              {copiarMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Copiando catálogos...
                </div>
              )}
            </div>
          )}

          {step === 3 && resultado && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium">{resultado.totalCopiados} registros copiados</span>
                {resultado.totalOmitidos > 0 && (
                  <span className="text-muted-foreground">
                    ({resultado.totalOmitidos} omitidos por ya existir)
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {resultado.resultados.map((r) => (
                  <div key={r.catalogo} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{CATALOGOS_LABELS[r.catalogo]}</span>
                      <div className="flex gap-2">
                        {r.copiados > 0 && (
                          <Badge className="text-xs">{r.copiados} copiados</Badge>
                        )}
                        {r.omitidos > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {r.omitidos} omitidos
                          </Badge>
                        )}
                      </div>
                    </div>
                    {r.detalleOmitidos.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground">
                          <ChevronDown className="h-3 w-3" />
                          Ver omitidos
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.detalleOmitidos.map((nombre) => (
                              <Badge
                                key={nombre}
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {nombre}
                              </Badge>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 1 && (
            <Button onClick={goToStep2} disabled={!canGoToStep2}>
              Siguiente
            </Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={goToStep3} disabled={totalSelected === 0}>
                Siguiente ({totalSelected} de {totalCopyable})
              </Button>
            </>
          )}
          {step === 3 && !resultado && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={copiarMutation.isPending}
              >
                Atrás
              </Button>
              <Button onClick={ejecutarCopia} disabled={copiarMutation.isPending}>
                {copiarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Ejecutar copia
              </Button>
            </>
          )}
          {step === 3 && resultado && (
            <Button onClick={() => handleOpenChange(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
