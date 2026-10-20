import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, FileWarning, Lock, Scale, Unlock,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { BloqueFormulario } from './BloqueFormulario'
import { DiscrepanciasPanel } from './DiscrepanciasPanel'
import { EstadoCuestionarioBadge } from './EstadoCuestionarioBadge'
import {
  useBloques, useCerrarCuestionario, useCuestionario, useCuestionarios, useFaltantes,
  useReabrirCuestionario, useTiposCuestionario, useValidarCuestionario,
} from '../hooks/useCuestionarios'

/**
 * Llenado de cuestionarios: la lista y, al elegir uno, el formulario por bloques.
 *
 * <h3>Por qué la pantalla se parte en bloques y no es un formulario largo</h3>
 *
 * El instrumento principal pasa de dos mil preguntas repartidas en más de cien bloques.
 * Un formulario completo serían megabytes de HTML, el navegador tardaría en pintarlo y
 * nadie podría volver a encontrar la pregunta que estaba contestando. Cada bloque se pide
 * y se guarda por su cuenta, como una página del papel.
 */
export function LlenadoCuestionarioTab() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeValidar = hasPermiso('CUESTIONARIOS_VALIDAR')

  const [idSeleccionado, setIdSeleccionado] = useState<number | null>(null)

  if (idSeleccionado == null) {
    return <Listado onAbrir={setIdSeleccionado} />
  }
  return (
    <Formulario
      id={idSeleccionado}
      puedeValidar={puedeValidar}
      onVolver={() => setIdSeleccionado(null)}
    />
  )
}

// ── Listado ─────────────────────────────────────────────────────────────────

