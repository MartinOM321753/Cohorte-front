import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Edit,
  ExternalLink,
  Eye,
  Layers,
  Plus,
  Search,
  Thermometer,
  Trash2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useGetRefrigeradores,
  useDeleteRefrigerador,
  useGetCajas,
  useGetPosicionesByPiso,
} from '../hooks/useBiobanco'
import { RefrigeradorFormModal } from '../components/RefrigeradorFormModal'
import { PisosFormModal } from '../components/PisosFormModal'
import { ExplorarBiobanco3DModal } from '../components/ubicacion3d/ExplorarBiobanco3DModal'
import { CajaFormModal } from '../components/CajaFormModal'
import { PosicionesModal } from '../components/PosicionesModal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
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
import type { Caja } from '@/types/api'

export default function RefrigeradoresExplorerPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedPisoId, setSelectedPisoId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [isRefrigeradorModalOpen, setIsRefrigeradorModalOpen] = useState(false)
  const [editingRefrigerador, setEditingRefrigerador] = useState<any>(null)
  const [isPisosModalOpen, setIsPisosModalOpen] = useState(false)
  const [pisosRefrigerador, setPisosRefrigerador] = useState<any>(null)
  const [explorando3D, setExplorando3D] = useState<number | null>(null)
  const [isCajaModalOpen, setIsCajaModalOpen] = useState(false)
  const [editingCaja, setEditingCaja] = useState<Caja | null>(null)
  const [viewingCaja, setViewingCaja] = useState<Caja | null>(null)

  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeCrearRefrigerador = hasPermiso('REFRIGERADORES_CREAR')
  const puedeEditarRefrigerador = hasPermiso('REFRIGERADORES_EDITAR')
  const puedeEliminarRefrigerador = hasPermiso('REFRIGERADORES_ELIMINAR')
  const puedeCrearCaja = hasPermiso('CAJAS_CREAR')

  const { data: refrigeradores, isLoading } = useGetRefrigeradores()
  const deleteRefrigeradorMutation = useDeleteRefrigerador()
  const { data: allCajas } = useGetCajas()
  const { data: pisoPosiciones } = useGetPosicionesByPiso(selectedPisoId ?? 0)

  const selected = refrigeradores?.find(r => r.id === selectedId) ?? null

  const filteredRefrigeradores = useMemo(() => {
    if (!refrigeradores) return []
    if (!searchQuery.trim()) return refrigeradores
    const q = searchQuery.toLowerCase()
    return refrigeradores.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.codigo.toLowerCase().includes(q) ||
      (r.marca && r.marca.toLowerCase().includes(q))
    )
  }, [refrigeradores, searchQuery])

  useEffect(() => {
    if (selected?.pisos && selected.pisos.length > 0) {
      setSelectedPisoId(selected.pisos[0].id)
    } else {
      setSelectedPisoId(null)
    }
  }, [selectedId, selected?.pisos?.length])

  const cajasEnPiso = useMemo(() => {
    if (!allCajas || !pisoPosiciones) return []
    const posIds = new Set(pisoPosiciones.map(p => p.id))
    return allCajas.filter(c => c.idPosicionPiso != null && posIds.has(c.idPosicionPiso))
  }, [allCajas, pisoPosiciones])

  const handleDeleteRefrigerador = async () => {
    if (!selected) return
    await deleteRefrigeradorMutation.mutateAsync(selected.id)
    setSelectedId(null)
  }

  const handleModalClose = () => {
    setIsRefrigeradorModalOpen(false)
    setIsPisosModalOpen(false)
    setPisosRefrigerador(null)
    setEditingRefrigerador(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const totalOcupacion = (pisos: { posicionesOcupadas: number; totalPosiciones: number }[]) => {
    const total = pisos.reduce((s, p) => s + p.totalPosiciones, 0)
    const ocupadas = pisos.reduce((s, p) => s + p.posicionesOcupadas, 0)
    return total > 0 ? Math.round((ocupadas / total) * 100) : 0
  }

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Almacenamiento criogénico</h2>
          <p className="text-sm text-muted-foreground">
            Refrigeradores, pisos y cajas del biobanco
          </p>
        </div>
        {puedeCrearRefrigerador && (
          <Button
            onClick={() => { setEditingRefrigerador(null); setIsRefrigeradorModalOpen(true) }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo refrigerador</span>
          </Button>
        )}
      </div>

      {/* ── Two-panel layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── Left panel: refrigerador list ────────────────────────── */}
        <div className={cn(
          'flex flex-col gap-2',
          selected && 'hidden lg:flex',
        )}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar refrigerador…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-240px)] custom-scrollbar pr-1">
            {filteredRefrigeradores.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm">
                  {refrigeradores?.length === 0
                    ? 'No hay refrigeradores registrados'
                    : 'Sin resultados para la búsqueda'}
                </p>
              </div>
            )}
            {filteredRefrigeradores.map(r => {
              const isActive = r.id === selectedId
              const pct = totalOcupacion(r.pisos ?? [])
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{r.nombre}</span>
                    {r.temperatura != null && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0">
                        <Thermometer className="h-2.5 w-2.5" />
                        {r.temperatura}°C
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{r.codigo}</span>
                    <span>·</span>
                    <span>{r.totalPisos} piso{r.totalPisos !== 1 ? 's' : ''}</span>
                  </div>
                  {r.pisos && r.pisos.length > 0 && (
                    <div className="mt-2">
                      <Progress value={pct} className="h-1.5" />
                      <div className="mt-0.5 text-[10px] text-muted-foreground text-right">{pct}% ocupado</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Right panel: detail ──────────────────────────────────── */}
        <div className="min-h-[400px]">
          {!selected ? (
            <Card className="flex h-full items-center justify-center">
              <CardContent className="text-center py-16 text-muted-foreground">
                <Boxes className="mx-auto h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">Selecciona un refrigerador para ver su contenido</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Back button (mobile only) */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden -ml-2"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver a la lista
              </Button>

              {/* Refrigerador header */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{selected.nombre}</h3>
                        <Badge variant={selected.activo ? 'default' : 'secondary'} className="text-[10px]">
                          {selected.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>Código: {selected.codigo}</span>
                        {selected.temperatura != null && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Thermometer className="h-3 w-3" />
                            {selected.temperatura}°C
                          </Badge>
                        )}
                        {selected.marca && <span>Marca: {selected.marca}</span>}
                        {selected.modelo && <span>Modelo: {selected.modelo}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExplorando3D(selected.id)}
                        disabled={selected.totalPisos === 0}
                        title={selected.totalPisos === 0 ? 'Sin pisos que recorrer' : 'Recorrer en 3D'}
                        className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      >
                        <Boxes className="mr-1 h-3.5 w-3.5" />
                        3D
                      </Button>
                      {puedeEditarRefrigerador && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setPisosRefrigerador(selected); setIsPisosModalOpen(true) }}
                          >
                            <Layers className="mr-1 h-3.5 w-3.5" />
                            Pisos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingRefrigerador(selected); setIsRefrigeradorModalOpen(true) }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {puedeEliminarRefrigerador && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar &ldquo;{selected.nombre}&rdquo;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                El refrigerador <strong>{selected.nombre}</strong> (código: {selected.codigo}) será eliminado
                                junto con todos sus pisos y posiciones asociadas. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteRefrigerador}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Piso selector */}
              {selected.pisos && selected.pisos.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Piso:</span>
                    {selected.pisos.map(piso => {
                      const isActive = piso.id === selectedPisoId
                      return (
                        <Button
                          key={piso.id}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedPisoId(piso.id)}
                          className="tabular-nums"
                        >
                          {piso.numeroPiso}
                          <span className="ml-1.5 text-[10px] opacity-70">
                            ({piso.posicionesLibres} libres)
                          </span>
                        </Button>
                      )
                    })}
                  </div>

                  {/* Cajas grid */}
                  {selectedPisoId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">
                          Cajas en piso {selected.pisos.find(p => p.id === selectedPisoId)?.numeroPiso}
                        </h4>
                        <div className="flex items-center gap-2">
                          {puedeCrearCaja && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setEditingCaja(null); setIsCajaModalOpen(true) }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Añadir caja
                            </Button>
                          )}
                          <Button variant="link" size="sm" className="text-xs px-0" asChild>
                            <Link to="/biobanco/cajas">
                              Ver todas las cajas
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {cajasEnPiso.length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center text-muted-foreground">
                            <p className="text-sm">No hay cajas ubicadas en este piso</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {cajasEnPiso.map(caja => (
                            <Card key={caja.id} className="hover:border-primary/30 transition-colors">
                              <CardContent className="pt-4 pb-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{caja.codigoCaja}</span>
                                  {caja.nombreTipoMuestraRecomendado && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {caja.nombreTipoMuestraRecomendado}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{caja.filas}×{caja.columnas}</span>
                                  {caja.totalPosiciones != null && caja.posicionesLibres != null && (
                                    <span>
                                      {caja.posicionesLibres}/{caja.totalPosiciones} libres
                                    </span>
                                  )}
                                </div>
                                {caja.totalPosiciones != null && caja.totalPosiciones > 0 && (
                                  <Progress
                                    value={
                                      ((caja.totalPosiciones - (caja.posicionesLibres ?? 0)) / caja.totalPosiciones) * 100
                                    }
                                    className="h-1"
                                  />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => setViewingCaja(caja)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver posiciones
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Layers className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Este refrigerador no tiene pisos configurados</p>
                    {puedeEditarRefrigerador && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => { setPisosRefrigerador(selected); setIsPisosModalOpen(true) }}
                      >
                        <Layers className="mr-1 h-3.5 w-3.5" />
                        Gestionar pisos
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <ExplorarBiobanco3DModal
        open={explorando3D !== null}
        onOpenChange={(open) => !open && setExplorando3D(null)}
        idRefrigeradorInicial={explorando3D}
      />
      <RefrigeradorFormModal
        open={isRefrigeradorModalOpen}
        onOpenChange={handleModalClose}
        refrigerador={editingRefrigerador}
      />
      <PisosFormModal
        open={isPisosModalOpen}
        onOpenChange={handleModalClose}
        refrigerador={pisosRefrigerador}
      />
      <CajaFormModal
        open={isCajaModalOpen}
        onOpenChange={(open) => { if (!open) { setIsCajaModalOpen(false); setEditingCaja(null) } }}
        caja={editingCaja}
      />
      <PosicionesModal
        open={viewingCaja !== null}
        onOpenChange={(open) => { if (!open) setViewingCaja(null) }}
        caja={viewingCaja}
      />
    </div>
  )
}
