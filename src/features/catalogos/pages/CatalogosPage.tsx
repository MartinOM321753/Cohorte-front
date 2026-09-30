import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function CatalogosPage() {
  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Catálogos</h1>
        <p className="section-subtitle">
          Gestiona catálogos maestros del sistema (tipos de estudios, exámenes, parámetros)
        </p>
      </div>

      <RoleGuard allowedRoles={['ADMINISTRADOR']}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Los catálogos contienen datos de referencia utilizados en todo el sistema.
            Solo administradores pueden modificarlos.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Estudios</CardTitle>
              <CardDescription>Estudios médicos disponibles</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Crear tipos de estudios<br />
              ✓ Definir parámetros por estudio<br />
              ✓ Activar/desactivar tipos
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exámenes de Laboratorio</CardTitle>
              <CardDescription>Catálogo de análisis disponibles</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Crear nuevos exámenes<br />
              ✓ Definir rangos de referencia<br />
              ✓ Por género (M/F/O)
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parámetros de Estudios</CardTitle>
              <CardDescription>Variables medibles por estudio</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Crear parámetros (numérico, texto, booleano)<br />
              ✓ Definir unidades<br />
              ✓ Ordenamiento y categorización
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles y Permisos</CardTitle>
              <CardDescription>Gestión de accesos al sistema</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm">
              ✓ Visualizar roles disponibles<br />
              ✓ Ver permisos asignados<br />
              ✓ Administrador: acceso total
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    </div>
  )
}
