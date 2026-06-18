/**
 * EstudiosMuestraPanel
 * Panel lateral que muestra todos los EstudioMuestra realizados a una muestra
 * y permite registrar uno nuevo o editar existentes.
 */
import { useState } from 'react'
import {
  AlertCircle, AlertTriangle, BeakerIcon, ChevronDown, ChevronRight,
  ClipboardList, Pencil, Plus, X,
} from 'lucide-react'

import type { MuestraDetalleDTO, EstudioMuestraResponse } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import {
  useGetEstudiosByMuestra,
} from '../hooks/useEstudiosMuestra'
import { LlenadoEstudioMuestraForm } from './LlenadoEstudioMuestraForm'
import { EdicionEstudioMuestraForm } from './EdicionEstudioMuestraForm'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistorialMuestraPanel } from './HistorialMuestraPanel'
import { cn } from '@/lib/utils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatLocalDate(iso: string) {
  const [y, mo, d] = iso.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── EstudioItem ──────────────────────────────────────────────────────────────

function EstudioItem({
  estudio,
  muestra,
  isPrestada,
  myInstitucionId,
}: {
  estudio: EstudioMuestraResponse
  muestra: MuestraDetalleDTO
  isPrestada: boolean
  myInstitucionId?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [editando, setEditando] = useState(false)

  const resultados = estudio.resultados ?? []
  const fechaEstudio = formatLocalDate(estudio.fechaEstudio)
  const fechaRegistro = estudio.fechaRegistro ? formatDateTime(estudio.fechaRegistro) : null
  const esMiEstudio = myInstitucionId != null && estudio.idInstitucionCreadora === myInstitucionId
  const puedeEditar = !isPrestada && esMiEstudio

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
            <Badge variant="outline" className="text-xs shrink-0">{fechaEstudio}</Badge>
            {!esMiEstudio && (
              <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                Externa
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {estudio.usuarioRealiza?.nombreCompleto ?? '—'}
            {estudio.cantidadConsumida != null && estudio.unidadConsumida && (
              <> · <span className="font-medium">{estudio.cantidadConsumida} {estudio.unidadConsumida} consumidos</span></>
            )}
            {' · '}{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
          </p>
          {fechaRegistro && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Registrado: {fechaRegistro}
            </p>
          )}
        </div>
        {puedeEditar && (
          <button
            className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
            title="Editar estudio"
            onClick={e => { e.stopPropagation(); setEditando(v => !v); if (!expanded) setExpanded(true) }}
          >
            {editando ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        )}
      </button>

      {/* Formulario de edición */}
      {editando && expanded && (
        <div className="border-t px-3 py-3">
          <EdicionEstudioMuestraForm
            estudio={estudio}
            muestra={muestra}
            onSuccess={() => setEditando(false)}
            onCancel={() => setEditando(false)}
          />
        </div>
      )}

      {/* Resultados expandidos (solo si no editando) */}
      {expanded && !editando && resultados.length > 0 && (
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

      {expanded && !editando && resultados.length === 0 && (
        <div className="border-t px-3 py-2">
          <p className="text-xs text-muted-foreground">Sin resultados registrados.</p>
        </div>
      )}
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
  const myInstitucionId = useAuthStore((s) => s.user?.institucion?.id)

  const isPrestada = muestra.estadoMuestra === 'PRESTADA'
  const esTenedorActual = myInstitucionId != null && muestra.idInstitucionActual === myInstitucionId
  const puedeRegistrar = esTenedorActual && !isPrestada

  return (
    <div className="space-y-4">
      {/* PRESTADA warning */}
      {isPrestada && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            La muestra está en préstamo. No se pueden registrar ni editar estudios mientras esté en tránsito.
          </AlertDescription>
        </Alert>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          className="gap-1 h-7 text-xs"
          onClick={() => setRegistrando(v => !v)}
          disabled={!puedeRegistrar}
        >
          {registrando ? 'Cancelar' : <><Plus className="h-3 w-3" /> Registrar estudio</>}
        </Button>
      </div>

      {/* Formulario de registro */}
      {registrando && puedeRegistrar && (
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
            <EstudioItem key={e.id} estudio={e} muestra={muestra} isPrestada={isPrestada} myInstitucionId={myInstitucionId} />
          ))}
        </div>
      )}

      {/* Info note */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Estos estudios corresponden a la <strong>calidad y caracterización de la muestra biológica</strong>
          (DNA, RNA, proteínas, integridad…). Son independientes de los estudios médicos del participante.
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
