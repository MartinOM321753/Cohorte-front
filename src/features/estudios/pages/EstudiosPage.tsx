import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import { EstudiosTab } from '../components/EstudiosTab'
import { TiposEstudioTab } from '../components/TiposEstudioTab'

export default function EstudiosPage() {
  const [activeTab, setActiveTab] = useState('estudios')

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
            Este módulo requiere un backend activo. Esta sección evita modales grandes: el registro y catálogos se gestionan en página.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="estudios">Estudios</TabsTrigger>
            <TabsTrigger value="catalogos">Catálogos</TabsTrigger>
          </TabsList>

          <TabsContent value="estudios" className="space-y-4">
            <EstudiosTab />
          </TabsContent>

          <TabsContent value="catalogos" className="space-y-4">
            <TiposEstudioTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

