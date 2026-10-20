import { useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, HelpCircle, Layers, Pencil, Plus, Search, Table2, Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import {
  useActualizarTipo, useBloques, useBuscarPreguntas, useCrearTipo, useDesactivarTipo,
  useEliminarTipo, usePreguntasSinDocumentar, useTodosLosTipos,
} from '../hooks/useCuestionarios'
import { DialogoBloque } from './DialogoBloque'
import { DialogoPregunta } from './DialogoPregunta'
import { PublicoFields, modoDesde, type ModoEdad } from './PublicoFields'
import type {
  BloqueCuestionario, DirigidoA, TipoCuestionario, TipoCuestionarioRequest,
} from '../api/cuestionarios.types'

/**
 * El catálogo: los instrumentos, sus bloques y sus preguntas.
 *
 * <h3>Las preguntas se buscan, no se listan</h3>
 *
 * El instrumento principal pasa de dos mil preguntas. Una tabla con todas no sirve para
 * nada —nadie recorre dos mil renglones— y además pesa megabytes. Lo que la pantalla
 * ofrece es búsqueda por código o por enunciado, que es como el investigador va a llegar a
 * «la pregunta del tabaco» sin saberse el código de memoria.
 */
export function CatalogoCuestionariosTab() {
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const puedeEditar = hasPermiso('CUESTIONARIOS_TIPOS_EDITAR')
  const puedeCrear = hasPermiso('CUESTIONARIOS_TIPOS_CREAR')
  const puedeEliminar = hasPermiso('CUESTIONARIOS_TIPOS_ELIMINAR')

  const { data: tipos = [], isLoading } = useTodosLosTipos()
  const [idTipo, setIdTipo] = useState<number | null>(null)
  const [editando, setEditando] = useState<TipoCuestionario | null>(null)
  const [creando, setCreando] = useState(false)

  const seleccionado = useMemo(
    () => tipos.find((t) => t.id === idTipo) ?? null,
    [tipos, idTipo],
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Cuestionarios del catálogo</CardTitle>
          {puedeCrear && (
            <Button size="sm" onClick={() => setCreando(true)}>
              <Plus className="mr-1.5 size-4" />
              Nuevo cuestionario
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : tipos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Todavía no hay cuestionarios. Cree uno y cargue su catálogo desde el libro de
              los investigadores.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Dirigido a</TableHead>
                  <TableHead className="text-right">Preguntas</TableHead>
                  <TableHead className="text-right">Bloques</TableHead>
                  <TableHead className="text-right">Contestados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((t) => (
                  <TableRow
                    key={t.id}
                    className={t.id === idTipo ? 'bg-accent/50' : undefined}
                  >
                    <TableCell className="font-mono font-medium">{t.clave}</TableCell>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.version}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-wrap items-center gap-1">
                        {t.dirigidoA === 'AMBOS' && t.edadMinima == null && t.edadMaxima == null
                          ? <span className="text-muted-foreground">Todos</span>
                          : <Badge variant="secondary" className="font-normal">{t.publico}</Badge>}
                        {t.permiteAutollenado && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px]">autollenado</Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              El participante puede empezarlo desde su cuenta, sin que el personal
                              se lo asigne.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.totalVariables.toLocaleString('es-MX')}
                      {t.variablesSinDocumentar > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="ml-1.5 gap-1 border-dashed text-[10px]">
                              <HelpCircle className="size-2.5" />
                              {t.variablesSinDocumentar}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {t.variablesSinDocumentar} pregunta(s) que el volcado produce y ningún
                            catálogo documenta. Se importan igual; falta redactarlas.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{t.totalBloques}</TableCell>
                    <TableCell className="text-right">
                      {t.cuestionariosContestados.toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell>
                      {t.activo
                        ? <Badge className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600">Activo</Badge>
                        : <Badge variant="secondary">Retirado</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setIdTipo(t.id)}>
                          <Layers className="mr-1.5 size-4" />
                          Ver
                        </Button>
                        {puedeEditar && (
                          <Button variant="ghost" size="icon" onClick={() => setEditando(t)}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {seleccionado && (
        <DetalleInstrumento
          tipo={seleccionado}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onCerrar={() => setIdTipo(null)}
        />
      )}

      {(creando || editando) && (
        <DialogoInstrumento
          tipo={editando}
          onCerrar={() => { setCreando(false); setEditando(null) }}
        />
      )}
    </div>
  )
}

// ── Detalle ─────────────────────────────────────────────────────────────────

function DetalleInstrumento({ tipo, puedeEditar, puedeEliminar, onCerrar }: {
  tipo: TipoCuestionario
  puedeEditar: boolean
  puedeEliminar: boolean
  onCerrar: () => void
}) {
  const { data: bloques = [] } = useBloques(tipo.id)
  const { data: sinDocumentar = [] } = usePreguntasSinDocumentar(tipo.id)
  const desactivar = useDesactivarTipo()
  const eliminar = useEliminarTipo()

  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(0)
  const [bloqueAbierto, setBloqueAbierto] = useState<BloqueCuestionario | null>(null)
  const { data: preguntas, isFetching } = useBuscarPreguntas(tipo.id, buscar, pagina)

  /**
   * La pregunta abierta en su ficha. `'nueva'` es el alta.
   *
   * Se guarda el id y no la pregunta: después de guardar, una copia en el estado
   * seguiría mostrando lo de antes, que es precisamente lo que acaba de cambiar.
   */
  const [fichaAbierta, setFichaAbierta] = useState<number | 'nueva' | null>(null)
  const preguntaEnFicha = fichaAbierta === null || fichaAbierta === 'nueva'
    ? null
    : (preguntas?.contenido ?? []).find((v) => v.id === fichaAbierta)
      ?? sinDocumentar.find((v) => v.id === fichaAbierta)
      ?? null

  // El bloque abierto se vuelve a buscar en la lista recien traida: al cambiarle la
  // presentacion, una copia guardada en el estado seguiria mostrando el valor viejo.
  const bloqueVigente = bloqueAbierto
    ? bloques.find((b) => b.id === bloqueAbierto.id) ?? null
    : null

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {tipo.clave} — {tipo.nombre}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Versión {tipo.version} · la etiqueta del volcado se lee de la columna{' '}
              <span className="font-mono">{tipo.columnaEtiqueta}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {tipo.activo && (
              <Button
                variant="outline" size="sm"
                disabled={desactivar.isPending}
                onClick={() => desactivar.mutate(tipo.id)}
              >
                Retirar de uso
              </Button>
            )}
            {puedeEliminar && tipo.cuestionariosContestados === 0 && (
              <Button
                variant="outline" size="sm"
                disabled={eliminar.isPending}
                onClick={() => { eliminar.mutate(tipo.id); onCerrar() }}
              >
                <Trash2 className="mr-1.5 size-4" />
                Eliminar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onCerrar}>Cerrar</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {sinDocumentar.length > 0 && (
          <section className="rounded-lg border border-dashed p-3">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <HelpCircle className="size-4" />
              {sinDocumentar.length} pregunta(s) sin documentar
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              El volcado produce estas columnas y ningún catálogo trae su enunciado. Se
              guardan y se importan; lo que falta es el texto de la pregunta.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {sinDocumentar.slice(0, 80).map((v) => (
                // Se abre la ficha desde aquí porque esto es la lista de trabajo: lo que
                // falta es escribirles el enunciado, y buscarlas de nuevo por código
                // una por una sería el mismo trabajo hecho dos veces.
                <button
                  key={v.id}
                  type="button"
                  disabled={!puedeEditar}
                  onClick={() => setFichaAbierta(v.id)}
                  className="rounded-md transition-opacity enabled:hover:opacity-70"
                >
                  <Badge
                    variant="outline"
                    className={cn('font-mono text-[10px]', puedeEditar && 'cursor-pointer')}
                  >
                    {v.codigo}
                  </Badge>
                </button>
              ))}
              {sinDocumentar.length > 80 && (
                <span className="self-center text-xs text-muted-foreground">
                  …y {sinDocumentar.length - 80} más
                </span>
              )}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h4 className="text-sm font-medium">Bloques ({bloques.length})</h4>
          <p className="text-xs text-muted-foreground">
            Abra uno para poner el salto del papel —la pregunta llave que apaga el resto
            del bloque— o para pintarlo como la rejilla que es en el papel.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bloques.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBloqueAbierto(b)}
                className="rounded-md transition-opacity hover:opacity-80"
              >
                <Badge variant="secondary" className="cursor-pointer gap-1.5">
                  {b.nombre}
                  <span className="opacity-60">{b.totalVariables}</span>
                  {b.presentacion === 'MATRIZ' && <Table2 className="size-3" />}
                </Badge>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium">
              Preguntas ({tipo.totalVariables.toLocaleString('es-MX')})
            </h4>
            <div className="flex items-center gap-2">
              <div className="relative w-[280px]">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Código o texto de la pregunta"
                  value={buscar}
                  onChange={(e) => { setBuscar(e.target.value); setPagina(0) }}
                />
              </div>
              {puedeEditar && (
                <Button size="sm" variant="outline" onClick={() => setFichaAbierta('nueva')}>
                  <Plus className="mr-1.5 size-4" />
                  Nueva
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Pregunta</TableHead>
                <TableHead className="w-[150px]">Tipo</TableHead>
                <TableHead className="w-[90px] text-right">Opciones</TableHead>
                <TableHead className="w-[130px]">Bloque</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching && !preguntas ? (
                [0, 1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : (preguntas?.contenido ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Ninguna pregunta coincide.
                  </TableCell>
                </TableRow>
              ) : (
                preguntas!.contenido.map((v) => (
                  <TableRow key={v.id} className={!v.activa ? 'opacity-50' : undefined}>
                    <TableCell className="font-mono text-xs">{v.codigo}</TableCell>
                    <TableCell className="text-sm">
                      {v.pregunta ?? (
                        <span className="italic text-muted-foreground">Sin enunciado</span>
                      )}
                      {v.dependeDe && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (si {v.dependeDe} = {v.valorHabilitante})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {v.tipo.replace(/_/g, ' ')}
                      </Badge>
                      {v.grupoMultiple && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="ml-1 text-[10px]">múltiple</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Se pueden marcar varias del grupo {v.grupoMultiple}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{v.opciones.length}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.nombreSeccion ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {puedeEditar && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="icon" className="size-8"
                              onClick={() => setFichaAbierta(v.id)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Enunciado, tipo, opciones, rango, instrucción
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {preguntas && preguntas.totalPaginas > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {preguntas.pagina + 1} de {preguntas.totalPaginas}
                {' · '}{preguntas.total.toLocaleString('es-MX')} preguntas
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={preguntas.pagina === 0}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={preguntas.pagina + 1 >= preguntas.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </CardContent>

      {bloqueVigente && (
        <DialogoBloque
          idTipo={tipo.id}
          bloque={bloqueVigente}
          onCerrar={() => setBloqueAbierto(null)}
        />
      )}

      {(fichaAbierta === 'nueva' || preguntaEnFicha) && (
        <DialogoPregunta
          idTipo={tipo.id}
          pregunta={preguntaEnFicha}
          bloques={bloques}
          puedeEliminar={puedeEliminar}
          onCerrar={() => setFichaAbierta(null)}
        />
      )}
    </Card>
  )
}

// ── Alta y edicion del instrumento ──────────────────────────────────────────

function DialogoInstrumento({ tipo, onCerrar }: {
  tipo: TipoCuestionario | null
  onCerrar: () => void
}) {
  const crear = useCrearTipo()
  const actualizar = useActualizarTipo()

  const [datos, setDatos] = useState<TipoCuestionarioRequest>({
    clave: tipo?.clave ?? '',
    nombre: tipo?.nombre ?? '',
    descripcion: tipo?.descripcion ?? '',
    version: tipo?.version ?? '1',
    columnaEtiqueta: tipo?.columnaEtiqueta ?? 'Folio',
    dirigidoA: tipo?.dirigidoA ?? 'AMBOS',
    permiteAutollenado: tipo?.permiteAutollenado ?? false,
    edadMinima: tipo?.edadMinima ?? null,
    edadMaxima: tipo?.edadMaxima ?? null,
    activo: tipo?.activo ?? true,
  })

  const [modoEdad, setModoEdad] = useState<ModoEdad>(
    modoDesde(tipo?.edadMinima, tipo?.edadMaxima))

  const rangoInvertido = datos.edadMinima != null && datos.edadMaxima != null
    && datos.edadMinima > datos.edadMaxima

  const bloqueado = (tipo?.cuestionariosContestados ?? 0) > 0

  async function guardar() {
    if (tipo) await actualizar.mutateAsync({ id: tipo.id, datos })
    else await crear.mutateAsync(datos)
    onCerrar()
  }

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onCerrar() }}>
      <DialogContent className="@container sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tipo ? 'Editar cuestionario' : 'Nuevo cuestionario'}</DialogTitle>
          <DialogDescription>
            La clave es el prefijo que se imprime en la etiqueta del papel, como C1 en
            C1/008601/F4. Es lo que permite saber de qué instrumento es un archivo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 @sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clave">Clave</Label>
            <Input
              id="clave"
              className="font-mono"
              placeholder="C1"
              value={datos.clave}
              disabled={bloqueado}
              onChange={(e) => setDatos((d) => ({ ...d, clave: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version">Versión del papel</Label>
            <Input
              id="version"
              placeholder="19-08-2024"
              value={datos.version}
              disabled={bloqueado}
              onChange={(e) => setDatos((d) => ({ ...d, version: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 @sm:col-span-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              placeholder="Cuestionario general"
              value={datos.nombre}
              onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 @sm:col-span-2">
            <Label htmlFor="columna">Columna de la etiqueta en el volcado</Label>
            <Input
              id="columna"
              className="font-mono"
              placeholder="Folio"
              value={datos.columnaEtiqueta ?? ''}
              onChange={(e) => setDatos((d) => ({ ...d, columnaEtiqueta: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Se configura porque no es estable: el primer archivo la llamaba
              Id-Participante y el siguiente Folio.
            </p>
          </div>
          <div className="space-y-1.5 @sm:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={2}
              value={datos.descripcion ?? ''}
              onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
            />
          </div>
          <div className="@sm:col-span-2">
            <PublicoFields
              permiteAutollenado={datos.permiteAutollenado ?? false}
              onPermiteAutollenado={(v) => setDatos((d) => ({ ...d, permiteAutollenado: v }))}
              dirigidoA={(datos.dirigidoA ?? 'AMBOS') as DirigidoA}
              edadMinima={datos.edadMinima ?? null}
              edadMaxima={datos.edadMaxima ?? null}
              modo={modoEdad}
              onDirigidoA={(v) => setDatos((d) => ({ ...d, dirigidoA: v }))}
              onModo={setModoEdad}
              onEdades={(min, max) => setDatos((d) => ({ ...d, edadMinima: min, edadMaxima: max }))}
            />
          </div>
          {tipo && (
            <div className="space-y-1.5 @sm:col-span-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={datos.activo ? 'activo' : 'retirado'}
                onValueChange={(v) => setDatos((d) => ({ ...d, activo: v === 'activo' }))}
              >
                <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="retirado">Retirado de uso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {bloqueado && (
          <p className="text-xs text-muted-foreground">
            La clave y la versión no se pueden cambiar: ya hay {tipo?.cuestionariosContestados}{' '}
            cuestionario(s) contestado(s) con este instrumento, y cambiarlas reinterpretaría
            esos datos. Para una revisión del papel, cree una versión nueva.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button
            disabled={!datos.clave || !datos.nombre || !datos.version || rangoInvertido
              || crear.isPending || actualizar.isPending}
            onClick={guardar}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
