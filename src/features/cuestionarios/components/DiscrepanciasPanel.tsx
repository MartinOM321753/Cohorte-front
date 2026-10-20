import { useState } from 'react'
import { ChevronDown, ChevronUp, FileWarning, Scale } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useDiscrepancias, useLecturasPendientes, useResolverDiscrepancia } from '../hooks/useCuestionarios'

/**
 * Lo que quedó sin resolver de un volcado: celdas que el escáner no leyó y celdas que
 * leyó de varias formas.
 *
 * <h3>Las dos listas son distintas y se muestran aparte</h3>
 *
 * Una celda **sin leer** no tiene ningún valor: el dato está en el papel y alguien tiene
 * que teclearlo. Una celda **en desacuerdo** tiene varios y hay que elegir. Juntarlas en
 * una sola bandeja de «pendientes» obligaría al capturista a averiguar en cada renglón
 * cuál de los dos trabajos le toca.
 *
 * <h3>La lectura en firme no es «la corrección»</h3>
 *
 * La hoja de desacuerdos del volcado parece traer un antes y un después, pero en los dos
 * archivos recibidos el valor que quedó en las respuestas es el **previo**, no el nuevo
 * —cincuenta y dos de cincuenta y dos—. Así que no hay una corrección pendiente de
 * aplicar: hay lecturas que discreparon y nadie adjudicó. La pantalla las presenta como
 * lo que son, opciones en igualdad de condiciones.
 */
export function DiscrepanciasPanel({ idCuestionario, puedeResolver }: {
  idCuestionario: number
  puedeResolver: boolean
}) {
  const { data: sinLeer = [] } = useLecturasPendientes(idCuestionario)
  const { data: desacuerdos = [] } = useDiscrepancias(idCuestionario, true)
  const resolver = useResolverDiscrepancia(idCuestionario)

  const [abierto, setAbierto] = useState(true)

  if (sinLeer.length === 0 && desacuerdos.length === 0) return null

  return (
    <Card className="border-amber-400/60">
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAbierto((a) => !a)}
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <FileWarning className="size-4 text-amber-600" />
            Lecturas por resolver
          </CardTitle>
          <div className="flex items-center gap-2">
            {sinLeer.length > 0 && (
              <Badge className="bg-amber-500 text-amber-50 hover:bg-amber-500">
                {sinLeer.length} sin leer
              </Badge>
            )}
            {desacuerdos.length > 0 && (
              <Badge variant="outline">{desacuerdos.length} en desacuerdo</Badge>
            )}
            {abierto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </button>
      </CardHeader>

      {abierto && (
        <CardContent className="space-y-6">
          {sinLeer.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-medium">
                Celdas que el escáner no pudo leer
              </h4>
              <p className="text-xs text-muted-foreground">
                El dato está en el papel. Hay que buscarlo en la hoja y teclearlo en el bloque
                que le corresponde.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pregunta</TableHead>
                    <TableHead>Celda del archivo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sinLeer.slice(0, 50).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.codigoVariable}</TableCell>
                      <TableCell className="font-mono text-xs">{r.celdaOrigen ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.marcaAusencia === 'NO_AUTORIZADO'
                          ? 'El reconocimiento de escritura no estaba licenciado'
                          : 'Error de lectura de la región'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sinLeer.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  …y {sinLeer.length - 50} más. Se muestran las primeras 50.
                </p>
              )}
            </section>
          )}

          {desacuerdos.length > 0 && (
            <section className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-medium">
                <Scale className="size-4" />
                Celdas con más de una lectura
              </h4>
              <p className="text-xs text-muted-foreground">
                Ninguna está adjudicada: la que quedó guardada es la que venía en la hoja de
                respuestas, no una corrección aplicada. Elija la que corresponda al papel.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pregunta</TableHead>
                    <TableHead>Celda</TableHead>
                    <TableHead>Lecturas</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desacuerdos.map((d) => {
                    const lecturas = [
                      d.valorEnFirme,
                      ...(d.lecturasAlternas ?? '').split('|').map((s) => s.trim()),
                    ].filter((v): v is string => !!v)

                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">
                          {d.codigoVariable ?? d.columnaVolcado ?? '—'}
                          {d.idVariable == null && (
                            <Badge variant="outline" className="ml-1.5 text-[10px]">
                              sin catalogar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{d.celdaOrigen ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {lecturas.map((v, i) => (
                              <Badge
                                key={`${v}-${i}`}
                                variant={i === 0 ? 'secondary' : 'outline'}
                                className="font-mono text-xs"
                              >
                                {v}
                                {i === 0 && (
                                  <span className="ml-1 font-sans text-[10px] opacity-70">
                                    guardada
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {puedeResolver && d.idVariable != null ? (
                            <div className="flex flex-wrap justify-end gap-1">
                              {lecturas.map((v, i) => (
                                <Button
                                  key={`${v}-${i}`}
                                  size="sm"
                                  variant="outline"
                                  disabled={resolver.isPending}
                                  onClick={() => resolver.mutate({ id: d.id, valorElegido: v })}
                                >
                                  Vale {v}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {d.idVariable == null
                                ? 'Documente la pregunta primero'
                                : 'Sin permiso para adjudicar'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </section>
          )}
        </CardContent>
      )}
    </Card>
  )
}
