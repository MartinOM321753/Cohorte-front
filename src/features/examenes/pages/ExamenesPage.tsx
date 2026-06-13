import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExamenesTab } from '@/features/estudios/components/ExamenesTab'
import { ResultadosExamenTab } from '@/features/estudios/components/ResultadosExamenTab'

export default function ExamenesPage() {
  const [activeTab, setActiveTab] = useState('resultados')

  return (
    <RoleGuard allowedRoles={['MEDICO', 'ADMINISTRADOR', 'LABORATORISTA']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Exámenes de laboratorio"
          subtitle="Catálogo de exámenes y registro de resultados por participante."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            <TabsTrigger value="examenes">Catálogo de exámenes</TabsTrigger>
          </TabsList>

          <TabsContent value="resultados" className="space-y-4">
            <ResultadosExamenTab />
          </TabsContent>

          <TabsContent value="examenes" className="space-y-4">
            <ExamenesTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
