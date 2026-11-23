import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Eye } from 'lucide-react'
import { useSolicitudesDatos, useCambiarEstadoSolicitud } from '../hooks/useSolicitudesDatos'
import type { SolicitudAccesoDatosResponse } from '../api/solicitudesDatos.api'

const ESTADO_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE: 'outline',
  REVISADA: 'secondary',
  APROBADA: 'default',
  RECHAZADA: 'destructive',
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  REVISADA: 'Revisada',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
}

const PRODUCTO_LABEL: Record<string, string> = {
  article: 'Artículo científico',
  thesis: 'Tesis o trabajo de grado',
  report: 'Informe técnico',
  conference: 'Presentación en congreso',
  other: 'Otro',
  undefined: 'Aún no definido',
}

const PROPOSITO_LABEL: Record<string, string> = {
  academic: 'Investigación académica', thesis: 'Desarrollo de tesis o trabajo de grado',
  teaching: 'Docencia o formación', policy: 'Análisis o evaluación de políticas públicas',
  journalism: 'Periodismo o divulgación científica',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SolicitudesDatosPanel() {
  const { data: solicitudes, isLoading } = useSolicitudesDatos()
  const cambiarEstado = useCambiarEstadoSolicitud()
  const [detalle, setDetalle] = useState<SolicitudAccesoDatosResponse | null>(null)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-700" />
            <div>
              <CardTitle>Historial de solicitudes de acceso a datos</CardTitle>
              <CardDescription>
                Registro de todas las solicitudes recibidas desde el sitio público. Puede cambiar el estado de cada una.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !solicitudes?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No se han recibido solicitudes todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Organización</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.id}</TableCell>
                      <TableCell className="font-medium">{s.nombreCompleto}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.organizacion}</TableCell>
                      <TableCell className="font-mono text-sm">{s.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(s.fechaSolicitud)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={s.estado}
                          onValueChange={estado => cambiarEstado.mutate({ id: s.id, estado })}
                          disabled={cambiarEstado.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ESTADO_LABEL).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(s)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog detalle */}
      <Dialog open={!!detalle} onOpenChange={open => { if (!open) setDetalle(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detalle && (
            <>
              <DialogHeader>
                <DialogTitle>Solicitud #{detalle.id}</DialogTitle>
                <DialogDescription>
                  Enviada el {formatDate(detalle.fechaSolicitud)}
                  {' · '}
                  <Badge variant={ESTADO_BADGE[detalle.estado]}>{ESTADO_LABEL[detalle.estado]}</Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <section>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Datos del solicitante</h4>
                  <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Nombre</dt>
                    <dd>{detalle.nombreCompleto}</dd>
                    <dt className="text-muted-foreground">Organización</dt>
                    <dd>{detalle.organizacion}</dd>
                    <dt className="text-muted-foreground">Correo</dt>
                    <dd className="font-mono">{detalle.email}</dd>
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd>{detalle.telefono || '—'}</dd>
                    <dt className="text-muted-foreground">Correo verificado</dt>
                    <dd>{detalle.correoVerificadoEn ? formatDate(detalle.correoVerificadoEn) : 'Sin registro previo'}</dd>
                  </dl>
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Propósito de la solicitud</h4>
                  <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Propósito</dt>
                    <dd>{detalle.proposito === 'other' ? detalle.propositoOtro : PROPOSITO_LABEL[detalle.proposito] || detalle.proposito}</dd>
                    <dt className="text-muted-foreground">Proyecto</dt>
                    <dd className="whitespace-pre-wrap">{detalle.proyecto}</dd>
                    <dt className="text-muted-foreground">Información solicitada</dt>
                    <dd className="whitespace-pre-wrap">{detalle.informacionSolicitada}</dd>
                  </dl>
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Productos académicos</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detalle.productos.map(p => (
                      <Badge key={p} variant="secondary">{PRODUCTO_LABEL[p] || p}</Badge>
                    ))}
                  </div>
                  {detalle.productoOtro && (
                    <p className="text-sm text-muted-foreground mt-2">Otro: {detalle.productoOtro}</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Origen del contacto</h4>
                  <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">IP de conexión</dt><dd>{detalle.ipSolicitante}</dd>
                    <dt className="text-muted-foreground">País de conexión</dt><dd>{detalle.conexionPais || '—'}</dd>
                    <dt className="text-muted-foreground">Revisión de red</dt><dd>{detalle.conexionProveedor || 'Sin registro previo'}</dd>
                    <dt className="text-muted-foreground">Ubicación del navegador</dt>
                    <dd>{detalle.ubicacionLatitud != null && detalle.ubicacionLongitud != null ? `${detalle.ubicacionLatitud.toFixed(5)}, ${detalle.ubicacionLongitud.toFixed(5)}` : '—'}</dd>
                    <dt className="text-muted-foreground">Precisión aproximada</dt><dd>{detalle.ubicacionPrecision != null ? `${Math.round(detalle.ubicacionPrecision)} m` : '—'}</dd>
                    <dt className="text-muted-foreground">Fecha de ubicación</dt><dd>{detalle.ubicacionCapturadaEn ? formatDate(detalle.ubicacionCapturadaEn) : '—'}</dd>
                  </dl>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
