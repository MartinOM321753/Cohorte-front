/**
 * EstudiosMuestraPanel
 * Panel lateral que muestra todos los EstudioMuestra realizados a una muestra
 * y permite registrar uno nuevo.
 */
import { useState } from 'react'
import {
  AlertCircle, BeakerIcon, ChevronDown, ChevronRight, ClipboardList, Plus, Trash2,
} from 'lucide-react'

import type { MuestraDetalleDTO, EstudioMuestraResponse } from '@/types/api'
import {
  useGetEstudiosByMuestra,
  useDeleteEstudioMuestra,
} from '../hooks/useEstudiosMuestra'
import { LlenadoEstudioMuestraForm } from './LlenadoEstudioMuestraForm'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/authStore'
import { HistorialMuestraPanel } from './HistorialMuestraPanel'
import { cn } from '@/lib/utils'

// ─── EstudioItem ──────────────────────────────────────────────────────────────

function EstudioItem({ estudio, idMuestra }: { estudio: EstudioMuestraResponse; idMuestra: number }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const deleteMutation = useDeleteEstudioMuestra(idMuestra)
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.rol === 'ADMINISTRADOR'

  const resultados = estudio.resultados ?? []
  // Parsear la fecha como local (no UTC) para evitar desplazamiento de zona horaria
  const fecha = (() => {
    const [y, mo, d] = estudio.fechaEstudio.split('-').map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  })()

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-card hover:bg-muted/20 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{estudio.tipoEstudioMuestra?.nombre ?? '—'}</span>
            <Badge variant="outline" className="text-xs shrink-0">{fecha}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {estudio.usuarioRealiza?.nombreCompleto ?? '—'}
            {estudio.cantidadConsumida != null && estudio.unidadConsumida && (
              <> · <span className="font-medium">{estudio.cantidadConsumida} {estudio.unidadConsumida} consumidos</span></>
            )}
            {' · '}{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            className="ml-2 shrink-0 text-destructive hover:text-destructive/80"
            onClick={e => { e.stopPropagation(); setConfirmarEliminar(true) }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </button>

      {/* Resultados expandidos */}
      {expanded && resultados.length > 0 && (
        <div className="border-t px-3 py-2 space-y-1">
          {resultados.map(r => (
            <div key={r.id} className="flex items-baseline justify-between gap-4 py-0.5">
              <span className="text-xs text-muted-foreground">{r.parametro}</span>
              <span className={cn('text-xs font-medium text-right', 'tabular-nums')}>
                {r.valorNumerico != null && String(r.valorNumerico)}
                {r.valorTexto != null && r.valorTexto}
                {r.valorBooleano != null && (r.valorBooleano ? 'Sí' : 'No')}
              </span>
            </div>
          ))}
        </div>
      )}

      {expanded && resultados.length === 0 && (
        <div className="border-t px-3 py-2">
          <p className="text-xs text-muted-foreground">Sin resultados registrados.</p>
        </div>
      )}

      {/* Confirmar eliminación */}
      <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán el estudio "{estudio.tipoEstudioMuestra?.nombre}" del {fecha} y todos sus resultados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(estudio.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  muestra: MuestraDetalleDTO
}

function EstudiosTab({ muestra }: { muestra: MuestraDetalleDTO }) {
  const { data: estudios = [], isLoading, isError } = useGetEstudiosByMuestra(muestra.id)
  const [registrando, setRegistrando] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => setRegistrando(v => !v)}>
          {registrando ? 'Cancelar' : <><Plus className="h-3 w-3" /> Registrar estudio</>}
        </Button>
      </div>

      {/* Formulario de registro */}
      {registrando && (
        <LlenadoEstudioMuestraForm
          muestra={muestra}
          onSuccess={() => setRegistrando(false)}
        />
      )}

      {/* Lista de estudios */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
          <Spinner className="h-4 w-4" /> Cargando estudios…
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al cargar los estudios.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && estudios.length === 0 && !registrando && (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <BeakerIcon className="h-8 w-8 opacity-30" />
          <div>
            <p className="font-medium text-sm">Sin estudios registrados</p>
            <p className="text-xs mt-1">Usa el botón "Registrar estudio" para agregar el primero.</p>
          </div>
        </div>
      )}

      {!isLoading && !isError && estudios.length > 0 && (
        <div className="space-y-2">
          {estudios.map(e => (
            <EstudioItem key={e.id} estudio={e} idMuestra={muestra.id} />
          ))}
        </div>
      )}

      {/* Info note */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Estos estudios corresponden a la <strong>calidad y caracterización de la muestra biológica</strong>
          (DNA, RNA, proteínas, integridad…). Son independientes de los estudios médicos del paciente.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export function EstudiosMuestraPanel({ muestra }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">
          Muestra: <span className="font-medium">{muestra.etiqueta}</span>
          {muestra.tipoMuestra && <> · {muestra.tipoMuestra.nombre}</>}
        </p>
      </div>

      <Tabs defaultValue="estudios">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="estudios" className="gap-1 text-xs">
            <ClipboardList className="h-3.5 w-3.5" /> Estudios
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1 text-xs">
            <BeakerIcon className="h-3.5 w-3.5" /> Historial de cambios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estudios" className="mt-4">
          <EstudiosTab muestra={muestra} />
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <HistorialMuestraPanel muestra={muestra} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
