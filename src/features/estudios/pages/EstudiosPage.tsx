import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LlenadoEstudioTab } from '../components/LlenadoEstudioTab'
import { TiposEstudioTab } from '../components/TiposEstudioTab'

export default function EstudiosPage() {
  const [activeTab, setActiveTab] = useState('llenado')

  return (
    <RoleGuard allowedRoles={['MEDICO', 'ADMINISTRADOR']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Estudios médicos"
          subtitle="Registro y gestión de estudios médicos especializados por paciente."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="llenado">Llenado</TabsTrigger>
            <TabsTrigger value="catalogos">Catálogos</TabsTrigger>
          </TabsList>

          <TabsContent value="llenado" className="space-y-4">
            <LlenadoEstudioTab />
          </TabsContent>

          <TabsContent value="catalogos" className="space-y-4">
            <TiposEstudioTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