function Listado({ onAbrir }: { onAbrir: (id: number) => void }) {
  const { data: tipos = [] } = useTiposCuestionario()
  const [idTipo, setIdTipo] = useState<string>('todos')
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')

  const filtroTipo = idTipo === 'todos' ? null : Number(idTipo)
  const { data, isLoading } = useCuestionarios(filtroTipo, pagina)

  // El filtro de texto se aplica sobre la página recibida, no sobre todo el padrón: es
  // una ayuda para encontrar algo que ya está a la vista. Buscar en el total es trabajo
  // del servidor y todavía no hay endpoint que lo haga.
  const filas = useMemo(() => {
    const termino = buscar.trim().toLowerCase()
    const contenido = data?.contenido ?? []
    if (!termino) return contenido
    return contenido.filter((c) =>
      c.folioParticipante.toLowerCase().includes(termino)
      || (c.nombreParticipante ?? '').toLowerCase().includes(termino)
      || (c.etiqueta ?? '').toLowerCase().includes(termino))
  }, [data, buscar])

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-base">Cuestionarios registrados</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={idTipo} onValueChange={(v) => { setIdTipo(v); setPagina(0) }}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Todos los cuestionarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los cuestionarios</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.clave} — {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-[240px]"
            placeholder="Folio, nombre o etiqueta"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : filas.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay cuestionarios que mostrar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead>Cuestionario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Sin leer</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.etiqueta ?? '—'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{c.folioParticipante}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.nombreParticipante ?? '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.claveCuestionario} — {c.nombreCuestionario}
                  </TableCell>
                  <TableCell><EstadoCuestionarioBadge estado={c.estado} /></TableCell>
                  <TableCell className="text-right">
                    {c.respuestasPendientes > 0 ? (
                      <Badge className="bg-amber-500 text-amber-50 hover:bg-amber-500">
                        {c.respuestasPendientes}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onAbrir(c.id)}>
                      Abrir
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-muted-foreground">
              Página {data.pagina + 1} de {data.totalPaginas} · {data.total} en total
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                disabled={data.pagina === 0}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={data.pagina + 1 >= data.totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Formulario ──────────────────────────────────────────────────────────────

function Formulario({ id, puedeValidar, onVolver }: {
  id: number
  puedeValidar: boolean
  onVolver: () => void
}) {
  const { data: cuestionario, isLoading } = useCuestionario(id)
  const { data: bloques = [] } = useBloques(cuestionario?.idTipoCuestionario ?? null)
  const { data: faltantes } = useFaltantes(id)

  const cerrar = useCerrarCuestionario()
  const validar = useValidarCuestionario()
  const reabrir = useReabrirCuestionario()

  const [idBloque, setIdBloque] = useState<number | null>(null)

  useEffect(() => {
    if (idBloque == null && bloques.length > 0) setIdBloque(bloques[0].id)
  }, [bloques, idBloque])

  if (isLoading || !cuestionario) {
    return <Skeleton className="h-96 w-full" />
  }

  const cerrado = cuestionario.estado === 'VALIDADO' || cuestionario.estado === 'ANULADO'
  const indice = bloques.findIndex((b) => b.id === idBloque)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={onVolver}>
                <ArrowLeft className="mr-1.5 size-4" />
                Volver al listado
              </Button>
              <CardTitle className="font-mono text-base">
                {cuestionario.etiqueta ?? cuestionario.folioParticipante}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {cuestionario.nombreParticipante ?? cuestionario.folioParticipante}
                {' · '}{cuestionario.nombreCuestionario}
              </p>
              {cuestionario.archivoOrigen && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Importado de {cuestionario.archivoOrigen}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <EstadoCuestionarioBadge estado={cuestionario.estado} />
                {cuestionario.respuestasPendientes > 0 && (
                  <Badge className="gap-1 bg-amber-500 text-amber-50 hover:bg-amber-500">
                    <FileWarning className="size-3" />
                    {cuestionario.respuestasPendientes} sin leer
                  </Badge>
                )}
                {faltantes && faltantes.total > 0 && (
                  <Badge variant="outline">{faltantes.total} obligatorias sin contestar</Badge>
                )}
              </div>
              <div className="flex gap-2">
                {cuestionario.estado === 'BORRADOR' && (
                  <Button
                    size="sm" variant="outline"
                    disabled={cerrar.isPending}
                    onClick={() => cerrar.mutate(id)}
                  >
                    <CheckCircle2 className="mr-1.5 size-4" />
                    Dar por completo
                  </Button>
                )}
                {puedeValidar && cuestionario.estado !== 'VALIDADO'
                  && cuestionario.estado !== 'ANULADO' && (
                  <Button
                    size="sm"
                    disabled={validar.isPending}
                    onClick={() => validar.mutate({ id })}
                  >
                    <Lock className="mr-1.5 size-4" />
                    Validar
                  </Button>
                )}
                {puedeValidar && cuestionario.estado === 'VALIDADO' && (
                  <Button
                    size="sm" variant="outline"
                    disabled={reabrir.isPending}
                    onClick={() => reabrir.mutate(id)}
                  >
                    <Unlock className="mr-1.5 size-4" />
                    Reabrir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {cuestionario.respuestasPendientes > 0 && (
        <DiscrepanciasPanel idCuestionario={id} puedeResolver={puedeValidar} />
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* El indice de bloques: con mas de cien, una barra de pestanas no cabe. */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bloques ({bloques.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[min(60vh,520px)]">
              <div className="space-y-0.5 pr-2">
                {bloques.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setIdBloque(b.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      b.id === idBloque ? 'bg-accent font-medium' : 'hover:bg-accent/50',
                    )}
                  >
                    <span className="truncate">
                      <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                      {b.nombre}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {b.totalVariables}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {idBloque != null && (
            <BloqueFormulario
              idCuestionario={id}
              idBloque={idBloque}
              soloLectura={cerrado}
            />
          )}

          {bloques.length > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline" size="sm"
                disabled={indice <= 0}
                onClick={() => setIdBloque(bloques[indice - 1].id)}
              >
                <ChevronLeft className="mr-1.5 size-4" />
                Bloque anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {indice + 1} de {bloques.length}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={indice < 0 || indice + 1 >= bloques.length}
                onClick={() => setIdBloque(bloques[indice + 1].id)}
              >
                Bloque siguiente
                <ChevronRight className="ml-1.5 size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {cerrado && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="size-3.5" />
          {cuestionario.estado === 'VALIDADO'
            ? `Validado por ${cuestionario.usuarioValida ?? 'un usuario'}; reábralo para modificarlo.`
            : 'Cuestionario anulado; se conserva lo capturado.'}
        </p>
      )}
    </div>
  )
}
