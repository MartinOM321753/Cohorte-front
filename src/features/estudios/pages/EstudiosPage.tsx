import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { AlertCircle } from 'lucide-react'

export default function EstudiosPage() {
  return (
    <RoleGuard allowedRoles={['MEDICO', 'ADMINISTRADOR']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Estudios médicos"
          subtitle="Registro y gestión de estudios médicos especializados."
        />

        <Alert>
          <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
          <AlertDescription>
            Este módulo requiere un backend activo. El sistema incluye un Form Engine que genera formularios a partir de
            los parámetros definidos para cada tipo de estudio.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Alcance</CardTitle>
            <CardDescription>Componentes disponibles en el frontend</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>API tipada para endpoints de estudios.</li>
              <li>Gestión de tipos de estudio.</li>
              <li>Parámetros por tipo y agrupación por secciones.</li>
              <li>Adjuntos (PDF, imágenes, video) según configuración.</li>
              <li>Validación con Zod e integración con React Query.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}

