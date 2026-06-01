import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LlenadoEstudioTab } from '../components/LlenadoEstudioTab'
import { TiposEstudioTab } from '../components/TiposEstudioTab'
import { ExamenesTab } from '../components/ExamenesTab'
import { ResultadosExamenTab } from '../components/ResultadosExamenTab'

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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="llenado">Llenado</TabsTrigger>
            <TabsTrigger value="examenes">Exámenes Lab.</TabsTrigger>
            <TabsTrigger value="catalogos">Cat. Estudios</TabsTrigger>
            <TabsTrigger value="cat-examenes">Cat. Exámenes</TabsTrigger>
          </TabsList>

          <TabsContent value="llenado" className="space-y-4">
            <LlenadoEstudioTab />
          </TabsContent>

          <TabsContent value="examenes" className="space-y-4">
            <ResultadosExamenTab />
          </TabsContent>

          <TabsContent value="catalogos" className="space-y-4">
            <TiposEstudioTab />
          </TabsContent>

          <TabsContent value="cat-examenes" className="space-y-4">
            <ExamenesTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
