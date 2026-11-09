import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getEstudioResumen, getExamenResumen } from '../api/cobertura.api'
import type { CatalogoTipo, ResultadoLineaDTO } from '../types/cobertura.types'

interface Props {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  catalogoTipo:  CatalogoTipo
  uuid:          string | null
  tipoId:        number | null
  /** id del estudio/resultado a mostrar (viene en la celda de la matriz) */
  refId:         number | null
  tipoNombre:    string
  pacienteNombre: string
}

const fmtFecha = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const valorEstudio = (r: ResultadoLineaDTO): string => {
  const base =
    r.valorNumerico !== null && r.valorNumerico !== undefined ? String(r.valorNumerico)
    : r.valorTexto !== null && r.valorTexto !== undefined && r.valorTexto !== '' ? r.valorTexto
    : r.valorBooleano !== null && r.valorBooleano !== undefined ? (r.valorBooleano ? 'Sí' : 'No')
    : '—'
  return r.unidad && base !== '—' ? `${base} ${r.unidad}` : base
}

export function CeldaDetalleDialog({
  open, onOpenChange, catalogoTipo, uuid, tipoId, refId, tipoNombre, pacienteNombre,
}: Props) {
  const esEstudio = catalogoTipo === 'ESTUDIO'
  const activo = open && !!uuid && tipoId !== null

  // ── ESTUDIO: una sola petición a un endpoint mínimo (solo lo que se pinta)
  const { data: estudio, isLoading: detLoad } = useQuery({
    queryKey: ['cobertura-estudio-resumen', refId],
    queryFn: () => getEstudioResumen(refId as number),
    enabled: activo && esEstudio && refId !== null,
  })

  // ── EXAMEN: endpoint dedicado de cobertura (uuid + examenId)
  const { data: examenResumen, isLoading: exLoad } = useQuery({
    queryKey: ['cobertura-examen-resumen', uuid, tipoId],
    queryFn: () => getExamenResumen(uuid as string, tipoId as number),
    enabled: activo && !esEstudio,
  })

  const cargando = esEstudio ? detLoad : exLoad

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{tipoNombre}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {pacienteNombre}
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : esEstudio ? (
          !estudio ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontró el detalle de este estudio.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Fecha: <span className="text-foreground font-medium">{fmtFecha(estudio.fechaEstudio)}</span></span>
                {estudio.resultados.length > 0 && (
                  <span>{estudio.resultados.length} parámetro{estudio.resultados.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              {estudio.observaciones && (
                <p className="text-[12px] text-muted-foreground border-l-2 border-border pl-2">
                  {estudio.observaciones}
                </p>
              )}
              {estudio.resultados.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Este estudio no tiene parámetros capturados.
                </p>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Parámetro</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudio.resultados.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 text-foreground">
                            {r.grupoEtiqueta ? <span className="text-muted-foreground">{r.grupoEtiqueta} · </span> : null}
                            {r.parametro}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-foreground">{valorEstudio(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        ) : !examenResumen || examenResumen.resultados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontró el resultado de este examen.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="text-[12px] text-muted-foreground">
              {examenResumen.resultados.length} resultado{examenResumen.resultados.length !== 1 ? 's' : ''} registrado{examenResumen.resultados.length !== 1 ? 's' : ''}
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {examenResumen.resultados.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">{fmtFecha(r.fechaResultado)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-foreground">
                        {r.valorObtenido}{examenResumen.unidad ? ` ${examenResumen.unidad}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
