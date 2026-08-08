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
import { UserPlus, AlertCircle, Network } from 'lucide-react'
import {
  useGetInstitucionesHijas,
  useGetPermisosRegistroOtorgados,
  useGetPermisosRegistroRecibidos,
  useOtorgarPermisoRegistro,
  useRevocarPermisoRegistro,
} from '../hooks/useInstituciones'
import { Institucion } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  institucion: Institucion | null
}

/**
 * Autoriza, desde la institución padre, a qué hijas se les permite registrar
 * participantes a nombre de otras sedes del grupo — el propio padre y las
 * hermanas.
 *
 * Se diferencia del permiso de acceso a pacientes por su alcance: aquel abre el
 * padrón de la institución que otorga, y este el del grupo entero — el padre y
 * todas sus hijas.
 *
 * Sin autorización cada sede registra y atiende únicamente lo suyo y lo de sus
 * descendientes, que es como venía funcionando.
 */
export function PermisosRegistroParticipantesModal({ open, onOpenChange, institucion }: Props) {
  const idInstitucion = institucion?.id ?? null

  const { data: hijas = [], isLoading: isLoadingHijas } = useGetInstitucionesHijas(open ? idInstitucion : null)
  const { data: otorgados = [], isLoading: isLoadingOtorgados } = useGetPermisosRegistroOtorgados(open ? idInstitucion : null)
  const { data: recibidos = [] } = useGetPermisosRegistroRecibidos(open ? idInstitucion : null)

  const otorgarMutation = useOtorgarPermisoRegistro(idInstitucion)
  const revocarMutation = useRevocarPermisoRegistro(idInstitucion)

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
            <UserPlus className="h-5 w-5 text-primary" />
            Registro de participantes en el grupo
          </DialogTitle>
          <DialogDescription>
            {institucion
              ? <>Define qué instituciones hijas pueden registrar participantes a nombre de <strong>{institucion.nombre}</strong> y de las demás hijas. Sin esta autorización, cada sede solo registra para sí misma.</>
              : 'Selecciona una institución'}
          </DialogDescription>
        </DialogHeader>

        {recibidos.length > 0 && (
          <Alert>
            <Network className="h-4 w-4" />
            <AlertDescription>
              Esta institución ya puede registrar participantes en el grupo de:{' '}
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
                        Registra para {institucion?.nombre} y las demás hijas
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

        <p className="text-[11px] leading-snug text-muted-foreground">
          Esta autorización abre el grupo completo: la hija podrá dar de alta participantes a
          nombre del padre y de sus hermanas, y también verlos y atenderlos. Sería incoherente
          dejarla registrar en una sede que después no puede abrir.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
