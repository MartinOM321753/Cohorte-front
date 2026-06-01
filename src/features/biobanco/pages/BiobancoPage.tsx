import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import { RefrigeradoresTab } from '../components/RefrigeradoresTab'
import { CajasTab } from '../components/CajasTab'
import { MuestrasTab } from '../components/MuestrasTab'
import { AlmacenesTab } from '../components/AlmacenesTab'

export default function BiobancoPage() {
  const [activeTab, setActiveTab] = useState('refrigeradores')

  return (
    <RoleGuard allowedRoles={['LABORATORISTA', 'ADMINISTRADOR']}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Biobanco"
          subtitle="Refrigeradores criogénicos · pisos · cajas · posiciones · traslados."
        />

        <Alert>
          <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
          <AlertDescription>
            Sistema de almacenamiento criogénico jerárquico: Refrigerador → Piso → Caja → Muestra. Las muestras pueden trasladarse a laboratorios externos registrados en Almacenes.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="refrigeradores">Refrigeradores</TabsTrigger>
            <TabsTrigger value="cajas">Cajas criogénicas</TabsTrigger>
            <TabsTrigger value="muestras">Muestras</TabsTrigger>
            <TabsTrigger value="almacenes">Almacenes</TabsTrigger>
          </TabsList>

          <TabsContent value="refrigeradores" className="space-y-4">
            <RefrigeradoresTab />
          </TabsContent>

          <TabsContent value="cajas" className="space-y-4">
            <CajasTab />
          </TabsContent>

          <TabsContent value="muestras" className="space-y-4">
            <MuestrasTab />
          </TabsContent>

          <TabsContent value="almacenes" className="space-y-4">
            <AlmacenesTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
