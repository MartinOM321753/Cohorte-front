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
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useGetModulosDeInstitucion,
  useOtorgarModuloInstitucion,
} from '../hooks/useInstituciones'
import { Institucion, MODULOS_SISTEMA, MODULO_LABELS, ModuloSistema } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  institucion: Institucion | null
}

/**
 * Permite a una institución ancestra (padre directo o de nivel superior) otorgar o revocar
 * el acceso de una institución a cada módulo del sistema — el equivalente a configurar los
 * "permisos de un ERP" que el usuario solicitó (Inicio, Participantes, Estudios, Exámenes,
 * Citas, Cobertura, Biobanco, etc.).
 *
 * `idOtorgante` siempre es la institución del usuario autenticado — el backend valida que
 * sea ancestra de la institución destino y rechaza la operación en caso contrario.
 */
export function InstitucionModulosModal({ open, onOpenChange, institucion }: Props) {
  const { user } = useAuthStore()
  // Use the institution id already stored in the auth session — avoids a second
  // round-trip that kept idOtorgante null (and all switches disabled) while loading.
  const idOtorgante = user?.institucion?.id ?? null

  const idInstitucion = institucion?.id ?? null
  const { data: permisos = [], isLoading } = useGetModulosDeInstitucion(open ? idInstitucion : null)
  const otorgarMutation = useOtorgarModuloInstitucion(idInstitucion)

  const habilitados = new Set(permisos.filter(p => p.habilitado).map(p => p.modulo))

  const esRaiz = institucion != null && institucion.institucionPadre == null

  // El encargado de una institución puede gestionar sus propios módulos.
  // El encargado de la institución padre también puede gestionar los módulos de sus hijas.
  const esMismaInstitucion = idOtorgante != null && idOtorgante === idInstitucion
  const esEncargadoDeEsta = user?.uuid != null && institucion?.encargado?.uuid === user?.uuid
  // No tiene autoridad si intenta auto-gestionar pero no es encargado (y la institución tiene encargado asignado)
  const noTieneAutoridad = esMismaInstitucion && !esRaiz && !esEncargadoDeEsta && institucion?.encargado != null

  const handleToggle = (modulo: ModuloSistema, checked: boolean) => {
    if (idOtorgante == null) return
    otorgarMutation.mutate({ modulo, habilitado: checked, idOtorgante })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Módulos habilitados
          </DialogTitle>
          <DialogDescription>
            {institucion
              ? <>Define a qué funcionalidades del sistema tiene acceso <strong>{institucion.nombre}</strong>, como en un ERP.</>
              : 'Selecciona una institución'}
          </DialogDescription>
        </DialogHeader>

        {noTieneAutoridad && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Solo el encargado de <strong>{institucion?.nombre}</strong> o el encargado de su institución
              superior pueden gestionar sus módulos.
            </AlertDescription>
          </Alert>
        )}

        {esRaiz && esMismaInstitucion && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Esta es una institución raíz (no depende de ninguna otra): su encargado la administra
              directamente como SUPER ADMINISTRADOR del sistema.
            </AlertDescription>
          </Alert>
        )}

        {idOtorgante == null && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No se pudo determinar tu institución. Vuelve a iniciar sesión.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            {MODULOS_SISTEMA.map((modulo) => {
              const checked = habilitados.has(modulo)
              return (
                <div
                  key={modulo}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">{MODULO_LABELS[modulo]}</span>
                  <Switch
                    checked={checked}
                    disabled={noTieneAutoridad || idOtorgante == null || otorgarMutation.isPending}
                    onCheckedChange={(value) => handleToggle(modulo, value)}
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
