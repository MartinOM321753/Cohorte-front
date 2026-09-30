import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoleGuard } from '@/components/routes/RoleGuard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { RefrigeradoresTab } from '../components/RefrigeradoresTab'
import { CajasTab } from '../components/CajasTab'
import { MuestrasTab } from '../components/MuestrasTab'

export default function BiobancoPage() {
  const [activeTab, setActiveTab] = useState('refrigeradores')

  return (
    <div className="page-wrapper space-y-6">
      <div className="section-header">
        <h1 className="section-title">Biobanco</h1>
        <p className="section-subtitle">
          Gestiona muestras biológicas, refrigeradores, cajas criogénicas y sus posiciones
        </p>
      </div>

      <RoleGuard allowedRoles={['LABORATORISTA', 'ADMINISTRADOR']}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sistema de almacenamiento criogénico jerárquico: Refrigerador → Piso → Caja → Muestra
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="refrigeradores">Refrigeradores</TabsTrigger>
            <TabsTrigger value="cajas">Cajas Criogénicas</TabsTrigger>
            <TabsTrigger value="muestras">Muestras</TabsTrigger>
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
        </Tabs>
      </RoleGuard>
    </div>
  )
}
