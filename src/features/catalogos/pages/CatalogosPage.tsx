import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Copy } from 'lucide-react'
import { UnidadesPanel } from '../components/UnidadesPanel'
import { TipoMuestraAdminPanel } from '../components/TipoMuestraAdminPanel'
import { CopiarCatalogosDialog } from '../components/CopiarCatalogosDialog'
import { TiposEstudioTab } from '@/features/estudios/components/TiposEstudioTab'
import { ExamenesTab } from '@/features/estudios/components/ExamenesTab'
import { TipoEstudioMuestraAdminTab } from '@/features/biobanco/components/TipoEstudioMuestraAdminTab'
import { useAuthStore } from '@/stores/authStore'

export default function CatalogosPage() {
  const [activeTab, setActiveTab] = useState('unidades')
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const hasPermiso = useAuthStore((s) => s.hasPermiso)

  return (
    <RoleGuard allowedRoles={['ADMINISTRADOR']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Catálogos"
          subtitle="Catálogos maestros del sistema para configuración clínica."
          actions={
            hasPermiso('CATALOGOS_EDITAR') && (
              <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar catálogos
              </Button>
            )
          }
        />

        <Alert>
          <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
          <AlertDescription>
            Los catálogos contienen datos de referencia utilizados en todo el sistema. Solo usuarios con rol
            administrador pueden modificarlos.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="unidades">Unidades</TabsTrigger>
            <TabsTrigger value="tipos-estudio">Tipos de Estudio</TabsTrigger>
            <TabsTrigger value="examenes">Exámenes</TabsTrigger>
            <TabsTrigger value="tipos-muestra">Tipos de Muestra</TabsTrigger>
            <TabsTrigger value="estudios-muestra">Est. de Muestra</TabsTrigger>
          </TabsList>

          <TabsContent value="unidades" className="space-y-4">
            <UnidadesPanel />
          </TabsContent>

          <TabsContent value="tipos-estudio" className="space-y-4">
            <TiposEstudioTab />
          </TabsContent>

          <TabsContent value="examenes" className="space-y-4">
            <ExamenesTab />
          </TabsContent>

          <TabsContent value="tipos-muestra" className="space-y-4">
            <TipoMuestraAdminPanel />
          </TabsContent>

          <TabsContent value="estudios-muestra" className="space-y-4">
            <TipoEstudioMuestraAdminTab />
          </TabsContent>
        </Tabs>

        <CopiarCatalogosDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen} />
      </div>
    </RoleGuard>
  )
}
