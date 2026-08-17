import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Network, Search } from 'lucide-react'
import {
  useGetInstitucionesHijas,
  useGetPermisosAccesoPacientesOtorgados,
  useGetPermisosAccesoPacientesRecibidos,
  useOtorgarPermisoAccesoPacientes,
  useRevocarPermisoAccesoPacientes,
  useSearchInstituciones,
} from '../hooks/useInstituciones'
import { useDebounce } from '@/hooks/useDebounce'
import { Institucion } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  institucion: Institucion | null
}

/** Una institución con su interruptor. Misma pinta la liste el bloque que la liste. */
function FilaInstitucion({ nombre, checked, disabled, nombrePadron, onToggle }: {
  nombre: string
  checked: boolean
  disabled: boolean
  nombrePadron?: string
  onToggle: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{nombre}</span>
        {checked && (
          <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
            Atiende a los participantes de {nombrePadron}
          </Badge>
        )}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onToggle} />
    </div>
  )
}

/**
 * Gestiona a qué otras instituciones se abre el padrón de ésta.
 *
 * Antes solo se podía otorgar a las hijas, y eso dejaba fuera el caso natural de
 * dos sedes hermanas que quieren colaborar. Ahora se puede otorgar a cualquier
 * institución: las hijas siguen listadas arriba por ser el caso habitual, y el
 * buscador cubre al resto. Una colaboración mutua son dos permisos, uno por
 * lado, y cada institución revoca el suyo cuando quiera.
 *
 * También muestra, en solo lectura, de quién ha recibido acceso esta institución,
 * para que quede claro de dónde viene lo que ve.
 */
export function PermisosAccesoPacientesModal({ open, onOpenChange, institucion }: Props) {
  const idInstitucion = institucion?.id ?? null

  const { data: hijas = [], isLoading: isLoadingHijas } = useGetInstitucionesHijas(open ? idInstitucion : null)
  const { data: otorgados = [], isLoading: isLoadingOtorgados } = useGetPermisosAccesoPacientesOtorgados(open ? idInstitucion : null)
  const { data: recibidos = [] } = useGetPermisosAccesoPacientesRecibidos(open ? idInstitucion : null)

  const otorgarMutation = useOtorgarPermisoAccesoPacientes(idInstitucion)
  const revocarMutation = useRevocarPermisoAccesoPacientes(idInstitucion)

  const [busqueda, setBusqueda] = useState('')
  const busquedaDebounced = useDebounce(busqueda, 350)
  const { data: resultados } = useSearchInstituciones(
    busquedaDebounced, true, 0, 8, open && busquedaDebounced.trim().length > 1,
  )

  const permisoPorHija = useMemo(() => {
    const map = new Map<number, typeof otorgados[number]>()
    for (const permiso of otorgados) {
      map.set(permiso.institucionRecibeId, permiso)
    }
    return map
  }, [otorgados])

  // Las que ya tienen permiso vivo y no son hijas: se listan aparte para que no
  // haya que buscarlas de nuevo para revocarlas.
  const idsHijas = useMemo(() => new Set(hijas.map((h) => h.id)), [hijas])
  const otrasConPermiso = useMemo(
    () => otorgados.filter((p) => p.habilitado && !idsHijas.has(p.institucionRecibeId)),
    [otorgados, idsHijas],
  )

  const candidatasBusqueda = useMemo(() => {
    const yaListadas = new Set<number>([
      ...idsHijas,
      ...otrasConPermiso.map((p) => p.institucionRecibeId),
      ...(idInstitucion != null ? [idInstitucion] : []),
    ])
    return (resultados?.content ?? []).filter((i) => !yaListadas.has(i.id))
  }, [resultados, idsHijas, otrasConPermiso, idInstitucion])

  const isLoading = isLoadingHijas || isLoadingOtorgados

  const handleToggle = (idHija: number, checked: boolean) => {
    if (idInstitucion == null) return
    if (checked) {
      otorgarMutation.mutate(idHija)
    } else {
      revocarMutation.mutate(idHija)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Permisos de acceso a pacientes
          </DialogTitle>
          <DialogDescription>
            {institucion
              ? <>Define qué instituciones pueden <strong>ver y atender</strong> a los participantes de <strong>{institucion.nombre}</strong>. Por defecto, ninguna. Para colaborar de ida y vuelta con otra sede, cada una tiene que abrir el suyo.</>
              : 'Selecciona una institución'}
          </DialogDescription>
        </DialogHeader>

        {recibidos.length > 0 && (
          <Alert>
            <Network className="h-4 w-4" />
            <AlertDescription>
              Esta institución ya puede ver pacientes de:{' '}
              {recibidos.map(p => p.institucionOtorgaNombre).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {hijas.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Instituciones hijas
                </p>
                {hijas.map((hija) => (
                  <FilaInstitucion
                    key={hija.id}
                    nombre={hija.nombre}
                    checked={permisoPorHija.get(hija.id)?.habilitado ?? false}
                    disabled={otorgarMutation.isPending || revocarMutation.isPending}
                    nombrePadron={institucion?.nombre}
                    onToggle={(value) => handleToggle(hija.id, value)}
                  />
                ))}
              </div>
            )}

            {otrasConPermiso.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Otras instituciones con acceso
                </p>
                {otrasConPermiso.map((permiso) => (
                  <FilaInstitucion
                    key={permiso.institucionRecibeId}
                    nombre={permiso.institucionRecibeNombre}
                    checked
                    disabled={otorgarMutation.isPending || revocarMutation.isPending}
                    nombrePadron={institucion?.nombre}
                    onToggle={(value) => handleToggle(permiso.institucionRecibeId, value)}
                  />
                ))}
              </div>
            )}

            <div className="space-y-1">
              <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Dar acceso a otra institución
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar institución por nombre…"
                  className="h-8 pl-8 text-[13px]"
                />
              </div>
              {busquedaDebounced.trim().length > 1 && candidatasBusqueda.length === 0 && (
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  Sin resultados nuevos para «{busquedaDebounced}».
                </p>
              )}
              {candidatasBusqueda.map((otra) => (
                <FilaInstitucion
                  key={otra.id}
                  nombre={otra.nombre}
                  checked={permisoPorHija.get(otra.id)?.habilitado ?? false}
                  disabled={otorgarMutation.isPending || revocarMutation.isPending}
                  nombrePadron={institucion?.nombre}
                  onToggle={(value) => handleToggle(otra.id, value)}
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
