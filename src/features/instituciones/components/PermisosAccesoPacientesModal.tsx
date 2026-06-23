import { useMemo } from 'react'
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
import { Users, AlertCircle, Network } from 'lucide-react'
import {
  useGetInstitucionesHijas,
  useGetPermisosAccesoPacientesOtorgados,
  useGetPermisosAccesoPacientesRecibidos,
  useOtorgarPermisoAccesoPacientes,
  useRevocarPermisoAccesoPacientes,
} from '../hooks/useInstituciones'
import { Institucion } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  institucion: Institucion | null
}

/**
 * Gestiona, desde la perspectiva de una institución padre, qué instituciones hijas
 * pueden ver a SUS pacientes. Por defecto una hija NO ve los pacientes del padre —
 * solo si el padre otorga el permiso explícito aquí (tabla `permiso_acceso_pacientes`).
 *
 * También muestra (solo lectura) qué permisos ha recibido esta institución de sus
 * propias instituciones ancestras, para que quede claro de dónde viene el acceso.
 */
export function PermisosAccesoPacientesModal({ open, onOpenChange, institucion }: Props) {
  const idInstitucion = institucion?.id ?? null

  const { data: hijas = [], isLoading: isLoadingHijas } = useGetInstitucionesHijas(open ? idInstitucion : null)
  const { data: otorgados = [], isLoading: isLoadingOtorgados } = useGetPermisosAccesoPacientesOtorgados(open ? idInstitucion : null)
  const { data: recibidos = [] } = useGetPermisosAccesoPacientesRecibidos(open ? idInstitucion : null)

  const otorgarMutation = useOtorgarPermisoAccesoPacientes(idInstitucion)
  const revocarMutation = useRevocarPermisoAccesoPacientes(idInstitucion)

  const permisoPorHija = useMemo(() => {
    const map = new Map<number, typeof otorgados[number]>()
    for (const permiso of otorgados) {
      map.set(permiso.institucionRecibeId, permiso)
    }
    return map
  }, [otorgados])

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
              ? <>Define qué instituciones hijas pueden ver a los pacientes de <strong>{institucion.nombre}</strong>. Por defecto, una hija NO ve los pacientes del padre.</>
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
        ) : hijas.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {institucion?.nombre ?? 'Esta institución'} no tiene instituciones hijas registradas.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1">
            {hijas.map((hija) => {
              const permiso = permisoPorHija.get(hija.id)
              const checked = permiso?.habilitado ?? false
              const isPending = otorgarMutation.isPending || revocarMutation.isPending
              return (
                <div
                  key={hija.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{hija.nombre}</span>
                    {checked && (
                      <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
                        Ve los pacientes de {institucion?.nombre}
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={checked}
                    disabled={isPending}
                    onCheckedChange={(value) => handleToggle(hija.id, value)}
                  />
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
