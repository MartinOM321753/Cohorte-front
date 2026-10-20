import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileWarning } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EstadoCuestionarioBadge } from './EstadoCuestionarioBadge'
import { useCuestionariosPendientes } from '../hooks/useCuestionarios'

/**
 * Los cuestionarios con celdas que el escáner no pudo leer, los más afectados primero.
 *
 * <h3>Por qué merece su propia pestaña</h3>
 *
 * Porque hoy no es un caso raro. El reconocimiento de escritura de Azure llegó sin licencia
 * en los volcados recibidos, y eso dejó sin leer casi nueve de cada diez campos de texto
 * del instrumento: todas las CURP, los teléfonos, los domicilios, los «especifique». Esa
 * cola de recaptura es trabajo real y organizado por cuestionario, no una excepción que se
 * resuelve de paso.
 *
 * <p>Si la licencia se activa y las hojas se vuelven a procesar, esta lista se vacía sola.
 * Mientras no, es por donde se empieza el día.</p>
 */
export function PendientesTab({ onAbrir }: { onAbrir?: (id: number) => void }) {
  const [pagina, setPagina] = useState(0)
  const { data, isLoading } = useCuestionariosPendientes(pagina)

  const total = data?.total ?? 0

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileWarning className="size-4 text-amber-600" />
          Pendientes de recaptura
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Celdas que el reconocimiento de escritura no leyó o que dieron error. El dato está
          en la hoja de papel; hay que buscarlo y teclearlo.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay nada pendiente de recapturar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Sin leer</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead>Cuestionario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Archivo</TableHead>
                {onAbrir && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.contenido.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-right">
                    <Badge className="bg-amber-500 text-amber-50 hover:bg-amber-500 tabular-nums">
                      {c.respuestasPendientes.toLocaleString('es-MX')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.etiqueta ?? '—'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{c.folioParticipante}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.nombreParticipante ?? '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.claveCuestionario}</TableCell>
                  <TableCell><EstadoCuestionarioBadge estado={c.estado} /></TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {c.archivoOrigen ?? '—'}
                  </TableCell>
                  {onAbrir && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => onAbrir(c.id)}>
                        Abrir
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-muted-foreground">
              Página {data.pagina + 1} de {data.totalPaginas} · {data.total} cuestionario(s)
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
