import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
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
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const hasAnyPermiso = useAuthStore((s) => s.hasAnyPermiso)

  const tabs = [
    { value: 'unidades', label: 'Unidades', visible: true },
    { value: 'tipos-estudio', label: 'Tipos de Estudio', visible: hasAnyPermiso(['ESTUDIOS_TIPOS_LOOKUP', 'ESTUDIOS_CATALOGO_ACCEDER']) },
    { value: 'examenes', label: 'Exámenes', visible: hasAnyPermiso(['EXAMENES_LOOKUP', 'EXAMENES_CATALOGO_ACCEDER']) },
    { value: 'tipos-muestra', label: 'Tipos de Muestra', visible: hasAnyPermiso(['TIPOS_MUESTRA_LOOKUP', 'TIPOS_MUESTRA_ACCEDER']) },
    { value: 'estudios-muestra', label: 'Est. de Muestra', visible: hasAnyPermiso(['ESTUDIOS_MUESTRA_LOOKUP', 'ESTUDIOS_MUESTRA_ACCEDER']) },
  ]
  const visibleTabs = tabs.filter((t) => t.visible)
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.value ?? 'unidades')

  return (
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
          <TabsList className="flex w-full flex-wrap">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1">{t.label}</TabsTrigger>
            ))}
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
  )
}
