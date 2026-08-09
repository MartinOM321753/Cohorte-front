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
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react'
import {
  useGetVisibilidadHijas,
  useFijarVisibilidadHija,
  useFijarVisibilidadDefecto,
} from '../hooks/useInstituciones'
import { Institucion } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  institucion: Institucion | null
}

/**
 * Decide de qué instituciones hijas se quieren ver los participantes.
 *
 * Hasta ahora ver a las descendientes era una constante del sistema. Aquí se
 * vuelve una decisión, con dos niveles: un interruptor general que arrastra a
 * todas —incluidas las sedes que se creen después— y excepciones por hija.
 *
 * Lo que se apaga es la vista de participantes, no la administración: la hija
 * oculta sigue apareciendo en esta pantalla y se le siguen gestionando usuarios,
 * catálogos y módulos. Si no fuera así, ocultarla sería irreversible.
 */
export function VisibilidadHijasModal({ open, onOpenChange, institucion }: Props) {
  const idInstitucion = institucion?.id ?? null

  const { data: hijas = [], isLoading } = useGetVisibilidadHijas(open ? idInstitucion : null)
  const fijarHija = useFijarVisibilidadHija(idInstitucion)
  const fijarDefecto = useFijarVisibilidadDefecto(idInstitucion)

  const isPending = fijarHija.isPending || fijarDefecto.isPending
  const ocultas = hijas.filter((h) => !h.verParticipantes).length
  const todasVisibles = hijas.length > 0 && ocultas === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Participantes de las instituciones hijas
          </DialogTitle>
          <DialogDescription>
            {institucion
              ? <>Elige de qué sedes bajo <strong>{institucion.nombre}</strong> quieres ver los participantes en búsquedas, listados y cobertura.</>
              : 'Selecciona una institución'}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[12px] leading-snug">
            Ocultar una sede oculta también las que cuelgan de ella, y deja de permitir
            registrar participantes a su nombre. No afecta a la administración: sigues
            gestionando sus usuarios, catálogos y módulos. Lo que ya le registraste a esos
            participantes se conserva y se consulta en «Participantes que ya no gestionas».
          </AlertDescription>
        </Alert>

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
          <>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Todas las hijas</span>
                <span className="text-[11px] text-muted-foreground">
                  Aplica también a las sedes que se creen después
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isPending}
                  onClick={() => fijarDefecto.mutate(true)}
                >
                  <Eye className="mr-1 h-3 w-3" /> Ver todas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isPending}
                  onClick={() => fijarDefecto.mutate(false)}
                >
                  <EyeOff className="mr-1 h-3 w-3" /> Ninguna
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {hijas.map((hija) => (
                <div
                  key={hija.idHija}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{hija.nombre}</span>
                    {!hija.verParticipantes && (
                      <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
                        No ves sus participantes
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={hija.verParticipantes}
                    disabled={isPending}
                    onCheckedChange={(value) =>
                      fijarHija.mutate({ idHija: hija.idHija, verParticipantes: value })
                    }
                  />
                </div>
              ))}
            </div>

            {!todasVisibles && (
              <p className="text-[11px] text-muted-foreground">
                {ocultas === hijas.length
                  ? 'No ves los participantes de ninguna sede hija.'
                  : `No ves los participantes de ${ocultas} de ${hijas.length} sedes hijas.`}
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
