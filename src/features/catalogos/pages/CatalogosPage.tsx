import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { AlertCircle } from 'lucide-react'

export default function CatalogosPage() {
  return (
    <RoleGuard allowedRoles={['ADMINISTRADOR']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Catálogos"
          subtitle="Catálogos maestros del sistema para configuración clínica."
        />

        <Alert>
          <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
          <AlertDescription>
            Los catálogos contienen datos de referencia utilizados en todo el sistema. Solo usuarios con rol
            administrador pueden modificarlos.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de estudio</CardTitle>
              <CardDescription>Estudios médicos disponibles</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Cree tipos de estudio y defina su descripción y estado.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exámenes de laboratorio</CardTitle>
              <CardDescription>Catálogo de análisis disponibles</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Gestione exámenes y rangos de referencia por criterio clínico.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parámetros</CardTitle>
              <CardDescription>Variables por tipo de estudio</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Configure parámetros numéricos, de texto y booleanos, así como unidades y agrupación.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles y permisos</CardTitle>
              <CardDescription>Accesos del sistema</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consulte roles disponibles y permisos asociados para auditoría y control de acceso.
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  )
}

